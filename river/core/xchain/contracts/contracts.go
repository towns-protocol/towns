package contracts

import (
	"context"
	"core/xchain/config"
	"core/xchain/contracts/dev"
	v3 "core/xchain/contracts/v3"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/event"
	"github.com/river-build/river/core/node/dlog"
)

type IRuleData struct {
	Operations        []IRuleEntitlementOperation
	CheckOperations   []IRuleEntitlementCheckOperation
	LogicalOperations []IRuleEntitlementLogicalOperation
}

type IRuleEntitlementOperation struct {
	OpType uint8
	Index  uint8
}

type IRuleEntitlementCheckOperation struct {
	OpType          uint8
	ChainId         *big.Int
	ContractAddress common.Address
	Threshold       *big.Int
}

// IRuleEntitlementLogicalOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementLogicalOperation struct {
	LogOpType           uint8
	LeftOperationIndex  uint8
	RightOperationIndex uint8
}

type IEntitlementGated struct {
	v3IEntitlementGated  *v3.IEntitlementGated
	devIEntitlementGated *dev.IEntitlementGated
}

type MockEntitlementGated struct {
	v3MockEntitlementGated  *v3.MockEntitlementGated
	devMockEntitlementGated *dev.MockEntitlementGated
}

type NodeVoteStatus uint8

const (
	NodeVoteStatus__NOT_VOTED NodeVoteStatus = iota
	NodeVoteStatus__PASSED
	NodeVoteStatus__FAILED
)

type IEntitlementCheckResultPosted interface {
	TransactionID() common.Hash
	Result() NodeVoteStatus
	Raw() interface{}
}

type entitlementCheckResultPosted struct {
	v3Inner  *v3.IEntitlementGatedEntitlementCheckResultPosted
	devInner *dev.IEntitlementGatedEntitlementCheckResultPosted
}

func (e *entitlementCheckResultPosted) TransactionID() common.Hash {
	if e.v3Inner != nil {
		return e.v3Inner.TransactionId
	}
	return e.devInner.TransactionId
}

func (e *entitlementCheckResultPosted) Result() NodeVoteStatus {
	if e.v3Inner != nil {
		return NodeVoteStatus(e.v3Inner.Result)
	}
	return NodeVoteStatus(e.devInner.Result)
}

func (e *entitlementCheckResultPosted) Raw() interface{} {
	if e.v3Inner != nil {
		return e.v3Inner
	}
	return e.devInner
}

func NewMockEntitlementGated(address common.Address, backend bind.ContractBackend) (*MockEntitlementGated, error) {
	res := &MockEntitlementGated{}
	if config.GetConfig().GetContractVersion() == "v3" {
		contract, err := v3.NewMockEntitlementGated(address, backend)
		res.v3MockEntitlementGated = contract
		return res, err
	} else {
		contract, err := dev.NewMockEntitlementGated(address, backend)
		res.devMockEntitlementGated = contract
		return res, err
	}
}

func (g *MockEntitlementGated) EntitlementCheckResultPosted() IEntitlementCheckResultPosted {
	if config.GetConfig().GetContractVersion() == "v3" {
		return &entitlementCheckResultPosted{&v3.IEntitlementGatedEntitlementCheckResultPosted{}, nil}
	} else {
		return &entitlementCheckResultPosted{nil, &dev.IEntitlementGatedEntitlementCheckResultPosted{}}
	}
}

func (g *MockEntitlementGated) GetMetadata() *bind.MetaData {
	if config.GetConfig().GetContractVersion() == "v3" {
		return v3.MockEntitlementGatedMetaData
	} else {
		return dev.MockEntitlementGatedMetaData
	}
}

func (g *MockEntitlementGated) GetAbi() *abi.ABI {
	md := g.GetMetadata()
	abi, err := md.GetAbi()
	if err != nil {
		panic("Failed to parse EntitlementGated ABI")
	}
	return abi
}

func (g *MockEntitlementGated) RequestEntitlementCheck(opts *bind.TransactOpts, ruledata IRuleData) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return g.v3MockEntitlementGated.RequestEntitlementCheck(opts, convertRuleDataToV3(ruledata))
	} else {
		return g.devMockEntitlementGated.RequestEntitlementCheck(opts, convertRuleDataToDev(ruledata))
	}
}

type MockCustomEntitlement struct {
	v3MockCustomEntitlement  *v3.MockCustomEntitlement
	devMockCustomEntitlement *dev.MockCustomEntitlement
}

func NewMockCustomEntitlement(address common.Address, backend bind.ContractBackend) (*MockCustomEntitlement, error) {
	res := &MockCustomEntitlement{}
	if config.GetConfig().GetContractVersion() == "v3" {
		contract, err := v3.NewMockCustomEntitlement(address, backend)
		res.v3MockCustomEntitlement = contract
		return res, err
	} else {
		contract, err := dev.NewMockCustomEntitlement(address, backend)
		res.devMockCustomEntitlement = contract
		return res, err
	}
}

func (m *MockCustomEntitlement) SetEntitled(
	opts *bind.TransactOpts,
	user []common.Address,
	userIsEntitled bool,
) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return m.v3MockCustomEntitlement.SetEntitled(opts, user, userIsEntitled)
	} else {
		return m.devMockCustomEntitlement.SetEntitled(opts, user, userIsEntitled)
	}
}

func NewIEntitlementGated(address common.Address, backend bind.ContractBackend) (*IEntitlementGated, error) {
	res := &IEntitlementGated{}
	if config.GetConfig().GetContractVersion() == "v3" {
		contract, err := v3.NewIEntitlementGated(address, backend)
		res.v3IEntitlementGated = contract
		return res, err
	} else {
		contract, err := dev.NewIEntitlementGated(address, backend)
		res.devIEntitlementGated = contract
		return res, err
	}
}

func (g *IEntitlementGated) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, result uint8) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return g.v3IEntitlementGated.PostEntitlementCheckResult(opts, transactionId, result)
	} else {
		return g.devIEntitlementGated.PostEntitlementCheckResult(opts, transactionId, result)
	}
}

func (g *IEntitlementGated) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *IEntitlementGatedEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		v3Sink := make(chan *v3.IEntitlementGatedEntitlementCheckResultPosted)
		sub, err := g.v3IEntitlementGated.WatchEntitlementCheckResultPosted(opts, v3Sink, transactionId)
		go func() {
			for v3Event := range v3Sink {
				shimEvent := convertV3ToShimResultPosted(v3Event)
				sink <- shimEvent
			}
		}()
		return sub, err
	} else {
		devSink := make(chan *dev.IEntitlementGatedEntitlementCheckResultPosted)
		sub, err := g.devIEntitlementGated.WatchEntitlementCheckResultPosted(opts, devSink, transactionId)
		go func() {
			for devEvent := range devSink {
				shimEvent := converDevToShimResultPosted(devEvent)
				sink <- shimEvent
			}
		}()
		return sub, err
	}
}

func (g *IEntitlementGated) GetRuleData(opts *bind.CallOpts, transactionId [32]byte) (*IRuleData, error) {
	var ruleData IRuleData
	if config.GetConfig().GetContractVersion() == "v3" {
		v3RuleData, err := g.v3IEntitlementGated.GetRuleData(opts, transactionId)
		if err != nil {
			return nil, err
		}
		ruleData = IRuleData{
			Operations:        make([]IRuleEntitlementOperation, len(v3RuleData.Operations)),
			CheckOperations:   make([]IRuleEntitlementCheckOperation, len(v3RuleData.CheckOperations)),
			LogicalOperations: make([]IRuleEntitlementLogicalOperation, len(v3RuleData.LogicalOperations)),
		}
		for i, op := range v3RuleData.Operations {
			ruleData.Operations[i] = IRuleEntitlementOperation{
				OpType: op.OpType,
				Index:  op.Index,
			}
		}
		for i, op := range v3RuleData.CheckOperations {
			ruleData.CheckOperations[i] = IRuleEntitlementCheckOperation{
				OpType:          op.OpType,
				ChainId:         op.ChainId,
				ContractAddress: op.ContractAddress,
				Threshold:       op.Threshold,
			}
		}
		for i, op := range v3RuleData.LogicalOperations {
			ruleData.LogicalOperations[i] = IRuleEntitlementLogicalOperation{
				LogOpType:           op.LogOpType,
				LeftOperationIndex:  op.LeftOperationIndex,
				RightOperationIndex: op.RightOperationIndex,
			}
		}
		return &ruleData, nil
	} else {
		devRuleDtata, err := g.devIEntitlementGated.GetRuleData(opts, transactionId)
		if err != nil {
			return nil, err
		}
		ruleData = IRuleData{
			Operations:        make([]IRuleEntitlementOperation, len(devRuleDtata.Operations)),
			CheckOperations:   make([]IRuleEntitlementCheckOperation, len(devRuleDtata.CheckOperations)),
			LogicalOperations: make([]IRuleEntitlementLogicalOperation, len(devRuleDtata.LogicalOperations)),
		}
		for i, op := range devRuleDtata.Operations {
			ruleData.Operations[i] = IRuleEntitlementOperation{
				OpType: op.OpType,
				Index:  op.Index,
			}
		}
		for i, op := range devRuleDtata.CheckOperations {
			ruleData.CheckOperations[i] = IRuleEntitlementCheckOperation{
				OpType:          op.OpType,
				ChainId:         op.ChainId,
				ContractAddress: op.ContractAddress,
				Threshold:       op.Threshold,
			}
		}
		for i, op := range devRuleDtata.LogicalOperations {
			ruleData.LogicalOperations[i] = IRuleEntitlementLogicalOperation{
				LogOpType:           op.LogOpType,
				LeftOperationIndex:  op.LeftOperationIndex,
				RightOperationIndex: op.RightOperationIndex,
			}
		}
		return &ruleData, nil
	}
}

type ICustomEntitlement struct {
	v3ICustomEntitlement  *v3.ICustomEntitlement
	devICustomEntitlement *dev.ICustomEntitlement
}

func NewICustomEntitlement(address common.Address, backend bind.ContractBackend) (*ICustomEntitlement, error) {
	res := &ICustomEntitlement{}
	if config.GetConfig().GetContractVersion() == "v3" {
		contract, err := v3.NewICustomEntitlement(address, backend)
		res.v3ICustomEntitlement = contract
		return res, err
	} else {
		contract, err := dev.NewICustomEntitlement(address, backend)
		res.devICustomEntitlement = contract
		return res, err
	}
}

func (c *ICustomEntitlement) GetMetadata() *bind.MetaData {
	if config.GetConfig().GetContractVersion() == "v3" {
		return v3.ICustomEntitlementMetaData
	} else {
		return dev.ICustomEntitlementMetaData
	}
}

func (c *ICustomEntitlement) GetAbi() *abi.ABI {
	md := c.GetMetadata()
	abi, err := md.GetAbi()
	if err != nil {
		panic("Failed to parse CustomEntitlement ABI")
	}
	return abi
}

func (c *ICustomEntitlement) IsEntitled(opts *bind.CallOpts, user []common.Address) (bool, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return c.v3ICustomEntitlement.IsEntitled(opts, user)
	} else {
		return c.devICustomEntitlement.IsEntitled(opts, user)
	}
}

func (g *MockEntitlementGated) EntitlementGatedMetaData() *bind.MetaData {
	if config.GetConfig().GetContractVersion() == "v3" {
		return v3.IEntitlementGatedMetaData
	} else {
		return dev.IEntitlementGatedMetaData
	}
}

type EntitlementGatedMetaData struct {
	v3IEntitlementGatedMetaData  *bind.MetaData
	devIEntitlementGatedMetaData *bind.MetaData
}

func NewEntitlementGatedMetaData() EntitlementGatedMetaData {
	if config.GetConfig().GetContractVersion() == "v3" {
		return EntitlementGatedMetaData{
			v3IEntitlementGatedMetaData: v3.IEntitlementGatedMetaData,
		}
	} else {
		return EntitlementGatedMetaData{
			devIEntitlementGatedMetaData: dev.IEntitlementGatedMetaData,
		}
	}
}

func (e EntitlementGatedMetaData) GetMetadata() *bind.MetaData {
	if e.v3IEntitlementGatedMetaData != nil {
		return e.v3IEntitlementGatedMetaData
	}
	return e.devIEntitlementGatedMetaData
}

type IEntitlementChecker struct {
	v3IEntitlementChecker  *v3.IEntitlementChecker
	devIEntitlementChecker *dev.IEntitlementChecker
}

func NewIEntitlementChecker(address common.Address, backend bind.ContractBackend) (*IEntitlementChecker, error) {
	res := &IEntitlementChecker{}
	if config.GetConfig().GetContractVersion() == "v3" {
		contract, err := v3.NewIEntitlementChecker(address, backend)
		res.v3IEntitlementChecker = contract
		return res, err
	} else {
		contract, err := dev.NewIEntitlementChecker(address, backend)
		res.devIEntitlementChecker = contract
		return res, err
	}
}

func (c *IEntitlementChecker) GetMetadata() *bind.MetaData {
	if config.GetConfig().GetContractVersion() == "v3" {
		return v3.IEntitlementCheckerMetaData
	} else {
		return dev.IEntitlementCheckerMetaData
	}
}

func (c *IEntitlementChecker) GetAbi() *abi.ABI {
	md := c.GetMetadata()
	abi, err := md.GetAbi()
	if err != nil {
		panic("Failed to parse EntitlementChecker ABI")
	}
	return abi
}

type IEntitlementCheckRequestEvent interface {
	CallerAddress() common.Address
	TransactionID() common.Hash
	SelectedNodes() []common.Address
	ContractAddress() common.Address
	Raw() interface{}
}

type entitlementCheckRequestEvent struct {
	v3Inner  *v3.IEntitlementCheckerEntitlementCheckRequested
	devInner *dev.IEntitlementCheckerEntitlementCheckRequested
}

func (e *entitlementCheckRequestEvent) CallerAddress() common.Address {
	if e.v3Inner != nil {
		return e.v3Inner.CallerAddress
	}
	return e.devInner.CallerAddress
}

func (e *entitlementCheckRequestEvent) TransactionID() common.Hash {
	if e.v3Inner != nil {
		return e.v3Inner.TransactionId
	}
	return e.devInner.TransactionId
}

func (e *entitlementCheckRequestEvent) SelectedNodes() []common.Address {
	if e.v3Inner != nil {
		return e.v3Inner.SelectedNodes
	}
	return e.devInner.SelectedNodes
}

func (e *entitlementCheckRequestEvent) ContractAddress() common.Address {
	if e.v3Inner != nil {
		return e.v3Inner.ContractAddress
	}
	return e.devInner.ContractAddress
}

func (e *entitlementCheckRequestEvent) Raw() interface{} {
	if e.v3Inner != nil {
		return e.v3Inner
	}
	return e.devInner

}

func (c *IEntitlementChecker) EntitlementCheckRequestEvent() IEntitlementCheckRequestEvent {
	if config.GetConfig().GetContractVersion() == "v3" {
		return &entitlementCheckRequestEvent{&v3.IEntitlementCheckerEntitlementCheckRequested{}, nil}
	} else {
		return &entitlementCheckRequestEvent{nil, &dev.IEntitlementCheckerEntitlementCheckRequested{}}
	}
}

func (c *IEntitlementChecker) EstimateGas(ctx context.Context, client *ethclient.Client, From common.Address, To *common.Address, name string, args ...interface{}) (*uint64, error) {
	log := dlog.FromCtx(ctx)
	// Generate the data for the contract method call
	// You must replace `YourContractABI` with the actual ABI of your contract
	// and `registerNodeMethodID` with the actual method ID you wish to call.
	// The following line is a placeholder for the encoded data of your method call.
	parsedABI := c.GetAbi()

	method, err := parsedABI.Pack(name, args...)
	if err != nil {
		return nil, err
	}

	// Prepare the transaction call message
	msg := ethereum.CallMsg{
		From: From,   // Sender of the transaction (optional)
		To:   To,     // Contract address
		Data: method, // Encoded method call
	}

	// Estimate the gas required for the transaction
	estimatedGas, err := client.EstimateGas(ctx, msg)
	if err != nil {
		log.Error("Failed to estimate gas", "err", err)
		return nil, err
	}

	log.Debug("estimatedGas", "estimatedGas", estimatedGas)
	return &estimatedGas, nil

}

func (c *IEntitlementChecker) NodeCount(opts *bind.CallOpts) (*big.Int, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return c.v3IEntitlementChecker.NodeCount(opts)
	} else {
		return c.devIEntitlementChecker.NodeCount(opts)
	}
}

func (c *IEntitlementChecker) RegisterNode(opts *bind.TransactOpts) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return c.v3IEntitlementChecker.RegisterNode(opts)
	} else {
		return c.devIEntitlementChecker.RegisterNode(opts)
	}
}

func (c *IEntitlementChecker) UnregisterNode(opts *bind.TransactOpts) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return c.v3IEntitlementChecker.UnregisterNode(opts)
	} else {
		return c.devIEntitlementChecker.UnregisterNode(opts)
	}
}

func (c *IEntitlementChecker) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *IEntitlementCheckerEntitlementCheckRequested, nodeAddress []common.Address) (event.Subscription, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		v3Sink := make(chan *v3.IEntitlementCheckerEntitlementCheckRequested)
		sub, err := c.v3IEntitlementChecker.WatchEntitlementCheckRequested(opts, v3Sink, nodeAddress)
		go func() {
			for v3Event := range v3Sink {
				shimEvent := convertV3ToShimCheckRequested(v3Event)
				sink <- shimEvent
			}
		}()
		return sub, err
	} else {
		devSink := make(chan *dev.IEntitlementCheckerEntitlementCheckRequested)
		sub, err := c.devIEntitlementChecker.WatchEntitlementCheckRequested(opts, devSink, nodeAddress)
		go func() {
			for devEvent := range devSink {
				shimEvent := convertDevToShimCheckRequested(devEvent)
				sink <- shimEvent
			}
		}()
		return sub, err
	}
}

type IEntitlementGatedEntitlementCheckResultPosted struct {
	TransactionId [32]byte
	Result        uint8
	Raw           types.Log // Blockchain specific contextual infos
}

type IEntitlementCheckerEntitlementCheckRequested struct {
	CallerAddress   common.Address
	TransactionId   [32]byte
	SelectedNodes   []common.Address
	ContractAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

func convertV3ToShimCheckRequested(v3Event *v3.IEntitlementCheckerEntitlementCheckRequested) *IEntitlementCheckerEntitlementCheckRequested {
	return &IEntitlementCheckerEntitlementCheckRequested{
		CallerAddress:   v3Event.CallerAddress,
		TransactionId:   v3Event.TransactionId,
		SelectedNodes:   v3Event.SelectedNodes,
		ContractAddress: v3Event.ContractAddress,
		Raw:             v3Event.Raw,
	}
}

func convertDevToShimCheckRequested(devEvent *dev.IEntitlementCheckerEntitlementCheckRequested) *IEntitlementCheckerEntitlementCheckRequested {
	return &IEntitlementCheckerEntitlementCheckRequested{
		CallerAddress:   devEvent.CallerAddress,
		TransactionId:   devEvent.TransactionId,
		SelectedNodes:   devEvent.SelectedNodes,
		ContractAddress: devEvent.ContractAddress,
		Raw:             devEvent.Raw,
	}
}

func convertV3ToShimResultPosted(v3Event *v3.IEntitlementGatedEntitlementCheckResultPosted) *IEntitlementGatedEntitlementCheckResultPosted {
	return &IEntitlementGatedEntitlementCheckResultPosted{
		TransactionId: v3Event.TransactionId,
		Result:        v3Event.Result,
		Raw:           v3Event.Raw,
	}
}

func converDevToShimResultPosted(devEvent *dev.IEntitlementGatedEntitlementCheckResultPosted) *IEntitlementGatedEntitlementCheckResultPosted {
	return &IEntitlementGatedEntitlementCheckResultPosted{
		TransactionId: devEvent.TransactionId,
		Result:        devEvent.Result,
		Raw:           devEvent.Raw,
	}
}

func convertRuleDataToV3(ruleData IRuleData) v3.IRuleEntitlementRuleData {
	operations := make([]v3.IRuleEntitlementOperation, len(ruleData.Operations))
	for i, op := range ruleData.Operations {
		operations[i] = v3.IRuleEntitlementOperation{
			OpType: op.OpType,
			Index:  op.Index,
		}
	}
	checkOperations := make([]v3.IRuleEntitlementCheckOperation, len(ruleData.CheckOperations))
	for i, op := range ruleData.CheckOperations {
		checkOperations[i] = v3.IRuleEntitlementCheckOperation{
			OpType:          op.OpType,
			ChainId:         op.ChainId,
			ContractAddress: op.ContractAddress,
			Threshold:       op.Threshold,
		}
	}
	logicalOperations := make([]v3.IRuleEntitlementLogicalOperation, len(ruleData.LogicalOperations))
	for i, op := range ruleData.LogicalOperations {
		logicalOperations[i] = v3.IRuleEntitlementLogicalOperation{
			LogOpType:           op.LogOpType,
			LeftOperationIndex:  op.LeftOperationIndex,
			RightOperationIndex: op.RightOperationIndex,
		}
	}
	return v3.IRuleEntitlementRuleData{
		Operations:        operations,
		CheckOperations:   checkOperations,
		LogicalOperations: logicalOperations,
	}
}

func convertRuleDataToDev(ruleData IRuleData) dev.IRuleEntitlementRuleData {
	operations := make([]dev.IRuleEntitlementOperation, len(ruleData.Operations))
	for i, op := range ruleData.Operations {
		operations[i] = dev.IRuleEntitlementOperation{
			OpType: op.OpType,
			Index:  op.Index,
		}
	}
	checkOperations := make([]dev.IRuleEntitlementCheckOperation, len(ruleData.CheckOperations))
	for i, op := range ruleData.CheckOperations {
		checkOperations[i] = dev.IRuleEntitlementCheckOperation{
			OpType:          op.OpType,
			ChainId:         op.ChainId,
			ContractAddress: op.ContractAddress,
			Threshold:       op.Threshold,
		}
	}
	logicalOperations := make([]dev.IRuleEntitlementLogicalOperation, len(ruleData.LogicalOperations))
	for i, op := range ruleData.LogicalOperations {
		logicalOperations[i] = dev.IRuleEntitlementLogicalOperation{
			LogOpType:           op.LogOpType,
			LeftOperationIndex:  op.LeftOperationIndex,
			RightOperationIndex: op.RightOperationIndex,
		}
	}
	return dev.IRuleEntitlementRuleData{
		Operations:        operations,
		CheckOperations:   checkOperations,
		LogicalOperations: logicalOperations,
	}

}
