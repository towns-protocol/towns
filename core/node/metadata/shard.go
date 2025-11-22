package metadata

import (
	"context"
	"encoding/json"
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
	"github.com/towns-protocol/towns/core/node/storage"
)

const (
	defaultValidatorPower int64 = 1
	chainIDPrefix               = "metadata-shard-"
)

var _ abci.Application = (*MetadataShard)(nil)

type MetadataShardOpts struct {
	ShardID         uint64
	P2PPort         int
	RootDir         string
	GenesisDoc      *types.GenesisDoc
	Wallet          *rivercrypto.Wallet
	PersistentPeers []string
	Store           storage.MetadataStore
}

type MetadataShard struct {
	opts      MetadataShardOpts
	serverCtx context.Context

	chainID string

	node *node.Node

	store storage.MetadataStore
	log   *logging.Log
}

func NewMetadataShard(ctx context.Context, opts MetadataShardOpts) (*MetadataShard, error) {
	if opts.RootDir == "" {
		return nil, RiverError(Err_INVALID_ARGUMENT, "root dir is required")
	}
	if opts.Wallet == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "wallet is required")
	}
	if opts.Store == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "store is required")
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

	shard := &MetadataShard{
		opts:      opts,
		serverCtx: ctx,
		chainID:   chainID,
		store:     opts.Store,
		log:       logging.FromCtx(ctx),
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
		proxy.NewLocalClientCreator(shard),
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

func (s *MetadataShard) Stopped() <-chan struct{} {
	return s.node.Quit()
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

func (MetadataShard) Info(context.Context, *abci.InfoRequest) (*abci.InfoResponse, error) {
	return &abci.InfoResponse{}, nil
}

func (MetadataShard) CheckTx(context.Context, *abci.CheckTxRequest) (*abci.CheckTxResponse, error) {
	return &abci.CheckTxResponse{Code: abci.CodeTypeOK}, nil
}

func (m *MetadataShard) Commit(ctx context.Context, _ *abci.CommitRequest) (*abci.CommitResponse, error) {
	appHash, err := m.store.ComputeAppHash(ctx, m.opts.ShardID)
	if err != nil {
		return nil, AsRiverError(err).Func("Commit")
	}
	if err := m.store.SetShardState(ctx, m.opts.ShardID, m.node.BlockStore().Height(), appHash); err != nil {
		return nil, AsRiverError(err).Func("Commit")
	}
	return &abci.CommitResponse{Data: appHash}, nil
}

func (MetadataShard) Query(context.Context, *abci.QueryRequest) (*abci.QueryResponse, error) {
	return &abci.QueryResponse{Code: abci.CodeTypeOK}, nil
}

func (MetadataShard) InitChain(context.Context, *abci.InitChainRequest) (*abci.InitChainResponse, error) {
	return &abci.InitChainResponse{}, nil
}

func (MetadataShard) ListSnapshots(context.Context, *abci.ListSnapshotsRequest) (*abci.ListSnapshotsResponse, error) {
	return &abci.ListSnapshotsResponse{}, nil
}

func (MetadataShard) OfferSnapshot(context.Context, *abci.OfferSnapshotRequest) (*abci.OfferSnapshotResponse, error) {
	return &abci.OfferSnapshotResponse{}, nil
}

func (MetadataShard) LoadSnapshotChunk(
	context.Context,
	*abci.LoadSnapshotChunkRequest,
) (*abci.LoadSnapshotChunkResponse, error) {
	return &abci.LoadSnapshotChunkResponse{}, nil
}

func (MetadataShard) ApplySnapshotChunk(
	context.Context,
	*abci.ApplySnapshotChunkRequest,
) (*abci.ApplySnapshotChunkResponse, error) {
	return &abci.ApplySnapshotChunkResponse{}, nil
}

func (MetadataShard) PrepareProposal(
	_ context.Context,
	req *abci.PrepareProposalRequest,
) (*abci.PrepareProposalResponse, error) {
	txs := make([][]byte, 0, len(req.Txs))
	var totalBytes int64
	for _, tx := range req.Txs {
		totalBytes += int64(len(tx))
		if totalBytes > req.MaxTxBytes {
			break
		}
		txs = append(txs, tx)
	}
	return &abci.PrepareProposalResponse{Txs: txs}, nil
}

func (MetadataShard) ProcessProposal(
	context.Context,
	*abci.ProcessProposalRequest,
) (*abci.ProcessProposalResponse, error) {
	return &abci.ProcessProposalResponse{Status: abci.PROCESS_PROPOSAL_STATUS_ACCEPT}, nil
}

func (MetadataShard) ExtendVote(context.Context, *abci.ExtendVoteRequest) (*abci.ExtendVoteResponse, error) {
	return &abci.ExtendVoteResponse{}, nil
}

func (MetadataShard) VerifyVoteExtension(
	context.Context,
	*abci.VerifyVoteExtensionRequest,
) (*abci.VerifyVoteExtensionResponse, error) {
	return &abci.VerifyVoteExtensionResponse{
		Status: abci.VERIFY_VOTE_EXTENSION_STATUS_ACCEPT,
	}, nil
}

func (MetadataShard) FinalizeBlock(
	ctx context.Context,
	req *abci.FinalizeBlockRequest,
) (*abci.FinalizeBlockResponse, error) {
	txs := make([]*abci.ExecTxResult, len(req.Txs))
	for i, txBytes := range req.Txs {
		result := &abci.ExecTxResult{Code: abci.CodeTypeOK}
		metaTx := &MetadataTx{}
		if err := json.Unmarshal(txBytes, metaTx); err != nil {
			result.Code = abci.CodeTypeEncodingError
			result.Log = fmt.Sprintf("decode error: %v", err)
			txs[i] = result
			continue
		}
		if err := m.validateTx(metaTx); err != nil {
			result.Code = abci.CodeTypeUnauthorized
			result.Log = fmt.Sprintf("validation failed: %v", err)
			txs[i] = result
			continue
		}
		if err := m.store.ApplyMetadataTx(ctx, m.opts.ShardID, req.Height, metaTx); err != nil {
			txs[i] = &abci.ExecTxResult{
				Code: abci.CodeTypeAbciError,
				Log:  fmt.Sprintf("apply failed: %v", err),
			}
			continue
		}
		txs[i] = result
	}
	return &abci.FinalizeBlockResponse{
		TxResults: txs,
	}, nil
}

func (m *MetadataShard) validateTx(tx *MetadataTx) error {
	if tx == nil || tx.Op == nil {
		return RiverError(Err_INVALID_ARGUMENT, "missing op")
	}
	switch op := tx.Op.(type) {
	case *MetadataTx_CreateStream:
		return m.validateCreateStream(op.CreateStream)
	case *MetadataTx_SetStreamLastMiniblockBatch:
		return m.validateSetBatch(op.SetStreamLastMiniblockBatch)
	case *MetadataTx_UpdateStreamNodesAndReplication:
		return m.validateUpdateNodes(op.UpdateStreamNodesAndReplication)
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown op")
	}
}

func (m *MetadataShard) validateCreateStream(cs *CreateStreamTx) error {
	if cs == nil {
		return RiverError(Err_INVALID_ARGUMENT, "create payload missing")
	}
	if len(cs.StreamId) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
	}
	if len(cs.GenesisMiniblockHash) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "genesis_miniblock_hash must be 32 bytes")
	}
	if len(cs.GenesisMiniblock) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "genesis_miniblock required")
	}
	if len(cs.Nodes) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "nodes required")
	}
	for _, n := range cs.Nodes {
		if len(n) != 20 {
			return RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
		}
	}
	if cs.ReplicationFactor == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "replication_factor must be > 0")
	}
	return nil
}

func (m *MetadataShard) validateSetBatch(batch *SetStreamLastMiniblockBatchTx) error {
	if batch == nil {
		return RiverError(Err_INVALID_ARGUMENT, "batch missing")
	}
	if len(batch.Miniblocks) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "miniblocks missing")
	}
	for _, mb := range batch.Miniblocks {
		if len(mb.StreamId) != 32 {
			return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
		}
		if len(mb.PrevMiniblockHash) != 32 || len(mb.LastMiniblockHash) != 32 {
			return RiverError(Err_INVALID_ARGUMENT, "hashes must be 32 bytes")
		}
		if mb.LastMiniblockNum <= 0 {
			return RiverError(Err_INVALID_ARGUMENT, "last_miniblock_num must be > 0")
		}
	}
	return nil
}

func (m *MetadataShard) validateUpdateNodes(update *UpdateStreamNodesAndReplicationTx) error {
	if update == nil {
		return RiverError(Err_INVALID_ARGUMENT, "update missing")
	}
	if len(update.StreamId) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
	}
	for _, n := range update.Nodes {
		if len(n) != 20 {
			return RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
		}
	}
	if update.ReplicationFactor != nil && *update.ReplicationFactor == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "replication_factor must be > 0")
	}
	return nil
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
