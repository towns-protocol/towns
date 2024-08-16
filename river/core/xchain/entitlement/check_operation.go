package entitlement

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/contracts/types"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/xchain/bindings/erc20"
	"github.com/river-build/river/core/xchain/bindings/erc721"
)

func (e *Evaluator) evaluateCheckOperation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	defer prometheus.NewTimer(e.evalHistrogram.WithLabelValues(op.CheckType.String())).ObserveDuration()

	if op.CheckType == types.MOCK {
		return e.evaluateMockOperation(ctx, op)
	} else if op.CheckType == types.CheckNONE {
		return false, fmt.Errorf("unknown operation")
	}

	// Sanity checks
	log := dlog.FromCtx(ctx).With("function", "evaluateCheckOperation")
	if op.ChainID == nil {
		log.Error("Entitlement check: chain ID is nil for operation", "operation", op.CheckType.String())
		return false, fmt.Errorf("evaluateCheckOperation: Chain ID is nil for operation %s", op.CheckType)
	}

	zeroAddress := common.Address{}
	if op.CheckType != types.NATIVE_COIN_BALANCE && op.ContractAddress == zeroAddress {
		log.Error("Entitlement check: contract address is nil for operation", "operation", op.CheckType.String())
		return false, fmt.Errorf(
			"evaluateCheckOperation: Contract address is nil for operation %s",
			op.CheckType,
		)
	}

	if op.CheckType == types.ERC20 || op.CheckType == types.ERC721 || op.CheckType == types.ERC1155 ||
		op.CheckType == types.NATIVE_COIN_BALANCE {
		params, err := types.DecodeThresholdParams(op.Params)
		if err != nil {
			log.Error(
				"evaluateCheckOperation: failed to decode threshold params",
				"error",
				err,
				"params",
				op.Params,
				"operation",
				op.CheckType.String(),
			)
			return false, err
		}
		if params.Threshold == nil {
			log.Error("Entitlement check: threshold is nil for operation", "operation", op.CheckType.String())
			return false, fmt.Errorf(
				"evaluateCheckOperation: Threshold is nil for operation %s",
				op.CheckType,
			)
		}
		if params.Threshold.Sign() <= 0 {
			log.Error(
				"Entitlement check: threshold is nonpositive for operation",
				"operation",
				op.CheckType.String(),
				"threshold",
				params.Threshold.String(),
			)
			return false, fmt.Errorf(
				"evaluateCheckOperation: Threshold %s is nonpositive for operation %s",
				params.Threshold,
				op.CheckType,
			)
		}
	}

	switch op.CheckType {
	case types.ISENTITLED:
		return e.evaluateIsEntitledOperation(ctx, op, linkedWallets)
	case types.ERC20:
		return e.evaluateErc20Operation(ctx, op, linkedWallets)
	case types.ERC721:
		return e.evaluateErc721Operation(ctx, op, linkedWallets)
	case types.ERC1155:
		return e.evaluateErc1155Operation(ctx, op)
	case types.NATIVE_COIN_BALANCE:
		return e.evaluateNativeCoinBalanceOperation(ctx, op, linkedWallets)
	case types.CheckNONE:
		fallthrough
	case types.MOCK:
		fallthrough
	default:
		return false, fmt.Errorf("unknown operation")
	}
}

func (e *Evaluator) evaluateMockOperation(
	ctx context.Context,
	op *types.CheckOperation,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateMockOperation")
	params, err := types.DecodeThresholdParams(op.Params)
	if err != nil {
		log.Error("evaluateMockOperation: failed to decode threshold params", "error", err)
		return false, fmt.Errorf("evaluateMockOperation: failed to decode threshold params, %w", err)
	}
	delay := int(params.Threshold.Int64())

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

func (e *Evaluator) evaluateIsEntitledOperation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateIsEntitledOperation")
	client, err := e.clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateIsEntitledOperation: Chain ID %v not found", op.ChainID)
	}

	customEntitlementChecker, err := base.NewICustomEntitlement(
		op.ContractAddress,
		client,
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

// Check balance in decimals of native token
func (e *Evaluator) evaluateNativeCoinBalanceOperation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateNativeTokenBalanceOperation")
	client, err := e.clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateNativeTokenBalanceOperation: Chain ID %v not found", op.ChainID)
	}
	params, err := types.DecodeThresholdParams(op.Params)
	if err != nil {
		log.Error("evaluateNativeCoinBalance: failed to decode threshold params", "error", err)
		return false, fmt.Errorf("evaluateNativeCoinBalance: failed to decode threshold params, %w", err)
	}

	total := big.NewInt(0)
	for _, wallet := range linkedWallets {
		// Balance is returned as a representation of the balance according the denomination of the
		// native token. The default decimals for most native tokens is 18, and we don't convert
		// according to decimals here, but compare the threshold directly with the balance.
		balance, err := client.BalanceAt(ctx, wallet, nil)
		if err != nil {
			log.Error("Failed to retrieve native token balance", "chain", op.ChainID, "error", err)
			return false, err
		}
		total.Add(total, balance)

		log.Info("Retrieved native token balance",
			"balance", balance.String(),
			"total", total.String(),
			"threshold", params.Threshold.String(),
			"chainID", op.ChainID.String(),
		)

		// Balance is a *big.Int
		// Iteratively check if the total balance of evaluated wallets is greater than or equal to the
		// threshold. Note threshold is always positive and total is non-negative.
		if total.Cmp(params.Threshold) >= 0 {
			return true, nil
		}
	}
	return false, nil
}

func (e *Evaluator) evaluateErc20Operation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc20Operation")
	client, err := e.clients.Get(op.ChainID.Uint64())
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

	params, err := types.DecodeThresholdParams(op.Params)
	if err != nil {
		log.Error("evaluateErc20Operation: failed to decode threshold params", "error", err)
		return false, fmt.Errorf("evaluateErc20Operation: failed to decode threshold params, %w", err)
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
			"threshold", params.Threshold.String(),
			"chainID", op.ChainID.String(),
			"erc20ContractAddress", op.ContractAddress.String(),
		)

		// Balance is a *big.Int
		// Iteratively check if the total balance of evaluated wallets is greater than or equal to the threshold
		// Note threshold is always positive and total is non-negative.
		if total.Cmp(params.Threshold) >= 0 {
			return true, nil
		}
	}
	return false, nil
}

func (e *Evaluator) evaluateErc721Operation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc721Operation")

	client, err := e.clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc721Operation: Chain ID %v not found", op.ChainID)
	}

	nft, err := erc721.NewErc721Caller(op.ContractAddress, client)
	if err != nil {
		log.Error("Failed to instantiate a NFT contract",
			"err", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}

	// Decode the threshold params
	params, err := types.DecodeThresholdParams(op.Params)
	if err != nil {
		log.Error("evaluateErc721Operation: failed to decode threshold params", "error", err)
		return false, fmt.Errorf("evaluateErc721Operation: failed to decode threshold params, %w", err)
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
		// Note threshold is always positive and total is non-negative.
		if total.Cmp(params.Threshold) >= 0 {
			return true, nil
		}
	}
	return false, err
}

func (e *Evaluator) evaluateErc1155Operation(ctx context.Context,
	op *types.CheckOperation,
) (bool, error) {
	return false, fmt.Errorf("ERC1155 not implemented")
}
