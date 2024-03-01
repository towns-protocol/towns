package entitlement

import (
	"context"
	"fmt"
	"log"
	"time"

	"core/xchain/bindings/erc20"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

func evaluateCheckOperation(
	ctx context.Context,
	op *CheckOperation,
	callerAddress *common.Address,
) (bool, error) {
	switch op.CheckType {
	case CheckOperationType(MOCK):
		return evaluateMockOperation(ctx, op)
	case CheckOperationType(ISENTITLED):
		return evaluateIsEntitledOperation(ctx, op)
	case CheckOperationType(ERC20):
		return evaluateErc20Operation(ctx, op, callerAddress)
	case CheckOperationType(ERC721):
		return evaluateErc721Operation(ctx, op)
	case CheckOperationType(ERC1155):
		return evaluateErc1155Operation(ctx, op)
	default:
		return false, fmt.Errorf("unknown operation")
	}

}

func evaluateMockOperation(ctx context.Context,
	op *CheckOperation) (bool, error) {

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

func evaluateIsEntitledOperation(ctx context.Context,
	op *CheckOperation) (bool, error) {

	delay := int(op.Threshold.Int64())

	result := awaitTimeout(ctx, func() error {
		delayDuration := time.Duration(delay*1000) * time.Millisecond
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

func evaluateErc20Operation(ctx context.Context,
	op *CheckOperation,
	callerAddress *common.Address) (bool, error) {
	client, err := ethclient.Dial("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID")

	if err != nil {
		log.Fatalf("Failed to dial %v", err)
		return false, err
	}

	// Create a new instance of the token contract
	token, err := erc20.NewErc20Caller(op.ContractAddress, client)
	if err != nil {
		log.Fatalf("Failed to instantiate a Token contract: %v", err)
		return false, err
	}

	balance, err := token.BalanceOf(&bind.CallOpts{Context: ctx}, *callerAddress)
	if err != nil {
		log.Fatalf("Failed to retrieve token balance: %v", err)
		return false, err
	}

	log.Printf("Balance: %s and requires %s", balance.String(), op.Threshold.String()) // Balance is a *big.Int

	if op.Threshold.Sign() > 0 && balance.Sign() > 0 && balance.Cmp(op.Threshold) >= 0 {
		return true, nil
	} else {
		return false, nil
	}
}

func evaluateErc721Operation(ctx context.Context,
	op *CheckOperation) (bool, error) {

	delay := int(op.Threshold.Int64())

	result := awaitTimeout(ctx, func() error {
		delayDuration := time.Duration(delay*1000) * time.Millisecond
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

func evaluateErc1155Operation(ctx context.Context,
	op *CheckOperation) (bool, error) {

	delay := int(op.Threshold.Int64())

	result := awaitTimeout(ctx, func() error {
		delayDuration := time.Duration(delay*1000) * time.Millisecond
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
