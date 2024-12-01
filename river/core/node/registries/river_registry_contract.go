package registries

import (
	"context"
	"math/big"
	"slices"
	"sync/atomic"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/gammazero/workerpool"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

var streamRegistryABI, _ = river.StreamRegistryV1MetaData.GetAbi()

// Convinience wrapper for the IRiverRegistryV1 interface (abigen exports it as RiverRegistryV1)
type RiverRegistryContract struct {
	OperatorRegistry *river.OperatorRegistryV1

	NodeRegistry    *river.NodeRegistryV1
	NodeRegistryAbi *abi.ABI
	NodeEventTopics [][]common.Hash
	NodeEventInfo   map[common.Hash]*EventInfo

	StreamRegistry    *river.StreamRegistryV1
	StreamRegistryAbi *abi.ABI
	StreamEventTopics [][]common.Hash
	StreamEventInfo   map[common.Hash]*EventInfo

	Blockchain *crypto.Blockchain

	Address   common.Address
	Addresses []common.Address

	Settings *config.RiverRegistryConfig

	errDecoder *crypto.EvmErrorDecoder
}

type EventInfo struct {
	Name  string
	Maker func(*types.Log) any
}

func initContract[T any](
	ctx context.Context,
	maker func(address common.Address, backend bind.ContractBackend) (*T, error),
	address common.Address,
	backend bind.ContractBackend,
	metadata *bind.MetaData,
	events []*EventInfo,
) (
	*T,
	*abi.ABI,
	[][]common.Hash,
	map[common.Hash]*EventInfo,
	error,
) {
	log := dlog.FromCtx(ctx)

	contract, err := maker(address, backend)
	if err != nil {
		return nil, nil, nil, nil, AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to initialize registry contract").
			Tags("address", address).
			Func("NewRiverRegistryContract").
			LogError(log)
	}

	abi, err := metadata.GetAbi()
	if err != nil {
		return nil, nil, nil, nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to parse ABI").
			Func("NewRiverRegistryContract").
			LogError(log)
	}

	if len(events) <= 0 {
		return contract, abi, nil, nil, nil
	}

	var eventSigs []common.Hash
	eventInfo := make(map[common.Hash]*EventInfo)
	for _, e := range events {
		ev, ok := abi.Events[e.Name]
		if !ok {
			return nil, nil, nil, nil, RiverError(
				Err_INTERNAL,
				"Event not found in ABI",
				"event",
				e,
			).Func("NewRiverRegistryContract").
				LogError(log)
		}
		eventSigs = append(eventSigs, ev.ID)
		eventInfo[ev.ID] = e
	}
	return contract, abi, [][]common.Hash{eventSigs}, eventInfo, nil
}

func NewRiverRegistryContract(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	cfg *config.ContractConfig,
	settings *config.RiverRegistryConfig,
) (*RiverRegistryContract, error) {
	c := &RiverRegistryContract{
		Blockchain: blockchain,
		Address:    cfg.Address,
		Addresses:  []common.Address{cfg.Address},
		Settings:   settings,
	}

	var err error
	c.OperatorRegistry, _, _, _, err = initContract(
		ctx,
		river.NewOperatorRegistryV1,
		cfg.Address,
		blockchain.Client,
		river.OperatorRegistryV1MetaData,
		nil,
	)
	if err != nil {
		return nil, err
	}

	c.NodeRegistry, c.NodeRegistryAbi, c.NodeEventTopics, c.NodeEventInfo, err = initContract(
		ctx,
		river.NewNodeRegistryV1,
		cfg.Address,
		blockchain.Client,
		river.NodeRegistryV1MetaData,
		[]*EventInfo{
			{"NodeAdded", func(log *types.Log) any { return &river.NodeRegistryV1NodeAdded{Raw: *log} }},
			{"NodeRemoved", func(log *types.Log) any { return &river.NodeRegistryV1NodeRemoved{Raw: *log} }},
			{
				"NodeStatusUpdated",
				func(log *types.Log) any { return &river.NodeRegistryV1NodeStatusUpdated{Raw: *log} },
			},
			{"NodeUrlUpdated", func(log *types.Log) any { return &river.NodeRegistryV1NodeUrlUpdated{Raw: *log} }},
		},
	)
	if err != nil {
		return nil, err
	}

	c.StreamRegistry, c.StreamRegistryAbi, c.StreamEventTopics, c.StreamEventInfo, err = initContract(
		ctx,
		river.NewStreamRegistryV1,
		cfg.Address,
		blockchain.Client,
		river.StreamRegistryV1MetaData,
		[]*EventInfo{
			{
				river.Event_StreamAllocated,
				func(log *types.Log) any { return &river.StreamRegistryV1StreamAllocated{Raw: *log} },
			},
			{
				river.Event_StreamLastMiniblockUpdated,
				func(log *types.Log) any { return &river.StreamRegistryV1StreamLastMiniblockUpdated{Raw: *log} },
			},
			{
				river.Event_StreamPlacementUpdated,
				func(log *types.Log) any { return &river.StreamRegistryV1StreamPlacementUpdated{Raw: *log} },
			},
		},
	)
	if err != nil {
		return nil, err
	}

	c.errDecoder, err = crypto.NewEVMErrorDecoder(river.StreamRegistryV1MetaData)
	if err != nil {
		return nil, err
	}

	return c, nil
}

func (c *RiverRegistryContract) AllocateStream(
	ctx context.Context,
	streamId StreamId,
	addresses []common.Address,
	genesisMiniblockHash common.Hash,
	genesisMiniblock []byte,
) error {
	log := dlog.FromCtx(ctx)

	pendingTx, err := c.Blockchain.TxPool.Submit(
		ctx,
		"AllocateStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			tx, err := c.StreamRegistry.AllocateStream(
				opts, streamId, addresses, genesisMiniblockHash, genesisMiniblock)
			if err == nil {
				log.Debug(
					"RiverRegistryContract: prepared transaction",
					"name", "AllocateStream",
					"streamId", streamId,
					"addresses", addresses,
					"genesisMiniblockHash", genesisMiniblockHash,
					"txHash", tx.Hash(),
				)
			}
			return tx, err
		},
	)
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CALL_CONTRACT).
			Func("AllocateStream").
			Message("Smart contract call failed")
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	if receipt != nil && receipt.Status == crypto.TransactionResultSuccess {
		return nil
	}
	if receipt != nil && receipt.Status != crypto.TransactionResultSuccess {
		return RiverError(Err_ERR_UNSPECIFIED, "Allocate stream transaction failed").
			Tag("tx", receipt.TxHash.Hex()).
			Func("AllocateStream")
	}

	return RiverError(Err_ERR_UNSPECIFIED, "AllocateStream transaction result unknown")
}

type GetStreamResult struct {
	StreamId          StreamId
	Nodes             []common.Address
	LastMiniblockHash common.Hash
	LastMiniblockNum  uint64
	IsSealed          bool
}

func makeGetStreamResult(streamId StreamId, stream *river.Stream) *GetStreamResult {
	return &GetStreamResult{
		StreamId:          streamId,
		Nodes:             stream.Nodes,
		LastMiniblockHash: stream.LastMiniblockHash,
		LastMiniblockNum:  stream.LastMiniblockNum,
		IsSealed:          stream.Flags&1 != 0, // TODO: constants for flags
	}
}

func (c *RiverRegistryContract) GetStream(
	ctx context.Context,
	streamId StreamId,
	blockNum crypto.BlockNumber,
) (*GetStreamResult, error) {
	stream, err := c.StreamRegistry.GetStream(c.callOptsWithBlockNum(ctx, blockNum), streamId)
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	return makeGetStreamResult(streamId, &stream), nil
}

// Returns stream, genesis miniblock hash, genesis miniblock, error
func (c *RiverRegistryContract) GetStreamWithGenesis(
	ctx context.Context,
	streamId StreamId,
) (*GetStreamResult, common.Hash, []byte, crypto.BlockNumber, error) {
	blockNum, err := c.Blockchain.GetBlockNumber(ctx)
	if err != nil {
		return nil, common.Hash{}, nil, blockNum, err
	}

	stream, mbHash, mb, err := c.StreamRegistry.GetStreamWithGenesis(c.callOptsWithBlockNum(ctx, blockNum), streamId)
	if err != nil {
		return nil, common.Hash{}, nil, blockNum, WrapRiverError(
			Err_CANNOT_CALL_CONTRACT,
			err,
		).Func("GetStream").
			Message("Call failed").
			Tag("blockNum", blockNum)
	}
	ret := makeGetStreamResult(streamId, &stream)
	return ret, mbHash, mb, blockNum, nil
}

func (c *RiverRegistryContract) GetStreamCount(ctx context.Context, blockNum crypto.BlockNumber) (int64, error) {
	num, err := c.StreamRegistry.GetStreamCount(c.callOptsWithBlockNum(ctx, blockNum))
	if err != nil {
		return 0, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamNum").Message("Call failed")
	}
	if !num.IsInt64() {
		return 0, RiverError(Err_INTERNAL, "Stream number is too big", "num", num).Func("GetStreamNum")
	}
	return num.Int64(), nil
}

var ZeroBytes32 = [32]byte{}

func (c *RiverRegistryContract) callGetPaginatedStreams(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	start int64,
	end int64,
) ([]river.StreamWithId, bool, error) {
	if c.Settings.SingleCallTimeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.Settings.SingleCallTimeout)
		defer cancel()
	}

	callOpts := c.callOptsWithBlockNum(ctx, blockNum)
	streams, lastPage, err := c.StreamRegistry.GetPaginatedStreams(callOpts, big.NewInt(start), big.NewInt(end))
	if err != nil {
		return nil, false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("ForAllStreams")
	}

	return streams, lastPage, nil
}

func (c *RiverRegistryContract) callGetPaginatedStreamsWithBackoff(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	start int64,
	end int64,
) ([]river.StreamWithId, bool, error) {
	bo := c.createBackoff()
	bo.Reset()
	for {
		streams, lastPage, err := c.callGetPaginatedStreams(ctx, blockNum, start, end)
		if err == nil {
			return streams, lastPage, nil
		}
		if !waitForBackoff(ctx, bo) {
			return nil, false, err
		}
	}
}

func (c *RiverRegistryContract) createBackoff() backoff.BackOff {
	var bo backoff.BackOff
	bo = backoff.NewExponentialBackOff(
		backoff.WithInitialInterval(100*time.Millisecond),
		backoff.WithRandomizationFactor(0.2),
		backoff.WithMaxElapsedTime(c.Settings.MaxRetryElapsedTime),
		backoff.WithMaxInterval(5*time.Second),
	)
	if c.Settings.MaxRetries > 0 {
		bo = backoff.WithMaxRetries(bo, uint64(c.Settings.MaxRetries))
	}
	return bo
}

func waitForBackoff(ctx context.Context, bo backoff.BackOff) bool {
	b := bo.NextBackOff()
	if b == backoff.Stop {
		return false
	}
	select {
	case <-ctx.Done():
		return false
	case <-time.After(b):
		return true
	}
}

// ForAllStreams calls the given cb for all streams that are registered in the river registry at the given block num.
// If cb returns false ForAllStreams returns.
func (c *RiverRegistryContract) ForAllStreams(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	cb func(*GetStreamResult) bool,
) error {
	if c.Settings.ParallelReaders > 1 {
		return c.forAllStreamsParallel(ctx, blockNum, cb)
	} else {
		return c.forAllStreamsSingle(ctx, blockNum, cb)
	}
}

func (c *RiverRegistryContract) forAllStreamsSingle(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	cb func(*GetStreamResult) bool,
) error {
	log := dlog.FromCtx(ctx)
	pageSize := int64(c.Settings.PageSize)
	if pageSize <= 0 {
		pageSize = 5000
	}

	progressReportInterval := c.Settings.ProgressReportInterval
	if progressReportInterval <= 0 {
		progressReportInterval = 10 * time.Second
	}

	bo := c.createBackoff()

	lastPage := false
	var err error
	var streams []river.StreamWithId
	startTime := time.Now()
	lastReport := time.Now()
	totalStreams := int64(0)
	for i := int64(0); !lastPage; i += pageSize {
		bo.Reset()
		for {
			now := time.Now()
			if now.Sub(lastReport) > progressReportInterval {
				elapsed := time.Since(startTime)
				log.Info(
					"RiverRegistryContract: GetPaginatedStreams in progress",
					"pagesCompleted",
					i,
					"pageSize",
					pageSize,
					"elapsed",
					elapsed,
					"streamPerSecond",
					float64(i)/elapsed.Seconds(),
				)
				lastReport = now
			}

			streams, lastPage, err = c.callGetPaginatedStreams(ctx, blockNum, i, i+pageSize)
			if err == nil {
				break
			}
			if !waitForBackoff(ctx, bo) {
				return err
			}
		}
		for _, stream := range streams {
			if stream.Id == ZeroBytes32 {
				continue
			}
			streamId, err := StreamIdFromHash(stream.Id)
			if err != nil {
				return err
			}
			totalStreams++
			if !cb(makeGetStreamResult(streamId, &stream.Stream)) {
				return nil
			}
		}
	}

	elapsed := time.Since(startTime)
	log.Info(
		"RiverRegistryContract: GetPaginatedStreams completed",
		"elapsed",
		elapsed,
		"streamsPerSecond",
		float64(totalStreams)/elapsed.Seconds(),
	)

	return nil
}

func (c *RiverRegistryContract) forAllStreamsParallel(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	cb func(*GetStreamResult) bool,
) error {
	log := dlog.FromCtx(ctx)
	ctx, cancelCtx := context.WithCancel(ctx)
	defer cancelCtx()

	numWorkers := c.Settings.ParallelReaders
	if numWorkers <= 1 {
		numWorkers = 8
	}

	pageSize := int64(c.Settings.PageSize)
	if pageSize <= 0 {
		pageSize = 5000
	}

	progressReportInterval := c.Settings.ProgressReportInterval
	if progressReportInterval <= 0 {
		progressReportInterval = 10 * time.Second
	}

	numStreamsBigInt, err := c.StreamRegistry.GetStreamCount(c.callOptsWithBlockNum(ctx, blockNum))
	if err != nil {
		return WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("ForAllStreams")
	}
	numStreams := numStreamsBigInt.Int64()

	if numStreams <= 0 {
		log.Info("RiverRegistryContract: GetPaginatedStreams no streams found", "blockNum", blockNum)
		return nil
	}

	log.Info(
		"RiverRegistryContract: GetPaginatedStreams starting parallel read",
		"numStreams",
		numStreams,
		"RiverRegistry.PageSize",
		pageSize,
		"RiverRegistry.ParallelReaders",
		numWorkers,
		"blockNum",
		blockNum,
	)

	chResults := make(chan []river.StreamWithId, numWorkers)
	chErrors := make(chan error, numWorkers)

	pool := workerpool.New(numWorkers)

	startTime := time.Now()
	lastReport := time.Now()
	var taskCounter atomic.Int64
	for i := int64(0); i < numStreams; i += pageSize {
		taskCounter.Add(1)
		pool.Submit(func() {
			streams, _, err := c.callGetPaginatedStreamsWithBackoff(ctx, blockNum, i, i+pageSize)
			if err == nil {
				select {
				case chResults <- streams:
				case <-ctx.Done():
				}
			} else {
				select {
				case chErrors <- err:
				case <-ctx.Done():
				}
			}
			taskCounter.Add(-1)
		})
	}

	totalStreams := int64(0)
OuterLoop:
	for {
		now := time.Now()
		if now.Sub(lastReport) > progressReportInterval {
			elapsed := time.Since(startTime)
			log.Info(
				"RiverRegistryContract: GetPaginatedStreams in progress",
				"streamsRead",
				totalStreams,
				"elapsed",
				elapsed,
				"streamPerSecond",
				float64(totalStreams)/elapsed.Seconds(),
			)
			lastReport = now
		}
		select {
		case streams := <-chResults:
			for _, stream := range streams {
				if stream.Id == ZeroBytes32 {
					continue
				}
				totalStreams++
				if !cb(makeGetStreamResult(stream.Id, &stream.Stream)) {
					break OuterLoop
				}
			}
			if taskCounter.Load() == 0 {
				break OuterLoop
			}
		case receivedErr := <-chErrors:
			err = receivedErr
			break OuterLoop
		case <-ctx.Done():
			err = ctx.Err()
			break OuterLoop
		case <-time.After(10 * time.Second):
			continue
		}
	}

	cancelCtx()
	go pool.Stop()

	if err != nil {
		return err
	}

	elapsed := time.Since(startTime)
	log.Info(
		"RiverRegistryContract: GetPaginatedStreams completed",
		"elapsed",
		elapsed,
		"streamsPerSecond",
		float64(totalStreams)/elapsed.Seconds(),
	)

	return nil
}

// SetStreamLastMiniblockBatch sets the given block proposal in the RiverRegistry#StreamRegistry facet as the new
// latest block. It returns the streamId's for which the proposed block was set successful as the latest block, failed
// or an error in case the transaction could not be submitted or failed.
func (c *RiverRegistryContract) SetStreamLastMiniblockBatch(
	ctx context.Context, mbs []river.SetMiniblock,
) ([]StreamId, []StreamId, error) {
	var (
		log     = dlog.FromCtx(ctx)
		success []StreamId
		failed  []StreamId
	)

	tx, err := c.Blockchain.TxPool.Submit(ctx, "SetStreamLastMiniblockBatch",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.StreamRegistry.SetStreamLastMiniblockBatch(opts, mbs)
		})
	if err != nil {
		ce, se, err := c.errDecoder.DecodeEVMError(err)
		switch {
		case ce != nil:
			return nil, nil, AsRiverError(ce, Err_CANNOT_CALL_CONTRACT).Func("SetStreamLastMiniblockBatch")
		case se != nil:
			return nil, nil, AsRiverError(se, Err_CANNOT_CALL_CONTRACT).Func("SetStreamLastMiniblockBatch")
		default:
			return nil, nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("SetStreamLastMiniblockBatch")
		}
	}

	receipt, err := tx.Wait(ctx)
	if err != nil {
		return nil, nil, err
	}

	if receipt != nil && receipt.Status == crypto.TransactionResultSuccess {
		for _, l := range receipt.Logs {
			if len(l.Topics) != 1 {
				continue
			}

			event, _ := streamRegistryABI.EventByID(l.Topics[0])
			if event == nil {
				continue
			}

			switch event.Name {
			case "StreamLastMiniblockUpdated":
				args, err := event.Inputs.Unpack(l.Data)
				if err != nil || len(args) != 4 {
					log.Error("Unable to unpack StreamLastMiniblockUpdated event", "err", err)
					continue
				}

				var (
					streamID          = args[0].([32]byte)
					lastMiniBlockHash = args[1].([32]byte)
					lastMiniBlockNum  = args[2].(uint64)
					isSealed          = args[3].(bool)
				)

				log.Debug(
					"RiverRegistryContract: set stream last miniblock",
					"name", "SetStreamLastMiniblockBatch",
					"streamId", streamID,
					"lastMiniBlockHash", lastMiniBlockHash,
					"lastMiniBlockNum", lastMiniBlockNum,
					"isSealed", isSealed,
					"txHash", receipt.TxHash,
				)

				success = append(success, streamID)

			case "StreamLastMiniblockUpdateFailed":
				args, err := event.Inputs.Unpack(l.Data)
				if err != nil || len(args) != 4 {
					log.Error("Unable to unpack StreamLastMiniblockUpdateFailed event", "err", err)
					continue
				}

				var (
					streamID          = args[0].([32]byte)
					lastMiniBlockHash = args[1].([32]byte)
					lastMiniBlockNum  = args[2].(uint64)
					reason            = args[3].(string)
				)

				log.Error(
					"RiverRegistryContract: set stream last miniblock failed",
					"name", "SetStreamLastMiniblockBatch",
					"streamId", streamID,
					"lastMiniBlockHash", lastMiniBlockHash,
					"lastMiniBlockNum", lastMiniBlockNum,
					"txHash", receipt.TxHash,
					"reason", reason,
				)

				failed = append(failed, streamID)

			default:
				log.Error("Unexpected event on RiverRegistry::SetStreamLastMiniblockBatch", "event", event.Name)
			}
		}

		return success, failed, nil
	}

	if receipt != nil && receipt.Status != crypto.TransactionResultSuccess {
		return nil, nil, RiverError(Err_ERR_UNSPECIFIED, "Set stream last mini block transaction failed").
			Tag("tx", receipt.TxHash.Hex()).
			Func("SetStreamLastMiniblockBatch")
	}
	return nil, nil, RiverError(Err_ERR_UNSPECIFIED, "SetStreamLastMiniblockBatch transaction result unknown")
}

func (c *RiverRegistryContract) SetStreamLastMiniblock(
	ctx context.Context,
	streamId StreamId,
	prevMiniblockHash common.Hash,
	lastMiniblockHash common.Hash,
	lastMiniblockNum uint64,
	isSealed bool,
) error {
	log := dlog.FromCtx(ctx)

	pendingTx, err := c.Blockchain.TxPool.Submit(
		ctx,
		"SetStreamLastMiniblock",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			tx, err := c.StreamRegistry.SetStreamLastMiniblock(
				opts, streamId, prevMiniblockHash, lastMiniblockHash, lastMiniblockNum, isSealed)
			if err == nil {
				log.Debug(
					"RiverRegistryContract: prepared transaction",
					"name", "SetStreamLastMiniblock",
					"streamId", streamId,
					"prevMiniblockHash", prevMiniblockHash,
					"lastMiniblockHash", lastMiniblockHash,
					"lastMiniblockNum", lastMiniblockNum,
					"isSealed", isSealed,
					"txHash", tx.Hash(),
				)
			}
			return tx, err
		},
	)
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CALL_CONTRACT).
			Func("SetStreamLastMiniblock").
			Tags("streamId", streamId, "prevMiniblockHash", prevMiniblockHash, "lastMiniblockHash",
				lastMiniblockHash, "lastMiniblockNum", lastMiniblockNum, "isSealed", isSealed)
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	if receipt != nil && receipt.Status == crypto.TransactionResultSuccess {
		return nil
	}
	if receipt != nil && receipt.Status != crypto.TransactionResultSuccess {
		return RiverError(Err_ERR_UNSPECIFIED, "Set stream last mini block transaction failed").
			Tag("tx", receipt.TxHash.Hex()).
			Func("SetStreamLastMiniblock")
	}

	return RiverError(Err_ERR_UNSPECIFIED, "SetStreamLastMiniblock transaction result unknown")
}

type NodeRecord = river.Node

func (c *RiverRegistryContract) GetAllNodes(ctx context.Context, blockNum crypto.BlockNumber) ([]NodeRecord, error) {
	nodes, err := c.NodeRegistry.GetAllNodes(c.callOptsWithBlockNum(ctx, blockNum))
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetAllNodes").Message("Call failed")
	}
	return nodes, nil
}

func (c *RiverRegistryContract) callOpts(ctx context.Context) *bind.CallOpts {
	return &bind.CallOpts{
		Context: ctx,
	}
}

func (c *RiverRegistryContract) callOptsWithBlockNum(ctx context.Context, blockNum crypto.BlockNumber) *bind.CallOpts {
	if blockNum == 0 {
		return c.callOpts(ctx)
	} else {
		return &bind.CallOpts{
			Context:     ctx,
			BlockNumber: blockNum.AsBigInt(),
		}
	}
}

type NodeEvents interface {
	river.NodeRegistryV1NodeAdded |
		river.NodeRegistryV1NodeRemoved |
		river.NodeRegistryV1NodeStatusUpdated |
		river.NodeRegistryV1NodeUrlUpdated
}

func (c *RiverRegistryContract) GetNodeEventsForBlock(ctx context.Context, blockNum crypto.BlockNumber) ([]any, error) {
	num := blockNum.AsBigInt()
	logs, err := c.Blockchain.Client.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: num,
		ToBlock:   num,
		Addresses: c.Addresses,
		Topics:    c.NodeEventTopics,
	})
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CALL_CONTRACT,
			err,
		).Func("GetNodeEventsForBlock").
			Message("FilterLogs failed")
	}
	var ret []any
	for _, log := range logs {
		ee, err := c.ParseEvent(ctx, c.NodeRegistry.BoundContract(), c.NodeEventInfo, &log)
		if err != nil {
			return nil, err
		}
		ret = append(ret, ee)
	}
	return ret, nil
}

func (c *RiverRegistryContract) ParseEvent(
	ctx context.Context,
	boundContract *bind.BoundContract,
	info map[common.Hash]*EventInfo,
	log *types.Log,
) (any, error) {
	if len(log.Topics) == 0 {
		return nil, RiverError(Err_INTERNAL, "Empty topics in log", "log", log).Func("ParseEvent")
	}
	eventInfo, ok := info[log.Topics[0]]
	if !ok {
		return nil, RiverError(Err_INTERNAL, "Event not found", "id", log.Topics[0]).Func("ParseEvent")
	}
	ee := eventInfo.Maker(log)
	err := boundContract.UnpackLog(ee, eventInfo.Name, *log)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CALL_CONTRACT,
			err,
		).Func("ParseEvent").
			Message("UnpackLog failed")
	}
	return ee, nil
}

func (c *RiverRegistryContract) OnStreamEvent(
	ctx context.Context,
	startBlockNumInclusive crypto.BlockNumber,
	allocated func(ctx context.Context, event *river.StreamRegistryV1StreamAllocated),
	lastMiniblockUpdated func(ctx context.Context, event *river.StreamRegistryV1StreamLastMiniblockUpdated),
	placementUpdated func(ctx context.Context, event *river.StreamRegistryV1StreamPlacementUpdated),
) error {
	c.Blockchain.ChainMonitor.OnContractWithTopicsEvent(
		startBlockNumInclusive,
		c.Address,
		c.StreamEventTopics,
		func(ctx context.Context, log types.Log) {
			parsed, err := c.ParseEvent(ctx, c.StreamRegistry.BoundContract(), c.StreamEventInfo, &log)
			if err != nil {
				dlog.FromCtx(ctx).Error("Failed to parse event", "err", err, "log", log)
				return
			}
			switch e := parsed.(type) {
			case *river.StreamRegistryV1StreamAllocated:
				allocated(ctx, e)
			case *river.StreamRegistryV1StreamLastMiniblockUpdated:
				lastMiniblockUpdated(ctx, e)
			case *river.StreamRegistryV1StreamPlacementUpdated:
				placementUpdated(ctx, e)
			default:
				dlog.FromCtx(ctx).Error("Unknown event type", "event", e)
			}
		})
	return nil
}

func (c *RiverRegistryContract) FilterStreamEvents(
	ctx context.Context,
	logs []*types.Log,
) (map[StreamId][]river.EventWithStreamId, []error) {
	ret := map[StreamId][]river.EventWithStreamId{}
	var finalErrs []error
	for _, log := range logs {
		if log.Address != c.Address || len(log.Topics) == 0 || !slices.Contains(c.StreamEventTopics[0], log.Topics[0]) {
			continue
		}
		parsed, err := c.ParseEvent(ctx, c.StreamRegistry.BoundContract(), c.StreamEventInfo, log)
		if err != nil {
			finalErrs = append(finalErrs, err)
			continue
		}
		withStreamId, ok := parsed.(river.EventWithStreamId)
		if !ok {
			finalErrs = append(
				finalErrs,
				RiverError(Err_INTERNAL, "Event does not implement EventWithStreamId", "event", parsed),
			)
			continue
		}
		streamId := withStreamId.GetStreamId()
		ret[streamId] = append(ret[streamId], withStreamId)
	}
	return ret, finalErrs
}
