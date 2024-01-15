package registries

import (
	"context"

	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
)

func NewStreamRegistryContract(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	cfg *config.ContractConfig,
) (StreamRegistryContract, error) {
	return newStreamRegistryContractImpl(ctx, blockchain, cfg)
}
