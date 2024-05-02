package server

import (
	"context"
	"core/xchain/config"
	"core/xchain/contracts"
	"core/xchain/entitlement"
	"core/xchain/util"
	"log/slog"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	go_eth_types "github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	node_contracts "github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
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
		config          *config.Config
		cancel          context.CancelFunc
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

type XChain interface {
	Run(ctx context.Context)
	Stop()
}

// New creates a new xchain instance that reads entitlement requests from Base,
// processes the requests and writes the results back to Base.
func New(
	ctx context.Context,
	cfg *config.Config,
	baseChain *crypto.Blockchain,
	workerID int,
) (server *xchain, err error) {
	ctx, cancel := context.WithCancel(ctx)

	// Cleanup on error
	defer func() {
		if err != nil {
			cancel()
		}
	}()

	checker, err := contracts.NewIEntitlementChecker(cfg.GetCheckerContractAddress(), nil, cfg.GetContractVersion())
	if err != nil {
		return nil, err
	}

	var (
		checkerABI      = checker.GetAbi()
		checkerContract = bind.NewBoundContract(
			cfg.GetCheckerContractAddress(),
			*checker.GetAbi(),
			nil,
			nil,
			nil,
		)
		entitlementGatedMetaData = contracts.NewEntitlementGatedMetaData(cfg.GetContractVersion())
	)

	var wallet *crypto.Wallet
	if baseChain == nil {
		wallet, err = util.LoadWallet(ctx)
		if err != nil {
			return nil, err
		}
	} else {
		wallet = baseChain.Wallet
	}

	if baseChain == nil {
		baseChain, err = crypto.NewBlockchain(ctx, &cfg.BaseChain, wallet)
		if err != nil {
			return nil, err
		}
		go baseChain.ChainMonitor.RunWithBlockPeriod(ctx, baseChain.Client, baseChain.InitialBlockNum, time.Duration(cfg.BaseChain.BlockTimeMs)*time.Millisecond)
	}

	walletLink, err := contracts.NewIWalletLink(
		cfg.GetWalletLinkContractAddress(),
		baseChain.Client,
		cfg.GetContractVersion(),
	)
	if err != nil {
		return nil, err
	}

	decoder, err := node_contracts.NewEVMErrorDecoder(
		checker.GetMetadata(),
		entitlementGatedMetaData.GetMetadata(),
		walletLink.GetMetadata(),
	)
	if err != nil {
		return nil, err
	}

	x := &xchain{
		workerID:        workerID,
		checker:         checker,
		checkerABI:      checkerABI,
		checkerContract: checkerContract,
		baseChain:       baseChain,
		evmErrDecoder:   decoder,
		config:          cfg,
		cancel:          cancel,
	}

	isRegistered, err := x.isRegistered(ctx)
	if err != nil {
		return nil, err
	}
	if !isRegistered {
		return nil, RiverError(Err_BAD_CONFIG, "xchain node not registered")
	}

	return x, nil
}

func (x *xchain) Stop() {
	x.cancel()
}

func (x *xchain) Log(ctx context.Context) *slog.Logger {
	return dlog.FromCtx(ctx).
		With("worker_id", x.workerID).
		With("application", "xchain").
		With("nodeAddress", x.baseChain.Wallet.Address.Hex())
}

// isRegistered returns an indication if this instance is registered by its operator as a xchain node.
// if not this instance isn't allowed to submit entitlement check results.
func (x *xchain) isRegistered(ctx context.Context) (bool, error) {
	checker, err := contracts.NewIEntitlementChecker(
		x.config.GetCheckerContractAddress(), x.baseChain.Client, x.config.GetContractVersion())
	if err != nil {
		return false, AsRiverError(err, Err_CANNOT_CALL_CONTRACT)
	}
	return checker.IsValidNode(&bind.CallOpts{Context: ctx}, x.baseChain.Wallet.Address)
}

// Run xchain until the given ctx expires.
// When ctx expires xchain stops reading new xchain requests from Base.
// Pending requests are processed before Run returns.
func (x *xchain) Run(ctx context.Context) {
	var (
		log                                 = x.Log(ctx)
		entitlementAddress                  = x.config.GetCheckerContractAddress()
		entitlementCheckReceipts            = make(chan *entitlementCheckReceipt, 256)
		onEntitlementCheckRequestedCallback = func(ctx context.Context, event types.Log) {
			x.onEntitlementCheckRequested(ctx, event, entitlementCheckReceipts)
		}
	)
	log.Info(
		"Starting xchain node",
		"entitlementAddress", entitlementAddress.Hex(),
		"nodeAddress", x.baseChain.Wallet.Address.Hex(),
	)

	// register callback for Base EntitlementCheckRequested events
	x.baseChain.ChainMonitor.OnContractWithTopicsEvent(
		entitlementAddress,
		[][]common.Hash{{x.checkerABI.Events["EntitlementCheckRequested"].ID}},
		onEntitlementCheckRequestedCallback)

	// read entitlement check results from entitlementCheckReceipts and write the result to Base
	x.writeEntitlementCheckResults(ctx, entitlementCheckReceipts)
}

// onEntitlementCheckRequested is the callback that the chain monitor calls for each EntitlementCheckRequested
// event raised on Base in the entitlement contract.
func (x *xchain) onEntitlementCheckRequested(
	ctx context.Context,
	event types.Log,
	entitlementCheckResults chan<- *entitlementCheckReceipt,
) {
	var (
		log                     = x.Log(ctx)
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
			log := x.Log(ctx).
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
	x.Log(ctx).Debug(
		"EntitlementCheckRequested not for this xchain instance",
		"req.txid", request.TransactionID().Hex(),
		"selectedNodes", request.SelectedNodes(),
		"nodeAddress", x.baseChain.Wallet.Address.Hex(),
	)
	return nil, nil // request not for this xchain instance
}

// writeEntitlementCheckResults writes the outcomes of entitlement checks to Base.
// returns when all items in checkResults are processed.
func (x *xchain) writeEntitlementCheckResults(ctx context.Context, checkResults <-chan *entitlementCheckReceipt) {
	var (
		log     = x.Log(ctx)
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
				gated, err := contracts.NewIEntitlementGated(
					receipt.Event.ContractAddress(),
					x.baseChain.Client,
					x.config.GetContractVersion(),
				)
				if err != nil {
					return nil, err
				}
				// Ensure gas limit is at least 250,000 as a workaround for simulated backend issues in tests.
				opts.GasLimit = max(opts.GasLimit, 250_000)

				return gated.PostEntitlementCheckResult(opts, receipt.TransactionID, uint8(outcome))
			})
			if err != nil {
				x.handleContractError(log, err, "Failed to submit transaction for xchain request")
				continue
			}
			pending <- &inprogress{pendingTx, receipt}
		}
		close(pending)
	}()

	// wait until all transactions are processed before returning
	for task := range pending {
		receipt := <-task.ptx.Wait() // Base transaction receipt
		if receipt.Status == go_eth_types.ReceiptStatusFailed {
			log.Error("entitlement check response failed to post",
				"tx", receipt.TxHash.Hex(), "tx.success", receipt.Status == crypto.TransactionResultSuccess,
				"xchain.req.txid", task.outcome.TransactionID, "xchain.req.outcome", task.outcome.Outcome,
				"gatedContract", task.outcome.Event.ContractAddress())
		} else {
			log.Info("entitlement check response posted",
				"tx", receipt.TxHash.Hex(), "tx.success", receipt.Status == crypto.TransactionResultSuccess,
				"xchain.req.txid", task.outcome.TransactionID, "xchain.req.outcome", task.outcome.Outcome,
				"gatedContract", task.outcome.Event.ContractAddress())
		}
	}
}

func (x *xchain) handleContractError(log *slog.Logger, err error, msg string) error {
	ce, se, err := x.evmErrDecoder.DecodeEVMError(err)
	switch {
	case ce != nil:
		log.Error(msg, "err", ce)
		return ce
	case se != nil:
		log.Error(msg, "err", se)
		return se
	case err != nil:
		log.Error(msg, "err", err)
		return err
	}
	return nil
}

func (x *xchain) getLinkedWallets(ctx context.Context, wallet common.Address) ([]common.Address, error) {
	log := x.Log(ctx)
	log.Debug("GetLinkedWallets", "wallet", wallet.Hex(), "walletLinkContract", x.config.GetWalletLinkContractAddress())
	iWalletLink, err := contracts.NewIWalletLink(
		x.config.GetWalletLinkContractAddress(),
		x.baseChain.Client,
		x.config.GetContractVersion(),
	)
	if err != nil {
		return nil, x.handleContractError(log, err, "Failed to create IWalletLink")
	}

	rootKey, err := iWalletLink.GetRootKeyForWallet(&bind.CallOpts{Context: ctx}, wallet)
	if err != nil {
		return nil, x.handleContractError(log, err, "Failed to GetRootKeyForWallet")
	}

	var zero common.Address
	if rootKey == zero {
		log.Debug("Wallet not linked to any root key, trying as root key", "wallet", wallet.Hex())
		rootKey = wallet
	}

	wallets, err := iWalletLink.GetWalletsByRootKey(&bind.CallOpts{Context: ctx}, rootKey)
	if err != nil {
		return nil, x.handleContractError(log, err, "Failed to GetWalletsByRootKey")
	}

	if len(wallets) == 0 {
		log.Debug("No linked wallets found", "rootKey", rootKey.Hex())
		return []common.Address{wallet}, nil
	}

	log.Debug("Linked wallets", "rootKey", rootKey.Hex(), "wallets", wallets)

	return wallets, nil
}

func (x *xchain) getRuleData(
	ctx context.Context,
	transactionId [32]byte,
	contractAddress common.Address,
	client crypto.BlockchainClient,
) (*contracts.IRuleData, error) {
	log := x.Log(ctx).With("function", "getRuleData", "req.txid", transactionId)
	gater, err := contracts.NewIEntitlementGated(contractAddress, client, x.config.GetContractVersion())
	if err != nil {
		return nil, x.handleContractError(log, err, "Failed to create NewEntitlementGated")
	}

	ruleData, err := gater.GetRuleData(&bind.CallOpts{Context: ctx}, transactionId)
	if err != nil {
		return nil, x.handleContractError(log, err, "Failed to GetEncodedRuleData")
	}
	return ruleData, nil
}

// process the given entitlement request.
// It returns an indication of the request passes checks.
func (x *xchain) process(
	ctx context.Context,
	request contracts.IEntitlementCheckRequestEvent,
	client crypto.BlockchainClient,
	callerAddress common.Address,
) (result bool, err error) {
	log := x.Log(ctx).
		With("caller_address", callerAddress.Hex())

	log = log.With("function", "process", "req.txid", request.TransactionID().Hex())
	log.Info("Process EntitlementCheckRequested")

	wallets, err := x.getLinkedWallets(ctx, callerAddress)
	if err != nil {
		return false, err
	}

	ruleData, err := x.getRuleData(ctx, request.TransactionID(), request.ContractAddress(), client)
	if err != nil {
		return false, err
	}

	// Embed log metadata for rule evaluation logs
	ctx = dlog.CtxWithLog(ctx, log)
	result, err = entitlement.EvaluateRuleData(ctx, x.config, wallets, ruleData)
	if err != nil {
		log.Error("Failed to EvaluateRuleData", "err", err)
		return false, err
	}

	return result, nil
}
