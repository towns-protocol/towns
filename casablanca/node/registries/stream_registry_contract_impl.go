package registries

import (
	"context"
	"math/big"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/contracts/dev"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/protocol"

	"github.com/river-build/river/crypto"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
)

type streamRegistryContractImpl struct {
	registry   *dev.StreamRegistry
	blockchain *crypto.Blockchain
}

var _ StreamRegistryContract = (*streamRegistryContractImpl)(nil)

func newStreamRegistryContractImpl(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	cfg *config.ContractConfig,
) (*streamRegistryContractImpl, error) {
	log := dlog.CtxLog(ctx)

	if cfg.Version != "dev" {
		return nil, RiverError(Err_BAD_CONFIG, "Unsupported contract version", "version", cfg.Version).Func("newStreamRegistryContractImpl")
	}

	address, err := crypto.ParseOrLoadAddress(cfg.Address)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).Message("Failed to parse contract address").Func("newStreamRegistryContractImpl")
	}

	stream_registry, err := dev.NewStreamRegistry(address, blockchain.Client)
	if err != nil {
		return nil,
			AsRiverError(err, Err_BAD_CONFIG).
				Message("Failed to initialize registry contract").
				Tags("address", cfg.Address, "version", cfg.Version).
				Func("newStreamRegistryContractImpl").
				LogError(log)
	}

	return &streamRegistryContractImpl{
		registry:   stream_registry,
		blockchain: blockchain,
	}, nil
}

func (sr *streamRegistryContractImpl) AllocateStream(
	ctx context.Context,
	streamId string,
	addresses []string,
	genesisMiniblockHash []byte,
) error {
	addrs, err := AddressStrsToEthAddresses(addresses)
	if err != nil {
		return AsRiverError(err).Func("AllocateStream")
	}

	hash, err := BytesToEthHash(genesisMiniblockHash)
	if err != nil {
		return AsRiverError(err).Func("AllocateStream")
	}

	transactor := dev.StreamRegistryTransactorRaw{
		Contract: &sr.registry.StreamRegistryTransactor,
	}
	_, _, err = sr.blockchain.TxRunner.SumbitAndWait(ctx, &transactor, "allocateStream", dev.StreamRegistryStream{
		StreamId:             streamId,
		Nodes:                addrs,
		GenesisMiniblockHash: hash,
	})
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("AllocateStream").Message("Smart contract call failed")
	}

	return nil
}

func (sr *streamRegistryContractImpl) GetStream(ctx context.Context, streamId string) ([]string, []byte, error) {
	stream, err := sr.registry.GetStream(sr.callOpts(ctx), streamId)
	if err != nil {
		return nil, nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	return EthAddressesToAddressStrs(stream.Nodes), stream.GenesisMiniblockHash[:], nil
}

func (sr *streamRegistryContractImpl) GetStreamsLength(ctx context.Context) (int64, error) {
	num, err := sr.registry.GetStreamsLength(sr.callOpts(ctx))
	if err != nil {
		return 0, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamNum").Message("Call failed")
	}
	if !num.IsInt64() {
		return 0, RiverError(Err_INTERNAL, "Stream number is too big", "num", num).Func("GetStreamNum")
	}
	return num.Int64(), nil
}

func (sr *streamRegistryContractImpl) GetStreamByIndex(ctx context.Context, index int64) (string, []string, []byte, error) {
	stream, err := sr.registry.GetStreamByIndex(sr.callOpts(ctx), big.NewInt(index))
	if err != nil {
		return "", nil, nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamByIndex").Message("Smart contract call failed")
	}
	return stream.StreamId, EthAddressesToAddressStrs(stream.Nodes), stream.GenesisMiniblockHash[:], nil
}

func (sr *streamRegistryContractImpl) callOpts(ctx context.Context) *bind.CallOpts {
	return &bind.CallOpts{
		Context: ctx,
	}
}
