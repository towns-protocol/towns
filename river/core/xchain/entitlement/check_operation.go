package entitlement

import (
	"context"
	"core/xchain/bindings/erc20"
	"core/xchain/bindings/erc721"
	"core/xchain/config"
	"core/xchain/contracts"
	"fmt"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/river-build/river/core/node/dlog"
)

func evaluateCheckOperation(
	ctx context.Context,
	cfg *config.Config,
	op *CheckOperation,
	callerAddress *common.Address,
) (bool, error) {
	switch op.CheckType {
	case CheckOperationType(MOCK):
		return evaluateMockOperation(ctx, op)
	case CheckOperationType(ISENTITLED):
		return evaluateIsEntitledOperation(ctx, cfg, op, callerAddress)
	case CheckOperationType(ERC20):
		return evaluateErc20Operation(ctx, cfg, op, callerAddress)
	case CheckOperationType(ERC721):
		return evaluateErc721Operation(ctx, cfg, op, callerAddress)
	case CheckOperationType(ERC1155):
		return evaluateErc1155Operation(ctx, op)
	case CheckOperationType(NONE):
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
	callerAddress *common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc20Operation")
	url, ok := cfg.Chains[op.ChainID.Uint64()]
	if !ok {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc20Operation: Chain ID %v not found", op.ChainID)
	}
	client, err := ethclient.Dial(url)
	if err != nil {
		log.Error("Failed to dial", "err", err)
		return false, err
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
			"chainUrl", url,
		)
		return false, err
	}
	// Check if the caller is entitled
	isEntitled, err := customEntitlementChecker.IsEntitled(
		&bind.CallOpts{Context: ctx},
		[]common.Address{*callerAddress},
	)
	if err != nil {
		log.Error("Failed to check if caller is entitled",
			"error", err,
			"contractAddress", op.ContractAddress,
			"callerAddress", callerAddress,
			"channelId", op.ChannelId,
			"permission", op.Permission,
			"chainId", op.ChainID,
			"chainUrl", url,
		)
		return false, err
	}
	return isEntitled, nil
}

func evaluateErc20Operation(
	ctx context.Context,
	cfg *config.Config,
	op *CheckOperation,
	callerAddress *common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc20Operation")
	url, ok := cfg.Chains[op.ChainID.Uint64()]
	if !ok {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc20Operation: Chain ID %v not found", op.ChainID)
	}
	client, err := ethclient.Dial(url)
	if err != nil {
		log.Error("Failed to dial", "err", err)
		return false, err
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

	// Balance is returned as a representation of the balance according to the token's decimals,
	// which stores the balance in exponentiated form.
	// Default decimals for most tokens is 18, meaning the balance is stored as balance * 10^18.
	balance, err := token.BalanceOf(&bind.CallOpts{Context: ctx}, *callerAddress)
	if err != nil {
		log.Error("Failed to retrieve token balance", "error", err)
		return false, err
	}

	log.Debug("Retrieved token balance",
		"balance", balance.String(),
		"threshold", op.Threshold.String(),
		"chainID", op.ChainID.String(),
		"contractAddress", op.ContractAddress.String(),
	)

	// Balance is a *big.Int
	if op.Threshold.Sign() > 0 && balance.Sign() > 0 && balance.Cmp(op.Threshold) >= 0 {
		return true, nil
	} else {
		return false, nil
	}
}

func evaluateErc721Operation(
	ctx context.Context,
	cfg *config.Config,
	op *CheckOperation,
	callerAddress *common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateErc721Operation")

	url, ok := cfg.Chains[op.ChainID.Uint64()]
	if !ok {
		log.Error("Chain ID not found", "chainID", op.ChainID)
		return false, fmt.Errorf("evaluateErc20Operation: Chain ID %v not found", op.ChainID)
	}
	log.Info("Evalutating operation with chain RPC URL", "url", url)
	client, err := ethclient.Dial(url)
	if err != nil {
		log.Error("Failed to dial", "err", err)
		return false, err
	}
	nft, err := erc721.NewErc721Caller(op.ContractAddress, client)
	if err != nil {
		log.Error("Failed to instantiate a NFT contract",
			"err", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}

	// Check if the caller owns the NFT
	log.Info(
		"Checking if caller owns NFT",
		"callerAddress", callerAddress,
		"contractAddress", op.ContractAddress,
	)
	tokenBalance, err := nft.BalanceOf(&bind.CallOpts{Context: ctx}, *callerAddress)
	if err != nil {
		log.Error("Failed to retrieve NFT balance",
			"error", err,
			"contractAddress", op.ContractAddress,
		)
		return false, err
	}
	// Require the caller to own at least one NFT in this contract.
	return tokenBalance.Cmp(op.Threshold) >= 0, nil
}

func evaluateErc1155Operation(ctx context.Context,
	op *CheckOperation,
) (bool, error) {
	return false, fmt.Errorf("ERC1155 not implemented")
}
