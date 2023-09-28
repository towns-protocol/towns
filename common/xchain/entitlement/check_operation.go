package entitlement

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"strconv"
	"time"

	"common/xchain/bindings/erc20"

	p "common/xchain/entitlement/gen"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

func evaluateCheckOperation(
	ctx context.Context,
	op *p.CheckOperation,
	callerAddress *common.Address,
) (bool, error) {
	if op == nil {
		return false, fmt.Errorf("operation is nil")
	}

	switch op.GetCheckClause().(type) {
	case *p.CheckOperation_IsEntitledOperation:
		return evaluateIsEntitledOperation(ctx, op.GetIsEntitledOperation())
	case *p.CheckOperation_Erc20Operation:
		return evaluateErc20Operation(ctx, op.GetErc20Operation(), callerAddress)
	case *p.CheckOperation_Erc721Operation:
		return evaluateErc721Operation(ctx, op.GetErc721Operation())
	case *p.CheckOperation_Erc1155Operation:
		return evaluateErc1155Operation(ctx, op.GetErc1155Operation())
	default:
		return false, fmt.Errorf("unknown operation")
	}

}

func evaluateIsEntitledOperation(ctx context.Context,
	op *p.IsEntitledOperation) (bool, error) {

	delay, err := strconv.ParseFloat(op.ContractAddress, 64)
	if err != nil {
		return false, err
	}

	result := awaitTimeout(ctx, func() error {
		delayDuration := time.Duration(delay*1000) * time.Millisecond
		time.Sleep(delayDuration) // simulate a long-running operation
		return nil
	})
	if result != nil {
		return false, result
	}
	if op.ChainId == "true" {
		return true, nil
	} else {
		return false, nil
	}
}

func evaluateErc20Operation(ctx context.Context,
	op *p.ERC20Operation,
	callerAddress *common.Address) (bool, error) {
	client, err := ethclient.Dial("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID")

	if err != nil {
		log.Fatalf("Failed to dial %v", err)
		return false, err
	}

	// ERC20 contract address
	contractAddress := common.HexToAddress(op.ContractAddress)

	// Create a new instance of the token contract
	token, err := erc20.NewErc20Caller(contractAddress, client)
	if err != nil {
		log.Fatalf("Failed to instantiate a Token contract: %v", err)
		return false, err
	}

	balance, err := token.BalanceOf(&bind.CallOpts{Context: ctx}, *callerAddress)
	if err != nil {
		log.Fatalf("Failed to retrieve token balance: %v", err)
		return false, err
	}

	threshold := new(big.Int).SetBytes(op.Threshold.Data)
	log.Printf("Balance: %s and requires %s", balance.String(), threshold.String()) // Balance is a *big.Int

	if threshold.Sign() > 0 && balance.Sign() > 0 && balance.Cmp(threshold) >= 0 {
		return true, nil
	} else {
		return false, nil
	}
}

func evaluateErc721Operation(ctx context.Context,
	operation *p.ERC721Operation) (bool, error) {

	delay, err := strconv.ParseFloat(operation.ContractAddress, 64)
	if err != nil {
		return false, err
	}

	result := awaitTimeout(ctx, func() error {
		delayDuration := time.Duration(delay*1000) * time.Millisecond
		time.Sleep(delayDuration) // simulate a long-running operation
		return nil
	})
	if result != nil {
		return false, result
	}
	if operation.ChainId == "true" {
		return true, nil
	} else {
		return false, nil
	}
}

func evaluateErc1155Operation(ctx context.Context,
	op *p.ERC1155Operation) (bool, error) {

	delay, err := strconv.ParseFloat(op.ContractAddress, 64)
	if err != nil {
		return false, err
	}

	result := awaitTimeout(ctx, func() error {
		delayDuration := time.Duration(delay*1000) * time.Millisecond
		time.Sleep(delayDuration) // simulate a long-running operation
		return nil
	})
	if result != nil {
		return false, result
	}
	if op.ChainId == "true" {
		return true, nil
	} else {
		return false, nil
	}
}
