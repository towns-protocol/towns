package metadata

import (
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/cometbft/cometbft/crypto/ed25519"
	"github.com/cometbft/cometbft/p2p"
	"github.com/cometbft/cometbft/types"
)

func TestMetadataShardProducesBlocks(t *testing.T) {
	const (
		shardID    = 1
		nodeCount  = 4
		blockCount = 5
		p2pBase    = 38000
	)

	rootDir := t.TempDir()

	shards := make([]*MetadataShard, nodeCount)
	privValidators := make([]types.PrivValidator, nodeCount)
	validators := make([]types.GenesisValidator, nodeCount)
	nodeKeys := make([]*p2p.NodeKey, nodeCount)
	nodeAddrs := make([]string, nodeCount)

	for i := 0; i < nodeCount; i++ {
		privValidators[i] = types.NewMockPV()
		pubKey, err := privValidators[i].GetPubKey()
		require.NoError(t, err)
		validators[i] = types.GenesisValidator{PubKey: pubKey, Power: defaultValidatorPower}
		nodeKeys[i] = &p2p.NodeKey{PrivKey: ed25519.GenPrivKey()}
		nodeAddrs[i] = fmt.Sprintf("%s@127.0.0.1:%d", nodeKeys[i].ID(), p2pBase+i)
	}

	genesisDoc := &types.GenesisDoc{
		ChainID:         chainIDForShard(shardID),
		GenesisTime:     time.Now().UTC(),
		Validators:      validators,
		ConsensusParams: types.DefaultConsensusParams(),
		InitialHeight:   1,
	}

	for i := 0; i < nodeCount; i++ {
		shardRoot := filepath.Join(rootDir, fmt.Sprintf("shard-%d", i))
		var peers []string
		for peerIdx := 0; peerIdx < nodeCount; peerIdx++ {
			if peerIdx == i {
				continue
			}
			peers = append(peers, nodeAddrs[peerIdx])
		}

		shard, err := NewMetadataShard(t.Context(), MetadataShardOpts{
			ShardID:         shardID,
			RootDir:         shardRoot,
			P2PPort:         p2pBase + i,
			GenesisDoc:      genesisDoc,
			PrivValidator:   privValidators[i],
			NodeKey:         nodeKeys[i],
			PersistentPeers: peers,
		})
		require.NoError(t, err)
		shards[i] = shard
		currentShard := shard
		t.Cleanup(func() {
			require.NoError(t, currentShard.stop())
		})
	}

	targetHeight := shards[0].Height()

	for blockIndex := 0; blockIndex < blockCount; blockIndex++ {
		require.NoError(t, shards[0].SubmitTx([]byte(fmt.Sprintf("tx-%d", blockIndex))))
		targetHeight++

		require.Eventually(t, func() bool {
			for _, shard := range shards {
				if shard.Height() < targetHeight {
					return false
				}
			}
			return true
		}, 30*time.Second, 200*time.Millisecond, "expected all shards to reach height %d", targetHeight)
	}
}
