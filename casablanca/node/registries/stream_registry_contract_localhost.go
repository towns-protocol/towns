package registries

import (
	. "casablanca/node/auth/contracts/localhost_towns_stream_registry"
	. "casablanca/node/base"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"
	"math/big"

	"casablanca/node/crypto"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type StreamRegistryContractLocalhostV3 struct {
	registry   *LocalhostTownsStreamRegistry
	blockchain *crypto.Blockchain
}

var _ StreamRegistryContract = (*StreamRegistryContractLocalhostV3)(nil)

func NewStreamRegistryContractLocalhostV3(
	ctx context.Context,
	blockchain *crypto.Blockchain,
) (*StreamRegistryContractLocalhostV3, error) {
	log := dlog.CtxLog(ctx)

	// get the space factory address from config
	strAddress, err := loadStreamRegistryContractAddress(infra.CHAIN_ID_LOCALHOST)
	if err != nil {
		log.Error("error parsing localhost contract address", "address", strAddress, "error", err)
		return nil, err
	}
	address := common.HexToAddress(strAddress)

	stream_registry, err := NewLocalhostTownsStreamRegistry(address, blockchain.Client)
	if err != nil {
		log.Error("error fetching localhost TownArchitect contract with address", "address", strAddress, "error", err)
		return nil, err
	}

	return &StreamRegistryContractLocalhostV3{
		registry:   stream_registry,
		blockchain: blockchain,
	}, nil
}

func (sr *StreamRegistryContractLocalhostV3) AllocateStream(
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

	transactor := LocalhostTownsStreamRegistryTransactorRaw{
		Contract: &sr.registry.LocalhostTownsStreamRegistryTransactor,
	}
	_, _, err = sr.blockchain.TxRunner.SumbitAndWait(ctx, &transactor, "allocateStream", StreamRegistryStream{
		StreamId:             streamId,
		Nodes:                addrs,
		GenesisMiniblockHash: hash,
	})
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("AllocateStream").Message("Smart contract call failed")
	}

	return nil
}

func (sr *StreamRegistryContractLocalhostV3) GetStream(ctx context.Context, streamId string) ([]string, []byte, error) {
	stream, err := sr.registry.GetStream(sr.callOpts(ctx), streamId)
	if err != nil {
		return nil, nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStream").Message("Call failed")
	}
	return EthAddressesToAddressStrs(stream.Nodes), stream.GenesisMiniblockHash[:], nil
}

func (sr *StreamRegistryContractLocalhostV3) GetStreamsLength(ctx context.Context) (int64, error) {
	num, err := sr.registry.GetStreamsLength(sr.callOpts(ctx))
	if err != nil {
		return 0, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamNum").Message("Call failed")
	}
	if !num.IsInt64() {
		return 0, RiverError(Err_INTERNAL, "Stream number is too big", "num", num).Func("GetStreamNum")
	}
	return num.Int64(), nil
}

func (sr *StreamRegistryContractLocalhostV3) GetStreamByIndex(ctx context.Context, index int64) (string, []string, []byte, error) {
	stream, err := sr.registry.GetStreamByIndex(sr.callOpts(ctx), big.NewInt(index))
	if err != nil {
		return "", nil, nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).Func("GetStreamByIndex").Message("Smart contract call failed")
	}
	return stream.StreamId, EthAddressesToAddressStrs(stream.Nodes), stream.GenesisMiniblockHash[:], nil
}

func (sr *StreamRegistryContractLocalhostV3) callOpts(ctx context.Context) *bind.CallOpts {
	return &bind.CallOpts{
		Context: ctx,
	}
}
