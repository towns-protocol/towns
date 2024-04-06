package server

import (
	"context"
	"core/xchain/config"
	"crypto/ecdsa"
	"encoding/hex"
	"math/big"
	"os"

	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"

	xc "core/xchain/common"

	e "core/xchain/contracts"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
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

	var err error
	var wallet *crypto.Wallet
	// Read env var WALLETPRIVATEKEY or PRIVATE_KEY
	privKey := os.Getenv("WALLETPRIVATEKEY")
	if privKey == "" {
		privKey = os.Getenv("PRIVATE_KEY")
	}
	if privKey != "" {
		wallet, err = crypto.NewWalletFromPrivKey(ctx, privKey)
	} else {
		wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
	}
	if err != nil {
		log.Error("error finding wallet")
		return
	}

	fromAddress := wallet.Address

	baseWebsocketURL, err := xc.ConvertHTTPToWebSocket(config.GetConfig().BaseChain.NetworkUrl)
	if err != nil {
		log.Error("Failed to convert BaseChain HTTP to WebSocket", "err", err)
		return
	}

	err = xc.WaitUntilWalletFunded(ctx, baseWebsocketURL, fromAddress)
	if err != nil {
		log.Error("Failed to confirm wallet has sufficent funds", "err", err)
		return
	}

	blockNumber, err := registerNode(ctx, workerID, fromAddress, wallet.PrivateKeyStruct)
	if err != nil {
		log.Error("Failed to registerNode", "err", err)
		return
	}

	events := make(chan *e.IEntitlementCheckerEntitlementCheckRequested)

	// Event loop
	for !isClosed(shutdown) {
		if eventLoop(ctx, workerID, blockNumber, events, shutdown, fromAddress, wallet.PrivateKeyStruct) {
			return
		}
	}
}

func registerNode(
	ctx context.Context,
	workerID int,
	fromAddress common.Address,
	privateKey *ecdsa.PrivateKey,
) (*uint64, error) {
	log := dlog.FromCtx(ctx)
	chainId := big.NewInt(int64(config.GetConfig().BaseChain.ChainId))
	log.Info(
		"Registering node",
		"Url",
		config.GetConfig().BaseChain.NetworkUrl,
		"ContractAddress",
		config.GetConfig().EntitlementContract.Address,
		"Node",
		fromAddress.String(),
	)
	baseWebsocketURL, err := xc.ConvertHTTPToWebSocket(config.GetConfig().BaseChain.NetworkUrl)
	if err != nil {
		log.Error("Failed to convert BaseChain HTTP to WebSocket", "err", err)
		return nil, err
	}
	client, err := ethclient.Dial(baseWebsocketURL)
	if err != nil {
		log.Error("Failed to connect to the Ethereum", "err", err)
		return nil, err
	}
	defer client.Close()

	nonce, err := client.PendingNonceAt(ctx, fromAddress)

	log.Debug("PendingNonceAt", "nonce", nonce)
	if err != nil {
		log.Error("Failed PendingNonceAt", "err", err)
		return nil, err
	}

	gasPrice, err := client.SuggestGasPrice(ctx)
	log.Debug("SuggestGasPrice", "gasPrice", gasPrice)
	if err != nil {
		log.Error("Failed SuggestGasPrice", "err", err)
		return nil, err
	}

	balance, err := client.BalanceAt(ctx, fromAddress, nil) // nil for latest block
	if err != nil {
		log.Error("Failed BalanceAt", "err", err)
		return nil, err
	}

	// To convert the balance to Ether, you can use the `go-ethereum` units package.
	etherValue := new(big.Float).Quo(new(big.Float).SetInt(balance), big.NewFloat(float64(1e18)))
	log.Debug("Balance in Ether", "eth", etherValue.String())

	log.Debug(
		"NewKeyedTransactorWithChainID",
		"privateKey",
		privateKey,
		"chainId",
		chainId,
		"address",
		*xc.GetCheckerContractAddress(),
	)

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainId)
	if err != nil {
		log.Error("Failed NewKeyedTransactorWithChainID", "err", err)
		return nil, err
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.GasLimit = 0

	checker, err := e.NewIEntitlementChecker(*xc.GetCheckerContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
		return nil, err
	}

	var (
		entitlementMD  = checker.GetMetadata()
		entitlementABI = checker.GetAbi()
	)

	alreadyRegisteredId := entitlementABI.Errors["EntitlementChecker_NodeAlreadyRegistered"].ID

	log.Info("AlreadyRegisteredId", "alreadyRegisteredId", alreadyRegisteredId)

	errorDecoder, err := contracts.NewEVMErrorDecoder(entitlementMD)
	if err != nil {
		log.Error("Failed to create error decoder", "err", err)
		return nil, err
	}

	// Get the latest block number
	blockNumber, err := client.BlockNumber(ctx)
	if err != nil {
		log.Error("Failed to get current block number", "err", err)
		return nil, err
	}

	tx, err := checker.RegisterNode(auth)
	if err != nil {
		customError, stringError, err := errorDecoder.DecodeEVMError(err)
		log.Error("Failed RegisterNode", "err", err, "customError", customError, "stringError", stringError)

		if customError != nil && customError.DecodedError.ID == alreadyRegisteredId {
			// was if err.Error() == "execution reverted: custom error d1922fc1:" {
			// This error is returned when the node is already registered
			// This is not an error, so we just log it and continue
			log.Warn("Node already registered")
		} else {
			log.Error("Failed RegisterNode", "err", err, "Error", err.Error())
			return nil, err
		}
	} else {
		_ = xc.WaitForTransaction(client, tx)
	}
	log.Info("Registered node", "blockNumber", blockNumber)
	temp := blockNumber
	return &temp, nil
}

func unregisterNode(ctx context.Context, workerID int, fromAddress common.Address, privateKey *ecdsa.PrivateKey) {
	log := dlog.FromCtx(ctx)
	chainId := big.NewInt(int64(config.GetConfig().BaseChain.ChainId))

	baseWebsocketURL, err := xc.ConvertHTTPToWebSocket(config.GetConfig().BaseChain.NetworkUrl)
	if err != nil {
		log.Error("Failed to convert BaseChain HTTP to WebSocket", "err", err)
		return
	}

	client, err := ethclient.Dial(baseWebsocketURL)
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

	checker, err := e.NewIEntitlementChecker(*xc.GetCheckerContractAddress(), client)
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

func eventLoop(
	ctx context.Context,
	workerID int,
	blockNumber *uint64,
	events chan *e.IEntitlementCheckerEntitlementCheckRequested,
	shutdown <-chan struct{},
	fromAddress common.Address,
	privateKey *ecdsa.PrivateKey,
) bool {
	log := dlog.FromCtx(ctx)
	chainId := big.NewInt(int64(config.GetConfig().BaseChain.ChainId))
	baseWebsocketURL, err := xc.ConvertHTTPToWebSocket(config.GetConfig().BaseChain.NetworkUrl)
	if err != nil {
		log.Error("Failed to convert BaseChain HTTP to WebSocket", "err", err)
		return false
	}

	client, err := ethclient.Dial(baseWebsocketURL)
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

	nodeCheckerFilterer, err := e.NewIEntitlementChecker(*xc.GetCheckerContractAddress(), client)
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

			log := dlog.FromCtx(ctx).
				With("transaction_id", hex.EncodeToString(event.TransactionId[:]), "block_num", event.Raw.BlockNumber)

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

func postCheckResult(
	ctx context.Context,
	workerID int,
	event *e.IEntitlementCheckerEntitlementCheckRequested,
	client *ethclient.Client,
	fromAddress common.Address,
	auth *bind.TransactOpts,
) {
	log := dlog.FromCtx(ctx)
	log.Info("EntitlementCheckRequested being handeled")

	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		log.Error("Failed PendingNonceAt", "err", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))

	gatedContractAdress := event.ContractAddress

	gater, err := e.NewIEntitlementGated(gatedContractAdress, client)
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
