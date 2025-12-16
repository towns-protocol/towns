package metadata

import (
	"bytes"
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
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

const (
	defaultValidatorPower int64 = 1
	chainIDPrefix               = "metadata-shard-"
	codeSpaceRiver              = "towns-protocol"
)

var _ abci.Application = (*MetadataShard)(nil)

// pendingStreamState tracks the in-memory state of a stream during FinalizeBlock.
// It mirrors the DB state and is updated as operations are validated.
type pendingStreamState struct {
	exists            bool
	lastMiniblockHash []byte
	lastMiniblockNum  int64
	sealed            bool
	replicationFactor uint32
	nodeIndexes       []int32

	// Only set for newly created streams
	isNew                bool
	genesisMiniblockHash []byte
	genesisMiniblock     []byte
}

// pendingBlockState holds all pending operations and state for a block being finalized.
type pendingBlockState struct {
	height     int64
	appHash    []byte
	streams    map[string]*pendingStreamState // key: hex(streamId)
	operations []*storage.CommitOperation
}

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

	// These are only touched on the consensus ABCI connection (FinalizeBlock/Commit),
	// which CometBFT invokes sequentially, so no mutex is required.
	lastBlockHeight int64
	lastAppHash     []byte

	// pendingBlock holds operations collected during FinalizeBlock to be applied in Commit.
	// Set during FinalizeBlock, cleared after Commit.
	pendingBlock *pendingBlockState
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
	if err := opts.Store.EnsureShardStorage(ctx, opts.ShardID); err != nil {
		return nil, AsRiverError(err).Func("EnsureShardStorage")
	}
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
		if err := shard.node.Stop(); err != nil {
			shard.log.Default.Warnw("failed to stop cometbft node", "err", err)
		}
	}()

	return shard, nil
}

func (m *MetadataShard) Stopped() <-chan struct{} {
	return m.node.Quit()
}

func (m *MetadataShard) SubmitTx(tx []byte) error {
	if m.node == nil {
		return RiverError(Err_FAILED_PRECONDITION, "metadata shard not started")
	}
	_, err := m.node.Mempool().CheckTx(tx, "")
	return err
}

func (m *MetadataShard) Height() int64 {
	if m.node == nil {
		return 0
	}
	return m.node.BlockStore().Height()
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
	*abci.CheckTxResponse | *abci.ExecTxResult | *abci.QueryResponse
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
		r.Codespace = codeSpaceRiver
	case *abci.ExecTxResult:
		r.Code = uint32(riverErr.Code)
		r.Log = riverErr.Error()
		r.Codespace = codeSpaceRiver
	case *abci.QueryResponse:
		r.Code = uint32(riverErr.Code)
		r.Log = riverErr.Error()
		r.Codespace = codeSpaceRiver
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
	if err := m.validateTx(metaTx); err != nil {
		setError(resp, err)
		return resp, nil
	}
	return resp, nil
}

func (m *MetadataShard) Commit(ctx context.Context, _ *abci.CommitRequest) (*abci.CommitResponse, error) {
	// Validate that FinalizeBlock was called
	if m.pendingBlock == nil {
		return nil, RiverError(
			Err_FAILED_PRECONDITION,
			"Commit called without FinalizeBlock",
			"lastBlockHeight", m.lastBlockHeight,
		)
	}

	// Validate pending block height matches lastBlockHeight
	if m.pendingBlock.height != m.lastBlockHeight {
		return nil, RiverError(
			Err_FAILED_PRECONDITION,
			"pending block height mismatch",
			"pendingHeight", m.pendingBlock.height,
			"lastBlockHeight", m.lastBlockHeight,
		)
	}

	height := m.lastBlockHeight
	appHash := m.lastAppHash
	if appHash == nil {
		var err error
		appHash, err = m.store.ComputeAppHash(ctx, m.opts.ShardID, height)
		if err != nil {
			return nil, AsRiverError(err).Func("Commit")
		}
	}

	// Apply all pending operations and update shard state atomically
	operations := m.pendingBlock.operations

	if err := m.store.CommitBlock(ctx, m.opts.ShardID, height, appHash, operations); err != nil {
		return nil, AsRiverError(err).Func("Commit")
	}

	// Clear pending state
	m.pendingBlock = nil

	return &abci.CommitResponse{}, nil
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
		streamID, err := shared.StreamIdFromString(streamHex)
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
	state, err := m.store.GetShardState(ctx, m.opts.ShardID)
	if err == nil {
		m.lastBlockHeight = state.LastHeight
	} else {
		m.log.Default.Warnw("failed to load shard state during InitChain", "err", err)
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
		if err := m.validateTx(metaTx); err != nil {
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
	for _, tx := range req.Txs {
		metaTx, err := decodeMetadataTx(tx)
		if err != nil {
			return &abci.ProcessProposalResponse{Status: abci.PROCESS_PROPOSAL_STATUS_REJECT}, nil
		}
		if err := m.validateTx(metaTx); err != nil {
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
	// Validate that previous FinalizeBlock was committed
	if m.pendingBlock != nil {
		return nil, RiverError(
			Err_FAILED_PRECONDITION,
			"FinalizeBlock called without committing previous block",
			"pendingHeight", m.pendingBlock.height,
			"newHeight", req.Height,
		)
	}

	// Validate block height is sequential
	// Height 1 is the first block after genesis (height 0)
	expectedHeight := m.lastBlockHeight + 1
	if req.Height != expectedHeight {
		return nil, RiverError(
			Err_FAILED_PRECONDITION,
			"block height mismatch",
			"expected", expectedHeight,
			"got", req.Height,
			"lastBlockHeight", m.lastBlockHeight,
		)
	}

	// Initialize pending block state
	m.pendingBlock = &pendingBlockState{
		height:     req.Height,
		streams:    make(map[string]*pendingStreamState),
		operations: make([]*storage.CommitOperation, 0),
	}

	txs := make([]*abci.ExecTxResult, len(req.Txs))
	for i, txBytes := range req.Txs {
		metaTx, err := decodeMetadataTx(txBytes)
		if err != nil {
			res := &abci.ExecTxResult{}
			setError(res, err)
			txs[i] = res
			continue
		}

		// Format validation
		if err := m.validateTx(metaTx); err != nil {
			res := &abci.ExecTxResult{}
			setError(res, err)
			txs[i] = res
			continue
		}

		// State validation and operation collection (reads DB but doesn't write)
		var ops []*storage.CommitOperation
		switch op := metaTx.Op.(type) {
		case *MetadataTx_CreateStream:
			commitOp, err := m.processCreateStream(ctx, op.CreateStream)
			if err != nil {
				res := &abci.ExecTxResult{}
				setError(res, err)
				txs[i] = res
				continue
			}
			ops = []*storage.CommitOperation{commitOp}
		case *MetadataTx_SetStreamLastMiniblockBatch:
			batchOps, err := m.processSetMiniblockBatch(ctx, op.SetStreamLastMiniblockBatch)
			if err != nil {
				res := &abci.ExecTxResult{}
				setError(res, err)
				txs[i] = res
				continue
			}
			ops = batchOps
		case *MetadataTx_UpdateStreamNodesAndReplication:
			commitOp, err := m.processUpdateNodes(ctx, op.UpdateStreamNodesAndReplication)
			if err != nil {
				res := &abci.ExecTxResult{}
				setError(res, err)
				txs[i] = res
				continue
			}
			ops = []*storage.CommitOperation{commitOp}
		default:
			res := &abci.ExecTxResult{}
			setError(res, RiverError(Err_INVALID_ARGUMENT, "unknown op"))
			txs[i] = res
			continue
		}

		// Add operations to pending block
		m.pendingBlock.operations = append(m.pendingBlock.operations, ops...)
		txs[i] = &abci.ExecTxResult{Code: abci.CodeTypeOK}
	}

	appHash, err := m.store.ComputeAppHash(ctx, m.opts.ShardID, req.Height)
	if err != nil {
		return nil, AsRiverError(err).Func("FinalizeBlock.ComputeAppHash")
	}
	m.pendingBlock.appHash = appHash
	m.lastBlockHeight = req.Height
	m.lastAppHash = appHash

	return &abci.FinalizeBlockResponse{
		TxResults: txs,
		AppHash:   appHash,
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
	if int(cs.ReplicationFactor) > len(cs.Nodes) {
		return RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
	}
	if cs.LastMiniblockNum == 0 {
		if len(cs.GenesisMiniblock) == 0 {
			return RiverError(Err_INVALID_ARGUMENT, "genesis_miniblock required when last_miniblock_num is 0")
		}
	} else {
		if len(cs.LastMiniblockHash) != 32 {
			return RiverError(Err_INVALID_ARGUMENT, "last_miniblock_hash must be 32 bytes when last_miniblock_num is set")
		}
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
		if mb.LastMiniblockNum == 0 {
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
	if len(update.Nodes) == 0 && update.ReplicationFactor == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "nothing to update")
	}
	if len(update.Nodes) > 0 {
		for _, n := range update.Nodes {
			if len(n) != 20 {
				return RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
			}
		}
		if update.ReplicationFactor > 0 && int(update.ReplicationFactor) > len(update.Nodes) {
			return RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
		}
	}
	return nil
}

// getStreamState retrieves stream state from pending state or DB.
// Returns nil (not error) if stream doesn't exist.
func (m *MetadataShard) getStreamState(ctx context.Context, streamId []byte) (*pendingStreamState, error) {
	streamKey := hex.EncodeToString(streamId)

	// Check pending state first
	if m.pendingBlock != nil {
		if state, ok := m.pendingBlock.streams[streamKey]; ok {
			return state, nil
		}
	}

	// Read from DB
	sid, err := shared.StreamIdFromBytes(streamId)
	if err != nil {
		return nil, err
	}
	record, err := m.store.GetStream(ctx, m.opts.ShardID, sid)
	if err != nil {
		riverErr := AsRiverError(err)
		if riverErr.Code == Err_NOT_FOUND {
			return nil, nil // Stream doesn't exist
		}
		return nil, err
	}

	// Convert to pending state and resolve node indexes
	nodeIndexes, err := m.store.ResolveNodeAddresses(record.Nodes)
	if err != nil {
		return nil, err
	}

	state := &pendingStreamState{
		exists:               true,
		lastMiniblockHash:    record.LastMiniblockHash,
		lastMiniblockNum:     record.LastMiniblockNum,
		sealed:               record.Sealed,
		replicationFactor:    record.ReplicationFactor,
		nodeIndexes:          nodeIndexes,
		isNew:                false,
		genesisMiniblockHash: record.GenesisMiniblockHash,
		genesisMiniblock:     record.GenesisMiniblock,
	}

	// Cache in pending state
	if m.pendingBlock != nil {
		m.pendingBlock.streams[streamKey] = state
	}

	return state, nil
}

// processCreateStream validates a CreateStream tx against pending state + DB
// and returns the commit operation if valid.
func (m *MetadataShard) processCreateStream(ctx context.Context, cs *CreateStreamTx) (*storage.CommitOperation, error) {
	// Check if stream already exists
	state, err := m.getStreamState(ctx, cs.StreamId)
	if err != nil {
		return nil, err
	}
	if state != nil && state.exists {
		return nil, RiverError(Err_ALREADY_EXISTS, "stream already exists", "streamId", cs.StreamId)
	}

	// Resolve node addresses to indexes
	nodeIndexes, err := m.store.ResolveNodeAddresses(cs.Nodes)
	if err != nil {
		return nil, err
	}

	// Determine last miniblock hash
	var lastMiniblockHash []byte
	if cs.LastMiniblockNum == 0 {
		lastMiniblockHash = cs.GenesisMiniblockHash
	} else {
		lastMiniblockHash = cs.LastMiniblockHash
	}

	genesisMiniblock := cs.GenesisMiniblock
	if genesisMiniblock == nil {
		genesisMiniblock = []byte{}
	}

	// Create pending state for this stream
	streamKey := hex.EncodeToString(cs.StreamId)
	newState := &pendingStreamState{
		exists:               true,
		lastMiniblockHash:    lastMiniblockHash,
		lastMiniblockNum:     int64(cs.LastMiniblockNum),
		sealed:               cs.Sealed,
		replicationFactor:    cs.ReplicationFactor,
		nodeIndexes:          nodeIndexes,
		isNew:                true,
		genesisMiniblockHash: cs.GenesisMiniblockHash,
		genesisMiniblock:     genesisMiniblock,
	}
	m.pendingBlock.streams[streamKey] = newState

	return &storage.CommitOperation{
		CreateStream: &storage.CommitCreateStreamOp{
			StreamId:             cs.StreamId,
			GenesisMiniblockHash: cs.GenesisMiniblockHash,
			GenesisMiniblock:     genesisMiniblock,
			LastMiniblockHash:    lastMiniblockHash,
			LastMiniblockNum:     int64(cs.LastMiniblockNum),
			ReplicationFactor:    cs.ReplicationFactor,
			Sealed:               cs.Sealed,
			NodeIndexes:          nodeIndexes,
		},
	}, nil
}

// processSetMiniblockBatch validates a SetStreamLastMiniblockBatchTx against pending state + DB
// and returns commit operations for each update if valid.
func (m *MetadataShard) processSetMiniblockBatch(
	ctx context.Context,
	batch *SetStreamLastMiniblockBatchTx,
) ([]*storage.CommitOperation, error) {
	ops := make([]*storage.CommitOperation, 0, len(batch.Miniblocks))

	for _, mb := range batch.Miniblocks {
		state, err := m.getStreamState(ctx, mb.StreamId)
		if err != nil {
			return nil, err
		}
		if state == nil || !state.exists {
			return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", mb.StreamId)
		}
		if state.sealed {
			return nil, RiverError(Err_FAILED_PRECONDITION, "stream is sealed", "streamId", mb.StreamId)
		}
		if !bytes.Equal(state.lastMiniblockHash, mb.PrevMiniblockHash) {
			return nil, RiverError(
				Err_FAILED_PRECONDITION,
				"prev_miniblock_hash mismatch",
				"streamId", mb.StreamId,
			)
		}
		nextNum := int64(mb.LastMiniblockNum)
		if nextNum != state.lastMiniblockNum+1 {
			return nil, RiverError(
				Err_FAILED_PRECONDITION,
				"last_miniblock_num must increase by 1",
				"streamId", mb.StreamId,
				"current", state.lastMiniblockNum,
				"proposed", nextNum,
			)
		}

		// Update pending state
		state.lastMiniblockHash = mb.LastMiniblockHash
		state.lastMiniblockNum = nextNum
		state.sealed = state.sealed || mb.Sealed

		ops = append(ops, &storage.CommitOperation{
			UpdateMiniblock: &storage.CommitUpdateMiniblockOp{
				StreamId:          mb.StreamId,
				LastMiniblockHash: mb.LastMiniblockHash,
				LastMiniblockNum:  nextNum,
				Sealed:            state.sealed,
			},
		})
	}

	return ops, nil
}

// processUpdateNodes validates an UpdateStreamNodesAndReplicationTx against pending state + DB
// and returns the commit operation if valid.
func (m *MetadataShard) processUpdateNodes(
	ctx context.Context,
	update *UpdateStreamNodesAndReplicationTx,
) (*storage.CommitOperation, error) {
	state, err := m.getStreamState(ctx, update.StreamId)
	if err != nil {
		return nil, err
	}
	if state == nil || !state.exists {
		return nil, RiverError(Err_NOT_FOUND, "stream not found", "streamId", update.StreamId)
	}

	var newNodeIndexes []int32
	newReplicationFactor := update.ReplicationFactor

	if len(update.Nodes) > 0 {
		newNodeIndexes, err = m.store.ResolveNodeAddresses(update.Nodes)
		if err != nil {
			return nil, err
		}
	}

	// Validate constraints
	switch {
	case newReplicationFactor > 0 && len(newNodeIndexes) > 0:
		// Both changing: validate new replication against new nodes
		if int(newReplicationFactor) > len(newNodeIndexes) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
		}
	case newReplicationFactor > 0:
		// Only replication changing: validate against current nodes
		if int(newReplicationFactor) > len(state.nodeIndexes) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
		}
	case len(newNodeIndexes) > 0:
		// Only nodes changing: validate against current replication
		if len(newNodeIndexes) < int(state.replicationFactor) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "nodes cannot be less than replication_factor")
		}
	}

	// Update pending state
	if newReplicationFactor > 0 {
		state.replicationFactor = newReplicationFactor
	}
	if len(newNodeIndexes) > 0 {
		state.nodeIndexes = newNodeIndexes
	}

	return &storage.CommitOperation{
		UpdateNodes: &storage.CommitUpdateNodesOp{
			StreamId:          update.StreamId,
			ReplicationFactor: newReplicationFactor,
			NodeIndexes:       newNodeIndexes,
		},
	}, nil
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
