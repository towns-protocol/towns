package registries

import (
	"context"
	"math/big"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"

	"github.com/river-build/river/core/node/crypto"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// Convinience wrapper for the IRiverRegistryV1 interface (abigen exports it as RiverRegistryV1)
type RiverRegistryContract struct {
	OperatorRegistry *contracts.OperatorRegistryV1
	NodeRegistry     *contracts.NodeRegistryV1
	StreamRegistry   *contracts.StreamRegistryV1
	Blockchain       *crypto.Blockchain
	Address          common.Address
	Addresses        []common.Address
	Abi              *abi.ABI
	NodeEventTopics  [][]common.Hash
	EventInfo        map[common.Hash]*EventInfo
}

type EventInfo struct {
	Name  string
	Maker func() any
}

func NewRiverRegistryContract(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	cfg *config.ContractConfig,
) (*RiverRegistryContract, error) {
	log := dlog.FromCtx(ctx)

	if cfg.Version != "" {
		return nil, RiverError(
			Err_BAD_CONFIG,
			"Always binding to same interface, version should be empty",
			"version",
			cfg.Version,
		).Func("NewRiverRegistryContract")
	}

	abi, err := contracts.NodeRegistryV1MetaData.GetAbi()
	if err != nil {
		return nil,
			AsRiverError(err, Err_INTERNAL).
				Message("Failed to parse ABI").
				Func("NewRiverRegistryContract")
	}
	var nodeEventSigs []common.Hash
	eventInfo := make(map[common.Hash]*EventInfo)
	for _, e := range []*EventInfo{
		{"NodeAdded", func() any { return new(contracts.NodeRegistryV1NodeAdded) }},
		{"NodeRemoved", func() any { return new(contracts.NodeRegistryV1NodeRemoved) }},
		{"NodeStatusUpdated", func() any { return new(contracts.NodeRegistryV1NodeStatusUpdated) }},
		{"NodeUrlUpdated", func() any { return new(contracts.NodeRegistryV1NodeUrlUpdated) }},
	} {
		ev, ok := abi.Events[e.Name]
		if !ok {
			return nil,
				RiverError(Err_INTERNAL, "Event not found in ABI", "event", e).Func("NewRiverRegistryContract")
		}
		nodeEventSigs = append(nodeEventSigs, ev.ID)
		eventInfo[ev.ID] = e
	}

	streamRegistry, err := contracts.NewStreamRegistryV1(cfg.Address, blockchain.Client)
	if err != nil {
		return nil,
			AsRiverError(err, Err_BAD_CONFIG).
				Message("Failed to initialize registry contract").
				Tags("address", cfg.Address, "version", cfg.Version).
				Func("NewRiverRegistryContract").
				LogError(log)
	}

	operatorRegistry, err := contracts.NewOperatorRegistryV1(cfg.Address, blockchain.Client)
	if err != nil {
		return nil,
			AsRiverError(err, Err_BAD_CONFIG).
				Message("Failed to initialize registry contract").
				Tags("address", cfg.Address, "version", cfg.Version).
				Func("NewRiverRegistryContract").
				LogError(log)
	}

	nodeRegistry, err := contracts.NewNodeRegistryV1(cfg.Address, blockchain.Client)
	if err != nil {
		return nil,
			AsRiverError(err, Err_BAD_CONFIG).
				Message("Failed to initialize registry contract").
				Tags("address", cfg.Address, "version", cfg.Version).
				Func("NewRiverRegistryContract").
				LogError(log)
	}

	return &RiverRegistryContract{
		OperatorRegistry: operatorRegistry,
		NodeRegistry:     nodeRegistry,
		StreamRegistry:   streamRegistry,
		Blockchain:       blockchain,
		Address:          cfg.Address,
		Addresses:        []common.Address{cfg.Address},
		Abi:              abi,
		NodeEventTopics:  [][]common.Hash{nodeEventSigs},
		EventInfo:        eventInfo,
	}, nil
}

func (c *RiverRegistryContract) AllocateStream(
	ctx context.Context,
	streamId StreamId,
	addresses []common.Address,
	genesisMiniblockHash common.Hash,
	genesisMiniblock []byte,
) error {
	_, _, err := c.Blockchain.TxRunner.SubmitAndWait(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.StreamRegistry.AllocateStream(
				opts,
				streamId,
				addresses,
				genesisMiniblockHash,
				genesisMiniblock,
			)
		},
	)
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("AllocateStream").Message("Smart contract call failed")
	}

	return nil
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

var zeroBytes32 = [32]byte{}

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
			if stream.Id == zeroBytes32 {
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

func (c *RiverRegistryContract) SetStreamLastMiniblock(
	ctx context.Context,
	streamId StreamId,
	prevMiniblockHash common.Hash,
	lastMiniblockHash common.Hash,
	lastMiniblockNum uint64,
	isSealed bool,
) error {
	_, _, err := c.Blockchain.TxRunner.SubmitAndWait(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			tx, err := c.StreamRegistry.SetStreamLastMiniblock(
				opts,
				streamId,
				prevMiniblockHash,
				lastMiniblockHash,
				lastMiniblockNum,
				isSealed,
			)
			if err != nil {
				err = AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("SetStreamLastMiniblock").
					Tags("streamId", streamId, "prevMiniblockHash", prevMiniblockHash, "lastMiniblockHash",
						lastMiniblockHash, "lastMiniblockNum", lastMiniblockNum, "isSealed", isSealed)
			}
			return tx, err
		},
	)
	return err
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
		if len(log.Topics) == 0 {
			return nil, RiverError(Err_INTERNAL, "Empty topics in log", "log", log).Func("GetNodeEventsForBlock")
		}
		eventInfo, ok := c.EventInfo[log.Topics[0]]
		if !ok {
			return nil, RiverError(Err_INTERNAL, "Event not found", "id", log.Topics[0]).Func("GetNodeEventsForBlock")
		}
		ee := eventInfo.Maker()
		err = c.NodeRegistry.BoundContract().UnpackLog(ee, eventInfo.Name, log)
		if err != nil {
			return nil, WrapRiverError(
				Err_CANNOT_CALL_CONTRACT,
				err,
			).Func("GetNodeEventsForBlock").
				Message("UnpackLog failed")
		}
		ret = append(ret, ee)
	}
	return ret, nil
}
