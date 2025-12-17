//go:build integration

// Package metadata provides multi-node CometBFT consensus tests for metadata shards.
//
// These tests set up 4 MetadataShard instances running full CometBFT nodes that
// communicate via P2P networking to reach consensus on blocks. Transactions are
// submitted through the CometBFT mempool interface (SubmitTx) and blocks are
// produced through the consensus protocol.
//
// Run with: go test -tags=integration -timeout=5m ./node/metadata/...
//
// Requirements:
// - PostgreSQL running on port 5433
// - Ports 26700-26703 available for P2P networking
// - Sufficient time for CometBFT P2P connection establishment (~10-30s)
//
// Note: CometBFT P2P networking in localhost environments can be slow to establish.
// The tests may need longer timeouts (up to several minutes) for all nodes to
// connect and begin producing blocks. If tests timeout waiting for height, try
// increasing the P2P wait time or running fewer tests at once.
package metadata

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/cometbft/cometbft/crypto/ed25519"
	cmttypes "github.com/cometbft/cometbft/types"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	nodespkg "github.com/towns-protocol/towns/core/node/nodes"
	prot "github.com/towns-protocol/towns/core/node/protocol"
	protocolconnect "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

const (
	numShardInstances = 4
	multiTestShardID  = uint64(9)
	baseP2PPort       = 26700
)

// multiInstanceRegistry implements nodespkg.NodeRegistry for testing with multiple instances.
type multiInstanceRegistry struct {
	nodes map[common.Address]*nodespkg.NodeRecord
}

func newMultiInstanceRegistry(addrs []common.Address) *multiInstanceRegistry {
	registry := &multiInstanceRegistry{
		nodes: make(map[common.Address]*nodespkg.NodeRecord),
	}
	for i, addr := range addrs {
		registry.nodes[addr] = nodespkg.NewNodeRecordForTest(addr, i+1)
	}
	return registry
}

func (r *multiInstanceRegistry) GetNode(address common.Address) (*nodespkg.NodeRecord, error) {
	if record, ok := r.nodes[address]; ok {
		return record, nil
	}
	return nil, base.RiverError(prot.Err_NOT_FOUND, "node not found", "address", address)
}

func (r *multiInstanceRegistry) GetNodeByPermanentIndex(index int32) (*nodespkg.NodeRecord, error) {
	for _, record := range r.nodes {
		if record.PermanentIndex() == int(index) {
			return record, nil
		}
	}
	return nil, base.RiverError(prot.Err_NOT_FOUND, "node not found", "index", index)
}

func (r *multiInstanceRegistry) GetAllNodes() []*nodespkg.NodeRecord {
	nodes := make([]*nodespkg.NodeRecord, 0, len(r.nodes))
	for _, node := range r.nodes {
		nodes = append(nodes, node)
	}
	return nodes
}

func (r *multiInstanceRegistry) GetStreamServiceClientForAddress(
	common.Address,
) (protocolconnect.StreamServiceClient, error) {
	return nil, base.RiverError(prot.Err_INTERNAL, "not implemented")
}

func (r *multiInstanceRegistry) GetNodeToNodeClientForAddress(
	common.Address,
) (protocolconnect.NodeToNodeClient, error) {
	return nil, base.RiverError(prot.Err_INTERNAL, "not implemented")
}

func (r *multiInstanceRegistry) GetValidNodeAddresses() []common.Address {
	addrs := make([]common.Address, 0, len(r.nodes))
	for addr := range r.nodes {
		addrs = append(addrs, addr)
	}
	return addrs
}

func (r *multiInstanceRegistry) IsOperator(common.Address) bool {
	return false
}

// multiNodeTestEnv holds multiple MetadataShard instances running full CometBFT nodes.
type multiNodeTestEnv struct {
	ctx       context.Context
	cancel    context.CancelFunc
	t         *testing.T
	shards    []*MetadataShard
	stores    []*storage.PostgresMetadataShardStore
	wallets   []*crypto.Wallet
	registry  *multiInstanceRegistry
	nodeAddrs []common.Address
}

// setupMultiNodeCometBFTTest creates numShardInstances MetadataShard instances
// running full CometBFT nodes connected via P2P for consensus.
func setupMultiNodeCometBFTTest(t *testing.T) *multiNodeTestEnv {
	t.Helper()
	ctx, cancel := context.WithCancel(test.NewTestContext(t))

	// Create wallets for all nodes
	wallets := make([]*crypto.Wallet, numShardInstances)
	nodeAddrs := make([]common.Address, numShardInstances)
	for i := range numShardInstances {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(t, err, "failed to create wallet %d", i)
		wallets[i] = wallet
		nodeAddrs[i] = wallet.Address
	}

	registry := newMultiInstanceRegistry(nodeAddrs)

	// Create genesis validators from the wallets
	validators := make([]cmttypes.GenesisValidator, numShardInstances)
	nodeKeys := make([]ed25519.PrivKey, numShardInstances)
	for i, wallet := range wallets {
		privKey := ed25519.GenPrivKeyFromSecret(wallet.PrivateKey)
		nodeKeys[i] = privKey
		validators[i] = cmttypes.GenesisValidator{
			Address: privKey.PubKey().Address(),
			PubKey:  privKey.PubKey(),
			Power:   defaultValidatorPower,
			Name:    fmt.Sprintf("validator-%d", i),
		}
	}

	// Create genesis document with all validators
	genesisDoc := &cmttypes.GenesisDoc{
		ChainID:         chainIDForShard(multiTestShardID),
		GenesisTime:     time.Now(),
		ConsensusParams: cmttypes.DefaultConsensusParams(),
		Validators:      validators,
	}

	// Build persistent peers list
	peerAddrs := make([]string, numShardInstances)
	for i := range numShardInstances {
		nodeID := nodeKeys[i].PubKey().Address()
		peerAddrs[i] = fmt.Sprintf("%x@127.0.0.1:%d", nodeID, baseP2PPort+i)
	}

	// Create stores and shards
	shards := make([]*MetadataShard, numShardInstances)
	stores := make([]*storage.PostgresMetadataShardStore, numShardInstances)
	dbClosers := make([]func(), numShardInstances)
	streamStores := make([]*storage.PostgresStreamStore, numShardInstances)

	for i := range numShardInstances {
		dbCfg, dbSchema, dbCloser, err := dbtestutils.ConfigureDB(ctx)
		require.NoError(t, err)

		dbCfg.StartupDelay = 2 * time.Millisecond
		dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

		poolInfo, err := storage.CreateAndValidatePgxPool(ctx, dbCfg, dbSchema, nil)
		require.NoError(t, err)

		exitSignal := make(chan error, 1)
		streamStore, err := storage.NewPostgresStreamStore(
			ctx,
			poolInfo,
			base.GenShortNanoid(),
			exitSignal,
			infra.NewMetricsFactory(nil, "", ""),
			&mocks.MockOnChainCfg{
				Settings: &crypto.OnChainSettings{
					StreamEphemeralStreamTTL: time.Minute * 10,
					StreamHistoryMiniblocks: crypto.StreamHistoryMiniblocks{
						Default:      0,
						Space:        5,
						UserSettings: 5,
					},
					MinSnapshotEvents: crypto.MinSnapshotEventsSettings{
						Default: 10,
					},
					StreamSnapshotIntervalInMiniblocks: 110,
					StreamTrimActivationFactor:         1,
				},
			},
			nil,
			5,
		)
		require.NoError(t, err)

		store, err := storage.NewPostgresMetadataShardStore(
			ctx,
			&streamStore.PostgresEventStore,
			multiTestShardID,
			registry,
		)
		require.NoError(t, err)

		stores[i] = store
		streamStores[i] = streamStore
		dbClosers[i] = dbCloser

		// Build persistent peers excluding self
		peers := make([]string, 0, numShardInstances-1)
		for j := range numShardInstances {
			if j != i {
				peers = append(peers, peerAddrs[j])
			}
		}

		// Create full CometBFT node via NewMetadataShard
		shard, err := NewMetadataShard(ctx, MetadataShardOpts{
			ShardID:         multiTestShardID,
			P2PPort:         baseP2PPort + i,
			RootDir:         t.TempDir(),
			GenesisDoc:      genesisDoc,
			Wallet:          wallets[i],
			PersistentPeers: peers,
			Store:           store,
		})
		require.NoError(t, err, "failed to create shard %d", i)
		shards[i] = shard
	}

	cleanup := func() {
		cancel()
		for i, shard := range shards {
			select {
			case <-shard.Stopped():
			case <-time.After(5 * time.Second):
				t.Logf("shard %d did not stop in time", i)
			}
		}
		for i := range numShardInstances {
			streamStores[i].Close(ctx)
			dbClosers[i]()
		}
	}

	t.Cleanup(cleanup)

	return &multiNodeTestEnv{
		ctx:       ctx,
		cancel:    cancel,
		t:         t,
		shards:    shards,
		stores:    stores,
		wallets:   wallets,
		registry:  registry,
		nodeAddrs: nodeAddrs,
	}
}

// waitForHeight waits until all shards reach at least the target block height.
func (env *multiNodeTestEnv) waitForHeight(targetHeight int64, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		allReached := true
		for i, shard := range env.shards {
			height := shard.Height()
			if height < targetHeight {
				allReached = false
				env.t.Logf("shard %d at height %d, waiting for %d", i, height, targetHeight)
			}
		}
		if allReached {
			return nil
		}
		time.Sleep(200 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for height %d", targetHeight)
}

// getHeights returns current block heights from all shards.
func (env *multiNodeTestEnv) getHeights() []int64 {
	heights := make([]int64, len(env.shards))
	for i, shard := range env.shards {
		heights[i] = shard.Height()
	}
	return heights
}

// buildCreateStreamTx creates a create stream transaction.
func (env *multiNodeTestEnv) buildCreateStreamTx(
	streamID shared.StreamId,
	genesisHash []byte,
) ([]byte, error) {
	tx := &prot.MetadataTx{
		Op: &prot.MetadataTx_CreateStream{
			CreateStream: &prot.CreateStreamTx{
				StreamId:             streamID[:],
				GenesisMiniblockHash: genesisHash,
				GenesisMiniblock:     bytes.Repeat([]byte{0x01}, 32),
				LastMiniblockNum:     0,
				Nodes:                [][]byte{env.nodeAddrs[0].Bytes()},
				ReplicationFactor:    1,
			},
		},
	}
	return proto.Marshal(tx)
}

// buildMiniblockUpdateTx creates a miniblock update transaction.
func buildMiniblockUpdateTx(
	streamID shared.StreamId,
	prevHash []byte,
	newHash []byte,
	newNum uint64,
	sealed bool,
) ([]byte, error) {
	tx := &prot.MetadataTx{
		Op: &prot.MetadataTx_SetStreamLastMiniblockBatch{
			SetStreamLastMiniblockBatch: &prot.SetStreamLastMiniblockBatchTx{
				Miniblocks: []*prot.MiniblockUpdate{{
					StreamId:          streamID[:],
					PrevMiniblockHash: prevHash,
					LastMiniblockHash: newHash,
					LastMiniblockNum:  newNum,
					Sealed:            sealed,
				}},
			},
		},
	}
	return proto.Marshal(tx)
}

// submitTxToNode submits a transaction to a specific node via CometBFT mempool.
func (env *multiNodeTestEnv) submitTxToNode(nodeIdx int, txBytes []byte) error {
	return env.shards[nodeIdx].SubmitTx(txBytes)
}

// verifyStreamConsistency checks that a stream has identical state across all nodes.
func (env *multiNodeTestEnv) verifyStreamConsistency(streamID shared.StreamId) error {
	var firstRecord *prot.StreamMetadata
	for i, store := range env.stores {
		record, err := store.GetStream(env.ctx, multiTestShardID, streamID)
		if err != nil {
			return fmt.Errorf("node %d: %w", i, err)
		}
		if firstRecord == nil {
			firstRecord = record
		} else {
			if !bytes.Equal(record.LastMiniblockHash, firstRecord.LastMiniblockHash) {
				return fmt.Errorf(
					"node %d has different LastMiniblockHash: %x vs %x",
					i, record.LastMiniblockHash, firstRecord.LastMiniblockHash,
				)
			}
			if record.LastMiniblockNum != firstRecord.LastMiniblockNum {
				return fmt.Errorf(
					"node %d has different LastMiniblockNum: %d vs %d",
					i, record.LastMiniblockNum, firstRecord.LastMiniblockNum,
				)
			}
			if record.Sealed != firstRecord.Sealed {
				return fmt.Errorf(
					"node %d has different Sealed: %v vs %v",
					i, record.Sealed, firstRecord.Sealed,
				)
			}
		}
	}
	return nil
}

// verifyHeightConsistency checks that all nodes are at the same block height.
func (env *multiNodeTestEnv) verifyHeightConsistency() error {
	heights := env.getHeights()
	for i := 1; i < len(heights); i++ {
		if heights[i] != heights[0] {
			return fmt.Errorf("height mismatch: node 0 at %d, node %d at %d", heights[0], i, heights[i])
		}
	}
	return nil
}

// TestMultiNodeCometBFTConsensus tests that 4 CometBFT nodes reach consensus
// and produce at least 20 blocks with transactions.
func TestMultiNodeCometBFTConsensus(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections to establish (CometBFT needs time for peer discovery)
	t.Log("Waiting for P2P connections...")
	time.Sleep(10 * time.Second)

	// Submit transactions to trigger block creation
	numStreams := 25
	streams := make([]shared.StreamId, numStreams)

	for i := range numStreams {
		streams[i] = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		genesisHash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streams[i], genesisHash)
		require.NoError(t, err)

		// Submit to a rotating node via CometBFT mempool
		nodeIdx := i % numShardInstances
		err = env.submitTxToNode(nodeIdx, txBytes)
		require.NoError(t, err, "failed to submit tx %d to node %d", i, nodeIdx)

		// Small delay between submissions
		time.Sleep(100 * time.Millisecond)
	}

	// Wait for blocks to be produced through consensus
	t.Log("Waiting for consensus and block production...")
	err := env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Log final heights
	heights := env.getHeights()
	t.Logf("Final heights: %v", heights)

	// Verify all nodes reached at least height 20
	for i, h := range heights {
		require.GreaterOrEqual(t, h, int64(20), "node %d did not reach height 20", i)
	}
}

// TestMultiNodeCometBFTStreamLifecycle tests stream create, update, and seal
// operations through the CometBFT consensus layer.
func TestMultiNodeCometBFTStreamLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections (CometBFT needs time for peer discovery)
	t.Log("Waiting for P2P connections...")
	time.Sleep(10 * time.Second)

	// Create a stream
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	createTx, err := env.buildCreateStreamTx(streamID, genesisHash)
	require.NoError(t, err)

	err = env.submitTxToNode(0, createTx)
	require.NoError(t, err, "failed to submit create stream tx")

	// Wait for block containing the create tx
	err = env.waitForHeight(1, 10*time.Second)
	require.NoError(t, err, "failed to reach height 1")

	// Allow time for state propagation
	time.Sleep(1 * time.Second)

	// Submit 19 more updates to reach 20 miniblock operations
	prevHash := genesisHash
	for i := 1; i <= 19; i++ {
		newHash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		updateTx, err := buildMiniblockUpdateTx(streamID, prevHash, newHash, uint64(i), false)
		require.NoError(t, err)

		// Submit to rotating nodes
		nodeIdx := i % numShardInstances
		err = env.submitTxToNode(nodeIdx, updateTx)
		require.NoError(t, err, "failed to submit update %d", i)

		// Wait for block to be produced
		time.Sleep(300 * time.Millisecond)

		prevHash = newHash
	}

	// Wait for all transactions to be processed
	err = env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Allow final state propagation
	time.Sleep(2 * time.Second)

	// Verify stream state consistency across all nodes
	err = env.verifyStreamConsistency(streamID)
	require.NoError(t, err, "stream state inconsistent across nodes")

	// Verify stream has correct final state
	for i, store := range env.stores {
		record, err := store.GetStream(env.ctx, multiTestShardID, streamID)
		require.NoError(t, err, "node %d", i)
		require.EqualValues(t, 19, record.LastMiniblockNum, "node %d wrong miniblock num", i)
	}
}

// TestMultiNodeCometBFTMultipleStreams tests creating and updating multiple
// streams through CometBFT consensus.
func TestMultiNodeCometBFTMultipleStreams(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections (CometBFT needs time for peer discovery)
	t.Log("Waiting for P2P connections...")
	time.Sleep(10 * time.Second)

	// Create multiple streams
	numStreams := 10
	streams := make([]shared.StreamId, numStreams)
	hashes := make([][]byte, numStreams)

	for i := range numStreams {
		streams[i] = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hashes[i] = bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streams[i], hashes[i])
		require.NoError(t, err)

		err = env.submitTxToNode(i%numShardInstances, txBytes)
		require.NoError(t, err)

		time.Sleep(100 * time.Millisecond)
	}

	// Wait for creates to be processed
	err := env.waitForHeight(5, 15*time.Second)
	require.NoError(t, err, "failed to reach height 5")

	// Submit updates to generate more blocks
	for round := 1; round <= 15; round++ {
		for i := range numStreams {
			newHash := bytes.Repeat([]byte{byte(round*16 + i)}, 32)
			txBytes, err := buildMiniblockUpdateTx(streams[i], hashes[i], newHash, uint64(round), false)
			require.NoError(t, err)

			err = env.submitTxToNode((round+i)%numShardInstances, txBytes)
			require.NoError(t, err)

			hashes[i] = newHash
		}
		time.Sleep(200 * time.Millisecond)
	}

	// Wait for all transactions to be processed
	err = env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Allow final state propagation
	time.Sleep(2 * time.Second)

	// Verify all streams have consistent state
	for _, streamID := range streams {
		err := env.verifyStreamConsistency(streamID)
		require.NoError(t, err, "stream %s inconsistent", streamID)
	}

	// Log final heights
	heights := env.getHeights()
	t.Logf("Final heights: %v", heights)
}

// TestMultiNodeCometBFTConcurrentSubmissions tests concurrent transaction
// submissions from multiple nodes through CometBFT consensus.
func TestMultiNodeCometBFTConcurrentSubmissions(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections (CometBFT needs time for peer discovery)
	t.Log("Waiting for P2P connections...")
	time.Sleep(10 * time.Second)

	// Submit transactions concurrently from all nodes
	done := make(chan struct{})
	errChan := make(chan error, numShardInstances*10)

	for nodeIdx := range numShardInstances {
		go func(nIdx int) {
			for i := range 10 {
				streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
				hash := bytes.Repeat([]byte{byte(nIdx*10 + i + 1)}, 32)

				txBytes, err := env.buildCreateStreamTx(streamID, hash)
				if err != nil {
					errChan <- err
					return
				}

				if err := env.submitTxToNode(nIdx, txBytes); err != nil {
					errChan <- err
					return
				}

				time.Sleep(50 * time.Millisecond)
			}
		}(nodeIdx)
	}

	// Wait for submissions to complete
	time.Sleep(2 * time.Second)
	close(done)

	// Check for submission errors
	select {
	case err := <-errChan:
		require.NoError(t, err, "submission error")
	default:
	}

	// Wait for blocks to be produced
	err := env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Log final heights
	heights := env.getHeights()
	t.Logf("Final heights after concurrent submissions: %v", heights)

	// Verify all nodes reached at least height 20
	for i, h := range heights {
		require.GreaterOrEqual(t, h, int64(20), "node %d did not reach height 20", i)
	}
}

// TestMultiNodeCometBFTStateConsistency tests that all nodes maintain
// consistent application state through CometBFT consensus.
func TestMultiNodeCometBFTStateConsistency(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections (CometBFT needs time for peer discovery)
	t.Log("Waiting for P2P connections...")
	time.Sleep(10 * time.Second)

	// Create streams and track them
	numStreams := 20
	streams := make([]shared.StreamId, numStreams)

	for i := range numStreams {
		streams[i] = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streams[i], hash)
		require.NoError(t, err)

		err = env.submitTxToNode(i%numShardInstances, txBytes)
		require.NoError(t, err)

		time.Sleep(100 * time.Millisecond)
	}

	// Wait for blocks
	err := env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Allow final state propagation
	time.Sleep(2 * time.Second)

	// Verify stream counts are consistent
	counts := make([]int64, numShardInstances)
	for i, store := range env.stores {
		count, err := store.CountStreams(env.ctx, multiTestShardID)
		require.NoError(t, err)
		counts[i] = count
	}

	t.Logf("Stream counts across nodes: %v", counts)

	// All nodes should have the same count
	for i := 1; i < numShardInstances; i++ {
		require.Equal(t, counts[0], counts[i], "node %d has different stream count", i)
	}

	// Verify each stream is consistent across all nodes
	for _, streamID := range streams {
		err := env.verifyStreamConsistency(streamID)
		require.NoError(t, err, "stream %s inconsistent", streamID)
	}

	// Verify shard state is consistent
	var firstState *storage.MetadataShardState
	for i, store := range env.stores {
		state, err := store.GetShardState(env.ctx, multiTestShardID)
		require.NoError(t, err)
		if firstState == nil {
			firstState = state
		} else {
			require.Equal(t, firstState.LastHeight, state.LastHeight,
				"node %d has different LastHeight", i)
			require.Equal(t, firstState.LastAppHash, state.LastAppHash,
				"node %d has different LastAppHash", i)
		}
	}
}

// TestMultiNodeCometBFT25Blocks ensures at least 25 blocks are created
// through CometBFT consensus with various transaction types.
func TestMultiNodeCometBFT25Blocks(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections (CometBFT needs time for peer discovery)
	t.Log("Waiting for P2P connections...")
	time.Sleep(10 * time.Second)

	// Submit enough transactions to generate 25+ blocks
	createdStreams := make(map[shared.StreamId][]byte)

	// Phase 1: Create streams (blocks 1-12)
	for i := range 12 {
		streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streamID, hash)
		require.NoError(t, err)

		err = env.submitTxToNode(i%numShardInstances, txBytes)
		require.NoError(t, err)

		createdStreams[streamID] = hash
		time.Sleep(150 * time.Millisecond)
	}

	// Wait for creates to be processed
	err := env.waitForHeight(10, 20*time.Second)
	require.NoError(t, err, "failed to reach height 10")

	// Phase 2: Update streams (blocks 13-25)
	updateRound := 1
	for streamID, prevHash := range createdStreams {
		newHash := bytes.Repeat([]byte{byte(updateRound + 100)}, 32)

		txBytes, err := buildMiniblockUpdateTx(streamID, prevHash, newHash, uint64(updateRound), false)
		require.NoError(t, err)

		err = env.submitTxToNode(updateRound%numShardInstances, txBytes)
		require.NoError(t, err)

		createdStreams[streamID] = newHash
		updateRound++
		time.Sleep(150 * time.Millisecond)
	}

	// Wait for final blocks
	err = env.waitForHeight(25, 60*time.Second)
	require.NoError(t, err, "failed to reach height 25")

	// Log final heights
	heights := env.getHeights()
	t.Logf("Final heights: %v", heights)

	// Verify all nodes reached at least height 25
	for i, h := range heights {
		require.GreaterOrEqual(t, h, int64(25), "node %d did not reach height 25", i)
	}

	// Verify state consistency
	err = env.verifyHeightConsistency()
	require.NoError(t, err, "height inconsistency detected")

	for streamID := range createdStreams {
		err := env.verifyStreamConsistency(streamID)
		require.NoError(t, err, "stream %s inconsistent", streamID)
	}
}
