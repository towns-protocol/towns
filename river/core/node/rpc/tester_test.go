package rpc

import (
	"context"
	"crypto/tls"
	"fmt"
	"hash/fnv"
	"io"
	"log"
	"maps"
	"math/big"
	"net"
	"net/http"
	"os"
	"runtime"
	"slices"
	"strings"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/events/dumpevents"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
	"github.com/river-build/river/core/node/testutils/testcert"
	"github.com/river-build/river/core/node/testutils/testfmt"
)

type testNodeRecord struct {
	listener net.Listener
	url      string
	service  *Service
	address  common.Address
}

func (n *testNodeRecord) Close(ctx context.Context, dbUrl string) {
	if n.service != nil {
		n.service.Close()
		n.service = nil
	}
	if n.address != (common.Address{}) {
		_ = dbtestutils.DeleteTestSchema(
			ctx,
			dbUrl,
			storage.DbSchemaNameFromAddress(n.address.String()),
		)
	}
}

type serviceTester struct {
	ctx       context.Context
	ctxCancel context.CancelFunc
	t         *testing.T
	require   *require.Assertions
	dbUrl     string
	btc       *crypto.BlockchainTestContext
	nodes     []*testNodeRecord
	opts      serviceTesterOpts
}

type serviceTesterOpts struct {
	numNodes          int
	replicationFactor int
	start             bool
	btcParams         *crypto.TestParams
	printTestLogs     bool
}

func makeTestListenerNoCleanup(t *testing.T) (net.Listener, string) {
	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)
	listener = tls.NewListener(listener, testcert.GetHttp2LocalhostTLSConfig())
	return listener, "https://" + listener.Addr().String()
}

func makeTestListener(t *testing.T) (net.Listener, string) {
	l, url := makeTestListenerNoCleanup(t)
	t.Cleanup(func() { _ = l.Close() })
	return l, url
}

func newServiceTester(t *testing.T, opts serviceTesterOpts) *serviceTester {
	t.Parallel()

	if opts.numNodes <= 0 {
		panic("numNodes must be greater than 0")
	}

	if opts.replicationFactor <= 0 {
		opts.replicationFactor = 1
	}

	var ctx context.Context
	var ctxCancel func()
	if opts.printTestLogs {
		ctx, ctxCancel = test.NewTestContextWithLogging("info")
	} else {
		ctx, ctxCancel = test.NewTestContext()
	}
	require := require.New(t)

	st := &serviceTester{
		ctx:       ctx,
		ctxCancel: ctxCancel,
		t:         t,
		require:   require,
		dbUrl:     dbtestutils.GetTestDbUrl(),
		nodes:     make([]*testNodeRecord, opts.numNodes),
		opts:      opts,
	}

	// Cleanup context on test completion even if no other cleanups are registered.
	st.cleanup(func() {})

	btcParams := opts.btcParams
	if btcParams == nil {
		btcParams = &crypto.TestParams{NumKeys: opts.numNodes, MineOnTx: true, AutoMine: true}
	} else if btcParams.NumKeys == 0 {
		btcParams.NumKeys = opts.numNodes
	}
	btc, err := crypto.NewBlockchainTestContext(
		st.ctx,
		*btcParams,
	)
	require.NoError(err)
	st.btc = btc
	st.cleanup(st.btc.Close)

	for i := 0; i < opts.numNodes; i++ {
		st.nodes[i] = &testNodeRecord{}
		st.nodes[i].listener, st.nodes[i].url = st.makeTestListener()
	}

	st.startAutoMining()

	st.btc.SetConfigValue(
		t,
		ctx,
		crypto.StreamReplicationFactorConfigKey,
		crypto.ABIEncodeUint64(uint64(opts.replicationFactor)),
	)

	if opts.start {
		st.initNodeRecords(0, opts.numNodes, river.NodeStatus_Operational)
		st.startNodes(0, opts.numNodes)
	}

	return st
}

// Returns a new serviceTester instance for a makeSubtest.
//
// The new instance shares nodes with the parent instance,
// if parallel tests are run, node restarts or other changes should not be performed.
func (st *serviceTester) makeSubtest(t *testing.T) *serviceTester {
	var sub serviceTester = *st
	sub.t = t
	sub.ctx, sub.ctxCancel = context.WithCancel(st.ctx)
	sub.require = require.New(t)

	// Cleanup context on subtest completion even if no other cleanups are registered.
	sub.cleanup(func() {})

	return &sub
}

func (st *serviceTester) parallelSubtest(name string, test func(*serviceTester)) {
	st.t.Run(name, func(t *testing.T) {
		t.Parallel()
		test(st.makeSubtest(t))
	})
}

func (st *serviceTester) sequentialSubtest(name string, test func(*serviceTester)) {
	st.t.Run(name, func(t *testing.T) {
		test(st.makeSubtest(t))
	})
}

func (st *serviceTester) cleanup(f any) {
	st.t.Cleanup(func() {
		st.t.Helper()
		// On first cleanup call cancel context for the current test, so relevant shutdowns are started.
		if st.ctxCancel != nil {
			st.ctxCancel()
			st.ctxCancel = nil
		}
		switch f := f.(type) {
		case func():
			f()
		case func() error:
			_ = f()
		default:
			panic(fmt.Sprintf("unsupported cleanup type: %T", f))
		}
	})
}

func (st *serviceTester) makeTestListener() (net.Listener, string) {
	l, url := makeTestListenerNoCleanup(st.t)
	st.cleanup(l.Close)
	return l, url
}

func (st *serviceTester) CloseNode(i int) {
	if st.nodes[i] != nil {
		st.nodes[i].Close(st.ctx, st.dbUrl)
	}
}

func (st *serviceTester) initNodeRecords(start, stop int, status uint8) {
	for i := start; i < stop; i++ {
		err := st.btc.InitNodeRecordEx(st.ctx, i, st.nodes[i].url, status)
		st.require.NoError(err)
	}
}

func (st *serviceTester) setNodesStatus(start, stop int, status uint8) {
	for i := start; i < stop; i++ {
		err := st.btc.UpdateNodeStatus(st.ctx, i, status)
		st.require.NoError(err)
	}
}

func (st *serviceTester) startAutoMining() {
	// creates blocks that signals the river nodes to check and create miniblocks when required.
	if !(st.btc.IsSimulated() || (st.btc.IsAnvil() && !st.btc.AnvilAutoMineEnabled())) {
		return
	}

	// hack to ensure that the chain always produces blocks (automining=true)
	// commit on simulated backend with no pending txs can sometimes crash in the simulator.
	// by having a pending tx with automining enabled we can work around that issue.
	go func() {
		blockPeriod := time.NewTicker(2 * time.Second)
		chainID, err := st.btc.Client().ChainID(st.ctx)
		if err != nil {
			log.Fatal(err)
		}
		signer := types.LatestSignerForChainID(chainID)

		for {
			select {
			case <-st.ctx.Done():
				return
			case <-blockPeriod.C:
				_, _ = st.btc.DeployerBlockchain.TxPool.Submit(
					st.ctx,
					"noop",
					func(opts *bind.TransactOpts) (*types.Transaction, error) {
						gp, err := st.btc.Client().SuggestGasPrice(st.ctx)
						if err != nil {
							return nil, err
						}
						tx := types.NewTransaction(
							opts.Nonce.Uint64(),
							st.btc.GetDeployerWallet().Address,
							big.NewInt(1),
							21000,
							gp,
							nil,
						)
						return types.SignTx(tx, signer, st.btc.GetDeployerWallet().PrivateKeyStruct)
					},
				)
			}
		}
	}()
}

type startOpts struct {
	configUpdater func(cfg *config.Config)
	listeners     []net.Listener
	scrubberMaker func(ctx context.Context, s *Service) Scrubber
}

func (st *serviceTester) startNodes(start, stop int, opts ...startOpts) {
	for i := start; i < stop; i++ {
		err := st.startSingle(i, opts...)
		st.require.NoError(err)
	}
}

func (st *serviceTester) getConfig(opts ...startOpts) *config.Config {
	options := &startOpts{}
	if len(opts) > 0 {
		options = &opts[0]
	}

	cfg := config.GetDefaultConfig()
	cfg.DisableBaseChain = true
	cfg.DisableHttps = false
	cfg.RegistryContract = st.btc.RegistryConfig()
	cfg.Database = config.DatabaseConfig{
		Url:           st.dbUrl,
		StartupDelay:  2 * time.Millisecond,
		NumPartitions: 4,
	}
	cfg.Log.Simplify = true
	cfg.Network = config.NetworkConfig{
		NumRetries: 3,
	}
	cfg.ShutdownTimeout = 2 * time.Millisecond
	cfg.StreamReconciliation = config.StreamReconciliationConfig{
		InitialWorkerPoolSize: 4,
		OnlineWorkerPoolSize:  8,
		GetMiniblocksPageSize: 4,
	}
	cfg.StandByOnStart = false
	cfg.ShutdownTimeout = 0

	if options.configUpdater != nil {
		options.configUpdater(cfg)
	}

	return cfg
}

func (st *serviceTester) startSingle(i int, opts ...startOpts) error {
	options := &startOpts{}
	if len(opts) > 0 {
		options = &opts[0]
	}

	cfg := st.getConfig(*options)

	listener := st.nodes[i].listener
	if i < len(options.listeners) && options.listeners[i] != nil {
		listener = options.listeners[i]
	}

	logger := dlog.FromCtx(st.ctx).With("nodeNum", i, "test", st.t.Name())
	ctx := dlog.CtxWithLog(st.ctx, logger)
	ctx, ctxCancel := context.WithCancel(ctx)

	bc := st.btc.GetBlockchain(ctx, i)
	service, err := StartServer(ctx, ctxCancel, cfg, &ServerStartOpts{
		RiverChain:      bc,
		Listener:        listener,
		HttpClientMaker: testcert.GetHttp2LocalhostTLSClient,
		ScrubberMaker:   options.scrubberMaker,
	})
	if err != nil {
		st.require.Nil(service)
		return err
	}

	st.nodes[i].service = service
	st.nodes[i].address = bc.Wallet.Address

	var nodeRecord testNodeRecord = *st.nodes[i]

	st.cleanup(func() { nodeRecord.Close(st.ctx, st.dbUrl) })

	return nil
}

func (st *serviceTester) testClient(i int) protocolconnect.StreamServiceClient {
	return st.testClientForUrl(st.nodes[i].url)
}

func (st *serviceTester) testNode2NodeClient(i int) protocolconnect.NodeToNodeClient {
	return st.testNode2NodeClientForUrl(st.nodes[i].url)
}

func (st *serviceTester) testClientForUrl(url string) protocolconnect.StreamServiceClient {
	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(st.ctx, st.getConfig())
	return protocolconnect.NewStreamServiceClient(httpClient, url, connect.WithGRPCWeb())
}

func (st *serviceTester) testNode2NodeClientForUrl(url string) protocolconnect.NodeToNodeClient {
	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(st.ctx, st.getConfig())
	return protocolconnect.NewNodeToNodeClient(httpClient, url, connect.WithGRPCWeb())
}

func (st *serviceTester) httpClient() *http.Client {
	c, err := testcert.GetHttp2LocalhostTLSClient(st.ctx, st.getConfig())
	st.require.NoError(err)
	return c
}

func bytesHash(b []byte) uint64 {
	h := fnv.New64a()
	_, _ = h.Write(b)
	return h.Sum64()
}

func (st *serviceTester) compareStreamDataInStorage(
	t assert.TestingT,
	streamId StreamId,
	expectedMbs int,
	expectedEvents int,
) {
	// Read data from storage.
	var data []*storage.DebugReadStreamDataResult
	for _, n := range st.nodes {
		// TODO: occasionally n.service.storage.DebugReadStreamData crashes due to nil pointer dereference,
		// example: https://github.com/river-build/river/actions/runs/10127906870/job/28006223317#step:18:113
		// the stack trace doesn't provide context which deref fails, therefore deref field by field.
		svc := n.service
		str := svc.storage
		d, err := str.DebugReadStreamData(st.ctx, streamId)
		if !assert.NoError(t, err) {
			return
		}
		data = append(data, d)
	}

	var evHashes0 []uint64
	for i, d := range data {
		failed := false

		failed = !assert.Equal(t, streamId, d.StreamId, "StreamId, node %d", i) || failed

		failed = !assert.Equal(t, expectedMbs, len(d.Miniblocks), "Miniblocks, node %d", i) || failed

		eventsLen := 0
		// Do not count slot -1 db marker events
		for _, e := range d.Events {
			if e.Slot != -1 {
				eventsLen++
			}
		}
		failed = !assert.Equal(t, expectedEvents, eventsLen, "Events, node %d", i) || failed

		if !failed {
			// All events should have the same generation and consecutive slots
			// starting with -1 (marker slot for in database table)
			if len(d.Events) > 1 {
				gen := d.Events[0].Generation
				for j, e := range d.Events {
					if !assert.Equal(t, gen, e.Generation, "Mismatching event generation") ||
						!assert.EqualValues(t, j-1, e.Slot, "Mismatching event slot") {
						failed = true
						break
					}
				}
			}
		}

		// Events in minipools might be in different order
		evHashes := []uint64{}
		for _, e := range d.Events {
			evHashes = append(evHashes, bytesHash(e.Data))
		}
		slices.Sort(evHashes)

		if i > 0 {
			if !failed {
				// Compare fields separately to get better error messages
				assert.Equal(
					t,
					data[0].LatestSnapshotMiniblockNum,
					d.LatestSnapshotMiniblockNum,
					"Bad snapshot num in node %d",
					i,
				)
				for j, mb := range data[i].Miniblocks {
					exp := data[0].Miniblocks[j]
					_ = assert.EqualValues(t, exp.MiniblockNumber, mb.MiniblockNumber, "Bad mb num in node %d", i) &&
						assert.EqualValues(t, exp.Hash, mb.Hash, "Bad mb hash in node %d", i) &&
						assert.Equal(
							t,
							bytesHash(exp.Data),
							bytesHash(mb.Data),
							"Bad mb data in node %d, mb %d",
							i,
							j,
						)
				}

				if !slices.Equal(evHashes0, evHashes) {
					assert.Fail(t, "Events mismatch", "node %d", i)
				}
			}
		} else {
			evHashes0 = evHashes
		}

		if failed {
			t.Errorf("Data for node %d: %v", i, d)
		}
	}
}

func (st *serviceTester) eventuallyCompareStreamDataInStorage(
	streamId StreamId,
	expectedMbs int,
	expectedEvents int,
) {
	st.require.EventuallyWithT(
		func(t *assert.CollectT) {
			st.compareStreamDataInStorage(t, streamId, expectedMbs, expectedEvents)
		},
		20*time.Second,
		100*time.Millisecond,
	)
}

func (st *serviceTester) httpGet(url string) string {
	resp, err := st.httpClient().Get(url)
	st.require.NoError(err)
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	st.require.NoError(err)
	return string(body)
}

type testClient struct {
	t               *testing.T
	ctx             context.Context
	assert          *assert.Assertions
	require         *require.Assertions
	client          protocolconnect.StreamServiceClient
	node2nodeClient protocolconnect.NodeToNodeClient
	wallet          *crypto.Wallet
	userId          common.Address
	userStreamId    StreamId
	name            string
}

func (st *serviceTester) newTestClient(i int) *testClient {
	wallet, err := crypto.NewWallet(st.ctx)
	st.require.NoError(err)
	return &testClient{
		t:               st.t,
		ctx:             st.ctx,
		assert:          assert.New(st.t),
		require:         st.require,
		client:          st.testClient(i),
		node2nodeClient: st.testNode2NodeClient(i),
		wallet:          wallet,
		userId:          wallet.Address,
		userStreamId:    UserStreamIdFromAddr(wallet.Address),
		name:            fmt.Sprintf("%d-%s", i, wallet.Address.Hex()[2:8]),
	}
}

// newTestClients creates a testClients with clients connected to nodes in round-robin fashion.
func (st *serviceTester) newTestClients(numClients int) testClients {
	clients := make(testClients, numClients)
	for i := range clients {
		clients[i] = st.newTestClient(i % st.opts.numNodes)
	}
	clients.parallelForAll(func(tc *testClient) {
		tc.createUserStream()
	})
	return clients
}

func (tc *testClient) withRequireFor(t require.TestingT) *testClient {
	var tcc testClient = *tc
	tcc.require = require.New(t)
	tcc.assert = assert.New(t)
	return &tcc
}

func (tc *testClient) createUserStream(
	streamSettings ...*StreamSettings,
) *MiniblockRef {
	var ss *StreamSettings
	if len(streamSettings) > 0 {
		ss = streamSettings[0]
	}
	cookie, _, err := createUser(tc.ctx, tc.wallet, tc.client, ss)
	tc.require.NoError(err)
	return &MiniblockRef{
		Hash: common.BytesToHash(cookie.PrevMiniblockHash),
		Num:  cookie.MinipoolGen - 1,
	}
}

func (tc *testClient) createSpace(
	streamSettings ...*StreamSettings,
) (StreamId, *MiniblockRef) {
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	var ss *StreamSettings
	if len(streamSettings) > 0 {
		ss = streamSettings[0]
	}
	cookie, _, err := createSpace(tc.ctx, tc.wallet, tc.client, spaceId, ss)
	tc.require.NoError(err)
	tc.require.NotNil(cookie)
	return spaceId, &MiniblockRef{
		Hash: common.BytesToHash(cookie.PrevMiniblockHash),
		Num:  cookie.MinipoolGen - 1,
	}
}

func (tc *testClient) createChannel(
	spaceId StreamId,
	streamSettings ...*StreamSettings,
) (StreamId, *MiniblockRef) {
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	var ss *StreamSettings
	if len(streamSettings) > 0 {
		ss = streamSettings[0]
	}
	cookie, _, err := createChannel(tc.ctx, tc.wallet, tc.client, spaceId, channelId, ss)
	tc.require.NoError(err)
	return channelId, &MiniblockRef{
		Hash: common.BytesToHash(cookie.PrevMiniblockHash),
		Num:  cookie.MinipoolGen - 1,
	}
}

func (tc *testClient) joinChannel(spaceId StreamId, channelId StreamId, mb *MiniblockRef) {
	userJoin, err := MakeEnvelopeWithPayload(
		tc.wallet,
		Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			channelId,
			nil,
			spaceId[:],
		),
		mb,
	)
	tc.require.NoError(err)

	userStreamId := UserStreamIdFromAddr(tc.wallet.Address)
	_, err = tc.client.AddEvent(
		tc.ctx,
		connect.NewRequest(
			&AddEventRequest{
				StreamId: userStreamId[:],
				Event:    userJoin,
			},
		),
	)
	tc.require.NoError(err)
}

func (tc *testClient) getLastMiniblockHash(streamId StreamId) *MiniblockRef {
	resp, err := tc.client.GetLastMiniblockHash(tc.ctx, connect.NewRequest(&GetLastMiniblockHashRequest{
		StreamId: streamId[:],
	}))
	tc.require.NoError(err)
	return &MiniblockRef{
		Hash: common.BytesToHash(resp.Msg.GetHash()),
		Num:  resp.Msg.GetMiniblockNum(),
	}
}

func (tc *testClient) say(channelId StreamId, message string) {
	ref := tc.getLastMiniblockHash(channelId)
	envelope, err := MakeEnvelopeWithPayload(tc.wallet, Make_ChannelPayload_Message(message), ref)
	tc.require.NoError(err)
	_, err = tc.client.AddEvent(tc.ctx, connect.NewRequest(&AddEventRequest{
		StreamId: channelId[:],
		Event:    envelope,
	}))
	tc.require.NoError(err)
}

type usersMessage struct {
	userId  common.Address
	message string
}

func (um usersMessage) String() string {
	return fmt.Sprintf("%s: '%s'\n", um.userId.Hex()[2:8], um.message)
}

type userMessages []usersMessage

func flattenUserMessages(userIds []common.Address, messages [][]string) userMessages {
	um := userMessages{}
	for _, msg := range messages {
		for j, m := range msg {
			if m != "" {
				um = append(um, usersMessage{userId: userIds[j], message: m})
			}
		}
	}
	return um
}

func (um userMessages) String() string {
	if len(um) == 0 {
		return " EMPTY"
	}
	lines := []string{"\n[[[\n"}
	for _, m := range um {
		lines = append(lines, m.String())
	}
	lines = append(lines, "]]]\n")
	return strings.Join(lines, "")
}

func diffUserMessages(expected, actual userMessages) (userMessages, userMessages) {
	expectedSet := map[string]usersMessage{}
	for _, m := range expected {
		expectedSet[m.String()] = m
	}
	actualExtra := userMessages{}
	for _, m := range actual {
		key := m.String()
		_, ok := expectedSet[key]
		if ok {
			delete(expectedSet, key)
		} else {
			actualExtra = append(actualExtra, m)
		}
	}
	expectedExtra := slices.Collect(maps.Values(expectedSet))
	return expectedExtra, actualExtra
}

func TestDiffUserMessages(t *testing.T) {
	assert := assert.New(t)

	um1 := usersMessage{common.Address{0x1}, "A"}
	um2 := usersMessage{common.Address{0x1}, "B"}
	um3 := usersMessage{common.Address{0x2}, "A"}
	um4 := usersMessage{common.Address{0x2}, "B"}
	umAll := userMessages{um1, um2, um3, um4}

	a, b := diffUserMessages(umAll, umAll)
	assert.Len(a, 0)
	assert.Len(b, 0)

	a, b = diffUserMessages(umAll, umAll[:3])
	assert.ElementsMatch(a, umAll[3:])
	assert.Len(b, 0)

	a, b = diffUserMessages(umAll[1:], umAll)
	assert.Len(a, 0)
	assert.ElementsMatch(b, umAll[:1])

	a, b = diffUserMessages(umAll[1:], umAll[:3])
	assert.ElementsMatch(a, umAll[3:])
	assert.ElementsMatch(b, umAll[:1])

	a, b = diffUserMessages(umAll[2:], umAll[:2])
	assert.ElementsMatch(a, umAll[2:])
	assert.ElementsMatch(b, umAll[:2])
}

func (tc *testClient) getAllMessages(channelId StreamId) userMessages {
	_, view := tc.getStreamAndView(channelId, true)

	messages := userMessages{}
	for e := range view.AllEvents() {
		payload := e.GetChannelMessage()
		if payload != nil {
			messages = append(messages, usersMessage{
				userId:  crypto.PublicKeyToAddress(e.SignerPubKey),
				message: string(payload.Message.Ciphertext),
			})
		}
	}

	return messages
}

func (tc *testClient) eventually(f func(*testClient), t ...time.Duration) {
	waitFor := 5 * time.Second
	if len(t) > 0 {
		waitFor = t[0]
	}
	tick := 100 * time.Millisecond
	if len(t) > 1 {
		tick = t[1]
	}
	tc.require.EventuallyWithT(func(t *assert.CollectT) {
		f(tc.withRequireFor(t))
	}, waitFor, tick)
}

//nolint:unused
func (tc *testClient) listen(channelId StreamId, userIds []common.Address, messages [][]string) {
	expected := flattenUserMessages(userIds, messages)
	tc.listenImpl(channelId, expected)
}

func (tc *testClient) listenImpl(channelId StreamId, expected userMessages) {
	tc.eventually(func(tc *testClient) {
		actual := tc.getAllMessages(channelId)
		expectedExtra, actualExtra := diffUserMessages(expected, actual)
		if len(expectedExtra) > 0 {
			tc.require.FailNow(
				"Didn't receive all messages",
				"client %s\nexpectedExtra:%vactualExtra:%v",
				tc.name,
				expectedExtra,
				actualExtra,
			)
		}
		if len(actualExtra) > 0 {
			tc.require.FailNow("Received unexpected messages", "actualExtra:%v", actualExtra)
		}
	})
}

func (tc *testClient) getStream(streamId StreamId) *StreamAndCookie {
	resp, err := tc.client.GetStream(tc.ctx, connect.NewRequest(&GetStreamRequest{
		StreamId: streamId[:],
	}))
	tc.require.NoError(err)
	tc.require.NotNil(resp.Msg)
	tc.require.NotNil(resp.Msg.Stream)
	return resp.Msg.Stream
}

func (tc *testClient) getStreamEx(streamId StreamId, onEachMb func(*Miniblock)) {
	resp, err := tc.client.GetStreamEx(tc.ctx, connect.NewRequest(&GetStreamExRequest{
		StreamId: streamId[:],
	}))
	tc.require.NoError(err)
	for resp.Receive() {
		onEachMb(resp.Msg().GetMiniblock())
	}
	tc.require.NoError(resp.Err())
	tc.require.NoError(resp.Close())
}

func (tc *testClient) getStreamAndView(
	streamId StreamId,
	history ...bool,
) (*StreamAndCookie, JoinableStreamView) {
	stream := tc.getStream(streamId)
	var view JoinableStreamView
	var err error
	view, err = MakeRemoteStreamView(tc.ctx, stream)
	tc.require.NoError(err)
	tc.require.NotNil(view)

	if len(history) > 0 && history[0] {
		mbs := view.Miniblocks()
		tc.require.NotEmpty(mbs)
		if mbs[0].Ref.Num > 0 {
			view = tc.addHistoryToView(view)
		}
	}

	return stream, view
}

func (tc *testClient) maybeDumpStreamView(view StreamView) {
	if os.Getenv("RIVER_TEST_DUMP_STREAM") != "" {
		testfmt.Print(
			tc.t,
			tc.name,
			"Dumping stream view",
			"\n",
			dumpevents.DumpStreamView(view, dumpevents.DumpOpts{EventContent: true, TestMessages: true}),
		)
	}
}

var _ = (*testClient)(nil).maybeDumpStreamView // Suppress unused warning TODO: remove once used

func (tc *testClient) maybeDumpStream(stream *StreamAndCookie) {
	if os.Getenv("RIVER_TEST_DUMP_STREAM") != "" {
		testfmt.Print(
			tc.t,
			tc.name,
			"Dumping stream",
			"\n",
			dumpevents.DumpStream(tc.ctx, stream, dumpevents.DumpOpts{EventContent: true, TestMessages: true}),
		)
	}
}

func (tc *testClient) getMiniblocks(streamId StreamId, fromInclusive, toExclusive int64) []*MiniblockInfo {
	resp, err := tc.client.GetMiniblocks(tc.ctx, connect.NewRequest(&GetMiniblocksRequest{
		StreamId:      streamId[:],
		FromInclusive: fromInclusive,
		ToExclusive:   toExclusive,
	}))
	tc.require.NoError(err)
	mbs, err := NewMiniblocksInfoFromProtos(resp.Msg.Miniblocks, NewMiniblockInfoFromProtoOpts{
		ExpectedBlockNumber: fromInclusive,
	})
	tc.require.NoError(err)
	return mbs
}

func (tc *testClient) addHistoryToView(
	view JoinableStreamView,
) JoinableStreamView {
	firstMbNum := view.Miniblocks()[0].Ref.Num
	if firstMbNum == 0 {
		return view
	}

	mbs := tc.getMiniblocks(*view.StreamId(), 0, firstMbNum)
	newView, err := view.CopyAndPrependMiniblocks(mbs)
	tc.require.NoError(err)
	return newView.(JoinableStreamView)
}

func (tc *testClient) requireMembership(streamId StreamId, expectedMemberships []common.Address) {
	tc.eventually(func(tc *testClient) {
		_, view := tc.getStreamAndView(streamId)
		members, err := view.GetChannelMembers()
		tc.require.NoError(err)
		actualMembers := []common.Address{}
		for _, a := range members.ToSlice() {
			actualMembers = append(actualMembers, common.HexToAddress(a))
		}
		tc.require.ElementsMatch(expectedMemberships, actualMembers)
	})
}

type testClients []*testClient

func (tcs testClients) requireMembership(streamId StreamId, expectedMemberships ...[]common.Address) {
	var expected []common.Address
	if len(expectedMemberships) > 0 {
		expected = expectedMemberships[0]
	} else {
		expected = tcs.userIds()
	}
	tcs.parallelForAll(func(tc *testClient) {
		tc.requireMembership(streamId, expected)
	})
}

func (tcs testClients) userIds() []common.Address {
	userIds := []common.Address{}
	for _, tc := range tcs {
		userIds = append(userIds, tc.userId)
	}
	return userIds
}

func (tcs testClients) listen(channelId StreamId, messages [][]string) {
	expected := flattenUserMessages(tcs.userIds(), messages)
	tcs.parallelForAll(func(tc *testClient) {
		tc.listenImpl(channelId, expected)
	})
}

func (tcs testClients) say(channelId StreamId, messages ...string) {
	parallel(tcs, func(tc *testClient, msg string) {
		if msg != "" {
			tc.say(channelId, msg)
		}
	}, messages...)
}

// parallel spreads params over clients calling provided function in parallel.
func parallel[Params any](tcs testClients, f func(*testClient, Params), params ...Params) {
	tcs[0].require.LessOrEqual(len(params), len(tcs))
	resultC := make(chan int, len(params))
	for i, p := range params {
		go func() {
			defer func() {
				resultC <- i
			}()
			f(tcs[i], p)
		}()
	}
	for range params {
		i := <-resultC
		if tcs[i].t.Failed() {
			tcs[i].t.Fatalf("client %s failed", tcs[i].name)
			return
		}
	}
}

func (tcs testClients) parallelForAll(f func(*testClient)) {
	resultC := make(chan int, len(tcs))
	for i, tc := range tcs {
		go func() {
			defer func() {
				resultC <- i
			}()
			f(tc)
		}()
	}
	for range tcs {
		i := <-resultC
		if tcs[i].t.Failed() {
			tcs[i].t.Fatalf("client %s failed", tcs[i].name)
			return
		}
	}
}

func (tcs testClients) parallelForAllT(t require.TestingT, f func(*testClient)) {
	collects := make([]*collectT, len(tcs))
	for i := range tcs {
		collects[i] = &collectT{}
	}
	resultC := make(chan int, len(tcs))
	for i, tc := range tcs {
		go func() {
			defer func() {
				resultC <- i
			}()
			f(tc.withRequireFor(collects[i]))
		}()
	}
	failed := false
	for range tcs {
		i := <-resultC
		if collects[i].Failed() {
			collects[i].copyErrorsTo(t)
			failed = true
		}
	}
	if failed {
		t.FailNow()
	}
}

// setupChannelWithClients creates a channel and returns a testClients with clients connected to it.
// First client is creator of both space and channel.
// Other clients join the channel.
// Clients are connected to nodes in round-robin fashion.
func (tcs testClients) createChannelAndJoin(spaceId StreamId) StreamId {
	alice := tcs[0]
	channelId, _ := alice.createChannel(spaceId)

	tcs[1:].parallelForAll(func(tc *testClient) {
		userLastMb := tc.getLastMiniblockHash(tc.userStreamId)
		tc.joinChannel(spaceId, channelId, userLastMb)
	})

	tcs.requireMembership(channelId)

	return channelId
}

func (tcs testClients) compareNowImpl(t require.TestingT, streamId StreamId) []*StreamAndCookie {
	assert := assert.New(t)
	streamC := make(chan *StreamAndCookie, len(tcs))
	tcs.parallelForAllT(t, func(tc *testClient) {
		streamC <- tc.getStream(streamId)
	})
	streams := []*StreamAndCookie{}
	for range tcs {
		streams = append(streams, <-streamC)
	}
	testfmt.Println(tcs[0].t, "compareNowImpl: Got all streams")
	first := streams[0]
	var success bool
	for i, stream := range streams[1:] {
		success = assert.Equal(
			len(first.Miniblocks),
			len(stream.Miniblocks),
			"different number of miniblocks, 0 and %d",
			i+1,
		)
		success = success &&
			assert.Equal(len(first.Events), len(stream.Events), "different number of events, 0 and %d", i+1)
		success = success && assert.Equal(
			common.BytesToHash(first.NextSyncCookie.PrevMiniblockHash).Hex(),
			common.BytesToHash(stream.NextSyncCookie.PrevMiniblockHash).Hex(),
			"different prev miniblock hash, 0 and %d",
			i+1,
		)
		success = success && assert.Equal(
			first.NextSyncCookie.MinipoolGen,
			stream.NextSyncCookie.MinipoolGen,
			"different minipool gen, 0 and %d",
			i+1,
		)
		success = success && assert.Equal(
			first.NextSyncCookie.MinipoolSlot,
			stream.NextSyncCookie.MinipoolSlot,
			"different minipool slot, 0 and %d",
			i+1,
		)

	}
	if !success {
		return streams
	}
	return nil
}

//nolint:unused
func (tcs testClients) compareNow(streamId StreamId) {
	if len(tcs) < 2 {
		panic("need at least 2 clients to compare")
	}
	streams := tcs.compareNowImpl(tcs[0].t, streamId)
	if streams != nil {
		for i, s := range streams {
			tcs[i].maybeDumpStream(s)
		}
		tcs[0].t.FailNow()
	}
}

func (tcs testClients) compare(streamId StreamId) {
	if len(tcs) < 2 {
		panic("need at least 2 clients to compare")
	}
	var streams []*StreamAndCookie
	success := tcs[0].assert.EventuallyWithT(func(t *assert.CollectT) {
		streams = tcs.compareNowImpl(t, streamId)
	}, 10*time.Second, 100*time.Millisecond)
	for i, s := range streams {
		tcs[i].maybeDumpStream(s)
	}
	if !success {
		tcs[0].t.FailNow()
	}
}

type collectT struct {
	errors []error
}

func (c *collectT) Errorf(format string, args ...interface{}) {
	c.errors = append(c.errors, fmt.Errorf(format, args...))
}

func (c *collectT) FailNow() {
	c.Fail()
	runtime.Goexit()
}

func (c *collectT) Fail() {
	if !c.Failed() {
		c.errors = []error{} // Make it non-nil to mark a failure.
	}
}

func (c *collectT) Failed() bool {
	return c.errors != nil
}

func (c *collectT) copyErrorsTo(t require.TestingT) {
	for _, err := range c.errors {
		t.Errorf("%v", err)
	}
}
