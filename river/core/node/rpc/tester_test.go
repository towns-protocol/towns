package rpc_test

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"net"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/rpc"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
	"github.com/stretchr/testify/require"
)

type testNodeRecord struct {
	listener net.Listener
	url      string
	service  *rpc.Service
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

	btc, err := crypto.NewBlockchainTestContext(st.ctx, opts.numNodes, true)
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

	pendingTx, err := st.btc.DeployerBlockchain.TxPool.Submit(ctx, "SetReplicationFactor",
		func(opt *bind.TransactOpts) (*types.Transaction, error) {
			return btc.Configuration.SetConfiguration(
				opt,
				crypto.StreamReplicationFactorConfigKey.ID(),
				0,
				crypto.ABIEncodeUint64(uint64(opts.replicationFactor)),
			)
		})

	require.NoError(err, "unable to set stream replication factor")
	receipt := <-pendingTx.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt.Status, "set stream replication factor tx failed")

	if opts.start {
		st.initNodeRecords(0, opts.numNodes, contracts.NodeStatus_Operational)
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
	service, err := rpc.StartServer(st.ctx, cfg, bc, listener)
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
