package metadata

import (
	"context"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/cometbft/cometbft/types"
)

func TestMetadataShardProducesBlocks(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	t.Cleanup(cancel)

	const (
		shardID    = 1
		nodeCount  = 4
		blockCount = 5
		p2pBase    = 38000
	)

	rootDir := t.TempDir()

	shards := make([]*MetadataShard, nodeCount)
	validators := make([]types.GenesisValidator, nodeCount)

	for i := 0; i < nodeCount; i++ {
		shardRoot := filepath.Join(rootDir, fmt.Sprintf("shard-%d", i))
		shard, err := NewMetadataShard(MetadataShardOpts{
			ShardID: shardID,
			RootDir: shardRoot,
			P2PPort: p2pBase + i,
		})
		require.NoError(t, err)
		shards[i] = shard

		validator, err := shard.GenesisValidator(defaultValidatorPower)
		require.NoError(t, err)
		validators[i] = validator
	}

	genesisDoc := &types.GenesisDoc{
		ChainID:         fmt.Sprintf("metadata-shard-%d", shardID),
		GenesisTime:     time.Now().UTC(),
		Validators:      validators,
		ConsensusParams: types.DefaultConsensusParams(),
		InitialHeight:   1,
	}

	for _, shard := range shards {
		require.NoError(t, shard.SetGenesisDoc(genesisDoc))
	}

	peerAddresses := make([]string, nodeCount)
	for i, shard := range shards {
		addr, err := shard.NodeAddress()
		require.NoError(t, err)
		peerAddresses[i] = addr
	}

	for i, shard := range shards {
		var peers []string
		for peerIdx, peerAddr := range peerAddresses {
			if peerIdx == i {
				continue
			}
			peers = append(peers, peerAddr)
		}
		require.NoError(t, shard.SetPersistentPeers(peers))
	}

	for _, shard := range shards {
		require.NoError(t, shard.Start(ctx))
	}
	t.Cleanup(func() {
		for _, shard := range shards {
			require.NoError(t, shard.Stop())
		}
	})

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
