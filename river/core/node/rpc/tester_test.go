package rpc

import (
	"context"
	"fmt"
	"hash/fnv"
	"log"
	"math/big"
	"net"
	"slices"
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
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
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
	ctx     context.Context
	t       *testing.T
	require *require.Assertions
	dbUrl   string
	btc     *crypto.BlockchainTestContext
	nodes   []*testNodeRecord
	opts    serviceTesterOpts
}

type serviceTesterOpts struct {
	numNodes          int
	replicationFactor int
	start             bool
}

func newServiceTester(t *testing.T, opts serviceTesterOpts) *serviceTester {
	t.Parallel()

	if opts.numNodes <= 0 {
		panic("numNodes must be greater than 0")
	}

	if opts.replicationFactor <= 0 {
		opts.replicationFactor = 1
	}

	ctx, ctxCancel := test.NewTestContext()
	t.Cleanup(ctxCancel)

	require := require.New(t)

	st := &serviceTester{
		ctx:     ctx,
		t:       t,
		require: require,
		dbUrl:   dbtestutils.GetTestDbUrl(),
		nodes:   make([]*testNodeRecord, opts.numNodes),
		opts:    opts,
	}

	btc, err := crypto.NewBlockchainTestContext(
		st.ctx,
		crypto.TestParams{NumKeys: opts.numNodes, MineOnTx: true, AutoMine: true},
	)
	require.NoError(err)
	st.btc = btc
	t.Cleanup(st.btc.Close)

	for i := 0; i < opts.numNodes; i++ {
		st.nodes[i] = &testNodeRecord{}

		// This is a hack to get the port number of the listener
		// so we can register it in the contract before starting
		// the server
		listener, err := net.Listen("tcp", "localhost:0")
		require.NoError(err)
		st.nodes[i].listener = listener

		port := listener.Addr().(*net.TCPAddr).Port

		st.nodes[i].url = fmt.Sprintf("http://localhost:%d", port)
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

func (st serviceTester) CloseNode(i int) {
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

	cfg := &config.Config{
		DisableBaseChain: true,
		DisableHttps:     true,
		RegistryContract: st.btc.RegistryConfig(),
		Database: config.DatabaseConfig{
			Url:          st.dbUrl,
			StartupDelay: 2 * time.Millisecond,
		},
		StorageType: "postgres",
		Network: config.NetworkConfig{
			NumRetries: 3,
		},
		ShutdownTimeout: 2 * time.Millisecond,
	}

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

	bc := st.btc.GetBlockchain(st.ctx, i)
	service, err := StartServer(st.ctx, cfg, bc, listener)
	if err != nil {
		if service != nil {
			// Sanity check
			panic("service should be nil")
		}
		return err
	}

	st.nodes[i].service = service
	st.nodes[i].address = bc.Wallet.Address

	st.t.Cleanup(func() {
		st.nodes[i].Close(st.ctx, st.dbUrl)
	})

	return nil
}

func (st *serviceTester) testClient(i int) protocolconnect.StreamServiceClient {
	return testClient(st.nodes[i].url)
}

func testClient(url string) protocolconnect.StreamServiceClient {
	return protocolconnect.NewStreamServiceClient(nodes.TestHttpClientMaker(), url, connect.WithGRPCWeb())
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
