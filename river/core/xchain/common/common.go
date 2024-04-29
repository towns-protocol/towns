package common

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/river-build/river/core/node/dlog"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/rpc"
)

var loadAddressesOnce sync.Once

func ConvertHTTPToWebSocket(httpURL string) (string, error) {
	// Parse the URL
	parsedURL, err := url.Parse(httpURL)
	if err != nil {
		return "", err
	}

	// Change the scheme based on the original
	switch parsedURL.Scheme {
	case "http":
		parsedURL.Scheme = "ws"
	case "https":
		parsedURL.Scheme = "wss"
	case "ws":
		parsedURL.Scheme = "ws"
	case "wss":
		parsedURL.Scheme = "wss"
	default:
		return "", fmt.Errorf("unexpected scheme: %s", parsedURL.Scheme)
	}

	// Return the modified URL
	return parsedURL.String(), nil
}

const requiredBalance = 10000000000000000 // 0.01 ETH in Wei

func WaitUntilWalletFunded(ctx context.Context, wsEndpoint string, walletAddress common.Address) error {
	log := dlog.FromCtx(ctx)

	// Connect to the client using WebSocket for live subscription
	rpcClient, err := rpc.DialContext(ctx, wsEndpoint)
	if err != nil {
		log.Error("Failed to connect to the Ethereum WebSocket client", "err", err)
		return err
	}
	defer rpcClient.Close()

	ethClient := ethclient.NewClient(rpcClient)

	// Subscribe to new block headers
	headers := make(chan *types.Header)
	subscription, err := ethClient.SubscribeNewHead(ctx, headers)
	if err != nil {
		log.Error("Failed to subscribe to new block headers", "err", err)
		return err
	}
	defer subscription.Unsubscribe()

	log.Info("Subscription created. Waiting for the wallet to be funded...")

	for {
		select {
		case err := <-subscription.Err():
			log.Error("Subscription error", "err", err)
			return err

		case <-headers:
			// Check the balance on each new block
			balance, err := ethClient.BalanceAt(ctx, walletAddress, nil)
			if err != nil || balance == nil {
				log.Warn("Failed to retrieve wallet balance", "err", err)
				continue // Try again in the next block
			}

			if balance.Cmp(big.NewInt(requiredBalance)) >= 0 {
				log.Info("Wallet is funded. Current balance", "balance", balance)
				return nil
			} else {
				log.Warn("Wallet is not funded yet. Current balance", "balance", balance, "requiredBalance", requiredBalance, "walletAddress", walletAddress.Hex())
			}

		case <-ctx.Done():
			// Handle context cancellation
			log.Info("Context cancelled, stopping WaitUntilWalletFunded subscription")
			return ctx.Err()
		}
	}
}

func WaitForTransaction(client *ethclient.Client, tx *types.Transaction) *big.Int {
	log := dlog.FromCtx(context.Background())
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
			parsed, err := abi.JSON(
				strings.NewReader(
					`[{"constant":true,"inputs":[],"name":"errorMessage","outputs":[{"name":"","type":"string"}],"type":"function"}]`,
				),
			)
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
				log.Error(
					"Transaction failed with status but no logs were emitted.",
					"status",
					tx.Hash().Hex(),
					"rcp",
					rcp,
					"result",
					result,
				)

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
