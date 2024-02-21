package server

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"errors"
	"math/big"

	"github.com/river-build/river/dlog"

	xc "servers/xchain/common"
	"servers/xchain/config"
	e "servers/xchain/contracts"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

func isClosed(ch <-chan struct{}) bool {
	select {
	case _, ok := <-ch:
		// if the channel is closed and empty, ok will be false
		return !ok
	default:
		// if the channel is neither closed nor empty, we'll get to the default case
		return false
	}
}
func RunServer(ctx context.Context, workerID int, shutdown <-chan struct{}) {

	log := dlog.FromCtx(ctx).With("worker_id", workerID)

	ctx = dlog.CtxWithLog(ctx, log)

	privateKey, err := crypto.GenerateKey()
	if err != nil {
		log.Error("Failed to generate private key", "err", err)
		return
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Error("error casting public key to ECDSA")
		return
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	err = xc.FundWallet(fromAddress)
	if err != nil {
		log.Error("Failed to fundWallet", "err", err)
		return
	}

	blockNumber, err := registerNode(ctx, workerID, fromAddress, privateKey)
	if err != nil {
		log.Error("Failed to registerNode", "err", err)
		return
	}

	defer unregisterNode(ctx, workerID, fromAddress, privateKey)

	events := make(chan *e.DevIEntitlementCheckerEntitlementCheckRequested)

	// Event loop
	for !isClosed(shutdown) {
		if eventLoop(ctx, workerID, blockNumber, events, shutdown, fromAddress, privateKey) {
			return
		}
	}
}

func registerNode(ctx context.Context, workerID int, fromAddress common.Address, privateKey *ecdsa.PrivateKey) (*uint64, error) {
	log := dlog.FromCtx(ctx)
	chainId := big.NewInt(int64(config.GetConfig().EntitlementContract.ChainId))
	log.Info("Registering node", "Url", config.GetConfig().EntitlementContract.Url)
	client, err := ethclient.Dial(config.GetConfig().EntitlementContract.Url)
	if err != nil {
		log.Error("Failed to connect to the Ethereum", "err", err)
		return nil, err
	}
	defer client.Close()

	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		log.Error("Failed PendingNonceAt", "err", err)
		return nil, err
	}

	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		log.Error("Failed SuggestGasPrice", "err", err)
		return nil, err
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainId)
	if err != nil {
		log.Error("Failed NewKeyedTransactorWithChainID", "err", err)
		return nil, err
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = uint64(300000)
	auth.GasPrice = gasPrice

	checker, err := e.NewDevIEntitlementChecker(*xc.GetCheckerContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
		return nil, err
	}

	log.Debug("Registering node", "auth", auth, "checker", checker)

	tx, err := checker.RegisterNode(auth)
	if err != nil {
		log.Error("Failed RegisterNode", "err", err)
		return nil, err
	}

	blockNumber := xc.WaitForTransaction(client, tx)
	if blockNumber == nil {
		log.Error("Failed to get block number", "err", err)

		return nil, errors.New("failed to get block number")
	}
	temp := blockNumber.Uint64()
	return &temp, nil
}

func unregisterNode(ctx context.Context, workerID int, fromAddress common.Address, privateKey *ecdsa.PrivateKey) {
	log := dlog.FromCtx(ctx)
	chainId := big.NewInt(int64(config.GetConfig().EntitlementContract.ChainId))

	client, err := ethclient.Dial(config.GetConfig().EntitlementContract.Url)
	if err != nil {
		log.Error("Failed to connect to the Ethereum client", "err", err)
		return
	}
	defer client.Close()

	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		log.Error("Failed PendingNonceAt", "err", err)
		return
	}

	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		log.Error("Failed SuggestGasPrice", "err", err)
		return
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainId)
	if err != nil {
		log.Error("Failed NewKeyedTransactorWithChainID", "err", err)
		return
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = uint64(300000)
	auth.GasPrice = gasPrice

	checker, err := e.NewDevIEntitlementChecker(*xc.GetCheckerContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
		return
	}

	tx, err := checker.UnregisterNode(auth)
	if err != nil {
		log.Error("Failed UnregisterNode", "err", err)
		return
	}

	blockNumber := xc.WaitForTransaction(client, tx).Uint64()
	log.Info("Unregistered node", "block_num", blockNumber)
}

func eventLoop(ctx context.Context, workerID int, blockNumber *uint64, events chan *e.DevIEntitlementCheckerEntitlementCheckRequested, shutdown <-chan struct{}, fromAddress common.Address, privateKey *ecdsa.PrivateKey) bool {
	log := dlog.FromCtx(ctx)
	chainId := big.NewInt(int64(config.GetConfig().EntitlementContract.ChainId))

	client, err := ethclient.Dial(config.GetConfig().EntitlementContract.Url)
	if err != nil {
		log.Error("Failed to connect to the Ethereum client", "err", err)
		return false
	}
	defer client.Close()

	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Error("Failed PendingNonceAt", "err", err)
		return false
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Error("Failed SuggestGasPrice", "err", err)
		return false
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainId)
	if err != nil {
		log.Error("Failed NewKeyedTransactorWithChainID", "err", err)
		return false
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = uint64(300000)
	auth.GasPrice = gasPrice

	nodeCheckerFilterer, err := e.NewDevIEntitlementCheckerFilterer(*xc.GetCheckerContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
	}
	bc := context.Background()

	opts := bind.WatchOpts{Start: blockNumber, Context: bc}
	sub, err := nodeCheckerFilterer.WatchEntitlementCheckRequested(&opts, events, nil)
	if err != nil {
		log.Error("Failed to set up event watch", "err", err, "opts", opts, "events", events)
	}
	defer func() {
		if sub != nil {
			sub.Unsubscribe()
		}
	}()
	for !isClosed(shutdown) {
		select {
		case <-shutdown:
			log.Info("Node shutting down")
			return true
		case event := <-events:
			// Keep track of the highest block number seen
			// in case the client needs to restart
			*blockNumber = event.Raw.BlockNumber

			log := dlog.FromCtx(ctx).With("transaction_id", hex.EncodeToString(event.TransactionId[:]), "block_num", event.Raw.BlockNumber)

			eventCtx := dlog.CtxWithLog(ctx, log)

			for _, nodeAddress := range event.SelectedNodes {
				if nodeAddress == fromAddress {
					postCheckResult(eventCtx, workerID, event, client, fromAddress, auth)
				}
			}
		case err := <-sub.Err():
			log.Error("Node Subscription error", "err", err)
			return false
		}
	}
	return true

}

func postCheckResult(ctx context.Context, workerID int, event *e.DevIEntitlementCheckerEntitlementCheckRequested, client *ethclient.Client, fromAddress common.Address, auth *bind.TransactOpts) {
	log := dlog.FromCtx(ctx)
	log.Info("EntitlementCheckRequested being handeled")

	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		log.Error("Failed PendingNonceAt", "err", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))

	gatedContractAdress := event.ContractAddress

	gater, err := e.NewDevIEntitlementGated(gatedContractAdress, client)
	if err != nil {
		log.Error("Failed to NewEntitlementGated watch", "err", err)
		return
	}

	tx, err := gater.PostEntitlementCheckResult(auth, event.TransactionId, 1)
	if err != nil {
		log.Error("Failed to PostEntitlementCheckResult watch", "err", err)
		return
	}

	go func() {
		// TODO retry the transaction if it fails
		postedBlockNumber := xc.WaitForTransaction(client, tx)
		log.Info("PostEntitlementCheckResult", "tx", tx.Hash().Hex(), "posted_block_num", postedBlockNumber)
	}()
}
