package client_simulator

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/xchain/contracts"
	"github.com/towns-protocol/towns/core/xchain/examples"

	contract_types "github.com/towns-protocol/towns/core/contracts/types"

	node_crypto "github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/contracts/base/deploy"

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
	EvaluateRuleData(
		ctx context.Context,
		cfg *config.Config,
		ruleData base.IRuleEntitlementBaseRuleData,
		emitV2Event bool,
	) (bool, error)
	EvaluateRuleDataV2(
		ctx context.Context,
		cfg *config.Config,
		ruleData base.IRuleEntitlementBaseRuleDataV2,
		emitV2Event bool,
	) (bool, error)
	Wallet() *node_crypto.Wallet
}

type clientSimulator struct {
	cfg *config.Config

	wallet *node_crypto.Wallet

	decoder *node_crypto.EvmErrorDecoder

	entitlementGated         *deploy.MockEntitlementGated
	entitlementGatedAddress  common.Address
	entitlementGatedABI      *abi.ABI
	entitlementGatedContract *bind.BoundContract

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
	mockEntitlementGatedAddress common.Address,
	baseChain *node_crypto.Blockchain,
	wallet *node_crypto.Wallet,
) (ClientSimulator, error) {
	entitlementGated, err := deploy.NewMockEntitlementGated(
		mockEntitlementGatedAddress,
		baseChain.Client,
	)
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
			mockEntitlementGatedAddress,
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
		mockEntitlementGatedAddress,
		entitlementGatedABI,
		entitlementGatedContract,
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
		cs.entitlementGatedAddress,
		[][]common.Hash{{cs.entitlementGatedABI.Events["EntitlementCheckResultPosted"].ID}},
		func(ctx context.Context, event *types.Log) {
			cs.onEntitlementCheckResultPosted(ctx, event, cs.resultPosted)
		},
	)

	logging.FromCtx(ctx).
		With("application", "clientSimulator").
		Infow("check requested topics", "topics", cs.checkerABI.Events["EntitlementCheckRequested"].ID)

	cs.baseChain.ChainMonitor.OnContractWithTopicsEvent(
		0,
		cs.cfg.GetEntitlementContractAddress(),
		[][]common.Hash{{cs.checkerABI.Events["EntitlementCheckRequested"].ID}},
		func(ctx context.Context, event *types.Log) {
			cs.onEntitlementCheckRequested(ctx, event, cs.checkRequests)
		},
	)

	cs.baseChain.ChainMonitor.OnContractWithTopicsEvent(
		0,
		cs.cfg.GetEntitlementContractAddress(),
		[][]common.Hash{{cs.checkerABI.Events["EntitlementCheckRequestedV2"].ID}},
		func(ctx context.Context, event *types.Log) {
			cs.onEntitlementCheckRequestedV2(ctx, event, cs.checkRequests)
		},
	)
}

func (cs *clientSimulator) executeCheck(
	ctx context.Context,
	ruleData *deploy.IRuleEntitlementBaseRuleData,
	emitV2Event bool,
) error {
	log := logging.FromCtx(ctx).With("application", "clientSimulator")
	log.Infow("ClientSimulator executing check", "ruleData", ruleData, "cfg", cs.cfg)

	pendingTx, err := cs.baseChain.TxPool.Submit(
		ctx,
		"RequestEntitlementCheckV1RuleDataV1",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			log.Infow(
				"Requesting entitlement check for legacy space",
				"opts",
				opts,
				"ruleData",
				ruleData,
				"v2Event",
				emitV2Event,
			)
			if emitV2Event {
				log.Infow("Calling RequestEntitlementCheckV2RuleDataV1", "opts", opts, "ruleData", ruleData)
				return cs.entitlementGated.RequestEntitlementCheckV2RuleDataV1(
					opts,
					[](*big.Int){big.NewInt(0)},
					*ruleData,
				)
			} else {
				log.Infow("Calling RequestEntitlementCheckV1RuleDataV1", "opts", opts, "ruleData", ruleData)
				return cs.entitlementGated.RequestEntitlementCheckV1RuleDataV1(opts, big.NewInt(0), *ruleData)
			}
		})

	log.Infow("Submitted entitlement check...")

	customErr, stringErr, err := cs.decoder.DecodeEVMError(err)
	switch {
	case customErr != nil:
		log.Errorw("Failed to submit entitlement check", "type", "customErr", "error", customErr)
		return err
	case stringErr != nil:
		log.Errorw("Failed to submit entitlement check", "type", "stringErr", "error", stringErr)
		return err
	case err != nil:
		log.Errorw("Failed to submit entitlement check", "type", "error", "error", err)
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	log.Infow("Entitlement check mined", "receipt", receipt)
	if receipt.Status == types.ReceiptStatusFailed {
		log.Errorw("Failed to execute check - could not execute transaction")
		return fmt.Errorf("failed to execute check - could not execute transaction")
	}
	return nil
}

func (cs *clientSimulator) executeV2Check(
	ctx context.Context,
	ruleData *deploy.IRuleEntitlementBaseRuleDataV2,
	emitV2Event bool,
) error {
	log := logging.FromCtx(ctx).With("application", "clientSimulator")
	log.Infow("ClientSimulator executing v2 check", "ruleData", ruleData, "cfg", cs.cfg)

	pendingTx, err := cs.baseChain.TxPool.Submit(
		ctx,
		"RequestEntitlementCheckV2",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			log.Infow(
				"Requesting entitlement check for V2 space",
				"opts",
				opts,
				"ruleDataV2",
				ruleData,
				"v2Event",
				emitV2Event,
			)

			if emitV2Event {
				tx, err := cs.entitlementGated.RequestEntitlementCheckV2RuleDataV2(
					opts,
					[]*big.Int{big.NewInt(0)},
					*ruleData,
				)
				log.Infow("RequestEntitlementCheckV2RuleDataV2 called", "tx", tx, "error", err)
				return tx, err

			} else {
				tx, err := cs.entitlementGated.RequestEntitlementCheckV1RuleDataV2(opts, []*big.Int{big.NewInt(0)}, *ruleData)
				log.Infow("RequestEntitlementCheckV1RuleDataV2 called", "tx", tx, "error", err)
				return tx, err
			}
		})

	log.Infow("Submitted entitlement check...")

	customErr, stringErr, err := cs.decoder.DecodeEVMError(err)
	switch {
	case customErr != nil:
		log.Errorw("Failed to submit v2 entitlement check", "type", "customErr", "error", customErr)
		return err
	case stringErr != nil:
		log.Errorw("Failed to submit v2 entitlement check", "type", "stringErr", "error", stringErr)
		return err
	case err != nil:
		log.Errorw("Failed to submit v2 entitlement check", "type", "error", "error", err)
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	log.Infow("Entitlement check mined", "receipt", receipt)
	if receipt.Status == types.ReceiptStatusFailed {
		log.Errorw("Failed to execute check - could not execute transaction")
		return fmt.Errorf("failed to execute check - could not execute transaction")
	}
	return nil
}

func (cs *clientSimulator) waitForNextRequest(ctx context.Context) ([32]byte, error) {
	log := logging.FromCtx(ctx).With("application", "clientSimulator")

	ctx, cancel := context.WithTimeout(ctx, time.Second*60)
	defer cancel()

	for {
		select {
		case transactionId := <-cs.checkRequests:
			log.Infow("Detected entitlement check request", "TransactionId", transactionId)
			return transactionId, nil

		case <-ctx.Done():
			log.Errorw("Timed out waiting for request")
			return [32]byte{}, ctx.Err()
		}
	}
}

func (cs *clientSimulator) waitForPostResult(ctx context.Context, txnId [32]byte) (bool, error) {
	log := logging.FromCtx(ctx).With("application", "clientSimulator")

	ctx, cancel := context.WithTimeout(ctx, time.Second*60)
	defer cancel()

	for {
		select {
		case result := <-cs.resultPosted:
			if result.transactionId != txnId {
				log.Errorw(
					"Received result for unexpected transaction",
					"TransactionId",
					result.transactionId,
					"Expected",
					txnId,
				)
				return false, fmt.Errorf("received result for unexpected transaction")
			}
			log.Infow(
				"Detected entitlement check result",
				"TransactionId",
				result.transactionId,
				"Result",
				result.result,
			)
			return result.result, nil

		case <-ctx.Done():
			log.Errorw("Timed out waiting for result")
			return false, ctx.Err()
		}
	}
}

func (cs *clientSimulator) onEntitlementCheckResultPosted(
	ctx context.Context,
	event *types.Log,
	postedResults chan postResult,
) {
	entitlementCheckResultPosted := base.IEntitlementGatedEntitlementCheckResultPosted{}
	log := logging.FromCtx(ctx).
		With("application", "clientSimulator").
		With("function", "onEntitlementCheckResultPosted")

	log.Infow(
		"Unpacking EntitlementCheckResultPosted event",
		"event",
		event,
	)

	if err := cs.entitlementGatedContract.UnpackLog(&entitlementCheckResultPosted, "EntitlementCheckResultPosted", *event); err != nil {
		log.Errorw("Failed to unpack EntitlementCheckResultPosted event", "error", err)
		return
	}

	log.Infow("Received EntitlementCheckResultPosted event",
		"event", entitlementCheckResultPosted,
	)

	postedResults <- postResult{
		transactionId: entitlementCheckResultPosted.TransactionId,
		result:        entitlementCheckResultPosted.Result == contracts.NodeVoteStatus__PASSED,
	}
}

func (cs *clientSimulator) onEntitlementCheckRequested(
	ctx context.Context,
	event *types.Log,
	checkRequests chan [32]byte,
) {
	entitlementCheckRequest := base.IEntitlementCheckerEntitlementCheckRequested{}
	log := logging.FromCtx(ctx).With("application", "clientSimulator").With("function", "onEntitlementCheckRequested")

	log.Infow(
		"Unpacking EntitlementCheckRequested event",
		"event",
		event,
		"entitlementCheckRequest",
		entitlementCheckRequest,
	)

	if err := cs.checkerContract.UnpackLog(&entitlementCheckRequest, "EntitlementCheckRequested", *event); err != nil {
		log.Errorw("Failed to unpack EntitlementCheckRequested event", "error", err)
		return
	}

	log.Infow("Observed EntitlementCheckRequested event",
		"TransactionId", entitlementCheckRequest.TransactionId,
		"selectedNodes", entitlementCheckRequest.SelectedNodes,
	)

	checkRequests <- entitlementCheckRequest.TransactionId
}

func (cs *clientSimulator) onEntitlementCheckRequestedV2(
	ctx context.Context,
	event *types.Log,
	checkRequests chan [32]byte,
) {
	entitlementCheckRequest := base.IEntitlementCheckerEntitlementCheckRequestedV2{}
	log := logging.FromCtx(ctx).With("application", "clientSimulator").With("function", "onEntitlementCheckRequestedV2")

	log.Infow(
		"Unpacking EntitlementCheckRequestedV2 event",
		"event",
		event,
		"entitlementCheckRequestV2",
		entitlementCheckRequest,
	)

	if err := cs.checkerContract.UnpackLog(&entitlementCheckRequest, "EntitlementCheckRequestedV2", *event); err != nil {
		log.Errorw("Failed to unpack EntitlementCheckRequestedV2 event", "error", err)
		return
	}

	log.Infow("Observed EntitlementCheckRequestedV2 event",
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
	log := logging.FromCtx(ctx).With("application", "clientSimulator").With("function", "waitForNextRequest")
	log.Infow("ClientSimulator waiting for request to publish")
	txId, err := cs.waitForNextRequest(ctx)
	if err != nil {
		log.Errorw("Failed to wait for request", "error", err)
		return false, err
	} else {
		log.Infow("ClientSimulator logged entitlement check request",
			"TransactionId", txId,
		)
	}

	log.Infow("ClientSimulator waiting for result")
	result, err := cs.waitForPostResult(ctx, txId)
	if err != nil {
		log.Errorw("Failed to wait for result", "error", err)
		return false, err
	}
	log.Infow("ClientSimulator logged entitlement check result", "Result", result)
	return result, nil
}

func (cs *clientSimulator) EvaluateRuleDataV2(
	ctx context.Context,
	cfg *config.Config,
	baseRuleData base.IRuleEntitlementBaseRuleDataV2,
	emitV2Event bool,
) (bool, error) {
	ruleData := convertRuleDataV2FromBaseToDeploy(baseRuleData)

	log := logging.FromCtx(ctx).With("application", "clientSimulator")
	log.Infow("ClientSimulator evaluating rule data v2", "ruleData", ruleData)

	err := cs.executeV2Check(ctx, &ruleData, emitV2Event)
	if err != nil {
		log.Errorw("Failed to execute entitlement check", "error", err)
		return false, err
	}
	return cs.awaitNextResult(ctx)
}

func (cs *clientSimulator) EvaluateRuleData(
	ctx context.Context,
	cfg *config.Config,
	baseRuleData base.IRuleEntitlementBaseRuleData,
	emitV2Event bool,
) (bool, error) {
	ruleData := convertRuleDataFromBaseToDeploy(baseRuleData)

	log := logging.FromCtx(ctx).With("application", "clientSimulator")
	log.Infow("ClientSimulator evaluating rule data", "ruleData", ruleData)

	err := cs.executeCheck(ctx, &ruleData, emitV2Event)
	if err != nil {
		log.Errorw("Failed to execute entitlement check", "error", err)
		return false, err
	}
	return cs.awaitNextResult(ctx)
}

func RunClientSimulator(
	ctx context.Context,
	cfg *config.Config,
	mockEntitlementGated common.Address,
	wallet *node_crypto.Wallet,
	simType SimulationType,
) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	log := logging.FromCtx(ctx).With("application", "clientSimulator")
	log.Infow("--- ClientSimulator starting", "simType", simType)

	cs, err := New(
		ctx,
		cfg,
		mockEntitlementGated,
		nil,
		wallet,
	)
	if err != nil {
		log.Errorw("--- Failed to create clientSimulator", "error", err)
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
		log.Errorw("--- ClientSimulator invalid SimulationType", "simType", simType)
		return
	}

	_, _ = cs.EvaluateRuleData(ctx, cfg, ruleData, false)
}
