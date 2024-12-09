package client_simulator

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/xchain/contracts"
	"github.com/river-build/river/core/xchain/examples"

	contract_types "github.com/river-build/river/core/contracts/types"

	node_crypto "github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"

	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/contracts/base/deploy"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

func erc721Example() base.IRuleEntitlementBaseRuleData {
	return base.IRuleEntitlementBaseRuleData{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
			{
				OpType:  uint8(contract_types.ERC721),
				ChainId: examples.EthSepoliaChainId,
				// Custom NFT contract example
				ContractAddress: examples.EthSepoliaTestNftContract,
				Threshold:       big.NewInt(1),
			},
		},
	}
}

func erc20Example() base.IRuleEntitlementBaseRuleData {
	return base.IRuleEntitlementBaseRuleData{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
			{
				OpType:  uint8(contract_types.ERC20),
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
)

type postResult struct {
	transactionId [32]byte
	result        bool
}

type ClientSimulator interface {
	Start(ctx context.Context)
	Stop()
	EvaluateRuleData(ctx context.Context, cfg *config.Config, ruleData base.IRuleEntitlementBaseRuleData) (bool, error)
	EvaluateRuleDataV2(
		ctx context.Context,
		cfg *config.Config,
		ruleData base.IRuleEntitlementBaseRuleDataV2,
	) (bool, error)
	Wallet() *node_crypto.Wallet
}

type clientSimulator struct {
	cfg *config.Config

	wallet *node_crypto.Wallet

	decoder *node_crypto.EvmErrorDecoder

	entitlementGated         *deploy.MockEntitlementGated
	entitlementGatedABI      *abi.ABI
	entitlementGatedContract *bind.BoundContract

	checker         *base.IEntitlementChecker
	checkerABI      *abi.ABI
	checkerContract *bind.BoundContract

	baseChain *node_crypto.Blockchain
	ownsChain bool

	checkRequests chan [32]byte
	resultPosted  chan postResult
}

// Enforce interface
var _ ClientSimulator = &clientSimulator{}

func New(
	ctx context.Context,
	cfg *config.Config,
	baseChain *node_crypto.Blockchain,
	wallet *node_crypto.Wallet,
) (ClientSimulator, error) {
	entitlementGated, err := deploy.NewMockEntitlementGated(
		cfg.GetTestEntitlementContractAddress(),
		nil,
	)
	if err != nil {
		return nil, err
	}
	checker, err := base.NewIEntitlementChecker(cfg.GetEntitlementContractAddress(), nil)
	if err != nil {
		return nil, err
	}

	entitlementGatedABI, err := deploy.MockEntitlementGatedMetaData.GetAbi()
	if err != nil {
		return nil, err
	}

	checkerABI, err := base.IEntitlementCheckerMetaData.GetAbi()
	if err != nil {
		return nil, err
	}

	var (
		entitlementGatedContract = bind.NewBoundContract(
			cfg.GetTestEntitlementContractAddress(),
			*entitlementGatedABI,
			nil,
			nil,
			nil,
		)

		checkerContract = bind.NewBoundContract(cfg.GetEntitlementContractAddress(), *checkerABI, nil, nil, nil)
	)

	metrics := infra.NewMetricsFactory(nil, "xchain", "simulator")
	var ownsChain bool
	if baseChain == nil {
		ownsChain = true
		baseChain, err = node_crypto.NewBlockchain(ctx, &cfg.BaseChain, wallet, metrics, nil)
		if err != nil {
			return nil, err
		}
	}

	decoder, err := node_crypto.NewEVMErrorDecoder(
		deploy.MockEntitlementGatedMetaData,
		base.IEntitlementCheckerMetaData,
	)
	if err != nil {
		return nil, err
	}

	return &clientSimulator{
		cfg,
		wallet,
		decoder,
		entitlementGated,
		entitlementGatedABI,
		entitlementGatedContract,
		checker,
		checkerABI,
		checkerContract,
		baseChain,
		ownsChain,
		make(chan [32]byte, 256),
		make(chan postResult, 256),
	}, nil
}

func (cs *clientSimulator) Stop() {
	cs.baseChain.Close()
}

func (cs *clientSimulator) Start(ctx context.Context) {
	cs.baseChain.ChainMonitor.OnContractWithTopicsEvent(
		0,
		cs.cfg.GetTestEntitlementContractAddress(),
		[][]common.Hash{{cs.entitlementGatedABI.Events["EntitlementCheckResultPosted"].ID}},
		func(ctx context.Context, event types.Log) {
			cs.onEntitlementCheckResultPosted(ctx, event, cs.resultPosted)
		},
	)

	dlog.FromCtx(ctx).
		With("application", "clientSimulator").
		Info("check requested topics", "topics", cs.checkerABI.Events["EntitlementCheckRequested"].ID)

	cs.baseChain.ChainMonitor.OnContractWithTopicsEvent(
		0,
		cs.cfg.GetEntitlementContractAddress(),
		[][]common.Hash{{cs.checkerABI.Events["EntitlementCheckRequested"].ID}},
		func(ctx context.Context, event types.Log) {
			cs.onEntitlementCheckRequested(ctx, event, cs.checkRequests)
		},
	)
}

func (cs *clientSimulator) executeCheck(ctx context.Context, ruleData *deploy.IRuleEntitlementBaseRuleData) error {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")
	log.Info("ClientSimulator executing check", "ruleData", ruleData, "cfg", cs.cfg)

	pendingTx, err := cs.baseChain.TxPool.Submit(
		ctx,
		"RequestEntitlementCheck",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			log.Info("Calling RequestEntitlementCheck", "opts", opts, "ruleData", ruleData)
			gated, err := deploy.NewMockEntitlementGated(
				cs.cfg.GetTestEntitlementContractAddress(),
				cs.baseChain.Client,
			)
			if err != nil {
				log.Error("Failed to get NewMockEntitlementGated", "err", err)
				return nil, err
			}
			log.Info("NewMockEntitlementGated", "gated", gated.RequestEntitlementCheck, "err", err)
			tx, err := gated.RequestEntitlementCheck(opts, big.NewInt(0), *ruleData)
			log.Info("RequestEntitlementCheck called", "tx", tx, "err", err)
			return tx, err
		})

	log.Info("Submitted entitlement check...")

	customErr, stringErr, err := cs.decoder.DecodeEVMError(err)
	switch {
	case customErr != nil:
		log.Error("Failed to submit entitlement check", "type", "customErr", "err", customErr)
		return err
	case stringErr != nil:
		log.Error("Failed to submit entitlement check", "type", "stringErr", "err", stringErr)
		return err
	case err != nil:
		log.Error("Failed to submit entitlement check", "type", "err", "err", err)
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	log.Info("Entitlement check mined", "receipt", receipt)
	if receipt.Status == types.ReceiptStatusFailed {
		log.Error("Failed to execute check - could not execute transaction")
		return fmt.Errorf("failed to execute check - could not execute transaction")
	}
	return nil
}

func (cs *clientSimulator) executeV2Check(ctx context.Context, ruleData *deploy.IRuleEntitlementBaseRuleDataV2) error {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")
	log.Info("ClientSimulator executing v2 check", "ruleData", ruleData, "cfg", cs.cfg)

	pendingTx, err := cs.baseChain.TxPool.Submit(
		ctx,
		"RequestEntitlementCheckV2",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			log.Info("Calling RequestEntitlementCheck", "opts", opts, "ruleData", ruleData)
			gated, err := deploy.NewMockEntitlementGated(
				cs.cfg.GetTestEntitlementContractAddress(),
				cs.baseChain.Client,
			)
			if err != nil {
				log.Error("Failed to get NewMockEntitlementGated", "err", err)
				return nil, err
			}
			log.Info("NewMockEntitlementGated", "gated", gated.RequestEntitlementCheck, "err", err)
			tx, err := gated.RequestEntitlementCheckV2(opts, []*big.Int{big.NewInt(0)}, *ruleData)
			log.Info("RequestEntitlementCheckV2 called", "tx", tx, "err", err)
			return tx, err
		})

	log.Info("Submitted entitlement check...")

	customErr, stringErr, err := cs.decoder.DecodeEVMError(err)
	switch {
	case customErr != nil:
		log.Error("Failed to submit v2 entitlement check", "type", "customErr", "err", customErr)
		return err
	case stringErr != nil:
		log.Error("Failed to submit v2 entitlement check", "type", "stringErr", "err", stringErr)
		return err
	case err != nil:
		log.Error("Failed to submit v2 entitlement check", "type", "err", "err", err)
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	log.Info("Entitlement check mined", "receipt", receipt)
	if receipt.Status == types.ReceiptStatusFailed {
		log.Error("Failed to execute check - could not execute transaction")
		return fmt.Errorf("failed to execute check - could not execute transaction")
	}
	return nil
}

func (cs *clientSimulator) waitForNextRequest(ctx context.Context) ([32]byte, error) {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")

	ctx, cancel := context.WithTimeout(ctx, time.Second*60)
	defer cancel()

	for {
		select {
		case transactionId := <-cs.checkRequests:
			log.Info("Detected entitlement check request", "TransactionId", transactionId)
			return transactionId, nil

		case <-ctx.Done():
			log.Error("Timed out waiting for request")
			return [32]byte{}, ctx.Err()
		}
	}
}

func (cs *clientSimulator) waitForPostResult(ctx context.Context, txnId [32]byte) (bool, error) {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")

	ctx, cancel := context.WithTimeout(ctx, time.Second*60)
	defer cancel()

	for {
		select {
		case result := <-cs.resultPosted:
			if result.transactionId != txnId {
				log.Error(
					"Received result for unexpected transaction",
					"TransactionId",
					result.transactionId,
					"Expected",
					txnId,
				)
				return false, fmt.Errorf("received result for unexpected transaction")
			}
			log.Info(
				"Detected entitlement check result",
				"TransactionId",
				result.transactionId,
				"Result",
				result.result,
			)
			return result.result, nil

		case <-ctx.Done():
			log.Error("Timed out waiting for result")
			return false, ctx.Err()
		}
	}
}

func (cs *clientSimulator) onEntitlementCheckResultPosted(
	ctx context.Context,
	event types.Log,
	postedResults chan postResult,
) {
	entitlementCheckResultPosted := base.IEntitlementGatedEntitlementCheckResultPosted{}
	log := dlog.FromCtx(ctx).With("application", "clientSimulator").With("function", "onEntitlementCheckResultPosted")

	log.Info(
		"Unpacking EntitlementCheckResultPosted event",
		"event",
		event,
		"entitlementCheckResultPosted",
		entitlementCheckResultPosted,
	)

	if err := cs.entitlementGatedContract.UnpackLog(&entitlementCheckResultPosted, "EntitlementCheckResultPosted", event); err != nil {
		log.Error("Failed to unpack EntitlementCheckResultPosted event", "err", err)
		return
	}

	log.Info("Received EntitlementCheckResultPosted event",
		"TransactionId", entitlementCheckResultPosted.TransactionId,
		"Result", entitlementCheckResultPosted.Result,
	)

	postedResults <- postResult{
		transactionId: entitlementCheckResultPosted.TransactionId,
		result:        entitlementCheckResultPosted.Result == contracts.NodeVoteStatus__PASSED,
	}
}

func (cs *clientSimulator) onEntitlementCheckRequested(
	ctx context.Context,
	event types.Log,
	checkRequests chan [32]byte,
) {
	entitlementCheckRequest := base.IEntitlementCheckerEntitlementCheckRequested{}
	log := dlog.FromCtx(ctx).With("application", "clientSimulator").With("function", "onEntitlementCheckRequested")

	log.Info(
		"Unpacking EntitlementCheckRequested event",
		"event",
		event,
		"entitlementCheckRequest",
		entitlementCheckRequest,
	)

	if err := cs.checkerContract.UnpackLog(&entitlementCheckRequest, "EntitlementCheckRequested", event); err != nil {
		log.Error("Failed to unpack EntitlementCheckRequested event", "err", err)
		return
	}

	log.Info("Received EntitlementCheckRequested event",
		"TransactionId", entitlementCheckRequest.TransactionId,
		"selectedNodes", entitlementCheckRequest.SelectedNodes,
	)

	checkRequests <- entitlementCheckRequest.TransactionId
}

func (cs *clientSimulator) Wallet() *node_crypto.Wallet {
	return cs.wallet
}

func convertRuleDataFromBaseToDeploy(ruleData base.IRuleEntitlementBaseRuleData) deploy.IRuleEntitlementBaseRuleData {
	operations := make([]deploy.IRuleEntitlementBaseOperation, len(ruleData.Operations))
	for i, op := range ruleData.Operations {
		operations[i] = deploy.IRuleEntitlementBaseOperation{
			OpType: op.OpType,
			Index:  op.Index,
		}
	}
	checkOperations := make([]deploy.IRuleEntitlementBaseCheckOperation, len(ruleData.CheckOperations))
	for i, op := range ruleData.CheckOperations {
		checkOperations[i] = deploy.IRuleEntitlementBaseCheckOperation{
			OpType:          op.OpType,
			ChainId:         op.ChainId,
			ContractAddress: op.ContractAddress,
			Threshold:       op.Threshold,
		}
	}
	logicalOperations := make([]deploy.IRuleEntitlementBaseLogicalOperation, len(ruleData.LogicalOperations))
	for i, op := range ruleData.LogicalOperations {
		logicalOperations[i] = deploy.IRuleEntitlementBaseLogicalOperation{
			LogOpType:           op.LogOpType,
			LeftOperationIndex:  op.LeftOperationIndex,
			RightOperationIndex: op.RightOperationIndex,
		}
	}
	return deploy.IRuleEntitlementBaseRuleData{
		Operations:        operations,
		CheckOperations:   checkOperations,
		LogicalOperations: logicalOperations,
	}
}

func convertRuleDataV2FromBaseToDeploy(
	ruleData base.IRuleEntitlementBaseRuleDataV2,
) deploy.IRuleEntitlementBaseRuleDataV2 {
	operations := make([]deploy.IRuleEntitlementBaseOperation, len(ruleData.Operations))
	for i, op := range ruleData.Operations {
		operations[i] = deploy.IRuleEntitlementBaseOperation{
			OpType: op.OpType,
			Index:  op.Index,
		}
	}

	checkOperations := make([]deploy.IRuleEntitlementBaseCheckOperationV2, len(ruleData.CheckOperations))
	for i, op := range ruleData.CheckOperations {
		checkOperations[i] = deploy.IRuleEntitlementBaseCheckOperationV2{
			OpType:          op.OpType,
			ChainId:         op.ChainId,
			ContractAddress: op.ContractAddress,
			Params:          op.Params[:],
		}
	}
	logicalOperations := make([]deploy.IRuleEntitlementBaseLogicalOperation, len(ruleData.LogicalOperations))
	for i, op := range ruleData.LogicalOperations {
		logicalOperations[i] = deploy.IRuleEntitlementBaseLogicalOperation{
			LogOpType:           op.LogOpType,
			LeftOperationIndex:  op.LeftOperationIndex,
			RightOperationIndex: op.RightOperationIndex,
		}
	}
	return deploy.IRuleEntitlementBaseRuleDataV2{
		Operations:        operations,
		CheckOperations:   checkOperations,
		LogicalOperations: logicalOperations,
	}
}

func (cs *clientSimulator) awaitNextResult(ctx context.Context) (bool, error) {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator").With("function", "waitForNextRequest")
	log.Info("ClientSimulator waiting for request to publish")
	txId, err := cs.waitForNextRequest(ctx)
	if err != nil {
		log.Error("Failed to wait for request", "err", err)
		return false, err
	} else {
		log.Info("ClientSimulator logged entitlement check request",
			"TransactionId", txId,
		)
	}

	log.Info("ClientSimulator waiting for result")
	result, err := cs.waitForPostResult(ctx, txId)
	if err != nil {
		log.Error("Failed to wait for result", "err", err)
		return false, err
	}
	log.Info("ClientSimulator logged entitlement check result", "Result", result)
	return result, nil
}

func (cs *clientSimulator) EvaluateRuleDataV2(
	ctx context.Context,
	cfg *config.Config,
	baseRuleData base.IRuleEntitlementBaseRuleDataV2,
) (bool, error) {
	ruleData := convertRuleDataV2FromBaseToDeploy(baseRuleData)

	log := dlog.FromCtx(ctx).With("application", "clientSimulator")
	log.Info("ClientSimulator evaluating rule data v2", "ruleData", ruleData)

	err := cs.executeV2Check(ctx, &ruleData)
	if err != nil {
		log.Error("Failed to execute entitlement check", "err", err)
		return false, err
	}
	return cs.awaitNextResult(ctx)
}

func (cs *clientSimulator) EvaluateRuleData(
	ctx context.Context,
	cfg *config.Config,
	baseRuleData base.IRuleEntitlementBaseRuleData,
) (bool, error) {
	ruleData := convertRuleDataFromBaseToDeploy(baseRuleData)

	log := dlog.FromCtx(ctx).With("application", "clientSimulator")
	log.Info("ClientSimulator evaluating rule data", "ruleData", ruleData)

	err := cs.executeCheck(ctx, &ruleData)
	if err != nil {
		log.Error("Failed to execute entitlement check", "err", err)
		return false, err
	}
	return cs.awaitNextResult(ctx)
}

func RunClientSimulator(ctx context.Context, cfg *config.Config, wallet *node_crypto.Wallet, simType SimulationType) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	log := dlog.FromCtx(ctx).With("application", "clientSimulator")
	log.Info("--- ClientSimulator starting", "simType", simType)

	cs, err := New(ctx, cfg, nil, wallet)
	if err != nil {
		log.Error("--- Failed to create clientSimulator", "err", err)
		return
	}
	cs.Start(ctx)
	defer cs.Stop()

	var ruleData base.IRuleEntitlementBaseRuleData
	switch simType {
	case ERC721:
		ruleData = erc721Example()
	case ERC20:
		ruleData = erc20Example()
	default:
		log.Error("--- ClientSimulator invalid SimulationType", "simType", simType)
		return
	}

	_, _ = cs.EvaluateRuleData(ctx, cfg, ruleData)
}
