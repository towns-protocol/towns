package registries

import (
	"context"
	"math/big"
	"slices"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/gammazero/workerpool"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// RiverRegistryContract is the convinience wrapper for the IRiverRegistryV1 interface (abigen exports it as RiverRegistryV1)
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
	log := logging.FromCtx(ctx)

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
				river.Event_StreamUpdated,
				func(log *types.Log) any { return &river.StreamRegistryV1StreamUpdated{Raw: *log} },
			},
			{
				river.Event_StreamLastMiniblockUpdateFailed,
				func(log *types.Log) any { return &river.StreamRegistryV1StreamLastMiniblockUpdateFailed{Raw: *log} },
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
	log := logging.FromCtx(ctx)

	pendingTx, err := c.Blockchain.TxPool.Submit(
		ctx,
		"AllocateStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			tx, err := c.StreamRegistry.AllocateStream(
				opts, streamId, addresses, genesisMiniblockHash, genesisMiniblock)
			if err == nil {
				log.Debugw(
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
			Message("Smart contract call failed").
			Tag("streamId", streamId)
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
			Func("AllocateStream").
			Tag("streamId", streamId)
	}

	return RiverError(Err_ERR_UNSPECIFIED, "AllocateStream transaction result unknown")
}

func (c *RiverRegistryContract) AddStream(
	ctx context.Context,
	streamId StreamId,
	addresses []common.Address,
	genesisMiniblockHash common.Hash,
	lastMiniblockHash common.Hash,
	lastMiniblockNum int64,
	isSealed bool,
) error {
	log := logging.FromCtx(ctx)

	var flags StreamFlag
	if isSealed {
		flags |= StreamFlagSealed
	}

	pendingTx, err := c.Blockchain.TxPool.Submit(
		ctx,
		"AddStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			tx, err := c.StreamRegistry.AddStream(
				opts, streamId, genesisMiniblockHash, river.Stream{
					LastMiniblockHash: lastMiniblockHash,
					LastMiniblockNum:  uint64(lastMiniblockNum),
					Reserved0:         uint64(len(addresses)),
					Flags:             uint64(flags),
					Nodes:             addresses,
				})
			if err == nil {
				log.Debugw(
					"RiverRegistryContract: prepared transaction",
					"name", "AddStream",
					"streamId", streamId,
					"addresses", addresses,
					"genesisMiniblockHash", genesisMiniblockHash,
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
			Func("AddStream").
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
		return RiverError(Err_ERR_UNSPECIFIED, "Add stream transaction failed").
			Tag("tx", receipt.TxHash.Hex()).
			Func("AddStream")
	}

	return RiverError(Err_ERR_UNSPECIFIED, "AddStream transaction result unknown")
}

func (c *RiverRegistryContract) GetStream(
	ctx context.Context,
	streamId StreamId,
	blockNum crypto.BlockNumber,
) (*river.StreamWithId, error) {
	stream, err := c.StreamRegistry.GetStream(c.callOptsWithBlockNum(ctx, blockNum), streamId)
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	return river.NewStreamWithId(streamId, &stream), nil
}

func (c *RiverRegistryContract) GetStreamOnLatestBlock(
	ctx context.Context,
	streamId StreamId,
) (*river.StreamWithId, error) {
	stream, err := c.StreamRegistry.GetStream(c.callOpts(ctx), streamId)
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamOnLatestBlock").Message("Call failed")
	}
	return river.NewStreamWithId(streamId, &stream), nil
}

// GetStreamWithGenesis returns stream, genesis miniblock hash, genesis miniblock, error
func (c *RiverRegistryContract) GetStreamWithGenesis(
	ctx context.Context,
	streamId StreamId,
	blockNum crypto.BlockNumber,
) (*river.StreamWithId, common.Hash, []byte, error) {
	stream, mbHash, mb, err := c.StreamRegistry.GetStreamWithGenesis(c.callOptsWithBlockNum(ctx, blockNum), streamId)
	if err != nil {
		return nil, common.Hash{}, nil, WrapRiverError(
			Err_CANNOT_CALL_CONTRACT,
			err,
		).Func("GetStream").
			Message("Call failed").
			Tag("blockNum", blockNum)
	}
	return river.NewStreamWithId(streamId, &stream), mbHash, mb, nil
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

func (c *RiverRegistryContract) GetStreamCountOnNode(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	node common.Address,
) (int64, error) {
	num, err := c.StreamRegistry.GetStreamCountOnNode(c.callOptsWithBlockNum(ctx, blockNum), node)
	if err != nil {
		return 0, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamCountOnNode").Message("Call failed")
	}
	if !num.IsInt64() {
		return 0, RiverError(Err_INTERNAL, "Stream number is too big", "num", num).Func("GetStreamCountOnNode")
	}
	return num.Int64(), nil
}

var ZeroBytes32 = [32]byte{}

func (c *RiverRegistryContract) callGetPaginatedStreams(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	node *common.Address,
	start int64,
	end int64,
) ([]river.StreamWithId, error) {
	if c.Settings.SingleCallTimeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.Settings.SingleCallTimeout)
		defer cancel()
	}

	var (
		callOpts = c.callOptsWithBlockNum(ctx, blockNum)
		streams  []river.StreamWithId
		err      error
	)

	if node != nil {
		streams, err = c.StreamRegistry.GetPaginatedStreamsOnNode(callOpts, *node, big.NewInt(start), big.NewInt(end))
	} else {
		streams, _, err = c.StreamRegistry.GetPaginatedStreams(callOpts, big.NewInt(start), big.NewInt(end))
	}

	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("ForAllStreams")
	}
	return streams, nil
}

func (c *RiverRegistryContract) callGetPaginatedStreamsWithBackoff(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	node *common.Address,
	start int64,
	end int64,
) ([]river.StreamWithId, error) {
	bo := c.createBackoff()
	bo.Reset()
	for {
		streams, err := c.callGetPaginatedStreams(ctx, blockNum, node, start, end)
		if err == nil {
			return streams, nil
		}
		if !waitForBackoff(ctx, bo) {
			return nil, err
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

// ForAllStreamsOnNode calls the given cb for all streams that are registered in the river registry at the given block
// num and on the given node. If cb returns false ForAllStreamsOnNode returns.
func (c *RiverRegistryContract) ForAllStreamsOnNode(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	node common.Address,
	cb func(*river.StreamWithId) bool,
) error {
	if c.Settings.ParallelReaders > 1 {
		return c.forAllStreamsParallel(ctx, blockNum, &node, cb)
	} else {
		return c.forAllStreamsSingle(ctx, blockNum, &node, cb)
	}
}

// ForAllStreams calls the given cb for all streams that are registered in the river registry at the given block num.
// If cb returns false ForAllStreams returns.
func (c *RiverRegistryContract) ForAllStreams(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	cb func(*river.StreamWithId) bool,
) error {
	if c.Settings.ParallelReaders > 1 {
		return c.forAllStreamsParallel(ctx, blockNum, nil, cb)
	} else {
		return c.forAllStreamsSingle(ctx, blockNum, nil, cb)
	}
}

func (c *RiverRegistryContract) forAllStreamsSingle(
	ctx context.Context,
	blockNum crypto.BlockNumber,
	node *common.Address,
	cb func(*river.StreamWithId) bool,
) error {
	log := logging.FromCtx(ctx)
	if node != nil {
		log = log.With("node", *node)
	}

	pageSize := int64(c.Settings.PageSize)
	if pageSize <= 0 {
		pageSize = 5000
	}

	progressReportInterval := c.Settings.ProgressReportInterval
	if progressReportInterval <= 0 {
		progressReportInterval = 10 * time.Second
	}

	bo := c.createBackoff()

	var (
		streams                    []river.StreamWithId
		startTime                  = time.Now()
		lastReport                 = time.Now()
		totalStreams               = int64(0)
		streamsWithZeroStreamID    = int64(0)
		nodeStreamsCountInRegistry *big.Int
		err                        error
	)

	if node != nil {
		nodeStreamsCountInRegistry, err = c.StreamRegistry.GetStreamCountOnNode(
			c.callOptsWithBlockNum(ctx, blockNum),
			*node,
		)
	} else {
		nodeStreamsCountInRegistry, err = c.StreamRegistry.GetStreamCount(c.callOptsWithBlockNum(ctx, blockNum))
	}

	if err != nil {
		return WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("ForAllStreams")
	}

	for i := int64(0); totalStreams+streamsWithZeroStreamID < nodeStreamsCountInRegistry.Int64(); i += pageSize {
		bo.Reset()
		for {
			now := time.Now()
			if now.Sub(lastReport) > progressReportInterval {
				elapsed := time.Since(startTime)
				log.Infow(
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

			streams, err = c.callGetPaginatedStreams(ctx, blockNum, node, i, i+pageSize)
			if err == nil {
				break
			}
			if !waitForBackoff(ctx, bo) {
				return err
			}
		}
		for _, stream := range streams {
			if stream.Id == ZeroBytes32 {
				streamsWithZeroStreamID++
				continue
			}

			totalStreams++
			if !cb(&stream) {
				return nil
			}
		}
	}

	elapsed := time.Since(startTime)
	log.Infow(
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
	node *common.Address,
	cb func(*river.StreamWithId) bool,
) error {
	log := logging.FromCtx(ctx)
	if node != nil {
		log = log.With("node", *node)
	}
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

	var (
		numStreamsBigInt *big.Int
		err              error
	)

	if node != nil {
		numStreamsBigInt, err = c.StreamRegistry.GetStreamCountOnNode(c.callOptsWithBlockNum(ctx, blockNum), *node)
	} else {
		numStreamsBigInt, err = c.StreamRegistry.GetStreamCount(c.callOptsWithBlockNum(ctx, blockNum))
	}

	if err != nil {
		return WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("ForAllStreams")
	}

	numStreams := numStreamsBigInt.Int64()

	if numStreams <= 0 {
		log.Infow("RiverRegistryContract: GetPaginatedStreams no streams found", "blockNum", blockNum)
		return nil
	}

	log.Infow(
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
	taskCounter := 0
	for i := int64(0); i < numStreams; i += pageSize {
		taskCounter++
		pool.Submit(func() {
			streams, err := c.callGetPaginatedStreamsWithBackoff(ctx, blockNum, node, i, i+pageSize)
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
		})
	}

	totalStreams := int64(0)
OuterLoop:
	for {
		now := time.Now()
		if now.Sub(lastReport) > progressReportInterval {
			elapsed := time.Since(startTime)
			log.Infow(
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
				if !cb(&stream) {
					break OuterLoop
				}
			}
			taskCounter--
			if taskCounter == 0 {
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
	log.Infow(
		"RiverRegistryContract: GetPaginatedStreams completed",
		"node",
		node,
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
) (success []StreamId, invalidMiniblock []StreamId, failed []StreamId, err error) {
	log := logging.FromCtx(ctx)

	tx, err := c.Blockchain.TxPool.Submit(ctx, "SetStreamLastMiniblockBatch",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.StreamRegistry.SetStreamLastMiniblockBatch(opts, mbs)
		})
	if err != nil {
		ce, se, err := c.errDecoder.DecodeEVMError(err)
		switch {
		case ce != nil:
			return nil, nil, nil, AsRiverError(ce, Err_CANNOT_CALL_CONTRACT).Func("SetStreamLastMiniblockBatch")
		case se != nil:
			return nil, nil, nil, AsRiverError(se, Err_CANNOT_CALL_CONTRACT).Func("SetStreamLastMiniblockBatch")
		default:
			return nil, nil, nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("SetStreamLastMiniblockBatch")
		}
	}

	receipt, err := tx.Wait(ctx)
	if err != nil {
		return nil, nil, nil, err
	}

	if receipt != nil && receipt.Status == crypto.TransactionResultSuccess {
		// during migration to the new eventing model the contract emits both the old and the new events.
		// only parse the new events (StreamUpdated + StreamLastMiniblockUpdateFailed) and ignore the old events.
		// this allows the contract to be upgraded without breaking event parsing.
		// TODO: remove wanted1/wanted2 check after smart contract has been upgraded and won't emit old event types.
		wanted1 := common.HexToHash(
			"0x378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb",
		) // StreamUpdated
		wanted2 := common.HexToHash(
			"0x75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa",
		) // StreamLastMiniblockUpdateFailed

		for _, l := range receipt.Logs {
			if l.Topics[0] != wanted1 && l.Topics[0] != wanted2 {
				continue
			}

			parsed, err := c.ParseEvent(ctx, c.StreamRegistry.BoundContract(), c.StreamEventInfo, l)
			if err != nil {
				return nil, nil, nil, err
			}

			switch p := parsed.(type) {
			case *river.StreamRegistryV1StreamUpdated:
				if river.StreamUpdatedEventType(p.EventType) == river.StreamUpdatedEventTypeLastMiniblockBatchUpdated {
					events, err := river.ParseStreamUpdatedEvent(p)
					if err != nil {
						return nil, nil, nil, err
					}
					for _, event := range events {
						success = append(success, event.GetStreamId())
					}
				}
			case *river.StreamRegistryV1StreamLastMiniblockUpdateFailed:
				var (
					streamID, _       = StreamIdFromBytes(p.StreamId[:])
					lastMiniBlockHash = p.LastMiniblockHash
					lastMiniBlockNum  = p.LastMiniblockNum
					reason            = p.Reason
				)

				// this can happen when 2 nodes try to register a miniblock with the same number for a stream.
				// only the first one will succeed. This isn't optimal but the result of nodes witnessing the
				// river chain block at different moments causing multiple nodes to decide that its their turn
				// to propose/register a miniblock.
				log.Infow(
					"RiverRegistryContract: set stream last miniblock failed",
					"name", "SetStreamLastMiniblockBatch",
					"streamId", streamID,
					"lastMiniBlockHash", lastMiniBlockHash,
					"lastMiniBlockNum", lastMiniBlockNum,
					"txHash", receipt.TxHash,
					"reason", reason,
				)

				switch reason {
				case "BAD_ARG":
					// BAD_ARG indicates that the candidate mini-block failed to register. This is likely
					// because it was either already registered or it wasn't build on top the expected
					// mini-block. Collect and try to find the corresponding local candidate in storage
					// and promote it.
					invalidMiniblock = append(invalidMiniblock, streamID)
				default:
					failed = append(failed, streamID)
				}
			default:
				log.Errorw("Unexpected event on RiverRegistry::SetStreamLastMiniblockBatch", "tx", l.TxHash)
			}
		}

		return success, invalidMiniblock, failed, nil
	}

	if receipt != nil && receipt.Status != crypto.TransactionResultSuccess {
		return nil, nil, nil, RiverError(Err_ERR_UNSPECIFIED, "Set stream last mini block transaction failed").
			Tag("tx", receipt.TxHash.Hex()).
			Func("SetStreamLastMiniblockBatch")
	}
	return nil, nil, nil, RiverError(Err_ERR_UNSPECIFIED, "SetStreamLastMiniblockBatch transaction result unknown")
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
	allocated func(ctx context.Context, event *river.StreamState),
	added func(ctx context.Context, event *river.StreamState),
	lastMiniblockUpdated func(ctx context.Context, event *river.StreamMiniblockUpdate),
	placementUpdated func(ctx context.Context, event *river.StreamState),
) error {
	c.Blockchain.ChainMonitor.OnContractWithTopicsEvent(
		startBlockNumInclusive,
		c.Address,
		c.StreamEventTopics,
		func(ctx context.Context, log types.Log) {
			parsed, err := c.ParseEvent(ctx, c.StreamRegistry.BoundContract(), c.StreamEventInfo, &log)
			if err != nil {
				logging.FromCtx(ctx).Errorw("Failed to parse event", "err", err, "log", log)
				return
			}
			if event, ok := parsed.(*river.StreamRegistryV1StreamUpdated); ok {
				events, err := river.ParseStreamUpdatedEvent(event)
				if err != nil {
					logging.FromCtx(ctx).Errorw("Failed to parse stream update event", "event", event)
					return
				}

				for _, event := range events {
					switch event.Reason() {
					case river.StreamUpdatedEventTypeAllocate:
						allocated(ctx, event.(*river.StreamState))
					case river.StreamUpdatedEventTypeCreate:
						added(ctx, event.(*river.StreamState))
					case river.StreamUpdatedEventTypePlacementUpdated:
						placementUpdated(ctx, event.(*river.StreamState))
					case river.StreamUpdatedEventTypeLastMiniblockBatchUpdated:
						lastMiniblockUpdated(ctx, event.(*river.StreamMiniblockUpdate))
					default:
						logging.FromCtx(ctx).Errorw("Unknown stream updated reason type", "event", event)
					}
				}
			} else if event, ok := parsed.(*river.StreamRegistryV1StreamLastMiniblockUpdateFailed); ok {
				logging.FromCtx(ctx).Debugw("Stream last miniblock update failed", "event", event)
			} else {
				logging.FromCtx(ctx).Errorw("Unknown event type", "event", parsed)
			}
		})
	return nil
}

func (c *RiverRegistryContract) FilterStreamEvents(
	ctx context.Context,
	logs []*types.Log,
) (map[StreamId][]river.StreamUpdatedEvent, []error) {
	ret := map[StreamId][]river.StreamUpdatedEvent{}
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

		streamUpdate, ok := parsed.(*river.StreamUpdated)
		if !ok {
			finalErrs = append(
				finalErrs,
				RiverError(Err_INTERNAL, "Stream event isn't update", "event", parsed),
			)
			continue
		}

		eventsWithStreamId, err := river.ParseStreamUpdatedEvent(streamUpdate)
		if err != nil {
			finalErrs = append(
				finalErrs,
				RiverError(Err_INTERNAL, "Unable to parse stream update event", "event", streamUpdate),
			)
			continue
		}

		for _, e := range eventsWithStreamId {
			ret[e.GetStreamId()] = append(ret[e.GetStreamId()], e)
		}
	}
	return ret, finalErrs
}
