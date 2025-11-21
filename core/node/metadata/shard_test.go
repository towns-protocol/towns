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

	rivercrypto "github.com/towns-protocol/towns/core/node/crypto"
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
	wallets := make([]*rivercrypto.Wallet, nodeCount)
	validators := make([]types.GenesisValidator, nodeCount)
	nodeAddrs := make([]string, nodeCount)

	for i := 0; i < nodeCount; i++ {
		wallet, err := rivercrypto.NewWalletFromPrivKey(t.Context(), fmt.Sprintf("%064x", i+1))
		require.NoError(t, err)
		wallets[i] = wallet
		privKey := ed25519.GenPrivKeyFromSecret(wallet.PrivateKey)
		nodeAddrs[i] = fmt.Sprintf("%s@127.0.0.1:%d", p2p.PubKeyToID(privKey.PubKey()), p2pBase+i)
		validators[i] = types.GenesisValidator{PubKey: privKey.PubKey(), Power: defaultValidatorPower}
	}

	genesisDoc := &types.GenesisDoc{
		ChainID:         chainIDForShard(shardID),
		GenesisTime:     time.Now().UTC(),
		Validators:      validators,
		ConsensusParams: types.DefaultConsensusParams(),
		InitialHeight:   1,
	}

	for i := 0; i < nodeCount; i++ {
		shardRoot := filepath.Join(rootDir, fmt.Sprintf("instance-%d", i))
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
			Wallet:          wallets[i],
			PersistentPeers: peers,
		})
		require.NoError(t, err)
		shards[i] = shard
	}

	targetHeight := shards[0].Height()

	time.Sleep(5 * time.Second)

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
		}, 90*time.Second, 200*time.Millisecond, "expected all shards to reach height %d", targetHeight)
	}
}
