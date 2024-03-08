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

	address, err := crypto.ParseOrLoadAddress(cfg.Address)
	if err != nil {
		return nil, AsRiverError(
			err,
			Err_BAD_CONFIG,
		).Message("Failed to parse contract address").
			Func("NewRiverRegistryContract")
	}

	streamRegistry, err := contracts.NewStreamRegistryV1(address, blockchain.Client)
	if err != nil {
		return nil,
			AsRiverError(err, Err_BAD_CONFIG).
				Message("Failed to initialize registry contract").
				Tags("address", cfg.Address, "version", cfg.Version).
				Func("NewRiverRegistryContract").
				LogError(log)
	}

	operatorRegistry, err := contracts.NewOperatorRegistryV1(address, blockchain.Client)
	if err != nil {
		return nil,
			AsRiverError(err, Err_BAD_CONFIG).
				Message("Failed to initialize registry contract").
				Tags("address", cfg.Address, "version", cfg.Version).
				Func("NewRiverRegistryContract").
				LogError(log)
	}

	nodeRegistry, err := contracts.NewNodeRegistryV1(address, blockchain.Client)
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
	}, nil
}

func (sr *RiverRegistryContract) AllocateStream(
	ctx context.Context,
	streamId StreamId,
	addresses []common.Address,
	genesisMiniblockHash common.Hash,
	genesisMiniblock []byte,
) error {
	_, _, err := sr.Blockchain.TxRunner.SubmitAndWait(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return sr.StreamRegistry.AllocateStream(opts, streamId.ByteArray(), addresses, genesisMiniblockHash, genesisMiniblock)
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

func (sr *RiverRegistryContract) GetStream(ctx context.Context, streamId StreamId) (*GetStreamResult, error) {
	stream, err := sr.StreamRegistry.GetStream(sr.callOpts(ctx), streamId.ByteArray())
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	return makeGetStreamResult(streamId, &stream), nil
}

// Returns stream, genesis miniblock hash, genesis miniblock, error
func (sr *RiverRegistryContract) GetStreamWithGenesis(
	ctx context.Context,
	streamId StreamId,
) (*GetStreamResult, common.Hash, []byte, error) {
	stream, mbHash, mb, err := sr.StreamRegistry.GetStreamWithGenesis(sr.callOpts(ctx), streamId.ByteArray())
	if err != nil {
		return nil, common.Hash{}, nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	ret := makeGetStreamResult(streamId, &stream)
	return ret, mbHash, mb, nil
}

func (sr *RiverRegistryContract) GetStreamCount(ctx context.Context) (int64, error) {
	num, err := sr.StreamRegistry.GetStreamCount(sr.callOpts(ctx))
	if err != nil {
		return 0, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamNum").Message("Call failed")
	}
	if !num.IsInt64() {
		return 0, RiverError(Err_INTERNAL, "Stream number is too big", "num", num).Func("GetStreamNum")
	}
	return num.Int64(), nil
}

func (sr *RiverRegistryContract) GetAllStreams(ctx context.Context, blockNum uint64) ([]*GetStreamResult, error) {
	callOpts := sr.callOpts(ctx)
	if blockNum != 0 {
		callOpts.BlockNumber = new(big.Int).SetUint64(blockNum)
	}
	streams, err := sr.StreamRegistry.GetAllStreams(callOpts)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CALL_CONTRACT,
			err,
		).Func("GetStreamByIndex").
			Message("Smart contract call failed")
	}
	ret := make([]*GetStreamResult, len(streams))
	for i, stream := range streams {
		streamId, err := StreamIdFromHash(stream.Id)
		if err != nil {
			return nil, err
		}
		ret[i] = makeGetStreamResult(streamId, &stream.Stream)
	}
	return ret, nil
}

func (sr *RiverRegistryContract) SetStreamLastMiniblock(ctx context.Context, streamId StreamId, lastMiniblockHash common.Hash, lastMiniblockNum uint64, isSealed bool) error {
	_, _, err := sr.Blockchain.TxRunner.SubmitAndWait(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return sr.StreamRegistry.SetStreamLastMiniblock(opts, streamId.ByteArray(), lastMiniblockHash, lastMiniblockNum, isSealed)
		},
	)
	return err
}

type NodeRecord = contracts.Node

func (sr *RiverRegistryContract) GetAllNodes(ctx context.Context) ([]NodeRecord, error) {
	nodes, err := sr.NodeRegistry.GetAllNodes(sr.callOpts(ctx))
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetAllNodes").Message("Call failed")
	}
	return nodes, nil
}

func (sr *RiverRegistryContract) callOpts(ctx context.Context) *bind.CallOpts {
	return &bind.CallOpts{
		Context: ctx,
	}
}
