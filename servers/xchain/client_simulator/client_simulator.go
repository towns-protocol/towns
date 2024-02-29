package client_simulator

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"math/big"

	"github.com/river-build/river/core/node/dlog"

	xc "servers/xchain/common"
	"servers/xchain/config"
	e "servers/xchain/contracts"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/event"
)

func ClientSimulator() {
	log := dlog.FromCtx(context.Background())

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
	client, err := ethclient.Dial(config.GetConfig().EntitlementContract.Url)
	if err != nil {
		log.Error("Failed to connect to the Ethereum client", "err", err)
		return
	}
	bc := context.Background()
	var result interface{}
	err = client.Client().CallContext(bc, &result, "anvil_setBalance", fromAddress, 1000000000000000000)
	if err != nil {
		log.Info("Failed call anvil_setBalance %v", err)
		return
	}

	gatedContract, err := e.NewDevIEntitlementGated(*xc.GetTestContractAddress(), client)
	if err != nil {
		log.Error("Failed to parse contract ABI", "err", err)
		return
	}

	resultPosted := make(chan *e.DevIEntitlementGatedEntitlementCheckResultPosted)

	checkRequestedResults := make(chan *e.DevIEntitlementCheckerEntitlementCheckRequested)

	checkerFilterer, err := e.NewDevIEntitlementCheckerFilterer(*xc.GetCheckerContractAddress(), client)

	if err != nil {
		log.Error("Failed call NewEntitlementCheckerEventsFilterer", "err", err)
		return
	}

	checkerOpts := &bind.WatchOpts{Start: nil, Context: bc} // Replace with appropriate context and filter query if needed

	// checkRequestedSub, err := checkRequestedFilterer.WatchEntitlementCheckRequested(opts, checkRequestedResults, []common.Address{fromAddress})
	checkRequestedSub, err := checkerFilterer.WatchEntitlementCheckRequested(checkerOpts, checkRequestedResults, []common.Address{fromAddress})
	if err != nil {
		log.Error("Failed call WatchEntitlementCheckRequested", "err", err)
		return
	}

	var checkRequestedSubCh <-chan error
	if checkRequestedSub != nil {
		checkRequestedSubCh = checkRequestedSub.Err()
	}

	gatedFilter, err := e.NewDevIEntitlementGatedFilterer(*xc.GetTestContractAddress(), client)
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

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(31337)) // replace 31337 with your actual chainID
	if err != nil {
		log.Error("NewKeyedTransactorWithChainID", "err", err)
		return
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)       // in wei
	auth.GasLimit = uint64(30000000) // in units
	auth.GasPrice = gasPrice

	tx, err := gatedContract.RequestEntitlementCheck(auth)
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

	log.Info("Client RequestEntitlementCheck mined in block", "rawBlockNumber", rawBlockNumber)

	var resultSubCh <-chan error
	var resultSub event.Subscription
	var transactionId [32]byte

	// Event loop
	for {
		select {
		case checkRequestedResult := <-checkRequestedResults:
			transactionId = checkRequestedResult.TransactionId
			log.Info("Client checkRequestedResult event transactionId", "transactionId", hex.EncodeToString(transactionId[:]), "BlockNumber", checkRequestedResult.Raw.BlockNumber)

			gatedOpts := &bind.WatchOpts{Start: &requestBlockNumber, Context: bc} // Replace with appropriate context and filter query if needed

			resultSub, err = gatedFilter.WatchEntitlementCheckResultPosted(gatedOpts, resultPosted, [][32]byte{transactionId})
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

		case result := <-resultPosted:

			log.Info("Client Result event", "TransactionId", hex.EncodeToString(result.TransactionId[:]), "Result", result.Result, "BlockNumber", result.Raw.BlockNumber)
			if result.TransactionId != transactionId {
				log.Error("Client Result event transactionId != transactionId", "TransactionId", hex.EncodeToString(result.TransactionId[:]), "transactionId", hex.EncodeToString(transactionId[:]))
				return
			}

			nonce, err = client.PendingNonceAt(context.Background(), fromAddress)

			if err != nil {
				log.Error("Client PendingNonceAt error", "err", err)
				return
			}
			auth.Nonce = big.NewInt(int64(nonce))

			tx, err = gatedContract.RemoveTransaction(auth, result.TransactionId)
			if err != nil {
				log.Error("Client RemoveTransaction error", "err", err)
				return
			}
			if resultSub != nil {
				resultSub.Unsubscribe()
				resultSub = nil
				log.Info("Client Unsubscribe resultSub")
			}
			go func() {
				removeBlockNum := xc.WaitForTransaction(client, tx)
				log.Info("Client RemoveTransaction ", "TransactionId", hex.EncodeToString(result.TransactionId[:]), "blcokNumber", removeBlockNum) // for verifying tx on Etherscan
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
