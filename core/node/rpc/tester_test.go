package rpc

import (
	"context"
	"fmt"
	"hash/fnv"
	"io"
	"log"
	"maps"
	"math"
	"math/big"
	"net"
	"net/http"
	"os"
	"runtime"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/atomic"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/events/dumpevents"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/rpc/node2nodeauth"
	"github.com/towns-protocol/towns/core/node/rpc/rpc_client"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
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
		// lint:ignore context.Background() is fine here
		err := dbtestutils.DeleteTestSchema(
			context.Background(),
			dbUrl,
			storage.DbSchemaNameFromAddress(n.address.String()),
		)
		// Force test writers to properly clean up schemas if this fails for some reason.
		if err != nil {
			panic(err)
		}
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
	numOperators      int
	replicationFactor int
	start             bool
	btcParams         *crypto.TestParams
	printTestLogs     bool
}

func makeTestListener(t *testing.T) (net.Listener, string) {
	l, url := testcert.MakeTestListener(t, nil)
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
		btcParams = &crypto.TestParams{
			NumKeys:      opts.numNodes,
			MineOnTx:     true,
			AutoMine:     true,
			NumOperators: opts.numOperators,
		}
	} else if btcParams.NumKeys == 0 {
		btcParams.NumKeys = opts.numNodes
		btcParams.NumOperators = opts.numOperators
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
	st.btc.SetConfigValue(
		t,
		ctx,
		crypto.StreamEnableNewSnapshotFormatConfigKey,
		crypto.ABIEncodeUint64(1),
	)
	st.btc.SetConfigValue(
		t,
		ctx,
		crypto.ServerEnableNode2NodeAuthConfigKey,
		crypto.ABIEncodeUint64(1),
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
	l, url := testcert.MakeTestListener(
		st.t,
		node2nodeauth.VerifyPeerCertificate(
			logging.FromCtx(st.ctx),
			func(addr common.Address) error {
				node, err := st.btc.NodeRegistry.GetNode(nil, addr)
				if err != nil {
					return err
				}

				if node.NodeAddress.Cmp(addr) != 0 {
					return fmt.Errorf("node address mismatch: expected %s, got %s", node.NodeAddress.Hex(), addr.Hex())
				}

				return nil
			},
		),
	)
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

	// TODO: FIX: remove
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
	cfg.Port = 0
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
		InitialWorkerPoolSize:           4,
		OnlineWorkerPoolSize:            8,
		GetMiniblocksPageSize:           4,
		ReconciliationTaskRetryDuration: 2 * time.Second,
	}
	cfg.StandByOnStart = false
	cfg.ShutdownTimeout = 0
	cfg.EnableTestAPIs = true

	cfg.MetadataShardMask = 0b11

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

	logger := logging.FromCtx(st.ctx).With("nodeNum", i, "test", st.t.Name())
	ctx := logging.CtxWithLog(st.ctx, logger)
	ctx, ctxCancel := context.WithCancel(ctx)

	bc := st.btc.GetBlockchain(ctx, i)
	service, err := StartServer(ctx, ctxCancel, cfg, &ServerStartOpts{
		RiverChain:              bc,
		Listener:                listener,
		HttpClientMaker:         testcert.GetHttp2LocalhostTLSClient,
		HttpClientMakerWithCert: testcert.GetHttp2LocalhostTLSClientWithCert,
		ScrubberMaker:           options.scrubberMaker,
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
	return st.testNode2NodeClientForUrl(st.nodes[i].url, i)
}

func (st *serviceTester) testClientForUrl(url string) protocolconnect.StreamServiceClient {
	return protocolconnect.NewStreamServiceClient(st.httpClient(), url, connect.WithGRPCWeb())
}

func (st *serviceTester) testNode2NodeClientForUrl(url string, i int) protocolconnect.NodeToNodeClient {
	return protocolconnect.NewNodeToNodeClient(st.httpClientWithCert(i), url, connect.WithGRPCWeb())
}

func (st *serviceTester) httpClient() *http.Client {
	c, err := testcert.GetHttp2LocalhostTLSClient(st.ctx, st.getConfig())
	st.require.NoError(err)
	return c
}

func (st *serviceTester) httpClientWithCert(i int) *http.Client {
	c, err := testcert.GetHttp2LocalhostTLSClientWithCert(
		st.ctx, st.getConfig(), node2nodeauth.CertGetter(nil, st.btc.NodeWallets[i], st.btc.ChainId),
	)
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
		// example: https://github.com/towns-protocol/towns/actions/runs/10127906870/job/28006223317#step:18:113
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
					_ = assert.EqualValues(t, exp.Number, mb.Number, "Bad mb num in node %d", i) &&
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

type receivedStreamUpdates struct {
	mu      sync.Mutex
	updates []*SyncStreamsResponse
}

func (r *receivedStreamUpdates) AddUpdate(update *SyncStreamsResponse) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.updates = append(r.updates, update)
}

func (r *receivedStreamUpdates) Clone() []*SyncStreamsResponse {
	r.mu.Lock()
	defer r.mu.Unlock()

	return slices.Clone(r.updates)
}

func (r *receivedStreamUpdates) ForEachEvent(
	t *testing.T,
	op func(e *ParsedEvent) bool,
) {
	if r == nil {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	for _, update := range r.updates {
		stream := update.GetStream()
		for _, block := range stream.GetMiniblocks() {
			for _, event := range block.Events {
				parsedEvent, err := ParseEvent(event)
				require.NoError(t, err)
				if !op(parsedEvent) {
					return
				}
			}
		}
		for _, event := range stream.GetEvents() {
			parsedEvent, err := ParseEvent(event)
			require.NoError(t, err)
			if !op(parsedEvent) {
				return
			}
		}
	}
}

type testClient struct {
	t                     *testing.T
	ctx                   context.Context
	assert                *assert.Assertions
	require               *require.Assertions
	client                protocolconnect.StreamServiceClient
	node2nodeClient       protocolconnect.NodeToNodeClient
	nodes                 []*testNodeRecord
	wallet                *crypto.Wallet
	userId                common.Address
	userStreamId          StreamId
	name                  string
	syncID                atomic.String // use testClient#SyncID() to retrieve the value
	enableSync            bool
	updates               *xsync.Map[StreamId, *receivedStreamUpdates]
	disableMiniblockComp  bool
	deviceKey             string
	fallbackKey           string
	defaultSessionId      string
	defaultSessionIdBytes []byte
	serviceTester         *serviceTester // Reference to the service tester
}

type testClientOpts struct {
	disableMiniblockComp bool
	// enableSync set to true means that the client will sync with all channels that it joined and compares all
	// received updates with other clients.
	enableSync bool

	deviceKey   string
	fallbackKey string

	createUserStreamsWithEncryptionDevice bool
}

func (st *serviceTester) newTestClient(i int, opts testClientOpts) *testClient {
	wallet, err := crypto.NewWallet(st.ctx)
	st.require.NoError(err)
	return st.newTestClientWithWallet(i, opts, wallet)
}

func (st *serviceTester) newTestClientWithWallet(i int, opts testClientOpts, wallet *crypto.Wallet) *testClient {
	deviceKey := opts.deviceKey
	if deviceKey == "" {
		deviceKey = fmt.Sprintf("deviceKey_%x", wallet.Address[:6])
	}
	fallbackKey := opts.fallbackKey
	if fallbackKey == "" {
		fallbackKey = fmt.Sprintf("fallbackKey_%x", wallet.Address[:6])
	}

	tc := &testClient{
		t:                     st.t,
		ctx:                   st.ctx,
		assert:                assert.New(st.t),
		require:               st.require,
		client:                st.testClient(i),
		node2nodeClient:       st.testNode2NodeClient(i),
		nodes:                 st.nodes,
		wallet:                wallet,
		userId:                wallet.Address,
		userStreamId:          UserStreamIdFromAddr(wallet.Address),
		name:                  fmt.Sprintf("%d-%s", i, wallet.Address.Hex()[2:8]),
		enableSync:            opts.enableSync,
		updates:               xsync.NewMap[StreamId, *receivedStreamUpdates](),
		disableMiniblockComp:  opts.disableMiniblockComp,
		deviceKey:             deviceKey,
		fallbackKey:           fallbackKey,
		defaultSessionId:      fmt.Sprintf("%0x", wallet.Address[:6]),
		defaultSessionIdBytes: wallet.Address[:6],
		serviceTester:         st, // Set the service tester reference
	}

	if opts.createUserStreamsWithEncryptionDevice {
		tc.createUserStreamsWithEncryptionDevice()
	}
	return tc
}

// newTestClients creates a testClients with clients connected to nodes in round-robin fashion.
func (st *serviceTester) newTestClients(numClients int, opts testClientOpts) testClients {
	clients := make(testClients, numClients)
	for i := range clients {
		clients[i] = st.newTestClient(i%st.opts.numNodes, opts)
	}
	clients.parallelForAll(func(tc *testClient) {
		tc.createUserStream()
	})
	clients.parallelForAll(func(tc *testClient) {
		tc.startSync()
	})

	return clients
}

// createMetadataStreams creates metadata streams for all shards using the operator client.
func (st *serviceTester) createMetadataStreams() {
	operatorClient := st.newTestClientWithWallet(0, testClientOpts{}, st.btc.OperatorWallets[0])

	numStreams := st.nodes[0].service.config.MetadataShardMask + 1

	var wg sync.WaitGroup
	for i := uint64(0); i < numStreams; i++ {
		wg.Add(1)
		go func(i uint64) {
			defer wg.Done()
			operatorClient.createMetadataStream(i)
		}(i)
	}
	wg.Wait()
}

func (tc *testClient) DefaultEncryptionDevice() app_client.EncryptionDevice {
	return app_client.EncryptionDevice{
		DeviceKey:   tc.deviceKey,
		FallbackKey: tc.fallbackKey,
	}
}

func (tc *testClient) createUserMetadataStreamWithEncryptionDevice() {
	cookie, _, err := createUserMetadataStream(tc.ctx, tc.wallet, tc.client, nil)
	tc.require.NoError(err, "Error creating user metadata stream for testClient")

	event, err := MakeEnvelopeWithPayloadAndTags(
		tc.wallet,
		Make_UserMetadataPayload_EncryptionDevice(
			tc.deviceKey,
			tc.fallbackKey,
		),
		&MiniblockRef{
			Num:  cookie.GetMinipoolGen() - 1,
			Hash: common.Hash(cookie.GetPrevMiniblockHash()),
		},
		nil,
	)
	tc.require.NoError(err)

	addEventResp, err := tc.client.AddEvent(
		tc.ctx,
		&connect.Request[AddEventRequest]{
			Msg: &AddEventRequest{
				StreamId: cookie.StreamId,
				Event:    event,
			},
		},
	)
	tc.require.NoError(err)
	tc.require.Nil(addEventResp.Msg.GetError())
}

func (tc *testClient) createUserInboxStream() {
	_, _, err := createUserInboxStream(tc.ctx, tc.wallet, tc.client, nil)
	tc.require.NoError(err, "Error creating user inbox stream for testClient")
}

func (tc *testClient) createUserStreamsWithEncryptionDevice() *MiniblockRef {
	userStreamMbRef := tc.createUserStream()
	tc.createUserInboxStream()
	tc.createUserMetadataStreamWithEncryptionDevice()
	return userStreamMbRef
}

func (tc *testClient) withRequireFor(t require.TestingT) *testClient {
	var tcc testClient = *tc
	tcc.require = require.New(t)
	tcc.assert = assert.New(t)
	return &tcc
}

func (tc *testClient) createUserStreamGetCookie(
	streamSettings ...*StreamSettings,
) *SyncCookie {
	var ss *StreamSettings
	if len(streamSettings) > 0 {
		ss = streamSettings[0]
	}
	cookie, _, err := createUser(tc.ctx, tc.wallet, tc.client, ss)
	tc.require.NoError(err)
	return cookie
}

func (tc *testClient) createUserStream(
	streamSettings ...*StreamSettings,
) *MiniblockRef {
	cookie := tc.createUserStreamGetCookie(streamSettings...)
	return &MiniblockRef{
		Hash: common.BytesToHash(cookie.PrevMiniblockHash),
		Num:  cookie.MinipoolGen - 1,
	}
}

func (tcs testClients) requireSubscribed(streamId StreamId) {
	tcs.parallelForAll(func(tc *testClient) {
		tc.requireSubscribed(streamId)
	})
}

func (tc *testClient) requireSubscribed(channelId StreamId) {
	if !tc.enableSync {
		return
	}

	tc.require.Eventually(func() bool {
		_, ok := tc.updates.Load(channelId)
		return ok
	}, 10*time.Second, 10*time.Millisecond)
}

func (tc *testClient) syncChannel(cookie *SyncCookie) {
	if !tc.enableSync {
		return
	}

	resp, err := tc.client.ModifySync(tc.ctx, connect.NewRequest(&ModifySyncRequest{
		SyncId:     tc.SyncID(),
		AddStreams: []*SyncCookie{cookie},
	}))
	tc.require.NoError(err)
	tc.require.Len(resp.Msg.GetBackfills(), 0)
	tc.require.Len(resp.Msg.GetAdds(), 0)
	tc.require.Len(resp.Msg.GetRemovals(), 0)
}

func (tc *testClient) syncChannelFromInit(streamId StreamId) {
	tc.syncChannel(&SyncCookie{
		StreamId:          streamId[:],
		MinipoolGen:       math.MaxInt64,
		PrevMiniblockHash: common.Hash{}.Bytes(),
	})
}

// startSync initiates a sync session without streams.
func (tc *testClient) startSync() {
	if !tc.enableSync {
		return
	}

	// TODO: Remove after removing the legacy syncer
	req := connect.NewRequest(&SyncStreamsRequest{})
	req.Header().Set(UseSharedSyncHeaderName, "true")

	updates, err := tc.client.SyncStreams(tc.ctx, req)
	tc.require.NoError(err)

	if updates.Receive() {
		tc.require.NoError(updates.Err())
		update := updates.Msg()
		tc.require.Equal(SyncOp_SYNC_NEW, update.GetSyncOp())
		tc.syncID.Store(update.GetSyncId())
	} else {
		tc.assert.Fail("Didn't receive sync new update")
	}

	go func() {
		for updates.Receive() {
			tc.require.NoError(updates.Err())

			update := updates.Msg()
			if update.GetSyncOp() == SyncOp_SYNC_UPDATE {
				streamID, _ := StreamIdFromBytes(update.GetStream().GetNextSyncCookie().GetStreamId())
				streamUpdates := &receivedStreamUpdates{}
				updates, _ := tc.updates.LoadOrStore(streamID, streamUpdates)
				updates.AddUpdate(update)
			}
		}
	}()
}

func (tc *testClient) SyncID() string {
	for range 50 {
		if syncID := tc.syncID.Load(); syncID != "" {
			return syncID
		}
		err := SleepWithContext(tc.ctx, 100*time.Millisecond)
		tc.require.NoError(err, "Failed to get sync ID")
	}
	tc.require.Fail("Failed to get sync ID")
	return ""
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
) (StreamId, *MiniblockRef, *SyncCookie) {
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
	}, cookie
}

func (tc *testClient) joinChannel(
	spaceId StreamId,
	channelId StreamId,
	userStreamMb *MiniblockRef,
) *MemberPayload_Membership {
	userJoin, err := MakeEnvelopeWithPayload(
		tc.wallet,
		Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			channelId,
			common.Address{},
			spaceId[:],
			nil,
		),
		userStreamMb,
	)
	tc.require.NoError(err)

	userStreamId := UserStreamIdFromAddr(tc.wallet.Address)
	tc.addEvent(userStreamId, userJoin)

	// The above add appends an event to the user's user stream. Once it reaches the node, the node will
	// create a derived membership event and add it to the channel.
	// The following returned payload content is the content of the membership event we would expect to see
	// in the channel if the user is indeed entitled to the channel, and the above event is successfully added.
	// Returning this is useful for understanding what kind of content a bot might see in the channel.
	return &MemberPayload_Membership{
		Op:               MembershipOp_SO_JOIN,
		UserAddress:      tc.wallet.Address[:],
		InitiatorAddress: tc.wallet.Address[:],
		StreamParentId:   spaceId[:],
	}
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

	tc.addEvent(channelId, envelope)
}

func (tc *testClient) sayWithSessionAndTags(
	channelId StreamId,
	message string,
	tags *Tags,
	session []byte,
	deviceKey string,
) (eventHash []byte) {
	ref := tc.getLastMiniblockHash(channelId)
	envelope, err := MakeEnvelopeWithPayloadAndTags(
		tc.wallet,
		Make_ChannelPayload_Message_WithSessionBytes(message, session, deviceKey),
		ref,
		tags,
	)
	tc.require.NoError(err)

	tc.addEvent(channelId, envelope)

	return envelope.Hash
}

func (tc *testClient) addEvent(streamId StreamId, envelope *Envelope) {
	backoff := BackoffTracker{
		NextDelay:   50 * time.Millisecond,
		MaxAttempts: 7,
		Multiplier:  2,
		Divisor:     1,
	}
	var err error
	for {
		ctx, ctxCancel := context.WithTimeout(tc.ctx, 10*time.Second)
		defer ctxCancel()
		_, err = tc.client.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
			StreamId: streamId[:],
			Event:    envelope,
		}))
		if err == nil {
			break
		}
		err = backoff.Wait(tc.ctx, err)
		if err != nil {
			break
		}
	}
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

func (tc *testClient) getAllSyncedMessages(streamId StreamId) userMessages {
	require.True(tc.t, tc.enableSync, "Sync must be enabled on the client for getAllSyncedMessages")

	updates, ok := tc.updates.Load(streamId)
	if !ok {
		tc.syncChannelFromInit(streamId)
		return userMessages{} // Return empty initially as sync starts
	}

	messages := userMessages{}
	updates.ForEachEvent(tc.t, func(e *ParsedEvent) bool {
		payload := e.GetChannelMessage()
		if payload != nil {
			messages = append(messages, usersMessage{
				userId:  crypto.PublicKeyToAddress(e.SignerPubKey),
				message: string(payload.Message.Ciphertext),
			})
		}
		return true // Continue processing events
	})

	return messages
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
				"client %s\nexpectedExtra:%v\nactualExtra:%v",
				tc.name,
				expectedExtra,
				actualExtra,
			)
		}
		if len(actualExtra) > 0 {
			tc.require.FailNow("Received unexpected messages", "actualExtra:%v", actualExtra)
		}
	}, 60*time.Second)
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
) (*StreamAndCookie, *StreamView) {
	stream := tc.getStream(streamId)
	var view *StreamView
	var err error
	view, err = MakeRemoteStreamView(stream)
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

func (tc *testClient) maybeDumpStreamView(view *StreamView) {
	if os.Getenv("RIVER_TEST_DUMP_STREAM") != "" {
		testfmt.Print(
			tc.t,
			tc.name,
			"Dumping stream view",
			"\n",
			dumpevents.DumpStreamView(view, dumpevents.DumpOpts{
				EventContent: true,
				TestMessages: true,
			}),
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
			dumpevents.DumpStream(stream, dumpevents.DumpOpts{
				EventContent: true,
				TestMessages: true,
			}),
		)
	}
}

func (tc *testClient) makeMiniblock(streamId StreamId, forceSnapshot bool, lastKnownMiniblockNum int64) *MiniblockRef {
	resp, err := tc.client.Info(tc.ctx, connect.NewRequest(&InfoRequest{
		Debug: []string{
			"make_miniblock",
			streamId.String(),
			fmt.Sprintf("%t", forceSnapshot),
			fmt.Sprintf("%d", lastKnownMiniblockNum),
		},
	}))
	tc.require.NoError(err, "client.Info make_miniblock failed")
	var hashBytes []byte
	if resp.Msg.Graffiti != "" {
		hashBytes = common.FromHex(resp.Msg.Graffiti)
	}
	num := int64(0)
	if resp.Msg.Version != "" {
		num, _ = strconv.ParseInt(resp.Msg.Version, 10, 64)
	}
	return &MiniblockRef{
		Hash: common.BytesToHash(hashBytes),
		Num:  num,
	}
}

func (tc *testClient) getMiniblocks(streamId StreamId, fromInclusive, toExclusive int64) []*MiniblockInfo {
	resp, err := tc.client.GetMiniblocks(tc.ctx, connect.NewRequest(&GetMiniblocksRequest{
		StreamId:      streamId[:],
		FromInclusive: fromInclusive,
		ToExclusive:   toExclusive,
	}))
	tc.require.NoError(err)

	mbs := make([]*MiniblockInfo, len(resp.Msg.GetMiniblocks()))
	for i, pb := range resp.Msg.GetMiniblocks() {
		mbs[i], err = NewMiniblockInfoFromProto(
			pb, resp.Msg.GetMiniblockSnapshot(fromInclusive+int64(i)),
			NewParsedMiniblockInfoOpts().
				WithExpectedBlockNumber(fromInclusive+int64(i)),
		)
		tc.require.NoError(err)
	}

	return mbs
}

func (tc *testClient) getMiniblocksByIds(streamId StreamId, ids []int64, onEachMb func(*Miniblock)) {
	resp, err := tc.node2nodeClient.GetMiniblocksByIds(tc.ctx, connect.NewRequest(&GetMiniblocksByIdsRequest{
		StreamId:     streamId[:],
		MiniblockIds: ids,
	}))
	tc.require.NoError(err)
	for resp.Receive() {
		onEachMb(resp.Msg().GetMiniblock())
	}
	tc.require.NoError(resp.Err())
	tc.require.NoError(resp.Close())
}

func (tc *testClient) addHistoryToView(
	view *StreamView,
) *StreamView {
	firstMbNum := view.Miniblocks()[0].Ref.Num
	if firstMbNum == 0 {
		return view
	}

	mbs := tc.getMiniblocks(*view.StreamId(), 0, firstMbNum)
	newView, err := view.CopyAndPrependMiniblocks(mbs)
	tc.require.NoError(err)
	return newView
}

func overAllEvents(
	require *require.Assertions,
	channel *StreamAndCookie,
	eventFilter func(*ParsedEvent) bool,
) bool {
	for _, block := range channel.Miniblocks {
		events, err := ParseEvents(block.Events)
		require.NoError(err)
		for _, event := range events {
			if eventFilter(event) {
				return true
			}
		}
	}

	for _, envelope := range channel.Events {
		event, err := ParseEvent(envelope)
		require.NoError(err)
		if eventFilter(event) {
			return true
		}
	}

	return false
}

func isKeySolicitation(
	event *ParsedEvent,
	deviceKey string,
	optionalSessionId string,
) bool {
	if payload := event.Event.GetMemberPayload(); payload != nil {
		if solicitation := payload.GetKeySolicitation(); solicitation != nil {
			if solicitation.DeviceKey == deviceKey {
				return optionalSessionId == "" || slices.Contains(solicitation.SessionIds[:], optionalSessionId)
			}
		}
	}
	return false
}

func findKeySolicitation(
	require *require.Assertions,
	channel *StreamAndCookie,
	deviceKey string,
	sessionId string,
) {
	exists := overAllEvents(
		require,
		channel,
		func(event *ParsedEvent) bool {
			return isKeySolicitation(event, deviceKey, sessionId)
		},
	)

	require.True(exists)
}

func containsKeySolicitation(
	require *require.Assertions,
	channel *StreamAndCookie,
	deviceKey string,
	sessionId string,
) bool {
	return overAllEvents(
		require, channel,
		func(event *ParsedEvent) bool {
			return isKeySolicitation(event, deviceKey, sessionId)
		},
	)
}

func (tcs testClients) waitForKeySolicitationsFrom(t *testing.T, channelId StreamId, senders testClients) {
	tcs.waitForAll(
		t,
		func(t require.TestingT, tc *testClient) {
			tc.hasKeySolicitationsFromClients(t, channelId, senders)
		},
		10*time.Second,
		1*time.Second,
	)
}

func (tcs testClients) sendSolicitationResponsesTo(channelId StreamId, receivers testClients) {
	tcs.parallelForAll(func(senderClient *testClient) {
		for _, receiverClient := range receivers {
			// senderClient sends a solicitation response to receiverClient's user inbox.
			// The response is for the receiverClient's deviceKey and concerns a session
			// identified by receiverClient.defaultSessionId for the given channelId.
			senderClient.sendSolicitationResponse(
				receiverClient.userId,                   // The user (receiver) to whom the response is addressed.
				channelId,                               // The channel context for these encryption sessions.
				receiverClient.deviceKey,                // The specific device key of the receiver this response is for.
				[]string{senderClient.defaultSessionId}, // The session ID(s) this response pertains to.
				fmt.Sprintf(
					"%s:%s",
					senderClient.defaultSessionId,
					receiverClient.deviceKey,
				),
			)
		}
	})
}

func (tc *testClient) hasKeySolicitationsFromClients(t require.TestingT, channelId StreamId, tcs testClients) {
	var updates *receivedStreamUpdates
	var ok bool
	if updates, ok = tc.updates.Load(channelId); !ok {
		tc.syncChannelFromInit(channelId)
	}

	type missingSolicitation struct {
		deviceKey string
		sessionId string
	}
	var missingSolicitations []missingSolicitation
	for _, c := range tcs {
		var found bool
		findSolicitation := func(e *ParsedEvent) bool {
			if isKeySolicitation(e, c.deviceKey, tc.defaultSessionId) {
				found = true
			}
			return !found
		}
		updates.ForEachEvent(tc.t, findSolicitation)
		if updates == nil || !found {
			missingSolicitations = append(missingSolicitations, missingSolicitation{
				deviceKey: c.deviceKey,
				sessionId: tc.defaultSessionId,
			})
		}
	}
	for _, missingSolicitation := range missingSolicitations {
		t.Errorf(
			"missing key solicitation from device(%v) for session(%v)",
			missingSolicitation.deviceKey,
			missingSolicitation.sessionId,
		)
	}
}

func (tc *testClient) requireKeySolicitation(channelId StreamId, deviceKey string, sessionId string) {
	tc.eventually(func(tc *testClient) {
		channel := tc.getStream(channelId)
		findKeySolicitation(tc.require, channel, deviceKey, sessionId)
	})
}

func (tc *testClient) requireNoKeySolicitation(
	channelId StreamId,
	deviceKey string,
	waitTime time.Duration,
	tick time.Duration,
) {
	tc.require.Never(func() bool {
		channel := tc.getStream(channelId)
		return containsKeySolicitation(tc.require, channel, deviceKey, "")
	}, waitTime, tick, "Expected no key solicitation for device in channel")
}

func (tc *testClient) solicitKeys(
	channelId StreamId,
	deviceKey string,
	fallbackKey string,
	isNewDevice bool,
	sessionIds []string,
) *MemberPayload_KeySolicitation {
	payload := Make_MemberPayload_KeySolicitation(deviceKey, fallbackKey, isNewDevice, sessionIds)
	envelope, err := MakeEnvelopeWithPayload(
		tc.wallet,
		payload,
		tc.getLastMiniblockHash(channelId),
	)
	tc.require.NoError(err)
	tc.addEvent(channelId, envelope)
	return payload.MemberPayload.GetKeySolicitation()
}

func (tc *testClient) sendSolicitationResponse(
	user common.Address,
	channelId StreamId,
	deviceKey string,
	sessionIds []string,
	ciphertexts string,
) {
	userInboxStreamId := UserInboxStreamIdFromAddress(user)
	lastMb := tc.getLastMiniblockHash(userInboxStreamId)

	event, err := MakeEnvelopeWithPayload(
		tc.wallet,
		Make_UserInboxPayload_GroupEncryptionSessions(
			channelId,
			sessionIds,
			map[string]string{deviceKey: ciphertexts},
		),
		lastMb,
	)
	tc.require.NoError(err)
	tc.addEvent(userInboxStreamId, event)
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
			tc.sayWithSessionAndTags(
				channelId,
				msg,
				nil,
				tc.wallet.Address[:6],
				tc.deviceKey,
			)
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

// createChannelAndJoin creates a channel and joins all clients to it.
// The first client is the creator of both the space and the channel.
// Other clients join the channel.
// Clients are connected to nodes in a round-robin fashion.
func (tcs testClients) createChannelAndJoin(spaceId StreamId) (StreamId, *SyncCookie) {
	alice := tcs[0]
	channelId, _, syncCookie := alice.createChannel(spaceId)

	tcs[1:].parallelForAll(func(tc *testClient) {
		userLastMb := tc.getLastMiniblockHash(tc.userStreamId)
		tc.joinChannel(spaceId, channelId, userLastMb)
	})

	tcs.requireMembership(channelId)

	tcs.parallelForAll(func(tc *testClient) {
		tc.syncChannel(syncCookie)
	})

	tcs.requireSubscribed(channelId)

	return channelId, syncCookie
}

func (tcs testClients) joinChannel(
	spaceId StreamId,
	channelId StreamId,
	channelSyncCookie *SyncCookie,
	extraMembers testClients,
) {
	tcs.parallelForAll(func(tc *testClient) {
		userLastMb := tc.getLastMiniblockHash(tc.userStreamId)
		tc.joinChannel(spaceId, channelId, userLastMb)
	})

	userIds := tcs.userIds()
	if extraMembers != nil {
		userIds = append(userIds, extraMembers.userIds()...)
	}

	tcs.requireMembership(channelId, userIds)

	tcs.parallelForAll(func(tc *testClient) {
		tc.syncChannel(channelSyncCookie)
	})

	tcs.requireSubscribed(channelId)
}

func (tcs testClients) compareNowImpl(
	t require.TestingT,
	streamId StreamId,
	miniBlockChain bool,
	syncUpdates bool,
) []*StreamAndCookie {
	assert := assert.New(t)
	success := true
	var streams []*StreamAndCookie

	if miniBlockChain {
		streamC := make(chan *StreamAndCookie, len(tcs))
		tcs.parallelForAllT(t, func(tc *testClient) {
			streamC <- tc.getStream(streamId)
		})

		for range tcs {
			streams = append(streams, <-streamC)
		}
		if false /*testfmt.Enabled()*/ {
			testfmt.Println(tcs[0].t, "compareNowImpl: Got all streams")
			for i, stream := range streams {
				testfmt.Println(
					tcs[0].t,
					"    ",
					i,
					"MBs:",
					len(stream.Miniblocks),
					"Gen:",
					stream.NextSyncCookie.MinipoolGen,
					"Events:",
					len(stream.Events),
				)
			}
		}
		first := streams[0]
		for i, stream := range streams[1:] {
			success = success && assert.Equal(
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
		}
	}

	if success && syncUpdates {
		firstClient := tcs[0]
	LOOP:
		for i, client := range tcs[1:] {
			if !client.enableSync {
				continue
			}

			if !firstClient.enableSync {
				firstClient = client
				continue
			}

			f, _ := firstClient.updates.Load(streamId)
			c, _ := client.updates.Load(streamId)

			firstUpdates := f.Clone()
			clientUpdates := c.Clone()

			success = success && assert.Equal(len(firstUpdates), len(clientUpdates))

			for j, first := range firstUpdates {
				if !success {
					break LOOP
				}

				clientUpdate := clientUpdates[j]

				success = success && assert.Equal(
					first.GetSyncOp(), clientUpdate.GetSyncOp(),
					"sync op not matching [%d:%d]: %s / %s",
					i+1, j,
					first.GetSyncOp(),
					clientUpdate.GetSyncOp())

				success = success && assert.Equal(
					first.GetStreamId(), clientUpdate.GetStreamId(),
					"different stream id [%d:%d]: %x / %x",
					i+1, j,
					first.GetStreamId(),
					clientUpdate.GetStreamId())

				success = success && assert.Equal(
					first.GetStream().GetSyncReset(),
					clientUpdate.GetStream().GetSyncReset(),
					"sync reset differs [%d:%d]: %v / %v",
					i+1, j,
					first.GetStream().GetSyncReset(),
					clientUpdate.GetStream().GetSyncReset())

				success = success && assert.Equal(
					first.GetStream().GetNextSyncCookie().GetMinipoolGen(),
					clientUpdate.GetStream().GetNextSyncCookie().GetMinipoolGen(),
					"minipool gen differs [%d:%d]: %d / %d",
					i+1, j,
					first.GetStream().GetNextSyncCookie().GetMinipoolGen(),
					clientUpdate.GetStream().GetNextSyncCookie().GetMinipoolGen())

				success = success && assert.Equal(
					first.GetStream().GetNextSyncCookie().GetPrevMiniblockHash(),
					clientUpdate.GetStream().GetNextSyncCookie().GetPrevMiniblockHash(),
					"prev miniblock hash differs [%d:%d]: %x / %x",
					i+1, j,
					first.GetStream().GetNextSyncCookie().GetPrevMiniblockHash(),
					clientUpdate.GetStream().GetNextSyncCookie().GetPrevMiniblockHash())
			}
		}
	}

	if !success {
		return streams
	}
	return nil
}

func (tcs testClients) compare(streamId StreamId, miniBlockChain bool, sync bool) {
	if len(tcs) < 2 {
		panic("need at least 2 clients to compare")
	}
	var streams []*StreamAndCookie
	success := tcs[0].assert.EventuallyWithT(func(t *assert.CollectT) {
		streams = tcs.compareNowImpl(t, streamId, miniBlockChain, sync)
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

// attemptRunOnAll performs one attempt to run f on all clients
// and returns true if all succeeded, false otherwise, along with any errors.
func (tcs testClients) attemptRunOnAll(f func(require.TestingT, *testClient)) (bool, []error) {
	collects := make([]*collectT, len(tcs))
	for i := range tcs {
		collects[i] = &collectT{} // Each client gets its own error collector for this attempt
	}

	var wg sync.WaitGroup
	wg.Add(len(tcs))

	for i, tc := range tcs {
		go func(clientIdx int, currentClient *testClient) {
			defer wg.Done()
			// The function f will use collects[clientIdx] via withRequireFor
			f(collects[clientIdx], currentClient)
		}(i, tc)
	}

	wg.Wait() // Wait for all goroutines for this attempt to complete

	allSucceededThisAttempt := true
	var allErrorsThisAttempt []error
	for _, collector := range collects {
		if collector.Failed() {
			allSucceededThisAttempt = false
			allErrorsThisAttempt = append(allErrorsThisAttempt, collector.errors...)
		}
	}
	return allSucceededThisAttempt, allErrorsThisAttempt
}

// waitForAll repeatedly executes the function f on all testClients in parallel.
// It checks for success at each checkInterval. If f succeeds for all clients
// in any given attempt, waitForAll returns. If maxWaitDuration is reached
// without a fully successful attempt, it fails the test t with the errors
// from the last attempt.
func (tcs testClients) waitForAll(
	t require.TestingT,
	f func(require.TestingT, *testClient),
	maxWaitDuration time.Duration,
	checkInterval time.Duration,
) {
	if len(tcs) == 0 {
		return // Nothing to wait for
	}

	if checkInterval <= 0 {
		t.Errorf("waitForAll: checkInterval must be positive, got %v", checkInterval)
		t.FailNow()
		return
	}

	timeout := time.NewTimer(maxWaitDuration)
	defer timeout.Stop()

	ticker := time.NewTicker(checkInterval)
	defer ticker.Stop()

	var lastErrors []error

	// Perform the first check immediately
	allSucceeded, currentErrors := tcs.attemptRunOnAll(f)
	lastErrors = currentErrors
	if allSucceeded {
		return
	}

	// If the first check failed and maxWaitDuration is very short,
	// ensure we don't miss the timeout before the first tick.
	// This select handles both timeout and subsequent ticks.
	for {
		select {
		case <-timeout.C:
			// Timeout reached
			t.Errorf("waitForAll timed out after %v. Last errors from final attempt:", maxWaitDuration)
			if len(lastErrors) == 0 {
				t.Errorf(
					" (No specific errors reported in the final attempt, but condition was not met across all clients)",
				)
			} else {
				for _, err := range lastErrors {
					t.Errorf("  - %v", err) // Indent errors for clarity
				}
			}
			t.FailNow()
			return // Should be unreachable due to FailNow
		case <-ticker.C:
			// Time for another check
			allSucceeded, currentErrors = tcs.attemptRunOnAll(f)
			lastErrors = currentErrors // Store errors from this latest attempt

			if allSucceeded {
				return // Success!
			}
			// Continue loop to wait for next tick or timeout
		}
	}
}

func (tc *testClient) clearUpdatesForChannel(streamId StreamId) {
	// Store a new empty updates object
	tc.updates.Store(streamId, &receivedStreamUpdates{})
}

func (tcs testClients) clearUpdatesForChannel(streamId StreamId) {
	tcs.parallelForAll(func(tc *testClient) { tc.clearUpdatesForChannel(streamId) })
}

func (tc *testClient) createMetadataStream(i uint64) {
	streamId := MetadataStreamIdFromShard(i)
	resp, err := tc.rpcClient().CreateMetadataStream(tc.ctx, streamId)
	tc.require.NoError(err)
	tc.require.Equal(streamId, StreamId(resp.Msg.Stream.NextSyncCookie.StreamId))
}

func (tc *testClient) rpcClient() *rpc_client.RpcClient {
	return rpc_client.NewRpcClient(tc.wallet, tc.client)
}
