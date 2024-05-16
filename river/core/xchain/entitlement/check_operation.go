package entitlement

import (
	"context"
	"core/xchain/bindings/erc20"
	"core/xchain/bindings/erc721"
	"core/xchain/config"
	"core/xchain/contracts"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
)

var (
	clientsOnce sync.Once
	clients     BlockchainClientPool
)

func Init(ctx context.Context, cfg *config.Config) error {
	var err error
	clientsOnce.Do(func() {
		clients, err = NewBlockchainClientPool(ctx, cfg)
	})
	return err
}

func evaluateCheckOperation(
	ctx context.Context,
	cfg *config.Config,
	op *CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	switch op.CheckType {
	case MOCK:
		defer infra.StoreExecutionTimeMetrics("evaluateMockOperation", infra.CONTRACT_CALLS_CATEGORY, time.Now())
		return evaluateMockOperation(ctx, op)
	case ISENTITLED:
		defer infra.StoreExecutionTimeMetrics("evaluateIsEntitledOperation", infra.CONTRACT_CALLS_CATEGORY, time.Now())
		return evaluateIsEntitledOperation(ctx, cfg, op, linkedWallets)
	case ERC20:
		defer infra.StoreExecutionTimeMetrics("evaluateErc20Operation", infra.CONTRACT_CALLS_CATEGORY, time.Now())
		return evaluateErc20Operation(ctx, cfg, op, linkedWallets)
	case ERC721:
		defer infra.StoreExecutionTimeMetrics("evaluateErc721Operation", infra.CONTRACT_CALLS_CATEGORY, time.Now())
		return evaluateErc721Operation(ctx, cfg, op, linkedWallets)
	case ERC1155:
		defer infra.StoreExecutionTimeMetrics("evaluateErc1155Operation", infra.CONTRACT_CALLS_CATEGORY, time.Now())
		return evaluateErc1155Operation(ctx, op)
	case CheckNONE:
		fallthrough
	default:
		return false, fmt.Errorf("unknown operation")
	}
}

func evaluateMockOperation(ctx context.Context,
	op *CheckOperation,
) (bool, error) {
	delay := int(op.Threshold.Int64())

	result := awaitTimeout(ctx, func() error {
		delayDuration := time.Duration(delay) * time.Millisecond
		time.Sleep(delayDuration) // simulate a long-running operation
		return nil
	})
	if result != nil {
		return false, result
	}
	if op.ChainID.Sign() != 0 {
		return true, nil
	} else {
		return false, nil
	}
}

func evaluateIsEntitledOperation(
	ctx context.Context,
	cfg *config.Config,
	op *CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc20Operation")
	client, err := clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc20Operation: Chain ID %v not found", op.ChainID)
	}

	customEntitlementChecker, err := contracts.NewICustomEntitlement(
		op.ContractAddress,
		client,
		cfg.GetContractVersion(),
	)
	if err != nil {
		log.Error("Failed to instantiate a CustomEntitlement contract from supplied contract address",
			"err", err,
			"contractAddress", op.ContractAddress,
			"chainId", op.ChainID,
		)
		return false, err
	}
	for _, wallet := range linkedWallets {
		// Check if the caller is entitled
		isEntitled, err := customEntitlementChecker.IsEntitled(
			&bind.CallOpts{Context: ctx},
			[]common.Address{wallet},
		)
		if err != nil {
			log.Error("Failed to check if caller is entitled",
				"error", err,
				"contractAddress", op.ContractAddress,
				"wallet", wallet,
				"channelId", op.ChannelId,
				"permission", op.Permission,
				"chainId", op.ChainID,
			)
			return false, err
		}
		if isEntitled {
			return true, nil
		}
	}
	return false, nil
}

func evaluateErc20Operation(
	ctx context.Context,
	cfg *config.Config,
	op *CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc20Operation")
	client, err := clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc20Operation: Chain ID %v not found", op.ChainID)
	}

	// Create a new instance of the token contract
	token, err := erc20.NewErc20Caller(op.ContractAddress, client)
	if err != nil {
		log.Error(
			"Failed to instantiate a Token contract",
			"err", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}

	total := big.NewInt(0)

	for _, wallet := range linkedWallets {
		// Balance is returned as a representation of the balance according to the token's decimals,
		// which stores the balance in exponentiated form.
		// Default decimals for most tokens is 18, meaning the balance is stored as balance * 10^18.
		balance, err := token.BalanceOf(&bind.CallOpts{Context: ctx}, wallet)
		if err != nil {
			log.Error("Failed to retrieve token balance", "error", err)
			return false, err
		}
		total.Add(total, balance)

		log.Debug("Retrieved ERC20 token balance",
			"balance", balance.String(),
			"total", total.String(),
			"threshold", op.Threshold.String(),
			"chainID", op.ChainID.String(),
			"erc20ContractAddress", op.ContractAddress.String(),
		)

		// Balance is a *big.Int
		// Iteratively check if the total balance of evaluated wallets is greater than or equal to the threshold
		if op.Threshold.Sign() > 0 && total.Sign() > 0 && total.Cmp(op.Threshold) >= 0 {
			return true, nil
		}
	}
	return false, nil
}

func evaluateErc721Operation(
	ctx context.Context,
	cfg *config.Config,
	op *CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc721Operation")

	client, err := clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc20Operation: Chain ID %v not found", op.ChainID)
	}

	nft, err := erc721.NewErc721Caller(op.ContractAddress, client)
	if err != nil {
		log.Error("Failed to instantiate a NFT contract",
			"err", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}

	total := big.NewInt(0)
	for _, wallet := range linkedWallets {
		tokenBalance, err := nft.BalanceOf(&bind.CallOpts{Context: ctx}, wallet)
		if err != nil {
			log.Error("Failed to retrieve NFT balance",
				"error", err,
				"contractAddress", op.ContractAddress,
				"wallet", wallet,
			)
			return false, err
		}

		// Accumulate the total balance across evaluated wallets
		total.Add(total, tokenBalance)
		// log.Info("Retrieved ERC721 token balance for wallet",
		// 	"balance", tokenBalance.String(),
		// 	"total", total.String(),
		// 	"threshold", op.Threshold.String(),
		// 	"wallet", wallet,
		// )

		// Iteratively check if the total balance of evaluated wallets is greater than or equal to the threshold
		if total.Cmp(op.Threshold) >= 0 {
			return true, nil
		}
	}
	return false, err
}

func evaluateErc1155Operation(ctx context.Context,
	op *CheckOperation,
) (bool, error) {
	return false, fmt.Errorf("ERC1155 not implemented")
}
