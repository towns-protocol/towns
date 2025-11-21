package metadata

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	abci "github.com/cometbft/cometbft/abci/types"
	cmtcfg "github.com/cometbft/cometbft/config"
	"github.com/cometbft/cometbft/crypto"
	"github.com/cometbft/cometbft/crypto/ed25519"
	"github.com/cometbft/cometbft/libs/log"
	"github.com/cometbft/cometbft/node"
	"github.com/cometbft/cometbft/p2p"
	"github.com/cometbft/cometbft/privval"
	"github.com/cometbft/cometbft/proxy"
	"github.com/cometbft/cometbft/types"

	. "github.com/towns-protocol/towns/core/node/base"
	rivercrypto "github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const (
	defaultValidatorPower int64 = 1
	chainIDPrefix               = "metadata-shard-"
)

type MetadataShardOpts struct {
	ShardID         uint64
	P2PPort         int
	RootDir         string
	GenesisDoc      *types.GenesisDoc
	Wallet          *rivercrypto.Wallet
	PersistentPeers []string
	App             abci.Application
}

type MetadataShard struct {
	opts      MetadataShardOpts
	serverCtx context.Context

	chainID string
	app     abci.Application

	node *node.Node
}

func NewMetadataShard(ctx context.Context, opts MetadataShardOpts) (*MetadataShard, error) {
	if opts.RootDir == "" {
		return nil, RiverError(Err_INVALID_ARGUMENT, "root dir is required")
	}
	if opts.Wallet == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "wallet is required")
	}

	chainID := chainIDForShard(opts.ShardID)
	rootDir := filepath.Join(opts.RootDir, chainID)

	cfg := cmtcfg.DefaultConfig()
	cfg.SetRoot(rootDir)
	cmtcfg.EnsureRoot(rootDir)

	// P2P and RPC defaults are tuned for local shard instances.
	cfg.BaseConfig.Moniker = chainID
	cfg.P2P.AddrBookStrict = true
	cfg.P2P.AllowDuplicateIP = true         // TODO: in prod set to false?
	cfg.Consensus.CreateEmptyBlocks = false // produce blocks only when txs are available
	cfg.Consensus.CreateEmptyBlocksInterval = 0
	cfg.Consensus.TimeoutPropose = 300 * time.Millisecond
	cfg.Consensus.TimeoutPrevote = 100 * time.Millisecond
	cfg.Consensus.TimeoutPrecommit = 100 * time.Millisecond
	cfg.Consensus.TimeoutCommit = 200 * time.Millisecond
	cfg.TxIndex.Indexer = "null"

	if opts.P2PPort > 0 {
		cfg.P2P.ListenAddress = fmt.Sprintf("tcp://0.0.0.0:%d", opts.P2PPort)
		cfg.P2P.ExternalAddress = fmt.Sprintf("tcp://127.0.0.1:%d", opts.P2PPort)
	}
	cfg.RPC.ListenAddress = ""
	if len(opts.PersistentPeers) > 0 {
		cfg.P2P.PersistentPeers = strings.Join(opts.PersistentPeers, ",")
	}

	privKey := ed25519.GenPrivKeyFromSecret(opts.Wallet.PrivateKey)
	privVal, err := privval.LoadOrGenFilePV(
		cfg.PrivValidatorKeyFile(),
		cfg.PrivValidatorStateFile(),
		func() (crypto.PrivKey, error) {
			return privKey, nil
		},
	)
	if err != nil {
		return nil, RiverErrorWithBase(Err_INTERNAL, "load or generate priv validator", err)
	}

	nodeKey := &p2p.NodeKey{PrivKey: privKey}

	app := opts.App
	if app == nil {
		app = abci.NewBaseApplication()
	}

	shard := &MetadataShard{
		opts:      opts,
		serverCtx: ctx,
		chainID:   chainID,
		app:       app,
	}

	// Save genenis doc
	err = opts.GenesisDoc.ValidateAndComplete()
	if err != nil {
		return nil, RiverErrorWithBase(Err_INTERNAL, "validate genesis doc", err)
	}
	err = opts.GenesisDoc.SaveAs(cfg.GenesisFile())
	if err != nil {
		return nil, RiverErrorWithBase(Err_INTERNAL, "write genesis file", err)
	}

	shard.node, err = node.NewNode(
		ctx,
		cfg,
		privVal,
		nodeKey,
		proxy.NewLocalClientCreator(app),
		node.DefaultGenesisDocProviderFunc(cfg),
		cmtcfg.DefaultDBProvider,
		node.DefaultMetricsProvider(cfg.Instrumentation),
		newCometLogger(ctx, chainID, opts.P2PPort),
	)
	if err != nil {
		return nil, RiverErrorWithBase(Err_INTERNAL, "create cometbft node", err)
	}

	if err := shard.node.Start(); err != nil {
		return nil, RiverErrorWithBase(Err_INTERNAL, "start cometbft node", err)
	}

	go func() {
		<-ctx.Done()
		shard.node.Stop()
	}()

	return shard, nil
}

func (s *MetadataShard) SubmitTx(tx []byte) error {
	if s.node == nil {
		return RiverError(Err_FAILED_PRECONDITION, "metadata shard not started")
	}
	_, err := s.node.Mempool().CheckTx(tx, "")
	return err
}

func (s *MetadataShard) Height() int64 {
	if s.node == nil {
		return 0
	}
	return s.node.BlockStore().Height()
}

func chainIDForShard(shardID uint64) string {
	return fmt.Sprintf("%s%016x", chainIDPrefix, shardID)
}

type cometZapLogger struct {
	log *logging.Log
}

func newCometLogger(ctx context.Context, chainID string, p2pPort int) log.Logger {
	return cometZapLogger{log: logging.FromCtx(ctx).With("cometbft", chainID, "p2pPort", p2pPort)}
}

func (l cometZapLogger) Debug(msg string, keyvals ...any) {
	l.log.Default.Debugw(msg, keyvals...)
}

func (l cometZapLogger) Info(msg string, keyvals ...any) {
	l.log.Default.Infow(msg, keyvals...)
}

func (l cometZapLogger) Error(msg string, keyvals ...any) {
	l.log.Default.Errorw(msg, keyvals...)
}

func (l cometZapLogger) With(keyvals ...any) log.Logger {
	return cometZapLogger{log: l.log.With(keyvals...)}
}
