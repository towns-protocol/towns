package server

import (
	"context"
	"core/xchain/config"
	"core/xchain/contracts"
	"core/xchain/entitlement"
	"fmt"
	"os"

	xc "core/xchain/common"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	go_eth_types "github.com/ethereum/go-ethereum/core/types"
	node_contracts "github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
)

type (
	// xchain reads entitlement requests from base chain and writes the result after processing back to base.
	xchain struct {
		workerID        int
		checker         *contracts.IEntitlementChecker
		checkerABI      *abi.ABI
		checkerContract *bind.BoundContract
		baseChain       *crypto.Blockchain
		evmErrDecoder   *node_contracts.EvmErrorDecoder
	}

	// entitlementCheckReceipt holds the outcome of an xchain entitlement check request
	entitlementCheckReceipt struct {
		TransactionID common.Hash
		Outcome       bool
		Event         contracts.IEntitlementCheckRequestEvent
	}

	// pending task to write the entitlement check outcome to base
	inprogress struct {
		ptx     crypto.TransactionPoolPendingTransaction
		outcome *entitlementCheckReceipt
	}
)

func loadWallet(ctx context.Context) (*crypto.Wallet, error) {
	var (
		wallet  *crypto.Wallet
		privKey = os.Getenv("WALLETPRIVATEKEY")
		err     error
	)
	// Read env var WALLETPRIVATEKEY or PRIVATE_KEY
	if privKey == "" {
		privKey = os.Getenv("PRIVATE_KEY")
	}
	if privKey != "" {
		wallet, err = crypto.NewWalletFromPrivKey(ctx, privKey)
	} else {
		wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
	}
	if err != nil {
		return nil, err
	}
	return wallet, err
}

// New creates a new xchain instance that reads entitlement requests from Base,
// processes the requests and writes the results back to Base.
func New(ctx context.Context, workerID int) (*xchain, error) {
	checker, err := contracts.NewIEntitlementChecker(*xc.GetCheckerContractAddress(), nil)
	if err != nil {
		return nil, err
	}

	var (
		cfg             = config.GetConfig()
		checkerABI      = checker.GetAbi()
		checkerContract = bind.NewBoundContract(
			*xc.GetCheckerContractAddress(),
			*checker.GetAbi(),
			nil,
			nil,
			nil,
		)
		entitlementGatedMetaData = contracts.NewEntitlementGatedMetaData()
	)

	wallet, err := loadWallet(ctx)
	if err != nil {
		return nil, err
	}

	baseChain, err := crypto.NewBlockchain(ctx, &cfg.BaseChain, wallet)
	if err != nil {
		return nil, err
	}

	decoder, err := node_contracts.NewEVMErrorDecoder(checker.GetMetadata(), entitlementGatedMetaData.GetMetadata())
	if err != nil {
		return nil, err
	}

	return &xchain{workerID, checker, checkerABI, checkerContract, baseChain, decoder}, nil
}

// Run xchain until the given ctx expires.
// When ctx expires xchain stops reading new xchain requests from Base.
// Pending requests are processed before Run returns.
func (x *xchain) Run(ctx context.Context) {
	var (
		log                                 = dlog.FromCtx(ctx).With("worker_id", x.workerID)
		entitlementAddress                  = *xc.GetCheckerContractAddress()
		entitlementCheckReceipts            = make(chan *entitlementCheckReceipt, 256)
		onEntitlementCheckRequestedCallback = func(ctx context.Context, event types.Log) {
			x.onEntitlementCheckRequested(ctx, event, entitlementCheckReceipts)
		}
	)
	log.Info(
		"Starting xchain node",
		"entitlementAddress", entitlementAddress.Hex(),
	)

	// determine block from which to start processing xchain requests
	initialBlockNum, err := x.baseChain.Client.BlockNumber(ctx)
	if err != nil {
		log.Error("unable to retrieve latest block number", "err", err)
		return
	}

	// register callback for Base EntitlementCheckRequested events
	x.baseChain.ChainMonitor.OnContractWithTopicsEvent(
		entitlementAddress,
		[][]common.Hash{{x.checkerABI.Events["EntitlementCheckRequested"].ID}},
		onEntitlementCheckRequestedCallback)

	// read entitlement check requests from chain, process them and write the result to entitlementCheckReceipts
	go func() {
		x.baseChain.ChainMonitor.Run(ctx, x.baseChain.Client, crypto.BlockNumber(initialBlockNum))
		close(entitlementCheckReceipts)
	}()

	err = x.registerNode(ctx)
	if err != nil {
		log.Error("Failed to register node", "err", err)
		return
	}

	// read entitlement check results from entitlementCheckReceipts and write the result to Base
	x.writeEntitlementCheckResults(ctx, entitlementCheckReceipts)
}

func (x *xchain) registerNode(ctx context.Context) error {
	log := dlog.FromCtx(ctx).With("worker_id", x.workerID)
	log.Info("Registering node")
	pendingTx, err := x.baseChain.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		checker, err := contracts.NewIEntitlementChecker(*xc.GetCheckerContractAddress(), x.baseChain.Client)
		if err != nil {
			return nil, err
		}
		return checker.RegisterNode(opts, x.baseChain.Wallet.Address)
	})

	ce, se, err := x.evmErrDecoder.DecodeEVMError(err)
	switch {
	case ce != nil:
		if ce.DecodedError.Sig == "EntitlementChecker_NodeAlreadyRegistered()" {
			log.Info("Node already registered", "address", x.baseChain.Wallet.Address)
			return nil
	}
		log.Error("unable to submit transaction for node registration", "err", ce)
		return ce
	case se != nil:
		log.Error("unable to submit transaction for node registration", "err", se)
		return se
	case err != nil:
		log.Error("unable to submit transaction for node registration", "err", err)
		return err
	}

	log.Info("Node registration transaction submitted")
	log.Info("Waiting for node registration transaction to be processed")
	receipt := <-pendingTx.Wait()
	log.Info(
		"Node registration transaction processed",
		"tx",
		receipt.TxHash.Hex(),
		"tx.success",
		receipt.Status == go_eth_types.ReceiptStatusSuccessful,
	)
	if receipt.Status == go_eth_types.ReceiptStatusFailed {
		return fmt.Errorf("failed to register node - could not execute transaction")
	}
	log.Info("Node registered")
	return nil
}

// onEntitlementCheckRequested is the callback that the chain monitor calls for each EntitlementCheckRequested
// event raised on Base in the entitlement contract.
func (x *xchain) onEntitlementCheckRequested(
	ctx context.Context,
	event types.Log,
	entitlementCheckResults chan<- *entitlementCheckReceipt,
) {
	var (
		log                     = dlog.FromCtx(ctx).With("worker_id", x.workerID)
		entitlementCheckRequest = x.checker.EntitlementCheckRequestEvent()
	)

	// try to decode the EntitlementCheckRequested event
	if err := x.checkerContract.UnpackLog(entitlementCheckRequest.Raw(), "EntitlementCheckRequested", event); err != nil {
		log.Error("Unable to decode EntitlementCheckRequested event", "err", err)
		return
	}

	log.Info("Received EntitlementCheckRequested", "xchain.req.txid", entitlementCheckRequest.TransactionID().Hex())

	// process the entitlement request and post the result to entitlementCheckResults
	outcome, err := x.handleEntitlementCheckRequest(ctx, entitlementCheckRequest)
	if err != nil {
		log.Error("Entitlement check failed to process",
			"err", err, "xchain.req.txid", entitlementCheckRequest.TransactionID().Hex())
		return
	}
	if outcome != nil { // request was not intended for this xchain instance.
		log.Info(
			"Queueing check result for post",
			"transactionId",
			outcome.TransactionID.Hex(),
			"outcome",
			outcome.Outcome,
		)
		entitlementCheckResults <- outcome
	}
}

// handleEntitlementCheckRequest processes the given xchain entitlement check request.
// It can return nil, nil in case the request wasn't targeted for the current xchain instance.
func (x *xchain) handleEntitlementCheckRequest(
	ctx context.Context,
	request contracts.IEntitlementCheckRequestEvent,
) (*entitlementCheckReceipt, error) {
	for _, selectedNodeAddress := range request.SelectedNodes() {
		if selectedNodeAddress == x.baseChain.Wallet.Address {
			log := dlog.FromCtx(ctx).
				With("function", "handleEntitlementCheckRequest", "req.txid", request.TransactionID().Hex())
			log.Info("Processing EntitlementCheckRequested")
			outcome, err := x.process(ctx, request, x.baseChain.Client, request.CallerAddress())
			if err != nil {
				return nil, err
			}
			return &entitlementCheckReceipt{
				TransactionID: request.TransactionID(),
				Outcome:       outcome,
				Event:         request,
			}, nil
		}
	}
	return nil, nil // request not for this xchain instance
}

// writeEntitlementCheckResults writes the outcomes of entitlement checks to Base.
// returns when all items in checkResults are processed.
func (x *xchain) writeEntitlementCheckResults(ctx context.Context, checkResults <-chan *entitlementCheckReceipt) {
	var (
		log     = dlog.FromCtx(ctx).With("worker_id", x.workerID)
		pending = make(chan *inprogress, 128)
	)

	// write entitlement check outcome to base
	go func() {
		for receipt := range checkResults {
			// 0 - NodeVoteStatus.NOT_VOTED, 1 - pass, 2 - fail
			outcome := contracts.NodeVoteStatus__FAILED
			if receipt.Outcome {
				outcome = contracts.NodeVoteStatus__PASSED
			}

			pendingTx, err := x.baseChain.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
				gated, err := contracts.NewIEntitlementGated(receipt.Event.ContractAddress(), x.baseChain.Client)
				if err != nil {
					return nil, err
				}
				return gated.PostEntitlementCheckResult(opts, receipt.TransactionID, uint8(outcome))
			})

			ce, se, err := x.evmErrDecoder.DecodeEVMError(err)
			switch {
			case ce != nil:
				log.Error("unable to submit transaction for xchain request",
					"err", ce, "request.txid", receipt.TransactionID)
				continue
			case se != nil:
				log.Error("unable to submit transaction for xchain request",
					"err", se, "request.txid", receipt.TransactionID)
				continue
			case err != nil:
				log.Error("unable to submit transaction for xchain request",
					"err", err, "request.txid", receipt.TransactionID)
				continue
			}

			pending <- &inprogress{pendingTx, receipt}
		}
		close(pending)
	}()

	// wait until all transactions are processed before returning
	for task := range pending {
		receipt := <-task.ptx.Wait() // Base transaction  receipt
		log.Info("entitlement check request processed",
			"tx", receipt.TxHash.Hex(), "tx.success", receipt.Status == crypto.TransactionResultSuccess,
			"xchain.req.txid", task.outcome.TransactionID, "xchain.req.outcome", task.outcome.Outcome)
	}
}

// process the given entitlement request.
// It returns an indication of the request passes checks.
func (x *xchain) process(
	ctx context.Context,
	request contracts.IEntitlementCheckRequestEvent,
	client crypto.BlockchainClient,
	callerAddress common.Address,
) (result bool, err error) {
	log := dlog.FromCtx(ctx).With("function", "process", "req.txid", request.TransactionID().Hex())
	log.Info("Process EntitlementCheckRequested")

	gater, err := contracts.NewIEntitlementGated(request.ContractAddress(), client)
	if err != nil {
		log.Error("Failed to NewEntitlementGated watch", "err", err)
		return false, err
	}

	ruleData, err := gater.GetRuleData(&bind.CallOpts{}, request.TransactionID())
	if err != nil {
		log.Error("Failed to GetEncodedRuleData", "err", err)
		return false, err
	}

	result, err = entitlement.EvaluateRuleData(ctx, &callerAddress, ruleData)
	if err != nil {
		log.Error("Failed to EvaluateRuleData watch", "err", err)
		return false, err
	}

	return result, nil
}
