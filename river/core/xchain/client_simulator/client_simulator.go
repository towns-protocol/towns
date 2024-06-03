package client_simulator

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"time"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/xchain/contracts"
	"github.com/river-build/river/core/xchain/entitlement"
	"github.com/river-build/river/core/xchain/examples"

	node_contracts "github.com/river-build/river/core/node/contracts"
	node_crypto "github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"

	xc "github.com/river-build/river/core/xchain/common"

	e "github.com/river-build/river/core/xchain/contracts"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

var isEntitled = false

func toggleCustomEntitlement(
	ctx context.Context,
	cfg *config.Config,
	fromAddress common.Address,
	client *ethclient.Client,
	privateKey *ecdsa.PrivateKey,
) {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")

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

	mockCustomContract, err := e.NewMockCustomEntitlement(
		cfg.GetTestCustomEntitlementContractAddress(),
		client,
		cfg.GetContractVersion(),
	)
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

func customEntitlementExample(cfg *config.Config) e.IRuleData {
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
				ContractAddress: cfg.GetTestCustomEntitlementContractAddress(),
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

type postResult struct {
	transactionId [32]byte
	result        bool
}

type ClientSimulator interface {
	Start(ctx context.Context)
	Stop()
	EvaluateRuleData(ctx context.Context, cfg *config.Config, ruleData e.IRuleData) (bool, error)
	Wallet() *node_crypto.Wallet
}

type clientSimulator struct {
	cfg *config.Config

	wallet *node_crypto.Wallet

	decoder *node_contracts.EvmErrorDecoder

	entitlementGated         *contracts.MockEntitlementGated
	entitlementGatedABI      *abi.ABI
	entitlementGatedContract *bind.BoundContract

	checker         *contracts.IEntitlementChecker
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
	entitlementGated, err := e.NewMockEntitlementGated(
		cfg.GetTestEntitlementContractAddress(),
		nil,
		cfg.GetContractVersion(),
	)
	if err != nil {
		return nil, err
	}
	checker, err := e.NewIEntitlementChecker(cfg.GetEntitlementContractAddress(), nil, cfg.GetContractVersion())
	if err != nil {
		return nil, err
	}

	var (
		entitlementGatedABI      = entitlementGated.GetAbi()
		entitlementGatedContract = bind.NewBoundContract(
			cfg.GetTestEntitlementContractAddress(),
			*entitlementGated.GetAbi(),
			nil,
			nil,
			nil,
		)

		checkerABI      = checker.GetAbi()
		checkerContract = bind.NewBoundContract(cfg.GetEntitlementContractAddress(), *checker.GetAbi(), nil, nil, nil)
	)

	metrics := infra.NewMetrics("xchain", "simulator")
	var ownsChain bool
	if baseChain == nil {
		ownsChain = true
		baseChain, err = node_crypto.NewBlockchain(ctx, &cfg.BaseChain, wallet, metrics)
		if err != nil {
			return nil, err
		}
		go baseChain.ChainMonitor.RunWithBlockPeriod(
			ctx,
			baseChain.Client,
			baseChain.InitialBlockNum,
			time.Duration(cfg.BaseChain.BlockTimeMs)*time.Millisecond,
			metrics,
		)
	}

	decoder, err := node_contracts.NewEVMErrorDecoder(entitlementGated.GetMetadata(), checker.GetMetadata())
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
		cs.cfg.GetEntitlementContractAddress(),
		[][]common.Hash{{cs.checkerABI.Events["EntitlementCheckRequested"].ID}},
		func(ctx context.Context, event types.Log) {
			cs.onEntitlementCheckRequested(ctx, event, cs.checkRequests)
		},
	)
}

func (cs *clientSimulator) executeCheck(ctx context.Context, ruleData *e.IRuleData) error {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")
	log.Info("ClientSimulator executing check", "ruleData", ruleData, "cfg", cs.cfg)

	pendingTx, err := cs.baseChain.TxPool.Submit(
		ctx,
		"RequestEntitlementCheck",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			log.Info("Calling RequestEntitlementCheck", "opts", opts, "ruleData", ruleData)
			gated, err := contracts.NewMockEntitlementGated(
				cs.cfg.GetTestEntitlementContractAddress(),
				cs.baseChain.Client,
				cs.cfg.GetContractVersion(),
			)
			if err != nil {
				log.Error("Failed to get NewMockEntitlementGated", "err", err)
				return nil, err
			}
			log.Info("NewMockEntitlementGated", "gated", gated.RequestEntitlementCheck, "err", err)
			tx, err := gated.RequestEntitlementCheck(opts, big.NewInt(0), *ruleData)
			log.Info("RequestEntitlementCheck called", "tx", tx, "err", err)
			return tx, err
		},
	)

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

	receipt := <-pendingTx.Wait()
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
	entitlementCheckResultPosted := cs.entitlementGated.EntitlementCheckResultPosted(cs.cfg.GetContractVersion())
	log := dlog.FromCtx(ctx).With("application", "clientSimulator").With("function", "onEntitlementCheckResultPosted")

	log.Info(
		"Unpacking EntitlementCheckResultPosted event",
		"event",
		event,
		"entitlementCheckResultPosted",
		entitlementCheckResultPosted,
	)

	if err := cs.entitlementGatedContract.UnpackLog(entitlementCheckResultPosted.Raw(), "EntitlementCheckResultPosted", event); err != nil {
		log.Error("Failed to unpack EntitlementCheckResultPosted event", "err", err)
		return
	}

	log.Info("Received EntitlementCheckResultPosted event",
		"TransactionId", entitlementCheckResultPosted.TransactionID(),
		"Result", entitlementCheckResultPosted.Result(),
	)

	postedResults <- postResult{
		transactionId: entitlementCheckResultPosted.TransactionID(),
		result:        entitlementCheckResultPosted.Result() == contracts.NodeVoteStatus__PASSED,
	}
}

func (cs *clientSimulator) onEntitlementCheckRequested(
	ctx context.Context,
	event types.Log,
	checkRequests chan [32]byte,
) {
	entitlementCheckRequest := cs.checker.EntitlementCheckRequestEvent()
	log := dlog.FromCtx(ctx).With("application", "clientSimulator").With("function", "onEntitlementCheckRequested")

	log.Info(
		"Unpacking EntitlementCheckRequested event",
		"event",
		event,
		"entitlementCheckRequest",
		entitlementCheckRequest,
	)

	if err := cs.checkerContract.UnpackLog(entitlementCheckRequest.Raw(), "EntitlementCheckRequested", event); err != nil {
		log.Error("Failed to unpack EntitlementCheckRequested event", "err", err)
		return
	}

	log.Info("Received EntitlementCheckRequested event",
		"TransactionId", entitlementCheckRequest.TransactionID(),
		"selectedNodes", entitlementCheckRequest.SelectedNodes(),
	)

	checkRequests <- entitlementCheckRequest.TransactionID()
}

func (cs *clientSimulator) Wallet() *node_crypto.Wallet {
	return cs.wallet
}

func (cs *clientSimulator) EvaluateRuleData(ctx context.Context, cfg *config.Config, ruleData e.IRuleData) (bool, error) {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")
	log.Info("ClientSimulator evaluating rule data", "ruleData", ruleData)

	err := cs.executeCheck(ctx, &ruleData)
	if err != nil {
		log.Error("Failed to execute entitlement check", "err", err)
		return false, err
	}

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

func RunClientSimulator(ctx context.Context, cfg *config.Config, wallet *node_crypto.Wallet, simType SimulationType) {
	if simType == TOGGLEISENTITLED {
		ToggleEntitlement(ctx, cfg, wallet)
		return
	}

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

	var ruleData e.IRuleData
	switch simType {
	case ERC721:
		ruleData = erc721Example()
	case ERC20:
		ruleData = erc20Example()
	case ISENTITLED:
		ruleData = customEntitlementExample(cfg)
	default:
		log.Error("--- ClientSimulator invalid SimulationType", "simType", simType)
		return
	}

	cs.EvaluateRuleData(ctx, cfg, ruleData)
}

func ToggleEntitlement(ctx context.Context, cfg *config.Config, wallet *node_crypto.Wallet) {
	log := dlog.FromCtx(ctx).With("application", "clientSimulator")

	privateKey := wallet.PrivateKeyStruct
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Error("error casting public key to ECDSA")
		return
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	log.Info("ClientSimulator fromAddress", "fromAddress", fromAddress.Hex())

	baseWebsocketURL, err := xc.ConvertHTTPToWebSocket(cfg.BaseChain.NetworkUrl)
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
	err = client.Client().CallContext(bc, &result, "anvil_setBalance", fromAddress, 1_000_000_000_000_000_000)
	if err != nil {
		log.Info("Failed call anvil_setBalance %v", err)
		return
	}
	log.Info("ClientSimulator add funds on anvil to wallet address", "result", result)

	toggleCustomEntitlement(ctx, cfg, fromAddress, client, privateKey)
}
