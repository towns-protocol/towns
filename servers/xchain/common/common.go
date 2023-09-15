package common

import (
	"context"
	_ "embed"
	"encoding/json"
	"math/big"
	"os"
	"strings"
	"sync"
	"time"

	"casablanca/node/dlog"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

//go:embed localhost_entitlementChecker.json
var localhost_entitlementChecker []byte

//go:embed localhost_entitlementGatedExample.json
var localhost_entitlementGatedExample []byte

var EMPTY_ADDRESS = common.Address{}

type ContractAddresses struct {
	EntitlementChecker      string `json:"entitlementChecker"`
	EntitlementGatedExample string `json:"entitlementGatedExample"`
}

type ContractAddress struct {
	Address string `json:"address"`
}

var checkerContractAddress common.Address
var gatedContractAddress common.Address

var loadAddressesOnce sync.Once

func loadAddresses() {
	var entitlementCheckerAddress ContractAddress
	err := json.Unmarshal(localhost_entitlementChecker, &entitlementCheckerAddress)
	if err != nil {
		dlog.CtxLog(context.Background()).Error("Failed to parse localhost_entitlementChecker.json", "err", err)
		os.Exit(1)
	}

	var entitlementGatedExampleAddress ContractAddress
	err = json.Unmarshal(localhost_entitlementGatedExample, &entitlementGatedExampleAddress)
	if err != nil {
		dlog.CtxLog(context.Background()).Error("Failed to parse localhost_entitlementGatedExample.json", "err", err)
		os.Exit(1)
	}

	checkerContractAddress = common.HexToAddress(entitlementCheckerAddress.Address)
	gatedContractAddress = common.HexToAddress(entitlementGatedExampleAddress.Address)
}

func GetCheckerContractAddress() *common.Address {
	loadAddressesOnce.Do(loadAddresses)
	return &checkerContractAddress
}

func GetGatedContractAddress() *common.Address {
	loadAddressesOnce.Do(loadAddresses)
	return &gatedContractAddress
}

func FundWallet(fromAddress common.Address) (err error) {
	log := dlog.CtxLog(context.Background())

	client, err := ethclient.Dial("ws://127.0.0.1:8545")
	if err != nil {
		log.Error("Failed to connect to the Ethereum client", "err", err)
		return err
	}

	var result interface{}

	err = client.Client().CallContext(context.Background(), &result, "anvil_setBalance", fromAddress, 1000000000000000000)
	if err != nil {
		log.Error("Failed call anvil_setBalance", "err", err)
		return err

	}
	log.Info("Funded wallet", "result", result)

	return err
}

func WaitForTransaction(client *ethclient.Client, tx *types.Transaction) *big.Int {
	log := dlog.CtxLog(context.Background())
	for {
		receipt, err := client.TransactionReceipt(context.Background(), tx.Hash())
		if err != nil {
			if err == ethereum.NotFound {

				time.Sleep(500 * time.Millisecond)
				continue
			} else {
				log.Error("Failed to get transaction receipt", "err", err)
				return nil
			}
		}

		if receipt.Status != types.ReceiptStatusSuccessful {

			// The ABI for a `revert` reason is essentially a string, so we'll use that
			parsed, err := abi.JSON(strings.NewReader(`[{"constant":true,"inputs":[],"name":"errorMessage","outputs":[{"name":"","type":"string"}],"type":"function"}]`))
			if err != nil {
				log.Error("Failed to parse ABI", "err", err)
				return nil
			}

			if receipt.Logs == nil || len(receipt.Logs) == 0 {
				rcp, err := json.MarshalIndent(receipt, "", "    ")
				if err != nil {
					log.Error("Failed to marshal receipt", "err", err)
					return nil
				}
				rpcClient := client.Client() // Access the underlying rpc.Client

				var result map[string]interface{} // Replace with the actual type of the result

				err = rpcClient.Call(&result, "debug_traceTransaction", tx.Hash(), map[string]interface{}{})
				if err != nil {
					log.Error("Failed to execute debug_traceTransaction: %v", err)
				}
				log.Error("Transaction failed with status but no logs were emitted.", "status", tx.Hash().Hex(), "rcp", rcp, "result", result)

				return nil
			}

			// Attempt to unpack the error message
			var errorMsg string
			err = parsed.UnpackIntoInterface(&errorMsg, "errorMessage", receipt.Logs[0].Data)
			if err != nil {
				log.Error("Failed to unpack error message", "err", err)
				return nil
			}

			log.Error("Revert Reason:", "errorMsg", errorMsg)
			/*
				var receiptResp interface{}
				err = client.Client().CallContext(context.Background(), &receiptResp, "eth_getTransactionReceipt", tx.Hash().Hex())
				if err != nil {
					log.Fatalf("Fetching transaction receipt failed %v %v!\n", receiptResp, err)
				}
				jsonResp, err := json.Marshal(receiptResp)
				if err != nil {
					log.Fatalf("Failed to marshal json %v!\n", err)
				}
				log.Fatalf("Transaction != types.ReceiptStatusSuccessful jsonResp: %v", string(jsonResp))
				return nil
			*/
		}
		return receipt.BlockNumber
	}
}
