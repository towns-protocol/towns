package client_simulator

import (
	"context"
	"core/xchain/config"
	"core/xchain/entitlement"
	"core/xchain/examples"
	"crypto/ecdsa"
	"encoding/hex"
	"math/big"
	"os"

	node_crypto "github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"

	xc "core/xchain/common"

	e "core/xchain/contracts"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/event"
)

var isEntitled = false

func toggleCustomEntitlement(
	ctx context.Context,
	fromAddress common.Address,
	client *ethclient.Client,
	privateKey *ecdsa.PrivateKey,
) {
	log := dlog.FromCtx(ctx)

	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Error("Failed getting PendingNonceAt", "err", err)
		return
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Error("Failed SuggestGasPrice", "err", err)
		return
	}

	auth, err := bind.NewKeyedTransactorWithChainID(
		privateKey,
		big.NewInt(31337),
	) // replace 31337 with your actual chainID
	if err != nil {
		log.Error("NewKeyedTransactorWithChainID", "err", err)
		return
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)       // in wei
	auth.GasLimit = uint64(30000000) // in units
	auth.GasPrice = gasPrice

	mockCustomContract, err := e.NewMockCustomEntitlement(*xc.GetTestCustomEntitlementContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
		return
	}

	isEntitled = !isEntitled

	txn, err := mockCustomContract.SetEntitled(auth, []common.Address{fromAddress}, isEntitled)
	if err != nil {
		log.Error("Failed to SetEntitled", "err", err)
		return
	}

	rawBlockNumber := xc.WaitForTransaction(client, txn)

	if rawBlockNumber == nil {
		log.Error("Client MockCustomContract SetEntitled failed to mine")
		return
	}

	log.Info(
		"Client SetEntitled mined in block",
		"rawBlockNumber",
		rawBlockNumber,
		"id",
		txn.Hash(),
		"hex",
		txn.Hash().Hex(),
	)
}

func customEntitlementExample() e.IRuleData {
	return e.IRuleData{
		Operations: []e.IRuleEntitlementOperation{
			{
				OpType: uint8(entitlement.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []e.IRuleEntitlementCheckOperation{
			{
				OpType:  uint8(entitlement.ISENTITLED),
				ChainId: big.NewInt(1),
				// This contract is deployed on our local base dev chain.
				ContractAddress: *xc.GetTestCustomEntitlementContractAddress(),
				Threshold:       big.NewInt(0),
			},
		},
	}
}

func erc721Example() e.IRuleData {
	return e.IRuleData{
		Operations: []e.IRuleEntitlementOperation{
			{
				OpType: uint8(entitlement.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []e.IRuleEntitlementCheckOperation{
			{
				OpType:  uint8(entitlement.ERC721),
				ChainId: examples.EthSepoliaChainId,
				// Custom NFT contract example
				ContractAddress: examples.EthSepoliaTestNftContract,
				Threshold:       big.NewInt(1),
			},
		},
	}
}

func erc20Example() e.IRuleData {
	return e.IRuleData{
		Operations: []e.IRuleEntitlementOperation{
			{
				OpType: uint8(entitlement.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []e.IRuleEntitlementCheckOperation{
			{
				OpType:  uint8(entitlement.ERC20),
				ChainId: examples.EthSepoliaChainId,
				// Chainlink is a good ERC 20 token to use for testing because it's easy to get from faucets.
				ContractAddress: examples.EthSepoliaChainlinkContract,
				Threshold:       big.NewInt(20),
			},
		},
	}
}

type SimulationType int

// SimulationType Enum
const (
	ERC721 SimulationType = iota
	ERC20
	ISENTITLED
	TOGGLEISENTITLED
)

func ClientSimulator(simType SimulationType) {
	ctx := context.Background()
	log := dlog.FromCtx(ctx)

	var wallet *node_crypto.Wallet
	var err error
	// Read env var WALLETPRIVATEKEY or PRIVATE_KEY
	privKey := os.Getenv("WALLETPRIVATEKEY")
	if privKey == "" {
		privKey = os.Getenv("PRIVATE_KEY")
	}
	if privKey != "" {
		wallet, err = node_crypto.NewWalletFromPrivKey(ctx, privKey)
	} else {
		wallet, err = node_crypto.LoadWallet(ctx, node_crypto.WALLET_PATH_PRIVATE_KEY)
	}
	if err != nil {
		log.Error("error finding wallet")
		return
	}

	privateKey := wallet.PrivateKeyStruct
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Error("error casting public key to ECDSA")
		return
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	log.Info("ClientSimulator fromAddress", "fromAddress", fromAddress.Hex())

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
	log.Info("ClientSimulator connected to Ethereum client")

	bc := context.Background()
	var result interface{}
	err = client.Client().CallContext(bc, &result, "anvil_setBalance", fromAddress, 1000000000000000000)
	if err != nil {
		log.Info("Failed call anvil_setBalance %v", err)
		return
	}
	log.Info("ClientSimulator add funds on anvil to wallet address", "result", result)

	if simType == TOGGLEISENTITLED {
		toggleCustomEntitlement(ctx, fromAddress, client, privateKey)
		return
	}

	gatedContract, err := e.NewIEntitlementGated(*xc.GetTestContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
		return
	}

	resultPosted := make(chan *e.IEntitlementGatedEntitlementCheckResultPosted)

	checkRequestedResults := make(chan *e.IEntitlementCheckerEntitlementCheckRequested)

	checkerFilterer, err := e.NewIEntitlementChecker(*xc.GetCheckerContractAddress(), client)
	if err != nil {
		log.Error("Failed call NewEntitlementCheckerEventsFilterer", "err", err)
		return
	}

	checkerOpts := &bind.WatchOpts{
		Start:   nil,
		Context: bc,
	} // Replace with appropriate context and filter query if needed

	log.Info("ClientSimulator watching for events...")

	// checkRequestedSub, err := checkRequestedFilterer.WatchEntitlementCheckRequested(opts, checkRequestedResults, []common.Address{fromAddress})
	checkRequestedSub, err := checkerFilterer.WatchEntitlementCheckRequested(
		checkerOpts,
		checkRequestedResults,
		[]common.Address{fromAddress},
	)
	if err != nil {
		log.Error("Failed call WatchEntitlementCheckRequested", "err", err)
		return
	}

	log.Info("ClientSimulator subscribed to checkRequestedSub")

	var checkRequestedSubCh <-chan error
	if checkRequestedSub != nil {
		checkRequestedSubCh = checkRequestedSub.Err()
	}

	gated, err := e.NewIEntitlementGated(*xc.GetTestContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
		return
	}

	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Error("Failed getting PendingNonceAt", "err", err)
		return
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Error("Failed SuggestGasPrice", "err", err)
		return
	}

	auth, err := bind.NewKeyedTransactorWithChainID(
		privateKey,
		big.NewInt(31337),
	) // replace 31337 with your actual chainID
	if err != nil {
		log.Error("NewKeyedTransactorWithChainID", "err", err)
		return
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)       // in wei
	auth.GasLimit = uint64(30000000) // in units
	auth.GasPrice = gasPrice

	log.Info("ClientSimulator Requesting entitlement check")
	var ruleData e.IRuleData
	switch simType {
	case ERC721:
		ruleData = erc721Example()
	case ERC20:
		ruleData = erc20Example()
	case ISENTITLED:
		ruleData = customEntitlementExample()

	case TOGGLEISENTITLED:
		fallthrough
	default:
		log.Error("ClientSimulator invalid SimulationType", "simType", simType)
		return
	}

	tx, err := gatedContract.RequestEntitlementCheck(auth, ruleData)
	if err != nil {
		log.Error("RequestEntitlementCheck", "err", err)
		return
	}

	rawBlockNumber := xc.WaitForTransaction(client, tx)

	if rawBlockNumber == nil {
		log.Info("Client RequestEntitlementCheck failed to mine\n")
		return
	}

	requestBlockNumber := rawBlockNumber.Uint64()

	log.Info(
		"Client RequestEntitlementCheck mined in block",
		"rawBlockNumber",
		rawBlockNumber,
		"id",
		tx.Hash(),
		"hex",
		tx.Hash().Hex(),
	)

	var resultSubCh <-chan error
	var resultSub event.Subscription
	var transactionId [32]byte

	// Event loop
	for {
		log.Info("ClientSimulator waiting for events")
		select {
		case checkRequestedResult := <-checkRequestedResults:
			log.Info("Client checkRequestedResult event", "TransactionId", checkRequestedResult.TransactionId)
			transactionId = checkRequestedResult.TransactionId
			log.Info(
				"Client checkRequestedResult event transactionId",
				"transactionId",
				hex.EncodeToString(transactionId[:]),
				"BlockNumber",
				checkRequestedResult.Raw.BlockNumber,
			)

			gatedOpts := &bind.WatchOpts{
				Start:   &requestBlockNumber,
				Context: bc,
			} // Replace with appropriate context and filter query if needed

			resultSub, err = gated.WatchEntitlementCheckResultPosted(gatedOpts, resultPosted, [][32]byte{transactionId})
			if err != nil {
				log.Error("Failed call WatchEntitlementCheckResultPosted", "err", err)
				return
			}

			if resultSub != nil {
				resultSubCh = resultSub.Err()
			}

			if checkRequestedSub != nil {
				checkRequestedSub.Unsubscribe()
				checkRequestedSub = nil
				checkRequestedSubCh = nil
				log.Info("Client Unsubscribe checkRequestedSub")
			}
			return

		case result := <-resultPosted:
			log.Info(
				"Client Result event",
				"TransactionId",
				hex.EncodeToString(result.TransactionId[:]),
				"Result",
				result.Result,
				"BlockNumber",
				result.Raw.BlockNumber,
			)
			if result.TransactionId != transactionId {
				log.Error(
					"Client Result event transactionId != transactionId",
					"TransactionId",
					hex.EncodeToString(result.TransactionId[:]),
					"transactionId",
					hex.EncodeToString(transactionId[:]),
				)
				return
			}

			nonce, err = client.PendingNonceAt(context.Background(), fromAddress)
			if err != nil {
				log.Error("Client PendingNonceAt error", "err", err)
				return
			}
			auth.Nonce = big.NewInt(int64(nonce))

			if resultSub != nil {
				resultSub.Unsubscribe()
				resultSub = nil
				log.Info("Client Unsubscribe resultSub")
			}
			go func() {
				removeBlockNum := xc.WaitForTransaction(client, tx)
				log.Info(
					"Client RemoveTransaction ",
					"TransactionId",
					hex.EncodeToString(result.TransactionId[:]),
					"blcokNumber",
					removeBlockNum,
				) // for verifying tx on Etherscan
			}()
			return
		case err := <-checkRequestedSubCh:
			if err != nil {
				log.Error("Client checkRequestedSub error", "err", err)
				return
			}
		case err := <-resultSubCh:
			if err != nil {
				log.Error("Client resultSub error: %v", "err", err)
				return
			}
		}
	}
}
