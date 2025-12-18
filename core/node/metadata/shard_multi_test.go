// Package metadata provides multi-node CometBFT consensus tests for metadata shards.
//
// These tests set up 4 MetadataShard instances running full CometBFT nodes that
// communicate via P2P networking to reach consensus on blocks. All interactions
// with the nodes go through CometBFT's rpc/client/local.Local client, which
// provides the standard CometBFT RPC interface:
//   - BroadcastTxSync for transaction submission
//   - Status for node status and block height
//   - ABCIQuery for application state queries
//
// Requirements:
// - PostgreSQL running on port 5433
// - Ports 26700-26703 available for P2P networking
// - Sufficient time for CometBFT P2P connection establishment (~10-30s)
package metadata

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	cmtcfg "github.com/cometbft/cometbft/config"
	"github.com/cometbft/cometbft/crypto/ed25519"
	"github.com/cometbft/cometbft/rpc/client/local"
	cmttypes "github.com/cometbft/cometbft/types"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	nodespkg "github.com/towns-protocol/towns/core/node/nodes"
	prot "github.com/towns-protocol/towns/core/node/protocol"
	protocolconnect "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

const (
	numShardInstances = 4
	multiTestShardID  = uint64(9)
	baseP2PPort       = 26700
	shutdownTimeout   = 10 * time.Second
	shutdownPollDelay = 50 * time.Millisecond
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

// multiNodeTestEnv holds multiple MetadataShard instances with CometBFT local RPC clients.
type multiNodeTestEnv struct {
	ctx       context.Context
	cancel    context.CancelFunc
	t         *testing.T
	shards    []*MetadataShard
	clients   []*local.Local // CometBFT local RPC clients
	stores    []*storage.PostgresMetadataShardStore
	wallets   []*crypto.Wallet
	registry  *multiInstanceRegistry
	nodeAddrs []common.Address
}

func waitForCondition(t *testing.T, check func() bool) bool {
	t.Helper()
	if check() {
		return true
	}
	timer := time.NewTimer(shutdownTimeout)
	ticker := time.NewTicker(shutdownPollDelay)
	defer timer.Stop()
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			if check() {
				return true
			}
		case <-timer.C:
			return check()
		}
	}
}

func waitForPeersDisconnected(t *testing.T, shards []*MetadataShard) {
	t.Helper()
	ok := waitForCondition(t, func() bool {
		for _, shard := range shards {
			if shard.Node() == nil || shard.Node().Switch() == nil {
				continue
			}
			sw := shard.Node().Switch()
			if sw.Peers().Size() > 0 {
				return false
			}
			if _, _, dialing := sw.NumPeers(); dialing > 0 {
				return false
			}
		}
		return true
	})
	if !ok {
		t.Errorf("peers did not disconnect before shutdown")
	}
}

func waitForShardsStopped(t *testing.T, shards []*MetadataShard) {
	t.Helper()
	for i, shard := range shards {
		ok := waitForCondition(t, func() bool {
			select {
			case <-shard.Stopped():
				return true
			default:
				return false
			}
		})
		if !ok {
			t.Errorf("shard %d did not stop in time", i)
		}
	}
}

func configureConsensusTestParams(cfg *cmtcfg.Config) {
	cfg.Consensus.PeerGossipSleepDuration = 10 * time.Millisecond
	cfg.Consensus.PeerQueryMaj23SleepDuration = 10 * time.Millisecond
	cfg.Consensus.PeerGossipIntraloopSleepDuration = 0
}

// setupMultiNodeCometBFTTest creates numShardInstances MetadataShard instances
// with CometBFT local RPC clients for interaction.
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
	// Node IDs must be lowercase hex for CometBFT peer matching
	peerAddrs := make([]string, numShardInstances)
	for i := range numShardInstances {
		nodeID := nodeKeys[i].PubKey().Address()
		peerAddrs[i] = fmt.Sprintf("%s@127.0.0.1:%d", strings.ToLower(nodeID.String()), baseP2PPort+i)
	}

	// Create stores, shards, and RPC clients
	shards := make([]*MetadataShard, numShardInstances)
	clients := make([]*local.Local, numShardInstances)
	stores := make([]*storage.PostgresMetadataShardStore, numShardInstances)
	storeCleanups := make([]func(), numShardInstances)

	for i := range numShardInstances {
		storeSetup := setupMetadataStore(t, ctx, multiTestShardID, registry)
		stores[i] = storeSetup.shardStore
		storeCleanups[i] = storeSetup.cleanup

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
				Store:           storeSetup.shardStore,
				ConfigOverride:  configureConsensusTestParams,
			})
		require.NoError(t, err, "failed to create shard %d", i)
		shards[i] = shard

		// Create CometBFT local RPC client for this node
		clients[i] = local.New(shard.Node())
	}

	cleanup := func() {
		// CometBFT has a race condition during shutdown where goroutines like
		// queryMaj23Routine may still access the blockstore after it's closed.
		// The issue is that node.Stop() closes the blockstore before all peer
		// goroutines have exited.
		//
		// To work around this, we:
		// 1. Disconnect all peers explicitly BEFORE stopping nodes
		// 2. Wait for peers to disconnect
		// 3. Then stop the nodes

		// Step 1: Explicitly disconnect all peers from all nodes.
		// This triggers RemovePeer which cancels peer contexts, causing
		// queryMaj23Routine and similar goroutines to exit.
		for _, shard := range shards {
			if shard.Node() != nil && shard.Node().Switch() != nil {
				sw := shard.Node().Switch()
				peers := sw.Peers().Copy()
				for _, peer := range peers {
					sw.StopPeerGracefully(peer)
				}
			}
		}

		// Step 2: Wait for all peers to be fully disconnected.
		waitForPeersDisconnected(t, shards)

		// Step 3: Now cancel context and stop nodes
		cancel()
		waitForShardsStopped(t, shards)

		for i := range numShardInstances {
			storeCleanups[i]()
		}
	}

	t.Cleanup(cleanup)

	return &multiNodeTestEnv{
		ctx:       ctx,
		cancel:    cancel,
		t:         t,
		shards:    shards,
		clients:   clients,
		stores:    stores,
		wallets:   wallets,
		registry:  registry,
		nodeAddrs: nodeAddrs,
	}
}

// getHeight returns the current block height from a node using CometBFT RPC Status.
func (env *multiNodeTestEnv) getHeight(nodeIdx int) (int64, error) {
	status, err := env.clients[nodeIdx].Status(env.ctx)
	if err != nil {
		return 0, err
	}
	return status.SyncInfo.LatestBlockHeight, nil
}

// getHeights returns current block heights from all nodes using CometBFT RPC.
func (env *multiNodeTestEnv) getHeights() []int64 {
	heights := make([]int64, len(env.clients))
	for i := range env.clients {
		h, err := env.getHeight(i)
		if err != nil {
			testfmt.Logf(env.t, "failed to get height from node %d: %v", i, err)
			heights[i] = -1
		} else {
			heights[i] = h
		}
	}
	return heights
}

// waitForHeight waits until all nodes reach at least the target block height
// using CometBFT RPC Status calls.
func (env *multiNodeTestEnv) waitForHeight(targetHeight int64, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		allReached := true
		for i := range env.clients {
			height, err := env.getHeight(i)
			if err != nil {
				testfmt.Logf(env.t, "node %d status error: %v", i, err)
				allReached = false
				continue
			}
			if height < targetHeight {
				allReached = false
				testfmt.Logf(env.t, "node %d at height %d, waiting for %d", i, height, targetHeight)
			}
		}
		if allReached {
			return nil
		}
		time.Sleep(200 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for height %d", targetHeight)
}

// broadcastTxSync submits a transaction to a node using CometBFT RPC BroadcastTxSync.
// This waits for the transaction to pass CheckTx before returning.
func (env *multiNodeTestEnv) broadcastTxSync(nodeIdx int, txBytes []byte) error {
	result, err := env.clients[nodeIdx].BroadcastTxSync(env.ctx, txBytes)
	if err != nil {
		return fmt.Errorf("broadcast error: %w", err)
	}
	if result.Code != 0 {
		return fmt.Errorf("CheckTx failed with code %d: %s", result.Code, result.Log)
	}
	return nil
}

// abciQuery performs an ABCI query via CometBFT RPC.
func (env *multiNodeTestEnv) abciQuery(nodeIdx int, path string, data []byte) ([]byte, error) {
	result, err := env.clients[nodeIdx].ABCIQuery(env.ctx, path, data)
	if err != nil {
		return nil, fmt.Errorf("ABCI query error: %w", err)
	}
	if result.Response.Code != 0 {
		return nil, fmt.Errorf("query failed with code %d: %s", result.Response.Code, result.Response.Log)
	}
	return result.Response.Value, nil
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

// verifyHeightConsistency checks that all nodes are at the same block height using RPC.
func (env *multiNodeTestEnv) verifyHeightConsistency() error {
	heights := env.getHeights()
	for i := 1; i < len(heights); i++ {
		if heights[i] != heights[0] {
			return fmt.Errorf("height mismatch: node 0 at %d, node %d at %d", heights[0], i, heights[i])
		}
	}
	return nil
}

// waitForP2PConnections waits until all nodes have established P2P connections.
func (env *multiNodeTestEnv) waitForP2PConnections() {
	require.Eventually(env.t, func() bool {
		for i := range env.shards {
			// Check if node has peers by querying NetInfo
			netInfo, err := env.clients[i].NetInfo(env.ctx)
			if err != nil {
				return false
			}
			// Each node should have at least 1 peer (ideally numShardInstances-1)
			if netInfo.NPeers < 1 {
				return false
			}
		}
		return true
	}, 30*time.Second, 200*time.Millisecond, "P2P connections not established")
}

// waitForStreamState waits until a stream reaches the expected state on all nodes.
func (env *multiNodeTestEnv) waitForStreamState(
	streamID shared.StreamId,
	expectedMiniblockNum int64,
	expectedHash []byte,
	expectedSealed bool,
) {
	require.Eventually(env.t, func() bool {
		for _, store := range env.stores {
			record, err := store.GetStream(env.ctx, multiTestShardID, streamID)
			if err != nil {
				return false
			}
			if record.LastMiniblockNum != expectedMiniblockNum {
				return false
			}
			if expectedHash != nil && !bytes.Equal(record.LastMiniblockHash, expectedHash) {
				return false
			}
			if record.Sealed != expectedSealed {
				return false
			}
		}
		return true
	}, 10*time.Second, 100*time.Millisecond, "stream state not reached on all nodes")
}

// waitForStreamCount waits until all nodes have the expected number of streams.
func (env *multiNodeTestEnv) waitForStreamCount(expectedCount int) {
	require.Eventually(env.t, func() bool {
		for _, store := range env.stores {
			streams, err := store.ListStreams(env.ctx, multiTestShardID, 0, 1000)
			if err != nil {
				return false
			}
			if len(streams) != expectedCount {
				return false
			}
		}
		return true
	}, 10*time.Second, 100*time.Millisecond, "stream count not reached on all nodes")
}

// TestMultiNodeCometBFTConsensus tests that 4 CometBFT nodes reach consensus
// and produce at least 20 blocks with transactions via RPC.
func TestMultiNodeCometBFTConsensus(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections to establish
	env.waitForP2PConnections()

	// Wait for consensus to start (nodes need to finish blocksync before accepting transactions)
	err := env.waitForHeight(1, 30*time.Second)
	require.NoError(t, err, "failed to reach height 1 - nodes may still be syncing")

	// Submit transactions via BroadcastTxSync to trigger block creation
	numStreams := 25
	streams := make([]shared.StreamId, numStreams)

	for i := range numStreams {
		streams[i] = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		genesisHash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streams[i], genesisHash)
		require.NoError(t, err)

		// Submit via CometBFT RPC BroadcastTxSync to a rotating node
		nodeIdx := i % numShardInstances
		err = env.broadcastTxSync(nodeIdx, txBytes)
		require.NoError(t, err, "failed to broadcast tx %d to node %d", i, nodeIdx)
	}

	// Wait for blocks to be produced through consensus
	err = env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Log final heights from RPC Status
	heights := env.getHeights()
	testfmt.Logf(t, "Final heights (via RPC Status): %v", heights)

	// Verify all nodes reached at least height 20
	for i, h := range heights {
		require.GreaterOrEqual(t, h, int64(20), "node %d did not reach height 20", i)
	}
}

// TestMultiNodeCometBFTStreamLifecycle tests stream create, update, and seal
// operations through the CometBFT RPC interface.
func TestMultiNodeCometBFTStreamLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections to establish
	env.waitForP2PConnections()

	// Wait for consensus to start (nodes need to finish blocksync before accepting transactions)
	err := env.waitForHeight(1, 30*time.Second)
	require.NoError(t, err, "failed to reach height 1 - nodes may still be syncing")

	// Create a stream via BroadcastTxSync
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesisHash := bytes.Repeat([]byte{0xaa}, 32)

	createTx, err := env.buildCreateStreamTx(streamID, genesisHash)
	require.NoError(t, err)

	err = env.broadcastTxSync(0, createTx)
	require.NoError(t, err, "failed to broadcast create stream tx")

	// Wait for stream to be created on all nodes
	env.waitForStreamState(streamID, 0, genesisHash, false)

	// Submit an update via RPC
	newHash := bytes.Repeat([]byte{0xbb}, 32)
	updateTx, err := buildMiniblockUpdateTx(streamID, genesisHash, newHash, 1, false)
	require.NoError(t, err)

	err = env.broadcastTxSync(1, updateTx)
	require.NoError(t, err, "failed to broadcast update tx")

	// Wait for update to be applied on all nodes
	env.waitForStreamState(streamID, 1, newHash, false)

	// Seal the stream
	finalHash := bytes.Repeat([]byte{0xcc}, 32)
	sealTx, err := buildMiniblockUpdateTx(streamID, newHash, finalHash, 2, true)
	require.NoError(t, err)

	err = env.broadcastTxSync(2, sealTx)
	require.NoError(t, err, "failed to broadcast seal tx")

	// Wait for stream to be sealed on all nodes
	env.waitForStreamState(streamID, 2, finalHash, true)

	// Final verification
	for i, store := range env.stores {
		record, err := store.GetStream(env.ctx, multiTestShardID, streamID)
		require.NoError(t, err, "node %d failed to get sealed stream", i)
		require.EqualValues(t, 2, record.LastMiniblockNum, "node %d wrong final miniblock num", i)
		require.Equal(t, finalHash, record.LastMiniblockHash, "node %d wrong final hash", i)
		require.True(t, record.Sealed, "node %d stream not sealed", i)
	}
}

// TestMultiNodeCometBFTMultipleStreams tests creating and updating multiple
// streams through CometBFT RPC.
func TestMultiNodeCometBFTMultipleStreams(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections to establish
	env.waitForP2PConnections()

	// Wait for consensus to start (nodes need to finish blocksync before accepting transactions)
	err := env.waitForHeight(1, 30*time.Second)
	require.NoError(t, err, "failed to reach height 1 - nodes may still be syncing")

	// Create multiple streams via BroadcastTxSync
	numStreams := 10
	streams := make([]shared.StreamId, numStreams)
	hashes := make([][]byte, numStreams)

	for i := range numStreams {
		streams[i] = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hashes[i] = bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streams[i], hashes[i])
		require.NoError(t, err)

		err = env.broadcastTxSync(i%numShardInstances, txBytes)
		require.NoError(t, err)
	}

	// Wait for all streams to exist on all nodes
	env.waitForStreamCount(numStreams)

	// Submit updates via RPC to generate more blocks
	for round := 1; round <= 15; round++ {
		for i := range numStreams {
			newHash := bytes.Repeat([]byte{byte(round*16 + i)}, 32)
			txBytes, err := buildMiniblockUpdateTx(streams[i], hashes[i], newHash, uint64(round), false)
			require.NoError(t, err)

			err = env.broadcastTxSync((round+i)%numShardInstances, txBytes)
			require.NoError(t, err)

			hashes[i] = newHash
		}
	}

	// Wait for all transactions to be processed
	err = env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Verify all streams have consistent state
	require.Eventually(t, func() bool {
		for _, streamID := range streams {
			if err := env.verifyStreamConsistency(streamID); err != nil {
				return false
			}
		}
		return true
	}, 10*time.Second, 100*time.Millisecond, "streams not consistent")

	// Log final heights from RPC
	heights := env.getHeights()
	testfmt.Logf(t, "Final heights (via RPC): %v", heights)
}

// TestMultiNodeCometBFTConcurrentSubmissions tests concurrent transaction
// submissions from multiple nodes through CometBFT RPC.
func TestMultiNodeCometBFTConcurrentSubmissions(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections to establish
	env.waitForP2PConnections()

	// Wait for consensus to start (nodes need to finish blocksync before accepting transactions)
	err := env.waitForHeight(1, 30*time.Second)
	require.NoError(t, err, "failed to reach height 1 - nodes may still be syncing")

	// Submit transactions concurrently from all nodes via BroadcastTxSync
	var wg sync.WaitGroup
	errChan := make(chan error, numShardInstances*10)

	for nodeIdx := range numShardInstances {
		wg.Add(1)
		go func(nIdx int) {
			defer wg.Done()
			for i := range 10 {
				streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
				hash := bytes.Repeat([]byte{byte(nIdx*10 + i + 1)}, 32)

				txBytes, err := env.buildCreateStreamTx(streamID, hash)
				if err != nil {
					errChan <- err
					return
				}

				if err := env.broadcastTxSync(nIdx, txBytes); err != nil {
					errChan <- err
					return
				}
			}
		}(nodeIdx)
	}

	// Wait for all goroutines to complete
	wg.Wait()
	close(errChan)

	// Check for submission errors
	for err := range errChan {
		require.NoError(t, err, "submission error")
	}

	// Wait for blocks to be produced
	err = env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")

	// Log final heights from RPC
	heights := env.getHeights()
	testfmt.Logf(t, "Final heights (via RPC) after concurrent submissions: %v", heights)

	// Verify all nodes reached at least height 20
	for i, h := range heights {
		require.GreaterOrEqual(t, h, int64(20), "node %d did not reach height 20", i)
	}
}

// TestMultiNodeCometBFTStateConsistency tests that all nodes maintain
// consistent application state through CometBFT consensus via RPC.
func TestMultiNodeCometBFTStateConsistency(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections to establish
	env.waitForP2PConnections()

	// Wait for consensus to start (nodes need to finish blocksync before accepting transactions)
	err := env.waitForHeight(1, 30*time.Second)
	require.NoError(t, err, "failed to reach height 1 - nodes may still be syncing")

	// Create streams and track them via BroadcastTxSync
	numStreams := 20
	streams := make([]shared.StreamId, numStreams)

	for i := range numStreams {
		streams[i] = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streams[i], hash)
		require.NoError(t, err)

		err = env.broadcastTxSync(i%numShardInstances, txBytes)
		require.NoError(t, err)
	}

	// Wait for all streams to exist on all nodes
	env.waitForStreamCount(numStreams)

	// Verify stream counts are consistent
	counts := make([]int64, numShardInstances)
	for i, store := range env.stores {
		count, err := store.CountStreams(env.ctx, multiTestShardID)
		require.NoError(t, err)
		counts[i] = count
	}

	testfmt.Logf(t, "Stream counts across nodes: %v", counts)

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
// through CometBFT consensus with various transaction types via RPC.
func TestMultiNodeCometBFT25Blocks(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections to establish
	env.waitForP2PConnections()

	// Wait for consensus to start (nodes need to finish blocksync before accepting transactions)
	err := env.waitForHeight(1, 30*time.Second)
	require.NoError(t, err, "failed to reach height 1 - nodes may still be syncing")

	// Submit enough transactions via BroadcastTxSync to generate 25+ blocks
	createdStreams := make(map[shared.StreamId][]byte)

	// Phase 1: Create streams (blocks 1-12)
	for i := range 12 {
		streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streamID, hash)
		require.NoError(t, err)

		err = env.broadcastTxSync(i%numShardInstances, txBytes)
		require.NoError(t, err)

		createdStreams[streamID] = hash
	}

	// Wait for creates to be processed via RPC
	err = env.waitForHeight(10, 30*time.Second)
	require.NoError(t, err, "failed to reach height 10")

	// Phase 2: Update streams (blocks 13-25)
	updateIndex := 0
	for streamID, prevHash := range createdStreams {
		newHash := bytes.Repeat([]byte{byte(updateIndex + 100)}, 32)

		txBytes, err := buildMiniblockUpdateTx(streamID, prevHash, newHash, 1, false)
		require.NoError(t, err)

		err = env.broadcastTxSync(updateIndex%numShardInstances, txBytes)
		require.NoError(t, err)

		createdStreams[streamID] = newHash
		updateIndex++
	}

	// Wait for final blocks via RPC Status
	err = env.waitForHeight(25, 60*time.Second)
	require.NoError(t, err, "failed to reach height 25")

	// Log final heights from RPC
	heights := env.getHeights()
	testfmt.Logf(t, "Final heights (via RPC): %v", heights)

	// Verify all nodes reached at least height 25
	for i, h := range heights {
		require.GreaterOrEqual(t, h, int64(25), "node %d did not reach height 25", i)
	}

	// Verify state consistency
	require.Eventually(t, func() bool {
		return env.verifyHeightConsistency() == nil
	}, 10*time.Second, 100*time.Millisecond, "height inconsistency")

	for streamID := range createdStreams {
		err := env.verifyStreamConsistency(streamID)
		require.NoError(t, err, "stream %s inconsistent", streamID)
	}
}

// TestMultiNodeCometBFTABCIQuery tests querying application state via
// CometBFT RPC ABCIQuery.
func TestMultiNodeCometBFTABCIQuery(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping multi-node CometBFT test in short mode")
	}

	env := setupMultiNodeCometBFTTest(t)

	// Wait for P2P connections
	env.waitForP2PConnections()

	// Wait for consensus to start (nodes need to finish blocksync before accepting transactions)
	err := env.waitForHeight(1, 30*time.Second)
	require.NoError(t, err, "failed to reach height 1 - nodes may still be syncing")

	// Create some streams
	numStreams := 5
	streams := make([]shared.StreamId, numStreams)

	for i := range numStreams {
		streams[i] = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streams[i], hash)
		require.NoError(t, err)

		err = env.broadcastTxSync(i%numShardInstances, txBytes)
		require.NoError(t, err)
	}

	// Wait for blocks
	err = env.waitForHeight(5, 20*time.Second)
	require.NoError(t, err, "failed to reach height 5")

	// Wait for all streams to be replicated to all nodes
	env.waitForStreamCount(numStreams)

	// Query each stream via ABCIQuery on all nodes
	for _, streamID := range streams {
		var firstValue []byte
		for nodeIdx := range env.clients {
			value, err := env.abciQuery(nodeIdx, "/stream/"+streamID.String(), nil)
			require.NoError(t, err, "node %d ABCI query failed", nodeIdx)
			require.NotEmpty(t, value, "node %d returned empty value", nodeIdx)

			if firstValue == nil {
				firstValue = value
			} else {
				require.Equal(t, firstValue, value,
					"node %d returned different query result", nodeIdx)
			}
		}
	}

	// Query stream count via ABCIQuery
	for nodeIdx := range env.clients {
		value, err := env.abciQuery(nodeIdx, "/streams/count", nil)
		require.NoError(t, err, "node %d count query failed", nodeIdx)
		require.NotEmpty(t, value, "node %d returned empty count", nodeIdx)
	}

	// Continue to 20 blocks
	for i := numStreams; i < 20; i++ {
		streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		hash := bytes.Repeat([]byte{byte(i + 1)}, 32)

		txBytes, err := env.buildCreateStreamTx(streamID, hash)
		require.NoError(t, err)

		err = env.broadcastTxSync(i%numShardInstances, txBytes)
		require.NoError(t, err)
	}

	err = env.waitForHeight(20, 60*time.Second)
	require.NoError(t, err, "failed to reach height 20")
}
