package metadata

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	abci "github.com/cometbft/cometbft/abci/types"
	cmtcfg "github.com/cometbft/cometbft/config"
	"github.com/cometbft/cometbft/crypto"
	"github.com/cometbft/cometbft/crypto/ed25519"
	"github.com/cometbft/cometbft/libs/log"
	"github.com/cometbft/cometbft/libs/service"
	"github.com/cometbft/cometbft/node"
	"github.com/cometbft/cometbft/p2p"
	"github.com/cometbft/cometbft/privval"
	"github.com/cometbft/cometbft/proxy"
	"github.com/cometbft/cometbft/types"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const defaultValidatorPower int64 = 1
const chainIDPrefix = "metadata-shard-"

type MetadataShardOpts struct {
	ShardID         uint64
	P2PPort         int
	RPCPort         int
	RootDir         string
	GenesisDoc      *types.GenesisDoc
	NodeKey         *p2p.NodeKey
	PrivValidator   types.PrivValidator
	PersistentPeers []string
	App             abci.Application
	Logger          log.Logger
}

type MetadataShard struct {
	opts MetadataShardOpts

	config        *cmtcfg.Config
	node          *node.Node
	app           abci.Application
	serverCtx     context.Context
	logger        log.Logger
	privValidator types.PrivValidator
	nodeKey       *p2p.NodeKey
	genesisDoc    *types.GenesisDoc
}

func NewMetadataShard(ctx context.Context, opts MetadataShardOpts) (*MetadataShard, error) {
	logger := opts.Logger
	if logger == nil {
		logger = log.NewNopLogger()
	}

	if opts.RootDir == "" {
		return nil, RiverError(Err_INVALID_ARGUMENT, "root dir is required")
	}

	chainID := chainIDForShard(opts.ShardID)
	rootDir := filepath.Join(opts.RootDir, chainID)

	cfg := cmtcfg.DefaultConfig()
	cfg.SetRoot(rootDir)
	cmtcfg.EnsureRoot(rootDir)

	// P2P and RPC defaults are tuned for local shard instances.
	cfg.BaseConfig.Moniker = fmt.Sprintf("metadata-shard-%d", opts.ShardID)
	cfg.P2P.AddrBookStrict = false
	cfg.P2P.AllowDuplicateIP = true
	cfg.Consensus.CreateEmptyBlocks = false // produce blocks only when txs are available
	cfg.Consensus.CreateEmptyBlocksInterval = 0
	cfg.Consensus.TimeoutPropose = 500 * time.Millisecond
	cfg.Consensus.TimeoutPrevote = 200 * time.Millisecond
	cfg.Consensus.TimeoutPrecommit = 200 * time.Millisecond
	cfg.Consensus.TimeoutCommit = 500 * time.Millisecond
	cfg.TxIndex.Indexer = "null"

	if opts.P2PPort > 0 {
		cfg.P2P.ListenAddress = fmt.Sprintf("tcp://0.0.0.0:%d", opts.P2PPort)
		cfg.P2P.ExternalAddress = fmt.Sprintf("tcp://127.0.0.1:%d", opts.P2PPort)
	}
	if opts.RPCPort != 0 {
		cfg.RPC.ListenAddress = fmt.Sprintf("tcp://127.0.0.1:%d", opts.RPCPort)
	} else {
		cfg.RPC.ListenAddress = "tcp://127.0.0.1:0"
	}
	if len(opts.PersistentPeers) > 0 {
		cfg.P2P.PersistentPeers = strings.Join(opts.PersistentPeers, ",")
	}

	privVal := opts.PrivValidator
	if privVal == nil {
		var err error
		privVal, err = privval.LoadOrGenFilePV(
			cfg.PrivValidatorKeyFile(),
			cfg.PrivValidatorStateFile(),
			func() (crypto.PrivKey, error) {
				return ed25519.GenPrivKey(), nil
			},
		)
		if err != nil {
			return nil, RiverErrorWithBase(Err_INTERNAL, "load or generate priv validator", err)
		}
	}

	nodeKey := opts.NodeKey
	if nodeKey == nil {
		var err error
		nodeKey, err = p2p.LoadOrGenNodeKey(cfg.NodeKeyFile())
		if err != nil {
			return nil, RiverErrorWithBase(Err_INTERNAL, "load or generate node key", err)
		}
	}

	app := opts.App
	if app == nil {
		app = abci.NewBaseApplication()
	}

	shard := &MetadataShard{
		opts:          opts,
		config:        cfg,
		app:           app,
		logger:        logger,
		privValidator: privVal,
		nodeKey:       nodeKey,
	}

	if err := shard.SetGenesisDoc(opts.GenesisDoc); err != nil {
		return nil, err
	}

	if err := shard.start(ctx); err != nil {
		return nil, err
	}

	go func() {
		<-ctx.Done()
		_ = shard.stop()
	}()

	return shard, nil
}

func (s *MetadataShard) start(ctx context.Context) error {
	if s.node != nil {
		return RiverError(Err_FAILED_PRECONDITION, "metadata shard already started")
	}
	if s.genesisDoc == nil {
		return RiverError(Err_FAILED_PRECONDITION, "genesis doc is not configured")
	}

	s.serverCtx = ctx

	if err := s.config.ValidateBasic(); err != nil {
		return RiverErrorWithBase(Err_INVALID_ARGUMENT, "invalid cometbft config", err)
	}

	if err := s.genesisDoc.SaveAs(s.config.GenesisFile()); err != nil {
		return RiverErrorWithBase(Err_INTERNAL, "write genesis file", err)
	}

	nodeInstance, err := node.NewNode(
		ctx,
		s.config,
		s.privValidator,
		s.nodeKey,
		proxy.NewLocalClientCreator(s.app),
		node.DefaultGenesisDocProviderFunc(s.config),
		cmtcfg.DefaultDBProvider,
		node.DefaultMetricsProvider(s.config.Instrumentation),
		s.logger,
	)
	if err != nil {
		return RiverErrorWithBase(Err_INTERNAL, "create cometbft node", err)
	}

	if err := nodeInstance.Start(); err != nil {
		return RiverErrorWithBase(Err_INTERNAL, "start cometbft node", err)
	}

	s.node = nodeInstance
	return nil
}

func (s *MetadataShard) stop() error {
	if s.node == nil {
		return nil
	}
	if err := s.node.Stop(); err != nil {
		if !errors.Is(err, service.ErrAlreadyStopped) {
			return err
		}
	}
	s.node = nil
	return nil
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

func (s *MetadataShard) SetPersistentPeers(peers []string) error {
	if s.node != nil {
		return RiverError(Err_FAILED_PRECONDITION, "cannot update peers after shard start")
	}
	s.config.P2P.PersistentPeers = strings.Join(peers, ",")
	return nil
}

func (s *MetadataShard) NodeAddress() (string, error) {
	addr := s.config.P2P.ExternalAddress
	if addr == "" {
		addr = s.config.P2P.ListenAddress
	}
	hostPort, err := hostPortFromAddress(addr)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s@%s", s.nodeKey.ID(), hostPort), nil
}

func (s *MetadataShard) GenesisValidator(power int64) (types.GenesisValidator, error) {
	if power <= 0 {
		power = defaultValidatorPower
	}
	pubKey, err := s.privValidator.GetPubKey()
	if err != nil {
		return types.GenesisValidator{}, RiverErrorWithBase(Err_INTERNAL, "get validator public key", err)
	}
	return types.GenesisValidator{
		PubKey: pubKey,
		Power:  power,
		Name:   s.config.Moniker,
	}, nil
}

func (s *MetadataShard) SetGenesisDoc(doc *types.GenesisDoc) error {
	if s.node != nil {
		return RiverError(Err_FAILED_PRECONDITION, "cannot update genesis after shard start")
	}
	if doc == nil {
		pubKey, err := s.privValidator.GetPubKey()
		if err != nil {
			return RiverErrorWithBase(Err_INTERNAL, "get validator public key", err)
		}
		doc = s.defaultGenesisDoc(pubKey)
	}

	genDoc := cloneGenesisDoc(doc)
	expectedChainID := s.defaultChainID()
	if genDoc.ChainID == "" {
		genDoc.ChainID = expectedChainID
	} else if genDoc.ChainID != expectedChainID {
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("genesis doc chain ID %q does not match shard chain ID %q", genDoc.ChainID, expectedChainID))
	}
	if genDoc.GenesisTime.IsZero() {
		genDoc.GenesisTime = time.Now().UTC()
	}
	if len(genDoc.Validators) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "genesis doc must contain at least one validator")
	}

	if err := genDoc.ValidateAndComplete(); err != nil {
		return RiverErrorWithBase(Err_INVALID_ARGUMENT, "invalid genesis doc", err)
	}

	s.genesisDoc = genDoc
	return nil
}

func (s *MetadataShard) defaultChainID() string {
	return chainIDForShard(s.opts.ShardID)
}

func (s *MetadataShard) defaultGenesisDoc(pubKey crypto.PubKey) *types.GenesisDoc {
	return &types.GenesisDoc{
		ChainID:       s.defaultChainID(),
		GenesisTime:   time.Now().UTC(),
		Validators:    []types.GenesisValidator{{PubKey: pubKey, Power: defaultValidatorPower, Name: s.config.Moniker}},
		InitialHeight: 1,
	}
}

func hostPortFromAddress(addr string) (string, error) {
	if addr == "" {
		return "", RiverError(Err_INVALID_ARGUMENT, "p2p address is empty")
	}
	if !strings.Contains(addr, "://") {
		return addr, nil
	}
	parsed, err := url.Parse(addr)
	if err != nil {
		return "", RiverErrorWithBase(Err_INVALID_ARGUMENT, fmt.Sprintf("parse p2p address %q", addr), err)
	}
	if parsed.Host == "" {
		return "", RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("p2p address %q does not contain host", addr))
	}
	return parsed.Host, nil
}

func cloneGenesisDoc(doc *types.GenesisDoc) *types.GenesisDoc {
	copyDoc := *doc
	copyDoc.Validators = append([]types.GenesisValidator(nil), doc.Validators...)
	copyDoc.AppHash = append([]byte(nil), doc.AppHash...)
	if doc.AppState != nil {
		copyDoc.AppState = append([]byte(nil), doc.AppState...)
	}
	if doc.ConsensusParams != nil {
		params := *doc.ConsensusParams
		copyDoc.ConsensusParams = &params
	}
	return &copyDoc
}

func chainIDForShard(shardID uint64) string {
	return fmt.Sprintf("%s%x", chainIDPrefix, shardID)
}
