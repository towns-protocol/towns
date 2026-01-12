package rpc

import (
	"context"
	"crypto/sha256"
	"fmt"
	"maps"
	"math"
	"slices"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes/streamplacement"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

// TestStreamsToNodeAssignment ensures that streams are evenly distributed over the nodes
// from a green state or from representative live environment.
func TestStreamsToNodeAssignment(t *testing.T) {
	t.Parallel()

	t.Run("GreenState", testStreamDistributionFromGreenState)

	t.Run("Alpha", func(t *testing.T) {
		t.Skip("run manually :: requires live environment Alpha")

		ctx, cancel := context.WithCancel(t.Context())
		defer cancel()

		cfg := config.GetDefaultConfig()
		cfg.RiverChain.NetworkUrl = "https://testnet.rpc.towns.com/http"
		cfg.RiverChain.ChainId = 6524490
		cfg.RiverChain.BlockTimeMs = 2000
		cfg.RegistryContract.Address = common.HexToAddress("0x44354786eacbebf981453a05728e1653bc3c5def")

		blockchain, err := crypto.NewBlockchain(
			ctx,
			&cfg.RiverChain,
			nil,
			infra.NewMetricsFactory(nil, "towns", "test"),
			nil,
		)
		require.NoError(t, err)
		defer blockchain.Close()

		riverContract, err := registries.NewRiverRegistryContract(
			ctx, blockchain, &cfg.RegistryContract, &cfg.RiverRegistry)
		require.NoError(t, err)

		testDistributionWithStateFromEnv(t, blockchain, riverContract, 2, 0)
	})

	t.Run("Omega", func(t *testing.T) {
		t.Skip("run manually :: requires live environment Omega")

		ctx, cancel := context.WithCancel(t.Context())
		defer cancel()

		cfg := config.GetDefaultConfig()
		cfg.RiverChain.NetworkUrl = "https://mainnet.rpc.towns.com/http"
		cfg.RiverChain.ChainId = 550
		cfg.RiverChain.BlockTimeMs = 2000
		cfg.RegistryContract.Address = common.HexToAddress("0x1298c03Fde548dc433a452573E36A713b38A0404")

		blockchain, err := crypto.NewBlockchain(
			ctx,
			&cfg.RiverChain,
			nil,
			infra.NewMetricsFactory(nil, "towns", "test"),
			nil,
		)
		require.NoError(t, err)
		defer blockchain.Close()

		riverContract, err := registries.NewRiverRegistryContract(
			ctx, blockchain, &cfg.RegistryContract, &cfg.RiverRegistry)
		require.NoError(t, err)

		testDistributionWithStateFromEnv(t, blockchain, riverContract, 2, 10)
	})
}

// testDistributionWithStateFromEnv loads the distributor initial state from a
// live environment before starting assigning new streams.
func testDistributionWithStateFromEnv(
	t *testing.T,
	blockchain *crypto.Blockchain,
	riverRegistry *registries.RiverRegistryContract,
	extraCandidatesCount uint64,
	newNodesCount int,
) {
	var (
		ctx, cancel       = context.WithCancel(t.Context())
		require           = require.New(t)
		streamID          StreamId
		replFactor        = 3
		streamsToAllocate = 5_000_000
	)
	defer cancel()

	allNodes, err := riverRegistry.GetAllNodes(ctx, blockchain.InitialBlockNum)
	require.NoError(err)

	blockNumber, err := blockchain.GetBlockNumber(ctx)
	require.NoError(err)

	mockCfg := &mocks.MockOnChainCfg{
		Settings: &crypto.OnChainSettings{
			FromBlockNumber: blockNumber,
			StreamDistribution: crypto.StreamDistribution{
				ExtraCandidatesCount: extraCandidatesCount,
			},
		},
	}

	distributor, err := streamplacement.NewDistributor(
		ctx,
		mockCfg,
		blockNumber,
		blockchain.ChainMonitor,
		riverRegistry,
	)
	require.NoError(err)

	distributorSim := distributor.(streamplacement.DistributorSimulator)

	initialStreamCount := 0
	initialNodeStreamCount := make(map[common.Address]uint64)
	for _, node := range allNodes {
		count, err := riverRegistry.StreamRegistry.GetStreamCountOnNode(
			ctx,
			blockchain.InitialBlockNum,
			node.NodeAddress,
		)
		require.NoError(err)
		initialNodeStreamCount[node.NodeAddress] = uint64(count)
		initialStreamCount += int(count)
	}
	distributorSim.SetNodeStreamLoad(initialNodeStreamCount)

	streamCount := distributorSim.NodeStreamCount()
	addresses := slices.Collect(maps.Keys(streamCount))
	slices.SortFunc(addresses, func(a, b common.Address) int {
		return a.Cmp(b)
	})

	var wallets []common.Address
	for range newNodesCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err)
		wallets = append(wallets, wallet.Address)
	}

	if testfmt.Enabled() {
		fmt.Printf("nodes")
		for _, addr := range addresses {
			fmt.Printf(",%s", addr.Hex())
		}
		for _, wallet := range wallets {
			fmt.Printf(",%s", wallet.Hex())
		}
		fmt.Println()
	}

	// add new streams and ensure that the streams are eventually distributs evenly over the nodes
	for i := range streamsToAllocate {
		b := sha256.Sum256(streamID[:])
		b[0] = STREAM_CHANNEL_BIN
		streamID, err = StreamIdFromBytes(b[:STREAM_ID_BYTES_LENGTH])
		require.NoError(err)

		nodes, err := distributor.ChooseStreamNodes(ctx, streamID, replFactor)
		require.NoError(err)

		uniqueNodes := make(map[common.Address]struct{})
		for _, node := range nodes {
			uniqueNodes[node] = struct{}{}
		}
		require.Equal(replFactor, len(uniqueNodes), "expected stream to be place on repl factor unique nodes")

		for _, node := range nodes {
			distributorSim.AssignStreamToNode(node)
		}

		if i%75_000 == 0 && len(wallets) > 0 {
			distributorSim.AddNewNode(wallets[0], wallets[0])
			addresses = append(addresses, wallets[0])
			wallets = wallets[1:]
		}

		if testfmt.Enabled() {
			if i%100_000 == 0 {
				streamCount := distributorSim.NodeStreamCount()
				fmt.Printf("%d", i)
				for _, node := range addresses {
					fmt.Printf(",%d", streamCount[node])
				}
				for range wallets {
					fmt.Printf(",0")
				}
				fmt.Println()
			}
		}
	}

	if testfmt.Enabled() {
		lastStreamCount := distributorSim.NodeStreamCount()
		fmt.Printf("%d", streamsToAllocate)
		for _, node := range addresses {
			fmt.Printf(",%d", lastStreamCount[node])
		}
		fmt.Println()
	}

	ensureStreamDistributionIsEven(t, require, distributorSim.NodeStreamCount())
}

// testStreamDistributionFromGreenState ensure that new streams are distributed evenly over the nodes
// from a fresh state.
func testStreamDistributionFromGreenState(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{
		numNodes:  25,
		start:     true,
		btcParams: &crypto.TestParams{NumOperators: 6, AutoMine: true},
	})

	cfg := tt.getConfig()
	riverContract, err := registries.NewRiverRegistryContract(
		tt.ctx,
		tt.btc.DeployerBlockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	tt.require.NoError(err)

	blockNumber, err := tt.btc.DeployerBlockchain.GetBlockNumber(t.Context())
	tt.require.NoError(err)

	distributor, err := streamplacement.NewDistributor(
		t.Context(),
		tt.btc.OnChainConfig,
		blockNumber,
		tt.btc.DeployerBlockchain.ChainMonitor,
		riverContract,
	)
	tt.require.NoError(err)

	var (
		distributorSim    = distributor.(streamplacement.DistributorSimulator)
		streamID          StreamId
		streamsToAllocate = 1_000_000
		replFactor        = 3
	)

	for range streamsToAllocate {
		b := sha256.Sum256(streamID[:])
		b[0] = STREAM_CHANNEL_BIN
		streamID, err = StreamIdFromBytes(b[:STREAM_ID_BYTES_LENGTH])
		tt.require.NoError(err)

		nodes, err := distributor.ChooseStreamNodes(tt.ctx, streamID, replFactor)
		tt.require.NoError(err)

		// simulate stream registration
		for _, node := range nodes {
			distributorSim.AssignStreamToNode(node)
		}

		// ensure that stream is assigned to unique nodes
		uniqueNodes := make(map[common.Address]struct{})
		for _, node := range nodes {
			uniqueNodes[node] = struct{}{}
		}
		tt.require.Len(uniqueNodes, replFactor, "expected stream to be place on repl factor unique nodes")
	}

	ensureStreamDistributionIsEven(t, tt.require, distributorSim.NodeStreamCount())
}

func ensureStreamDistributionIsEven(
	t *testing.T,
	require *require.Assertions,
	nodeStreamCount map[common.Address]int64,
) {
	// make sure that the node with the least and node with the most streams are not too far apart
	minStreams := int64(math.MaxInt64)
	maxStreams := int64(math.MinInt64)

	for node, count := range nodeStreamCount {
		testfmt.Printf(t, "node %s has %d streams\n", node, count)

		minStreams = min(minStreams, count)
		maxStreams = max(maxStreams, count)
	}

	// ensure that the min and max nodes don't have more than 10% difference in stream count
	require.GreaterOrEqual((110*minStreams)/100, maxStreams, "streams not evenly distributed")
}

// TestRequiredOperators ensures that when required operators are configured,
// at least one node from a required operator is included in each stream placement.
func TestRequiredOperators(t *testing.T) {
	tests := []struct {
		name                     string
		numRequiredOperators     int
		expectRequiredConstraint bool
	}{
		{
			name:                     "0 required operators",
			numRequiredOperators:     0,
			expectRequiredConstraint: false,
		},
		{
			name:                     "1 required operator",
			numRequiredOperators:     1,
			expectRequiredConstraint: true,
		},
		{
			name:                     "2 required operators",
			numRequiredOperators:     2,
			expectRequiredConstraint: true,
		},
		{
			name:                     "3 required operators",
			numRequiredOperators:     3,
			expectRequiredConstraint: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tt := newServiceTester(t, serviceTesterOpts{
				numNodes:  20,
				start:     true,
				btcParams: &crypto.TestParams{NumOperators: 5, AutoMine: true},
			})

			cfg := tt.getConfig()
			riverContract, err := registries.NewRiverRegistryContract(
				tt.ctx,
				tt.btc.DeployerBlockchain,
				&cfg.RegistryContract,
				&cfg.RiverRegistry,
			)
			tt.require.NoError(err)

			blockNumber, err := tt.btc.DeployerBlockchain.GetBlockNumber(t.Context())
			tt.require.NoError(err)

			// Get all nodes to find their operators
			allNodes, err := riverContract.GetAllNodes(tt.ctx, blockNumber)
			tt.require.NoError(err)

			// Build a map of operator to their nodes
			operatorNodes := make(map[common.Address][]common.Address)
			for _, node := range allNodes {
				operatorNodes[node.Operator] = append(operatorNodes[node.Operator], node.NodeAddress)
			}

			// Pick the specified number of operators to be "required"
			var requiredOperators []common.Address
			for op := range operatorNodes {
				if len(requiredOperators) >= tc.numRequiredOperators {
					break
				}
				requiredOperators = append(requiredOperators, op)
			}

			// Build set of nodes belonging to required operators
			requiredOperatorNodes := make(map[common.Address]struct{})
			for _, op := range requiredOperators {
				for _, node := range operatorNodes[op] {
					requiredOperatorNodes[node] = struct{}{}
				}
			}

			mockCfg := &mocks.MockOnChainCfg{
				Settings: &crypto.OnChainSettings{
					FromBlockNumber: blockNumber,
					StreamDistribution: crypto.StreamDistribution{
						ExtraCandidatesCount: 1,
						RequiredOperators:    requiredOperators,
					},
				},
			}

			distributor, err := streamplacement.NewDistributor(
				t.Context(),
				mockCfg,
				blockNumber,
				tt.btc.DeployerBlockchain.ChainMonitor,
				riverContract,
			)
			tt.require.NoError(err)

			var (
				distributorSim    = distributor.(streamplacement.DistributorSimulator)
				streamID          StreamId
				streamsToAllocate = 10_000
				replFactor        = 3
			)

			for i := range streamsToAllocate {
				b := sha256.Sum256(streamID[:])
				b[0] = STREAM_CHANNEL_BIN
				streamID, err = StreamIdFromBytes(b[:STREAM_ID_BYTES_LENGTH])
				tt.require.NoError(err)

				nodes, err := distributor.ChooseStreamNodes(tt.ctx, streamID, replFactor)
				tt.require.NoError(err)

				// Verify at least one node is from a required operator (when configured)
				if tc.expectRequiredConstraint {
					hasRequiredOperatorNode := false
					for _, node := range nodes {
						if _, isRequired := requiredOperatorNodes[node]; isRequired {
							hasRequiredOperatorNode = true
							break
						}
					}
					tt.require.True(hasRequiredOperatorNode,
						"stream %d placement must include at least one node from a required operator", i)
				}

				// simulate stream registration
				for _, node := range nodes {
					distributorSim.AssignStreamToNode(node)
				}
			}

			// Verify streams are evenly distributed (only when no required operators)
			// With required operators, distribution is intentionally skewed toward those nodes
			if !tc.expectRequiredConstraint {
				ensureStreamDistributionIsEven(t, tt.require, distributorSim.NodeStreamCount())
			}
		})
	}
}

// TestRequiredOperatorsGracefulDegradation ensures that when required operators are configured
// but none have operational nodes, stream placement proceeds normally without error.
func TestRequiredOperatorsGracefulDegradation(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{
		numNodes:  10,
		start:     true,
		btcParams: &crypto.TestParams{NumOperators: 3, AutoMine: true},
	})

	cfg := tt.getConfig()
	riverContract, err := registries.NewRiverRegistryContract(
		tt.ctx,
		tt.btc.DeployerBlockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	tt.require.NoError(err)

	blockNumber, err := tt.btc.DeployerBlockchain.GetBlockNumber(t.Context())
	tt.require.NoError(err)

	// Configure a non-existent operator as required
	nonExistentOperator := common.HexToAddress("0x1234567890123456789012345678901234567890")

	mockCfg := &mocks.MockOnChainCfg{
		Settings: &crypto.OnChainSettings{
			FromBlockNumber: blockNumber,
			StreamDistribution: crypto.StreamDistribution{
				ExtraCandidatesCount: 1,
				RequiredOperators:    []common.Address{nonExistentOperator},
			},
		},
	}

	distributor, err := streamplacement.NewDistributor(
		t.Context(),
		mockCfg,
		blockNumber,
		tt.btc.DeployerBlockchain.ChainMonitor,
		riverContract,
	)
	tt.require.NoError(err)

	var (
		streamID   StreamId
		replFactor = 3
	)

	// Should succeed without error even though required operator has no nodes
	b := sha256.Sum256(streamID[:])
	b[0] = STREAM_CHANNEL_BIN
	streamID, err = StreamIdFromBytes(b[:STREAM_ID_BYTES_LENGTH])
	tt.require.NoError(err)

	nodes, err := distributor.ChooseStreamNodes(tt.ctx, streamID, replFactor)
	tt.require.NoError(err)
	tt.require.Len(nodes, replFactor, "should still return replFactor nodes")
}
