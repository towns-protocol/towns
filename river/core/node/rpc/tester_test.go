package rpc_test

import (
	"context"
	"fmt"
	"net"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
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

type serviceTester struct {
	ctx     context.Context
	cancel  context.CancelFunc
	require *require.Assertions
	dbUrl   string
	btc     *crypto.BlockchainTestContext
	nodes   []*testNodeRecord
}

func newServiceTester(numNodes int, require *require.Assertions) *serviceTester {
	st := &serviceTester{
		require: require,
		dbUrl:   dbtestutils.GetTestDbUrl(),
		nodes:   make([]*testNodeRecord, numNodes),
	}
	st.ctx, st.cancel = context.WithCancel(test.NewTestContext())

	btc, err := crypto.NewBlockchainTestContext(st.ctx, numNodes)
	require.NoError(err)
	st.btc = btc

	for i := 0; i < numNodes; i++ {
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

	return st
}

func (st *serviceTester) Close() {
	for _, node := range st.nodes {
		if node != nil {
			if node.service != nil {
				node.service.Close()
			}
			if node.address != (common.Address{}) {
				_ = dbtestutils.DeleteTestSchema(st.ctx, st.dbUrl, storage.DbSchemaNameFromAddress(node.address.String()))
			}
		}
	}
	if st.btc != nil {
		st.btc.Close()
	}
	if st.cancel != nil {
		st.cancel()
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

func (st *serviceTester) startNodes(start, stop int) {
	for i := start; i < stop; i++ {
		cfg := &config.Config{
			DisableBaseChain: true,
			RegistryContract: st.btc.RegistryConfig(),
			Database:         config.DatabaseConfig{Url: st.dbUrl},
			StorageType:      "postgres",
			Stream: config.StreamConfig{
				Media: config.MediaStreamConfig{
					MaxChunkCount: 100,
					MaxChunkSize:  1000000,
				},
				RecencyConstraints: config.RecencyConstraintsConfig{
					AgeSeconds:  11,
					Generations: 5,
				},
			},
		}

		bc := st.btc.GetBlockchain(st.ctx, i, true)
		service, err := rpc.StartServer(st.ctx, cfg, bc, st.nodes[i].listener)
		st.require.NoError(err)
		st.nodes[i].service = service
		st.nodes[i].address = bc.Wallet.Address
	}
}

func (st *serviceTester) testClient(i int) protocolconnect.StreamServiceClient {
	return testClient(st.nodes[i].url)
}

func testClient(url string) protocolconnect.StreamServiceClient {
	return protocolconnect.NewStreamServiceClient(nodes.TestHttpClientMaker(), url, connect.WithGRPCWeb())
}

func createTestServerAndClient(
	ctx context.Context,
	numNodes int,
	require *require.Assertions,
) (protocolconnect.StreamServiceClient, string, func()) {
	st := newServiceTester(numNodes, require)
	st.initNodeRecords(0, numNodes, contracts.NodeStatus_Operational)
	st.startNodes(0, numNodes)
	url := st.nodes[0].url
	return testClient(url), url, st.Close
}
