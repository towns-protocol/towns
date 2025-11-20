package metadata

import (
	"context"
	"fmt"
	"net/url"
	"os"
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
)

const defaultValidatorPower int64 = 1

type MetadataShardOpts struct {
	ShardID         uint64
	P2PPort         int
	RPCPort         int
	RootDir         string
	ChainID         string
	GenesisDoc      *types.GenesisDoc
	PersistentPeers []string
	App             abci.Application
	Logger          log.Logger
}

type MetadataShard struct {
	opts MetadataShardOpts

	config        *cmtcfg.Config
	node          *node.Node
	app           abci.Application
	logger        log.Logger
	privValidator types.PrivValidator
	nodeKey       *p2p.NodeKey
	genesisDoc    *types.GenesisDoc
}

func NewMetadataShard(opts MetadataShardOpts) (*MetadataShard, error) {
	logger := opts.Logger
	if logger == nil {
		logger = log.NewNopLogger()
	}

	rootDir := opts.RootDir
	if rootDir == "" {
		tempRoot, err := os.MkdirTemp("", fmt.Sprintf("metadata-shard-%d-", opts.ShardID))
		if err != nil {
			return nil, fmt.Errorf("create shard root: %w", err)
		}
		rootDir = tempRoot
	}

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

	privVal, err := privval.LoadOrGenFilePV(
		cfg.PrivValidatorKeyFile(),
		cfg.PrivValidatorStateFile(),
		func() (crypto.PrivKey, error) {
			return ed25519.GenPrivKey(), nil
		},
	)
	if err != nil {
		return nil, fmt.Errorf("load or generate priv validator: %w", err)
	}

	nodeKey, err := p2p.LoadOrGenNodeKey(cfg.NodeKeyFile())
	if err != nil {
		return nil, fmt.Errorf("load or generate node key: %w", err)
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

	return shard, nil
}

func (s *MetadataShard) Start(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if s.node != nil {
		return fmt.Errorf("metadata shard already started")
	}
	if s.genesisDoc == nil {
		return fmt.Errorf("genesis doc is not configured")
	}

	if err := s.config.ValidateBasic(); err != nil {
		return fmt.Errorf("invalid cometbft config: %w", err)
	}

	if err := s.genesisDoc.SaveAs(s.config.GenesisFile()); err != nil {
		return fmt.Errorf("write genesis file: %w", err)
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
		return fmt.Errorf("create cometbft node: %w", err)
	}

	if err := nodeInstance.Start(); err != nil {
		return fmt.Errorf("start cometbft node: %w", err)
	}

	s.node = nodeInstance
	return nil
}

func (s *MetadataShard) Stop() error {
	if s.node == nil {
		return nil
	}
	if err := s.node.Stop(); err != nil {
		return err
	}
	s.node = nil
	return nil
}

func (s *MetadataShard) SubmitTx(tx []byte) error {
	if s.node == nil {
		return fmt.Errorf("metadata shard not started")
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
		return fmt.Errorf("cannot update peers after shard start")
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
		return types.GenesisValidator{}, fmt.Errorf("get validator public key: %w", err)
	}
	return types.GenesisValidator{
		PubKey: pubKey,
		Power:  power,
		Name:   s.config.Moniker,
	}, nil
}

func (s *MetadataShard) SetGenesisDoc(doc *types.GenesisDoc) error {
	if s.node != nil {
		return fmt.Errorf("cannot update genesis after shard start")
	}
	if doc == nil {
		pubKey, err := s.privValidator.GetPubKey()
		if err != nil {
			return fmt.Errorf("get validator public key: %w", err)
		}
		doc = s.defaultGenesisDoc(pubKey)
	}

	genDoc := cloneGenesisDoc(doc)
	if genDoc.ChainID == "" {
		genDoc.ChainID = s.defaultChainID()
	} else if s.opts.ChainID != "" && genDoc.ChainID != s.opts.ChainID {
		return fmt.Errorf("genesis doc chain ID %q does not match shard chain ID %q", genDoc.ChainID, s.opts.ChainID)
	}
	if genDoc.GenesisTime.IsZero() {
		genDoc.GenesisTime = time.Now().UTC()
	}
	if len(genDoc.Validators) == 0 {
		return fmt.Errorf("genesis doc must contain at least one validator")
	}

	if err := genDoc.ValidateAndComplete(); err != nil {
		return fmt.Errorf("invalid genesis doc: %w", err)
	}

	s.genesisDoc = genDoc
	return nil
}

func (s *MetadataShard) defaultChainID() string {
	if s.opts.ChainID != "" {
		return s.opts.ChainID
	}
	return fmt.Sprintf("metadata-shard-%d", s.opts.ShardID)
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
		return "", fmt.Errorf("p2p address is empty")
	}
	if !strings.Contains(addr, "://") {
		return addr, nil
	}
	parsed, err := url.Parse(addr)
	if err != nil {
		return "", fmt.Errorf("parse p2p address %q: %w", addr, err)
	}
	if parsed.Host == "" {
		return "", fmt.Errorf("p2p address %q does not contain host", addr)
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
