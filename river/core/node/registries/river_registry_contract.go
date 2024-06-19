package registries

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

var streamRegistryABI, _ = contracts.StreamRegistryV1MetaData.GetAbi()

// Convinience wrapper for the IRiverRegistryV1 interface (abigen exports it as RiverRegistryV1)
type RiverRegistryContract struct {
	OperatorRegistry *contracts.OperatorRegistryV1

	NodeRegistry    *contracts.NodeRegistryV1
	NodeRegistryAbi *abi.ABI
	NodeEventTopics [][]common.Hash
	NodeEventInfo   map[common.Hash]*EventInfo

	StreamRegistry    *contracts.StreamRegistryV1
	StreamRegistryAbi *abi.ABI
	StreamEventTopics [][]common.Hash
	StreamEventInfo   map[common.Hash]*EventInfo

	Blockchain *crypto.Blockchain

	Address   common.Address
	Addresses []common.Address

	errDecoder *contracts.EvmErrorDecoder
}

type EventInfo struct {
	Name  string
	Maker func() any
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
) (*RiverRegistryContract, error) {
	if cfg.Version != "" {
		return nil, RiverError(
			Err_BAD_CONFIG,
			"Always binding to same interface, version should be empty",
			"version",
			cfg.Version,
		).Func("NewRiverRegistryContract")
	}

	c := &RiverRegistryContract{
		Blockchain: blockchain,
		Address:    cfg.Address,
		Addresses:  []common.Address{cfg.Address},
	}

	var err error
	c.OperatorRegistry, _, _, _, err = initContract(
		ctx,
		contracts.NewOperatorRegistryV1,
		cfg.Address,
		blockchain.Client,
		contracts.OperatorRegistryV1MetaData,
		nil,
	)
	if err != nil {
		return nil, err
	}

	c.NodeRegistry, c.NodeRegistryAbi, c.NodeEventTopics, c.NodeEventInfo, err = initContract(
		ctx,
		contracts.NewNodeRegistryV1,
		cfg.Address,
		blockchain.Client,
		contracts.NodeRegistryV1MetaData,
		[]*EventInfo{
			{"NodeAdded", func() any { return new(contracts.NodeRegistryV1NodeAdded) }},
			{"NodeRemoved", func() any { return new(contracts.NodeRegistryV1NodeRemoved) }},
			{"NodeStatusUpdated", func() any { return new(contracts.NodeRegistryV1NodeStatusUpdated) }},
			{"NodeUrlUpdated", func() any { return new(contracts.NodeRegistryV1NodeUrlUpdated) }},
		},
	)
	if err != nil {
		return nil, err
	}

	c.StreamRegistry, c.StreamRegistryAbi, c.StreamEventTopics, c.StreamEventInfo, err = initContract(
		ctx,
		contracts.NewStreamRegistryV1,
		cfg.Address,
		blockchain.Client,
		contracts.StreamRegistryV1MetaData,
		[]*EventInfo{
			{contracts.Event_StreamAllocated, func() any { return new(contracts.StreamRegistryV1StreamAllocated) }},
			{
				contracts.Event_StreamLastMiniblockUpdated,
				func() any { return new(contracts.StreamRegistryV1StreamLastMiniblockUpdated) },
			},
			{
				contracts.Event_StreamPlacementUpdated,
				func() any { return new(contracts.StreamRegistryV1StreamPlacementUpdated) },
			},
		},
	)
	if err != nil {
		return nil, err
	}

	c.errDecoder, err = contracts.NewEVMErrorDecoder(contracts.StreamRegistryV1MetaData)
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

	receipt := <-pendingTx.Wait()
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

func makeGetStreamResult(streamId StreamId, stream *contracts.Stream) *GetStreamResult {
	return &GetStreamResult{
		StreamId:          streamId,
		Nodes:             stream.Nodes,
		LastMiniblockHash: stream.LastMiniblockHash,
		LastMiniblockNum:  stream.LastMiniblockNum,
		IsSealed:          stream.Flags&1 != 0, // TODO: constants for flags
	}
}

func (c *RiverRegistryContract) GetStream(ctx context.Context, streamId StreamId) (*GetStreamResult, error) {
	stream, err := c.StreamRegistry.GetStream(c.callOpts(ctx), streamId)
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	return makeGetStreamResult(streamId, &stream), nil
}

// Returns stream, genesis miniblock hash, genesis miniblock, error
func (c *RiverRegistryContract) GetStreamWithGenesis(
	ctx context.Context,
	streamId StreamId,
) (*GetStreamResult, common.Hash, []byte, error) {
	stream, mbHash, mb, err := c.StreamRegistry.GetStreamWithGenesis(c.callOpts(ctx), streamId)
	if err != nil {
		return nil, common.Hash{}, nil, WrapRiverError(
			Err_CANNOT_CALL_CONTRACT,
			err,
		).Func("GetStream").
			Message("Call failed")
	}
	ret := makeGetStreamResult(streamId, &stream)
	return ret, mbHash, mb, nil
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

func (c *RiverRegistryContract) GetAllStreams(
	ctx context.Context,
	blockNum crypto.BlockNumber,
) ([]*GetStreamResult, error) {
	// TODO: setting
	const pageSize = int64(5000)

	ret := make([]*GetStreamResult, 0, 5000)

	lastPage := false
	var err error
	var streams []contracts.StreamWithId
	for i := int64(0); !lastPage; i += pageSize {
		callOpts := c.callOptsWithBlockNum(ctx, blockNum)
		streams, lastPage, err = c.StreamRegistry.GetPaginatedStreams(callOpts, big.NewInt(i), big.NewInt(i+pageSize))
		if err != nil {
			return nil, WrapRiverError(
				Err_CANNOT_CALL_CONTRACT,
				err,
			).Func("GetStreamByIndex").
				Message("Smart contract call failed")
		}
		for _, stream := range streams {
			if stream.Id == ZeroBytes32 {
				continue
			}
			streamId, err := StreamIdFromHash(stream.Id)
			if err != nil {
				return nil, err
			}
			ret = append(ret, makeGetStreamResult(streamId, &stream.Stream))
		}
	}

	return ret, nil
}

// SetStreamLastMiniblockBatch sets the given block proposal in the RiverRegistry#StreamRegistry facet as the new
// latest block. It returns the streamId's for which the proposed block was set successful as the latest block, failed
// or an error in case the transaction could not be submitted or failed.
func (c *RiverRegistryContract) SetStreamLastMiniblockBatch(
	ctx context.Context, mbs []contracts.SetMiniblock,
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

	receipt := <-tx.Wait()

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

	receipt := <-pendingTx.Wait()
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

type NodeRecord = contracts.Node

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
	contracts.NodeRegistryV1NodeAdded |
		contracts.NodeRegistryV1NodeRemoved |
		contracts.NodeRegistryV1NodeStatusUpdated |
		contracts.NodeRegistryV1NodeUrlUpdated
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
		ee, err := c.ParseEvent(ctx, c.NodeRegistry.BoundContract(), c.NodeEventInfo, log)
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
	log types.Log,
) (any, error) {
	if len(log.Topics) == 0 {
		return nil, RiverError(Err_INTERNAL, "Empty topics in log", "log", log).Func("ParseEvent")
	}
	eventInfo, ok := info[log.Topics[0]]
	if !ok {
		return nil, RiverError(Err_INTERNAL, "Event not found", "id", log.Topics[0]).Func("ParseEvent")
	}
	ee := eventInfo.Maker()
	err := boundContract.UnpackLog(ee, eventInfo.Name, log)
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
	allocated func(ctx context.Context, event *contracts.StreamRegistryV1StreamAllocated),
	lastMiniblockUpdated func(ctx context.Context, event *contracts.StreamRegistryV1StreamLastMiniblockUpdated),
	placementUpdated func(ctx context.Context, event *contracts.StreamRegistryV1StreamPlacementUpdated),
) error {
	// TODO: modify ChainMonitor to accept block number in each subscription call
	c.Blockchain.ChainMonitor.OnContractWithTopicsEvent(
		c.Address,
		c.StreamEventTopics,
		func(ctx context.Context, log types.Log) {
			parsed, err := c.ParseEvent(ctx, c.StreamRegistry.BoundContract(), c.StreamEventInfo, log)
			if err != nil {
				dlog.FromCtx(ctx).Error("Failed to parse event", "err", err, "log", log)
				return
			}
			switch e := parsed.(type) {
			case *contracts.StreamRegistryV1StreamAllocated:
				allocated(ctx, e)
			case *contracts.StreamRegistryV1StreamLastMiniblockUpdated:
				lastMiniblockUpdated(ctx, e)
			case *contracts.StreamRegistryV1StreamPlacementUpdated:
				placementUpdated(ctx, e)
			default:
				dlog.FromCtx(ctx).Error("Unknown event type", "event", e)
			}
		})
	return nil
}
