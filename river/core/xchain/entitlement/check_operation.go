package entitlement

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/contracts/types"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/xchain/bindings/erc1155"
	"github.com/towns-protocol/towns/core/xchain/bindings/erc20"
	"github.com/towns-protocol/towns/core/xchain/bindings/erc721"
)

func checkThresholdParam(threshold *big.Int) error {
	if threshold == nil {
		return fmt.Errorf("threshold is nil")
	}
	if threshold.Sign() <= 0 {
		return fmt.Errorf(
			"threshold %s is nonpositive",
			threshold,
		)
	}
	return nil
}

func checkTokenIdParam(tokenId *big.Int) error {
	if tokenId == nil {
		return fmt.Errorf("token ID is nil")
	}
	if tokenId.Sign() < 0 {
		return fmt.Errorf("token ID %s is negative", tokenId)
	}
	return nil
}

func validateCheckOperation(ctx context.Context, op *types.CheckOperation) error {
	// Validation for each of the following fields is applied to relevant check types.
	// 1. Chain ID is not nil
	// 2. Contract address is not nil
	// 3. Threshold is positive
	// 4. Token ID is non-negative
	log := logging.FromCtx(ctx).With("function", "validateCheckOperation")
	if op.CheckType != types.ETH_BALANCE && op.ChainID == nil {
		log.Errorw("Entitlement check: chain ID is nil for operation", "operation", op.CheckType.String())
		return fmt.Errorf("validateCheckOperation: chain ID is nil for operation %s", op.CheckType)
	}

	zeroAddress := common.Address{}
	if op.CheckType != types.ETH_BALANCE && op.ContractAddress == zeroAddress {
		log.Errorw("Entitlement check: contract address is nil for operation", "operation", op.CheckType.String())
		return fmt.Errorf(
			"validateCheckOperation: contract address is nil for operation %s",
			op.CheckType,
		)
	}

	if op.CheckType == types.ERC20 || op.CheckType == types.ERC721 || op.CheckType == types.ETH_BALANCE {
		params, err := types.DecodeThresholdParams(op.Params)
		if err != nil {
			log.Errorw(
				"validateCheckOperation: failed to decode threshold params",
				"error",
				err,
				"params",
				op.Params,
				"operation",
				op.CheckType.String(),
			)
			return fmt.Errorf("validateCheckOperation: failed to decode threshold params, %w", err)
		}
		if err := checkThresholdParam(params.Threshold); err != nil {
			// Wrap the error with the operation type
			err = fmt.Errorf("validateCheckOperation: %w for operation %s", err, op.CheckType)
			log.Errorw(
				"Entitlement check: invalid threshold for operation",
				"operation",
				op.CheckType.String(),
				"error",
				err,
			)
			return err
		}
	} else if op.CheckType == types.ERC1155 {
		params, err := types.DecodeERC1155Params(op.Params)
		if err != nil {
			log.Errorw("validateCheckOperation: failed to decode ERC1155 params", "error", err)
			return fmt.Errorf("validateCheckOperation: failed to decode ERC1155 params, %w", err)
		}
		if err := checkTokenIdParam(params.TokenId); err != nil {
			// Wrap the error with the operation type
			err = fmt.Errorf("validateCheckOperation: %w for operation %s", err, op.CheckType)
			log.Errorw(
				"Entitlement check: invalid token ID for operation",
				"operation",
				op.CheckType.String(),
				"error",
				err,
			)
			return err
		}
		if err := checkThresholdParam(params.Threshold); err != nil {
			// Wrap the error with the operation type
			err = fmt.Errorf("validateCheckOperation: %w for operation %s", err, op.CheckType)
			log.Errorw(
				"Entitlement check: invalid threshold for operation",
				"operation",
				op.CheckType.String(),
				"error",
				err,
			)
			return err
		}
	}
	return nil
}

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

	if err := validateCheckOperation(ctx, op); err != nil {
		return false, err
	}

	switch op.CheckType {
	case types.ISENTITLED:
		return e.evaluateIsEntitledOperation(ctx, op, linkedWallets)
	case types.ERC20:
		return e.evaluateErc20Operation(ctx, op, linkedWallets)
	case types.ERC721:
		return e.evaluateErc721Operation(ctx, op, linkedWallets)
	case types.ERC1155:
		return e.evaluateErc1155Operation(ctx, op, linkedWallets)
	case types.ETH_BALANCE:
		return e.evaluateEthBalanceOperation(ctx, op, linkedWallets)
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
	log := logging.FromCtx(ctx).With("function", "evaluateMockOperation")
	params, err := types.DecodeThresholdParams(op.Params)
	if err != nil {
		log.Errorw("evaluateMockOperation: failed to decode threshold params", "error", err)
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

	if (op.ContractAddress != common.Address{}) {
		// Grab last byte of contract address as a unique identifier of which check
		// caused the error, for ease of debugging test cases.
		return false, fmt.Errorf("intentional failure (%.2x)", op.ContractAddress[19])
	}
	return op.ChainID.Sign() != 0, nil
}

func (e *Evaluator) evaluateIsEntitledOperation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := logging.FromCtx(ctx).With("function", "evaluateIsEntitledOperation")
	client, err := e.clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Errorw("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateIsEntitledOperation: Chain ID %v not found", op.ChainID)
	}

	crossChainEntitlementChecker, err := base.NewICrossChainEntitlement(
		op.ContractAddress,
		client,
	)
	if err != nil {
		log.Errorw("Failed to instantiate a CustomEntitlement contract from supplied contract address",
			"err", err,
			"contractAddress", op.ContractAddress,
			"chainId", op.ChainID,
		)
		return false, err
	}
	for _, wallet := range linkedWallets {
		// Check if the caller is entitled
		isEntitled, err := crossChainEntitlementChecker.IsEntitled(
			&bind.CallOpts{Context: ctx},
			[]common.Address{wallet},
			op.Params,
		)
		if err != nil {
			log.Errorw("Failed to check if caller is entitled",
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

// Check ETH balance, in decimals, across all supported chains that use Ether as the native token for payments.
func (e *Evaluator) evaluateEthBalanceOperation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := logging.FromCtx(ctx).With("function", "evaluateEthBalanceOperation")

	// Accumulator for the total balance across all chains.
	total := big.NewInt(0)

	for _, chainID := range e.ethChainIds {
		log.Infow("Evaluating ETH balance on chain", "chainID", chainID, "wallets", linkedWallets)
		client, err := e.clients.Get(chainID)
		if err != nil {
			log.Errorw("Provider for Chain ID not found", "chainID", chainID)
			return false, fmt.Errorf("evaluateEthBalanceOperation: Providerfor chain ID %v not found", chainID)
		}
		params, err := types.DecodeThresholdParams(op.Params)
		if err != nil {
			log.Errorw("Failed to decode threshold params", "error", err)
			return false, fmt.Errorf("evaluateEthBalanceOperation: failed to decode threshold params, %w", err)
		}

		for _, wallet := range linkedWallets {
			// Balance is returned as a representation of the balance according the denomination of the
			// ETH, which is 18. We do not convert away from decimals here, but compare the threshold
			// directly with the decimalized balance.
			balance, err := client.BalanceAt(ctx, wallet, nil)
			if err != nil {
				log.Errorw("Failed to retrieve ETH balance", "chain", chainID, "error", err)
				return false, err
			}
			total.Add(total, balance)

			log.Infow("Accumulated ETH balance for chain",
				"balance", balance.String(),
				"total", total.String(),
				"threshold", params.Threshold.String(),
				"chainID", chainID,
			)

			// Balance is a *big.Int
			// Iteratively check if the total balance of evaluated wallets is greater than or equal to the
			// threshold. Note threshold is always positive and total is non-negative.
			if total.Cmp(params.Threshold) >= 0 {
				return true, nil
			}
		}
	}
	return false, nil
}

func (e *Evaluator) evaluateErc20Operation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := logging.FromCtx(ctx).With("function", "evaluateErc20Operation")
	client, err := e.clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Errorw("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc20Operation: Chain ID %v not found", op.ChainID)
	}

	// Create a new instance of the token contract
	token, err := erc20.NewErc20Caller(op.ContractAddress, client)
	if err != nil {
		log.Errorw(
			"Failed to instantiate a Token contract",
			"err", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}

	params, err := types.DecodeThresholdParams(op.Params)
	if err != nil {
		log.Errorw("evaluateErc20Operation: failed to decode threshold params", "error", err)
		return false, fmt.Errorf("evaluateErc20Operation: failed to decode threshold params, %w", err)
	}

	total := big.NewInt(0)

	for _, wallet := range linkedWallets {
		// Balance is returned as a representation of the balance according to the token's decimals,
		// which stores the balance in exponentiated form.
		// Default decimals for most tokens is 18, meaning the balance is stored as balance * 10^18.
		balance, err := token.BalanceOf(&bind.CallOpts{Context: ctx}, wallet)
		if err != nil {
			log.Errorw("Failed to retrieve token balance", "error", err)
			return false, err
		}
		total.Add(total, balance)

		log.Debugw("Retrieved ERC20 token balance",
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
	log := logging.FromCtx(ctx).With("function", "evaluateErc721Operation")

	client, err := e.clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Errorw("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc721Operation: Chain ID %v not found", op.ChainID)
	}

	nft, err := erc721.NewErc721Caller(op.ContractAddress, client)
	if err != nil {
		log.Errorw("Failed to instantiate a NFT contract",
			"err", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}

	// Decode the threshold params
	params, err := types.DecodeThresholdParams(op.Params)
	if err != nil {
		log.Errorw("evaluateErc721Operation: failed to decode threshold params", "error", err)
		return false, fmt.Errorf("evaluateErc721Operation: failed to decode threshold params, %w", err)
	}

	total := big.NewInt(0)
	for _, wallet := range linkedWallets {
		tokenBalance, err := nft.BalanceOf(&bind.CallOpts{Context: ctx}, wallet)
		if err != nil {
			log.Errorw("Failed to retrieve NFT balance",
				"error", err,
				"contractAddress", op.ContractAddress,
				"wallet", wallet,
			)
			return false, err
		}

		// Accumulate the total balance across evaluated wallets
		total.Add(total, tokenBalance)

		// Iteratively check if the total balance of evaluated wallets is greater than or equal to the threshold
		// Note threshold is always positive and total is non-negative.
		if total.Cmp(params.Threshold) >= 0 {
			return true, nil
		}
	}
	return false, err
}

func (e *Evaluator) evaluateErc1155Operation(
	ctx context.Context,
	op *types.CheckOperation,
	linkedWallets []common.Address,
) (bool, error) {
	log := logging.FromCtx(ctx).With("function", "evaluateErc1155Operation")

	client, err := e.clients.Get(op.ChainID.Uint64())
	if err != nil {
		log.Errorw("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc1155Operation: Chain ID %v not found", op.ChainID)
	}

	collection, err := erc1155.NewErc1155Caller(op.ContractAddress, client)
	if err != nil {
		log.Errorw("Failed to instantiate an ERC1155 contract",
			"err", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}

	// Decode the ERC1155 params
	params, err := types.DecodeERC1155Params(op.Params)
	if err != nil {
		log.Errorw("evaluateErc1155Operation: failed to decode erc1155 params", "error", err)
		return false, fmt.Errorf("evaluateErc1155Operation: failed to decode erc1155 params, %w", err)
	}

	total := big.NewInt(0)
	for _, wallet := range linkedWallets {
		tokenBalance, err := collection.BalanceOf(&bind.CallOpts{Context: ctx}, wallet, params.TokenId)
		if err != nil {
			log.Errorw("Failed to retrieve ERC1155 token balance",
				"error", err,
				"contractAddress", op.ContractAddress,
				"wallet", wallet,
				"tokenId", params.TokenId.String(),
			)
			return false, err
		}

		// Accumulate the total balance across evaluated wallets
		total.Add(total, tokenBalance)

		// Iteratively check if the total balance of evaluated wallets is greater than or equal to the threshold
		// Note threshold is always positive and total is non-negative.
		if total.Cmp(params.Threshold) >= 0 {
			return true, nil
		}
	}
	return false, err
}
