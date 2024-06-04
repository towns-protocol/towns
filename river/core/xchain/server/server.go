package server

import (
	"context"
	"log/slog"
	"math/big"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/river-build/river/core/node/config"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/xchain/contracts"
	"github.com/river-build/river/core/xchain/entitlement"
	"github.com/river-build/river/core/xchain/util"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	go_eth_types "github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	node_contracts "github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
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
		evaluator       *entitlement.Evaluator

		// Metrics
		metrics                   *infra.Metrics
		entitlementCheckRequested *infra.StatusCounterVec
		entitlementCheckProcessed *infra.StatusCounterVec
		entitlementCheckTx        *infra.StatusCounterVec
		getRootKeyForWalletCalls  *infra.StatusCounterVec
		getWalletsByRootKeyCalls  *infra.StatusCounterVec
		getRuleDataCalls          *infra.StatusCounterVec
		callDurations             *prometheus.HistogramVec
	}

	// entitlementCheckReceipt holds the outcome of an xchain entitlement check request
	entitlementCheckReceipt struct {
		TransactionID common.Hash
		RoleId        *big.Int
		Outcome       bool
		Event         contracts.IEntitlementCheckRequestEvent
	}

	// pending task to write the entitlement check outcome to base
	inprogress struct {
		ptx         crypto.TransactionPoolPendingTransaction
		gasEstimate uint64
		outcome     *entitlementCheckReceipt
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

	metrics := infra.NewMetrics("river", "xchain")

	evaluator, err := entitlement.NewEvaluatorFromConfig(ctx, cfg, metrics)
	if err != nil {
		return nil, err
	}

	checker, err := contracts.NewIEntitlementChecker(cfg.GetEntitlementContractAddress(), nil, cfg.GetContractVersion())
	if err != nil {
		return nil, err
	}

	var (
		log = dlog.FromCtx(ctx).
			With("worker_id", workerID).
			With("application", "xchain")
		checkerABI      = checker.GetAbi()
		checkerContract = bind.NewBoundContract(
			cfg.GetEntitlementContractAddress(),
			*checker.GetAbi(),
			nil,
			nil,
			nil,
		)
		entitlementGatedMetaData = contracts.NewEntitlementGatedMetaData(cfg.GetContractVersion())
	)

	log.Info("Starting xchain node", "cfg", cfg)

	var wallet *crypto.Wallet
	if baseChain == nil {
		wallet, err = util.LoadWallet(ctx)
		if err != nil {
			return nil, err
		}
	} else {
		wallet = baseChain.Wallet
	}
	log = log.With("nodeAddress", wallet.Address.Hex())

	if baseChain == nil {
		baseChain, err = crypto.NewBlockchain(ctx, &cfg.BaseChain, wallet, metrics)
		if err != nil {
			return nil, err
		}
		// determine from which block to start processing entitlement check requests
		startBlock, err := util.StartBlockNumberWithHistory(ctx, baseChain.Client, cfg.History)
		if err != nil {
			return nil, err
		}
		if startBlock < baseChain.InitialBlockNum.AsUint64() {
			baseChain.InitialBlockNum = crypto.BlockNumber(startBlock)
		}

		log.Info("Start processing entitlement check requests", "startBlock", baseChain.InitialBlockNum)
		go baseChain.ChainMonitor.RunWithBlockPeriod(
			ctx,
			baseChain.Client,
			baseChain.InitialBlockNum,
			time.Duration(cfg.BaseChain.BlockTimeMs)*time.Millisecond,
			metrics,
		)
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

	entCounter := metrics.NewStatusCounterVecEx("entitlement_checks", "Counters for entitelement check ops", "op")
	contractCounter := metrics.NewStatusCounterVecEx(
		"contract_calls",
		"Contract calls fro entitlement checks",
		"op",
		"name",
	)
	x := &xchain{
		workerID:        workerID,
		checker:         checker,
		checkerABI:      checkerABI,
		checkerContract: checkerContract,
		baseChain:       baseChain,
		evmErrDecoder:   decoder,
		config:          cfg,
		evaluator:       evaluator,

		metrics:                   metrics,
		entitlementCheckRequested: entCounter.MustCurryWith(map[string]string{"op": "requested"}),
		entitlementCheckProcessed: entCounter.MustCurryWith(map[string]string{"op": "processed"}),
		entitlementCheckTx: contractCounter.MustCurryWith(
			map[string]string{"op": "write", "name": "entitlement_check_tx"},
		),
		getRootKeyForWalletCalls: contractCounter.MustCurryWith(
			map[string]string{"op": "read", "name": "get_root_key_for_wallet"},
		),
		getWalletsByRootKeyCalls: contractCounter.MustCurryWith(
			map[string]string{"op": "read", "name": "get_wallets_by_root_key"},
		),
		getRuleDataCalls: contractCounter.MustCurryWith(
			map[string]string{"op": "read", "name": "get_rule_data"},
		),
		callDurations: metrics.NewHistogramVecEx(
			"call_duration_seconds",
			"Durations of contract calls",
			infra.DefaultDurationBucketsSeconds,
			"op",
		),
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
	if x.cancel != nil {
		x.cancel()
	}
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
		x.config.GetEntitlementContractAddress(), x.baseChain.Client, x.config.GetContractVersion())
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
		runCtx, cancel                      = context.WithCancel(ctx)
		log                                 = x.Log(ctx)
		entitlementAddress                  = x.config.GetEntitlementContractAddress()
		entitlementCheckReceipts            = make(chan *entitlementCheckReceipt, 256)
		onEntitlementCheckRequestedCallback = func(ctx context.Context, event types.Log) {
			x.onEntitlementCheckRequested(ctx, event, entitlementCheckReceipts)
		}
	)
	x.cancel = cancel

	log.Info(
		"Starting xchain node",
		"entitlementAddress", entitlementAddress.Hex(),
		"nodeAddress", x.baseChain.Wallet.Address.Hex(),
	)

	if x.config.Metrics.Enabled {
		// node and xchain are run in the same docker container and share the same config key for the metrics port.
		// to prevent both processes claiming the same port we decided to increment the port by 1 for xchain.
		x.config.Metrics.Port += 1
		x.metrics.StartMetricsServer(runCtx, x.config.Metrics)
	}

	// register callback for Base EntitlementCheckRequested events
	x.baseChain.ChainMonitor.OnContractWithTopicsEvent(
		entitlementAddress,
		[][]common.Hash{{x.checkerABI.Events["EntitlementCheckRequested"].ID}},
		onEntitlementCheckRequestedCallback)

	// read entitlement check results from entitlementCheckReceipts and write the result to Base
	x.writeEntitlementCheckResults(runCtx, entitlementCheckReceipts)
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
		x.entitlementCheckRequested.IncFail()
		log.Error("Unable to decode EntitlementCheckRequested event", "err", err)
		return
	}

	log.Info("Received EntitlementCheckRequested", "xchain.req.txid", entitlementCheckRequest.TransactionID().Hex())

	// process the entitlement request and post the result to entitlementCheckResults
	outcome, err := x.handleEntitlementCheckRequest(ctx, entitlementCheckRequest)
	if err != nil {
		x.entitlementCheckRequested.IncFail()
		log.Error("Entitlement check failed to process",
			"err", err, "xchain.req.txid", entitlementCheckRequest.TransactionID().Hex())
		return
	}
	if outcome != nil { // request was not intended for this xchain instance.
		x.entitlementCheckRequested.IncPass()
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
	log := x.Log(ctx).
		With("function", "handleEntitlementCheckRequest").
		With("req.txid", request.TransactionID().Hex()).
		With("roleId", request.RoleId().String())

	for _, selectedNodeAddress := range request.SelectedNodes() {
		if selectedNodeAddress == x.baseChain.Wallet.Address {
			log.Info("Processing EntitlementCheckRequested")
			outcome, err := x.process(ctx, request, x.baseChain.Client, request.CallerAddress())
			if err != nil {
				return nil, err
			}
			return &entitlementCheckReceipt{
				TransactionID: request.TransactionID(),
				RoleId:        request.RoleId(),
				Outcome:       outcome,
				Event:         request,
			}, nil
		}
	}
	log.Debug(
		"EntitlementCheckRequested not for this xchain instance",
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
		for {
			select {
			case <-ctx.Done():
				close(pending)
				return
			case receipt := <-checkResults:
				// 0 - NodeVoteStatus.NOT_VOTED, 1 - pass, 2 - fail
				outcome := contracts.NodeVoteStatus__FAILED
				if receipt.Outcome {
					outcome = contracts.NodeVoteStatus__PASSED
				}

				createPostResultTx := func(opts *bind.TransactOpts) (*types.Transaction, error) {
					gated, err := contracts.NewIEntitlementGated(
						receipt.Event.ContractAddress(),
						x.baseChain.Client,
						x.config.GetContractVersion(),
					)
					if err != nil {
						return nil, err
					}
					return gated.PostEntitlementCheckResult(opts, receipt.TransactionID, receipt.RoleId, uint8(outcome))
				}
				gasEstimate, err := x.baseChain.TxPool.EstimateGas(ctx, createPostResultTx)
				if err != nil {
					log.Warn(
						"Failed to estimate gas for PostEntitlementCheckResult (entitlement check complete?)",
						"err",
						err,
					)
				}

				pendingTx, err := x.baseChain.TxPool.Submit(
					ctx,
					"PostEntitlementCheckResult",
					func(opts *bind.TransactOpts) (*types.Transaction, error) {
						// Ensure gas limit is at least 2_500_000 as a workaround for simulated backend issues in tests.
						opts.GasLimit = max(opts.GasLimit, 2_500_000)
						return createPostResultTx(opts)
					},
				)

				// it is possible that some entitlement checks are already processed before xchain restarted,
				// or enough other xchain instances have already reached a quorum -> ignore these errors.
				ce, _, _ := x.evmErrDecoder.DecodeEVMError(err)
				if ce != nil && (ce.DecodedError.Sig == "EntitlementGated_TransactionNotRegistered()" ||
					ce.DecodedError.Sig == "EntitlementGated_NodeAlreadyVoted()" ||
					ce.DecodedError.Sig == "EntitlementGated_TransactionCheckAlreadyCompleted()") {
					log.Debug("Unable to submit entitlement check outcome",
						"err", ce.DecodedError.Name,
						"txid", receipt.TransactionID.Hex())
					continue
				}

				if err != nil {
					x.entitlementCheckTx.IncFail()
					x.handleContractError(log, err, "Failed to submit transaction for xchain request")
					continue
				}
				pending <- &inprogress{pendingTx, gasEstimate, receipt}
			}
		}
	}()

	// wait until all transactions are processed before returning
	for task := range pending {
		receipt := <-task.ptx.Wait() // Base transaction receipt

		x.entitlementCheckTx.IncPass()
		if receipt.Status == go_eth_types.ReceiptStatusFailed {
			// it is possible that other xchain instances have already reached a quorum and our transaction was simply
			// too late and failed because of that. Therefore this can be an expected error.
			log.Warn("entitlement check response failed to post",
				"gasUsed", receipt.GasUsed,
				"gasEstimate", task.gasEstimate,
				"tx.hash", task.ptx.TransactionHash(),
				"tx.success", receipt.Status == crypto.TransactionResultSuccess,
				"xchain.req.txid", task.outcome.TransactionID,
				"xchain.req.outcome", task.outcome.Outcome,
				"gatedContract", task.outcome.Event.ContractAddress())
			x.entitlementCheckProcessed.IncFail()
		} else {
			log.Info("entitlement check response posted",
				"gasUsed", receipt.GasUsed,
				"gasEstimate", task.gasEstimate,
				"tx.hash", task.ptx.TransactionHash(),
				"tx.success", receipt.Status == crypto.TransactionResultSuccess,
				"xchain.req.txid", task.outcome.TransactionID,
				"xchain.req.outcome", task.outcome.Outcome,
				"gatedContract", task.outcome.Event.ContractAddress())
			x.entitlementCheckProcessed.IncPass()
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

	wrapped := entitlement.NewWrappedWalletLink(iWalletLink)
	wallets, err := entitlement.GetLinkedWallets(
		ctx,
		wallet,
		wrapped,
		x.callDurations,
		x.getRootKeyForWalletCalls,
		x.getWalletsByRootKeyCalls,
	)
	if err != nil {
		log.Error(
			"Failed to get linked wallets",
			"err",
			err,
			"wallet",
			wallet.Hex(),
			"walletLinkContract",
			x.config.GetWalletLinkContractAddress(),
		)
		return nil, x.handleContractError(log, err, "Failed to get linked wallets")
	}
	return wallets, nil
}

func (x *xchain) getRuleData(
	ctx context.Context,
	transactionId [32]byte,
	roleId *big.Int,
	contractAddress common.Address,
	client crypto.BlockchainClient,
) (*contracts.IRuleData, error) {
	log := x.Log(ctx).With("function", "getRuleData", "req.txid", transactionId)
	gater, err := contracts.NewIEntitlementGated(contractAddress, client, x.config.GetContractVersion())
	if err != nil {
		return nil, x.handleContractError(log, err, "Failed to create NewEntitlementGated")
	}

	defer prometheus.NewTimer(x.callDurations.WithLabelValues("GetRuleData")).ObserveDuration()

	ruleData, err := gater.GetRuleData(&bind.CallOpts{Context: ctx}, transactionId, roleId)
	if err != nil {
		x.getRuleDataCalls.IncFail()
		return nil, x.handleContractError(log, err, "Failed to GetEncodedRuleData")
	}
	x.getRuleDataCalls.IncPass()
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

	ruleData, err := x.getRuleData(ctx, request.TransactionID(), request.RoleId(), request.ContractAddress(), client)
	if err != nil {
		return false, err
	}

	// Embed log metadata for rule evaluation logs
	ctx = dlog.CtxWithLog(ctx, log)
	result, err = x.evaluator.EvaluateRuleData(ctx, wallets, ruleData)
	if err != nil {
		log.Error("Failed to EvaluateRuleData", "err", err)
		return false, err
	}

	return result, nil
}
