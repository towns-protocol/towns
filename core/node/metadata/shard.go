package metadata

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"path/filepath"
	"strconv"
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
	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	rivercrypto "github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/metadata/mdstate"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

const (
	defaultValidatorPower int64  = 1
	chainIDPrefix         string = "metadata-shard-"
)

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

	// pendingBlock holds operations collected during FinalizeBlock to be applied in Commit.
	// Set during FinalizeBlock, cleared after Commit.
	pendingBlock *PendingBlockState
}

var _ abci.Application = (*MetadataShard)(nil)

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
	if err := opts.Store.EnsureShardStorage(ctx, opts.ShardID); err != nil {
		return nil, AsRiverError(err).Func("EnsureShardStorage")
	}
	rootDir := filepath.Join(opts.RootDir, chainID)

	cfg := cmtcfg.DefaultConfig()
	cfg.SetRoot(rootDir)
	cmtcfg.EnsureRoot(rootDir)

	// P2P and RPC defaults are tuned for local shard instances.
	cfg.BaseConfig.Moniker = chainID
	cfg.P2P.AddrBookStrict = false          // Allow localhost addresses for local/test environments
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

	log := logging.FromCtx(ctx).Named("md").With("shardId", opts.ShardID)
	ctx = logging.CtxWithLog(ctx, log)

	shard := &MetadataShard{
		opts:      opts,
		serverCtx: ctx,
		chainID:   chainID,
		store:     opts.Store,
		log:       log,
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
		if err := shard.node.Stop(); err != nil {
			shard.log.Default.Warnw("failed to stop cometbft node", "err", err)
		}
	}()

	return shard, nil
}

func (m *MetadataShard) Stopped() <-chan struct{} {
	return m.node.Quit()
}

func (m *MetadataShard) Height() int64 {
	if m.node == nil {
		return 0
	}
	return m.node.BlockStore().Height()
}

// Node returns the underlying CometBFT node for direct RPC client access.
func (m *MetadataShard) Node() *node.Node {
	return m.node
}

func chainIDForShard(shardID uint64) string {
	return fmt.Sprintf("%s%016x", chainIDPrefix, shardID)
}

func decodeMetadataTx(txBytes []byte) (*MetadataTx, error) {
	metaTx := &MetadataTx{}
	if err := proto.Unmarshal(txBytes, metaTx); err == nil {
		return metaTx, nil
	}
	return nil, RiverError(Err_INVALID_ARGUMENT, "unable to decode metadata tx")
}

type abciErrorResponder interface {
	*abci.CheckTxResponse | *abci.QueryResponse
}

func setError[T abciErrorResponder](resp T, err error) {
	if err == nil {
		return
	}
	riverErr := AsRiverError(err)
	switch r := any(resp).(type) {
	case *abci.CheckTxResponse:
		r.Code = uint32(riverErr.Code)
		r.Log = riverErr.Error()
		r.Codespace = "towns"
	case *abci.QueryResponse:
		r.Code = uint32(riverErr.Code)
		r.Log = riverErr.Error()
		r.Codespace = "towns"
	}
}

func parsePagination(u *url.URL) (int64, int32, error) {
	offset := int64(0)
	limit := int32(100)

	values := u.Query()
	if rawOffset := values.Get("offset"); rawOffset != "" {
		val, err := strconv.ParseInt(rawOffset, 10, 64)
		if err != nil {
			return 0, 0, RiverError(Err_INVALID_ARGUMENT, "invalid offset", "err", err)
		}
		if val < 0 {
			return 0, 0, RiverError(Err_INVALID_ARGUMENT, "offset must be >= 0")
		}
		offset = val
	}

	if rawLimit := values.Get("limit"); rawLimit != "" {
		val, err := strconv.ParseInt(rawLimit, 10, 32)
		if err != nil {
			return 0, 0, RiverError(Err_INVALID_ARGUMENT, "invalid limit", "err", err)
		}
		if val > 0 {
			limit = int32(val)
		}
	}

	return offset, limit, nil
}

func (m *MetadataShard) Info(ctx context.Context, _ *abci.InfoRequest) (*abci.InfoResponse, error) {
	if err := m.store.EnsureShardStorage(ctx, m.opts.ShardID); err != nil {
		return nil, AsRiverError(err).Func("Info")
	}
	state, err := m.store.GetShardState(ctx, m.opts.ShardID)
	if err != nil {
		return nil, AsRiverError(err).Func("Info")
	}
	return &abci.InfoResponse{
		Data:             m.chainID,
		LastBlockHeight:  state.LastHeight,
		LastBlockAppHash: state.LastAppHash,
	}, nil
}

func (m *MetadataShard) CheckTx(ctx context.Context, req *abci.CheckTxRequest) (*abci.CheckTxResponse, error) {
	resp := &abci.CheckTxResponse{Code: abci.CodeTypeOK}
	metaTx, err := decodeMetadataTx(req.Tx)
	if err != nil {
		setError(resp, err)
		return resp, nil
	}
	if err := ValidateMetadataTx(metaTx); err != nil {
		setError(resp, err)
		return resp, nil
	}
	return resp, nil
}

func (m *MetadataShard) Query(ctx context.Context, req *abci.QueryRequest) (*abci.QueryResponse, error) {
	resp := &abci.QueryResponse{Code: abci.CodeTypeOK}

	state, err := m.store.GetShardState(ctx, m.opts.ShardID)
	if err == nil {
		resp.Height = state.LastHeight
	}

	parsedPath, err := url.Parse(req.Path)
	if err != nil {
		setError(resp, RiverError(Err_INVALID_ARGUMENT, "invalid path", "err", err))
		return resp, nil
	}

	switch {
	case strings.HasPrefix(parsedPath.Path, "/stream/"):
		streamHex := strings.TrimPrefix(parsedPath.Path, "/stream/")
		if streamHex == "" && len(req.Data) > 0 {
			streamHex = hex.EncodeToString(req.Data)
		}
		streamID, err := StreamIdFromString(streamHex)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		record, err := m.store.GetStream(ctx, m.opts.ShardID, streamID)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		payload, err := protojson.Marshal(record)
		if err != nil {
			return nil, AsRiverError(err).Func("Query.stream.encode")
		}
		resp.Value = payload
	case parsedPath.Path == "/streams":
		offset, limit, err := parsePagination(parsedPath)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		streams, err := m.store.ListStreams(ctx, m.opts.ShardID, offset, limit)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		count, err := m.store.CountStreams(ctx, m.opts.ShardID)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		payload, err := json.Marshal(struct {
			Streams []*StreamMetadata `json:"streams"`
			Offset  int64             `json:"offset"`
			Limit   int32             `json:"limit"`
			Count   int64             `json:"count"`
		}{
			Streams: streams,
			Offset:  offset,
			Limit:   limit,
			Count:   count,
		})
		if err != nil {
			return nil, AsRiverError(err).Func("Query.streams.encode")
		}
		resp.Value = payload
	case strings.HasPrefix(parsedPath.Path, "/streams/node/"):
		addrHex := strings.TrimPrefix(parsedPath.Path, "/streams/node/")
		addrHex = strings.TrimPrefix(addrHex, "0x")
		if len(addrHex) != 40 {
			setError(resp, RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes hex"))
			return resp, nil
		}
		nodeAddr := common.HexToAddress(addrHex)
		offset, limit, err := parsePagination(parsedPath)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		streams, err := m.store.ListStreamsByNode(ctx, m.opts.ShardID, nodeAddr, offset, limit)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		count, err := m.store.CountStreamsByNode(ctx, m.opts.ShardID, nodeAddr)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		payload, err := json.Marshal(struct {
			Node    string            `json:"node"`
			Streams []*StreamMetadata `json:"streams"`
			Offset  int64             `json:"offset"`
			Limit   int32             `json:"limit"`
			Count   int64             `json:"count"`
		}{
			Node:    "0x" + addrHex,
			Streams: streams,
			Offset:  offset,
			Limit:   limit,
			Count:   count,
		})
		if err != nil {
			return nil, AsRiverError(err).Func("Query.node.encode")
		}
		resp.Value = payload
	case parsedPath.Path == "/streams/count":
		count, err := m.store.CountStreams(ctx, m.opts.ShardID)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		payload, err := json.Marshal(struct {
			Count int64 `json:"count"`
		}{Count: count})
		if err != nil {
			return nil, AsRiverError(err).Func("Query.count.encode")
		}
		resp.Value = payload
	case strings.HasPrefix(parsedPath.Path, "/streams/count/"):
		addrHex := strings.TrimPrefix(parsedPath.Path, "/streams/count/")
		addrHex = strings.TrimPrefix(addrHex, "0x")
		if len(addrHex) != 40 {
			setError(resp, RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes hex"))
			return resp, nil
		}
		nodeAddr := common.HexToAddress(addrHex)
		count, err := m.store.CountStreamsByNode(ctx, m.opts.ShardID, nodeAddr)
		if err != nil {
			setError(resp, err)
			return resp, nil
		}
		payload, err := json.Marshal(struct {
			Node  string `json:"node"`
			Count int64  `json:"count"`
		}{
			Node:  "0x" + addrHex,
			Count: count,
		})
		if err != nil {
			return nil, AsRiverError(err).Func("Query.count.node.encode")
		}
		resp.Value = payload
	default:
		setError(resp, RiverError(Err_INVALID_ARGUMENT, "unsupported query path", "path", req.Path))
	}
	return resp, nil
}

func (m *MetadataShard) InitChain(ctx context.Context, req *abci.InitChainRequest) (*abci.InitChainResponse, error) {
	if err := m.store.EnsureShardStorage(ctx, m.opts.ShardID); err != nil {
		return nil, AsRiverError(err).Func("InitChain")
	}
	return &abci.InitChainResponse{
		ConsensusParams: req.ConsensusParams,
		Validators:      req.Validators,
	}, nil
}

func (m *MetadataShard) ListSnapshots(
	context.Context,
	*abci.ListSnapshotsRequest,
) (*abci.ListSnapshotsResponse, error) {
	return &abci.ListSnapshotsResponse{}, nil
}

func (m *MetadataShard) OfferSnapshot(
	context.Context,
	*abci.OfferSnapshotRequest,
) (*abci.OfferSnapshotResponse, error) {
	return &abci.OfferSnapshotResponse{}, nil
}

func (m *MetadataShard) LoadSnapshotChunk(
	context.Context,
	*abci.LoadSnapshotChunkRequest,
) (*abci.LoadSnapshotChunkResponse, error) {
	return &abci.LoadSnapshotChunkResponse{}, nil
}

func (m *MetadataShard) ApplySnapshotChunk(
	context.Context,
	*abci.ApplySnapshotChunkRequest,
) (*abci.ApplySnapshotChunkResponse, error) {
	return &abci.ApplySnapshotChunkResponse{}, nil
}

func (m *MetadataShard) PrepareProposal(
	_ context.Context,
	req *abci.PrepareProposalRequest,
) (*abci.PrepareProposalResponse, error) {
	txs := make([][]byte, 0, len(req.Txs))
	var totalBytes int64
	for _, tx := range req.Txs {
		metaTx, err := decodeMetadataTx(tx)
		if err != nil {
			continue
		}
		if err := ValidateMetadataTx(metaTx); err != nil {
			continue
		}

		txSize := int64(len(tx))
		if totalBytes+txSize > req.MaxTxBytes {
			break
		}
		txs = append(txs, tx)
		totalBytes += txSize
	}
	return &abci.PrepareProposalResponse{Txs: txs}, nil
}

func (m *MetadataShard) ProcessProposal(
	_ context.Context,
	req *abci.ProcessProposalRequest,
) (*abci.ProcessProposalResponse, error) {
	m.log.Infow(
		"processing proposal",
		"height",
		req.Height,
		"blockHash",
		req.Hash,
		"txs",
		len(req.Txs),
	)
	for _, tx := range req.Txs {
		metaTx, err := decodeMetadataTx(tx)
		if err != nil {
			return &abci.ProcessProposalResponse{Status: abci.PROCESS_PROPOSAL_STATUS_REJECT}, nil
		}
		if err := ValidateMetadataTx(metaTx); err != nil {
			return &abci.ProcessProposalResponse{Status: abci.PROCESS_PROPOSAL_STATUS_REJECT}, nil
		}
	}
	return &abci.ProcessProposalResponse{Status: abci.PROCESS_PROPOSAL_STATUS_ACCEPT}, nil
}

func (m *MetadataShard) ExtendVote(context.Context, *abci.ExtendVoteRequest) (*abci.ExtendVoteResponse, error) {
	return &abci.ExtendVoteResponse{}, nil
}

func (m *MetadataShard) VerifyVoteExtension(
	context.Context,
	*abci.VerifyVoteExtensionRequest,
) (*abci.VerifyVoteExtensionResponse, error) {
	return &abci.VerifyVoteExtensionResponse{
		Status: abci.VERIFY_VOTE_EXTENSION_STATUS_ACCEPT,
	}, nil
}

func (m *MetadataShard) FinalizeBlock(
	ctx context.Context,
	req *abci.FinalizeBlockRequest,
) (*abci.FinalizeBlockResponse, error) {
	resp, err := m.finalizeBlockImpl(ctx, req)
	if err != nil {
		m.log.Errorw(
			"failed to finalize block",
			"err", err,
			"height", req.Height,
			"blockHash", req.Hash,
		)
		return nil, err
	}

	m.log.Infow(
		"finalized block",
		"height", req.Height,
		"blockHash", req.Hash,
		"txs", len(req.Txs),
		"appHash", resp.AppHash,
	)
	return resp, nil
}

func (m *MetadataShard) finalizeBlockImpl(
	ctx context.Context,
	req *abci.FinalizeBlockRequest,
) (*abci.FinalizeBlockResponse, error) {
	// Validate that previous FinalizeBlock was committed
	if m.pendingBlock != nil {
		return nil, RiverError(
			Err_FAILED_PRECONDITION,
			"FinalizeBlock called without committing previous block",
			"pendingHeight", m.pendingBlock.Height,
			"newHeight", req.Height,
		)
	}

	pendingBlock := &PendingBlockState{
		Height:            req.Height,
		BlockHash:         req.Hash,
		Txs:               make([]*MetadataTx, len(req.Txs)),
		TxResults:         make([]*abci.ExecTxResult, len(req.Txs)),
		CreatedStreams:    make(map[StreamId]*CreateStreamTx),
		UpdatedStreams:    make(map[StreamId]*UpdateStreamNodesAndReplicationTx),
		UpdatedMiniblocks: make(map[StreamId]*MiniblockUpdate),
	}

	for i, txBytes := range req.Txs {
		pendingBlock.TxResults[i] = &abci.ExecTxResult{}
		pendingBlock.TxResults[i].Codespace = "towns"

		metaTx, err := decodeMetadataTx(txBytes)
		if err != nil {
			pendingBlock.SetTxError(i, err)
			continue
		}
		if err := ValidateMetadataTx(metaTx); err != nil {
			pendingBlock.SetTxError(i, err)
			continue
		}

		pendingBlock.Txs[i] = metaTx
		if op, ok := metaTx.Op.(*MetadataTx_SetStreamLastMiniblockBatch); ok {
			pendingBlock.TxResults[i].Events = make([]abci.Event, len(op.SetStreamLastMiniblockBatch.Miniblocks))
		} else {
			// Batch txes report errors through events.
			// For non-batch txes mark result as unknown as a precaution.
			// PreparePendingBlock should explicitly set the result.
			pendingBlock.TxResults[i].Code = uint32(Err_UNKNOWN)
		}
	}

	err := m.store.PreparePendingBlock(ctx, m.opts.ShardID, pendingBlock)
	if err != nil {
		return nil, AsRiverError(err).Func("FinalizeBlock.ComputeAppHash")
	}

	m.pendingBlock = pendingBlock

	return &abci.FinalizeBlockResponse{
		TxResults: pendingBlock.TxResults,
		AppHash:   pendingBlock.AppHash,
	}, nil
}

func (m *MetadataShard) Commit(ctx context.Context, _ *abci.CommitRequest) (*abci.CommitResponse, error) {
	if m.pendingBlock == nil {
		m.log.Errorw("commit called without finalize block")
		return nil, RiverError(
			Err_FAILED_PRECONDITION,
			"Commit called without FinalizeBlock",
		)
	}

	err := m.store.CommitPendingBlock(ctx, m.opts.ShardID, m.pendingBlock)

	if err == nil {
		m.log.Infow(
			"committed block",
			"height", m.pendingBlock.Height,
			"blockHash", m.pendingBlock.BlockHash,
			"appHash", m.pendingBlock.AppHash,
		)
	} else {
		m.log.Errorw(
			"failed to commit block",
			"err", err,
			"height", m.pendingBlock.Height,
			"blockHash", m.pendingBlock.BlockHash,
			"appHash", m.pendingBlock.AppHash,
		)
	}

	// Drop pending state even if commit fails. This allows FinalizeBlock to be retried.
	m.pendingBlock = nil

	if err != nil {
		return nil, AsRiverError(err).Func("Commit")
	}

	return &abci.CommitResponse{}, nil
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
