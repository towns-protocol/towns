package registries

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"casablanca/node/utils"
	"context"
	"errors"
	"fmt"
)

func NewStreamRegistryContract(ctx context.Context, cfg *config.ChainConfig, nodeWallet *crypto.Wallet) (StreamRegistryContract, error) {
	log := dlog.CtxLog(ctx)
	chainId := cfg.ChainId
	// initialise the eth client.
	if cfg.NetworkUrl == "" {
		log.Error("No blockchain network url specified in config")
		return nil, fmt.Errorf("no blockchain network url specified in config")
	}
	ethClient, err := utils.GetEthClient(cfg.NetworkUrl)
	if err != nil {
		log.Error("Cannot connect to eth client", "url", cfg.NetworkUrl, "error", err)
		return nil, err
	}

	switch chainId {
	case infra.CHAIN_ID_LOCALHOST:
		contract, err := NewStreamRegistryContractLocalhostV3(ethClient, nodeWallet)
		if err != nil {
			return nil, err
		}
		return contract, nil
	default:
		errMsg := fmt.Sprintf("unsupported chainId: %d", chainId)
		log.Error("NewStreamRegistryContractLocalhostV3", errMsg)
		return nil, errors.New(errMsg)
	}
}
