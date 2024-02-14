package registries

import (
	"context"
	"math/big"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/contracts"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/protocol"

	"github.com/river-build/river/crypto"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	ethCrypto "github.com/ethereum/go-ethereum/crypto"
)

// Convinience wrapper for the IRiverRegistryV1 interface (abigen exports it as RiverRegistryV1)
type RiverRegistryContract struct {
	Contract   *contracts.RiverRegistryV1
	Blockchain *crypto.Blockchain
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

	registry, err := contracts.NewRiverRegistryV1(address, blockchain.Client)
	if err != nil {
		return nil,
			AsRiverError(err, Err_BAD_CONFIG).
				Message("Failed to initialize registry contract").
				Tags("address", cfg.Address, "version", cfg.Version).
				Func("NewRiverRegistryContract").
				LogError(log)
	}

	return &RiverRegistryContract{
		Contract:   registry,
		Blockchain: blockchain,
	}, nil
}

func (sr *RiverRegistryContract) AllocateStream(
	ctx context.Context,
	streamId string,
	addresses []string,
	genesisMiniblockHash []byte,
	genesisMiniblock []byte,
) error {
	addrs, err := AddressStrsToEthAddresses(addresses)
	if err != nil {
		return AsRiverError(err).Func("AllocateStream")
	}

	hash, err := BytesToEthHash(genesisMiniblockHash)
	if err != nil {
		return AsRiverError(err).Func("AllocateStream")
	}

	transactor := contracts.RiverRegistryV1TransactorRaw{
		Contract: &sr.Contract.RiverRegistryV1Transactor,
	}
	_, _, err = sr.Blockchain.TxRunner.SubmitAndWait(ctx, &transactor, "allocateStream", streamId, addrs, hash, genesisMiniblock)
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("AllocateStream").Message("Smart contract call failed")
	}

	return nil
}

type GetStreamResult struct {
	StreamId             string
	Nodes                []string
	GenesisMiniblockHash []byte
	GenesisMiniblock     []byte
	LastMiniblockHash    []byte
	LastMiniblockNum     uint64
}

func getStreamResultFromContractStream(stream *contracts.IRiverRegistryBaseStream) *GetStreamResult {
	return &GetStreamResult{
		StreamId:             stream.StreamId,
		Nodes:                EthAddressesToAddressStrs(stream.Nodes),
		GenesisMiniblockHash: stream.GenesisMiniblockHash[:],
		GenesisMiniblock:     stream.GenesisMiniblock,
		LastMiniblockHash:    stream.LastMiniblockHash[:],
		LastMiniblockNum:     stream.LastMiniblockNum,
	}
}

func (sr *RiverRegistryContract) GetStream(ctx context.Context, streamId string) (*GetStreamResult, error) {
	hash := ethCrypto.Keccak256Hash([]byte(streamId))
	stream, err := sr.Contract.GetStream(sr.callOpts(ctx), hash)
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	return getStreamResultFromContractStream(&stream), nil
}

func (sr *RiverRegistryContract) GetStreamCount(ctx context.Context) (int64, error) {
	num, err := sr.Contract.GetStreamCount(sr.callOpts(ctx))
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
	streams, err := sr.Contract.GetAllStreams(callOpts)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CALL_CONTRACT,
			err,
		).Func("GetStreamByIndex").
			Message("Smart contract call failed")
	}
	ret := make([]*GetStreamResult, len(streams))
	for i, stream := range streams {
		ret[i] = getStreamResultFromContractStream(&stream)
	}
	return ret, nil
}

type NodeRecord = contracts.IRiverRegistryBaseNode

func (sr *RiverRegistryContract) GetAllNodes(ctx context.Context) ([]NodeRecord, error) {
	nodes, err := sr.Contract.GetAllNodes(sr.callOpts(ctx))
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
