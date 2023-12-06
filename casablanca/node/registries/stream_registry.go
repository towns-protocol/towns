package registries

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"context"
)

func NewStreamRegistryContract(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	cfg *config.ContractConfig,
) (StreamRegistryContract, error) {
	return newStreamRegistryContractImpl(ctx, blockchain, cfg)
}
