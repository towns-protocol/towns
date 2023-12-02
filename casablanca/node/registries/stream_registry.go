package registries

import (
	. "casablanca/node/base"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"
)

func NewStreamRegistryContract(ctx context.Context, blockchain *crypto.Blockchain) (StreamRegistryContract, error) {
	log := dlog.CtxLog(ctx)
	switch blockchain.ChainId.Uint64() {
	case infra.CHAIN_ID_LOCALHOST:
		contract, err := NewStreamRegistryContractLocalhostV3(ctx, blockchain)
		if err != nil {
			return nil, err
		}
		return contract, nil
	default:
		return nil,
			RiverError(
				Err_BAD_CONFIG,
				"Unsupported chain id for NewStreamRegistryContractLocalhostV3",
				"chainId", blockchain.ChainId.Uint64()).
				Func("NewStreamRegistryContract").
				LogError(log)
	}
}
