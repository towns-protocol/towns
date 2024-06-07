package contracts

import (
	"context"
	"math/big"

	"github.com/river-build/river/core/node/config"
	dev "github.com/river-build/river/core/xchain/contracts/dev"
	v3 "github.com/river-build/river/core/xchain/contracts/v3"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/event"
	"github.com/river-build/river/core/node/dlog"
)

type IWalletLinkBaseLinkedWallet struct {
	Addr      common.Address
	Signature []byte
}

func (w IWalletLinkBaseLinkedWallet) v3() v3.IWalletLinkBaseLinkedWallet {
	return v3.IWalletLinkBaseLinkedWallet{
		Addr:      w.Addr,
		Signature: w.Signature,
	}
}

func (w IWalletLinkBaseLinkedWallet) dev() dev.IWalletLinkBaseLinkedWallet {
	return dev.IWalletLinkBaseLinkedWallet{
		Addr:      w.Addr,
		Signature: w.Signature,
	}
}

type WalletLink struct {
	v3WalletLink  *v3.WalletLink
	devWalletLink *dev.WalletLink
}

func DeployWalletLink(auth *bind.TransactOpts, backend bind.ContractBackend, version config.ContractVersion) (
	common.Address,
	*types.Transaction,
	*WalletLink,
	error,
) {
	if version == "v3" {
		address, tx, contract, err := v3.DeployWalletLink(auth, backend)
		return address, tx, &WalletLink{v3WalletLink: contract}, err
	} else {
		address, tx, contract, err := dev.DeployWalletLink(auth, backend)
		return address, tx, &WalletLink{devWalletLink: contract}, err
	}
}

type IWalletLink struct {
	v3IWalletLink  *v3.IWalletLink
	devIWalletLink *dev.IWalletLink
}

func NewIWalletLink(address common.Address, backend bind.ContractBackend, version config.ContractVersion) (*IWalletLink, error) {
	res := &IWalletLink{}
	if version == "v3" {
		contract, err := v3.NewIWalletLink(address, backend)
		res.v3IWalletLink = contract
		return res, err
	} else {
		contract, err := dev.NewIWalletLink(address, backend)
		res.devIWalletLink = contract
		return res, err
	}
}

func (w *IWalletLink) CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, linkedWallet common.Address) (bool, error) {
	if w.v3IWalletLink != nil {
		return w.v3IWalletLink.CheckIfLinked(opts, rootKey, linkedWallet)
	}
	return w.devIWalletLink.CheckIfLinked(opts, rootKey, linkedWallet)
}

func (w *IWalletLink) GetMetadata() *bind.MetaData {
	if w.v3IWalletLink != nil {
		return v3.IWalletLinkMetaData
	}
	return dev.IWalletLinkMetaData
}

func (w *IWalletLink) GetAbi() *abi.ABI {
	md := w.GetMetadata()
	abi, err := md.GetAbi()
	if err != nil {
		panic("Failed to parse WalletLink ABI")
	}
	return abi
}

func (w *IWalletLink) GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error) {
	if w.v3IWalletLink != nil {
		return w.v3IWalletLink.GetRootKeyForWallet(opts, wallet)
	}
	return w.devIWalletLink.GetRootKeyForWallet(opts, wallet)
}

func (w *IWalletLink) GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	if w.v3IWalletLink != nil {
		return w.v3IWalletLink.GetWalletsByRootKey(opts, rootKey)
	}
	return w.devIWalletLink.GetWalletsByRootKey(opts, rootKey)
}

func (w *IWalletLink) GetLatestNonceForRootKey(opts *bind.CallOpts, rootKey common.Address) (*big.Int, error) {
	if w.v3IWalletLink != nil {
		return w.v3IWalletLink.GetLatestNonceForRootKey(opts, rootKey)
	}
	return w.devIWalletLink.GetLatestNonceForRootKey(opts, rootKey)
}

func (w *IWalletLink) CheckIfLinkedWallet(opts *bind.CallOpts, rootKey common.Address, linkedWallet common.Address) (bool, error) {
	if w.v3IWalletLink != nil {
		return w.v3IWalletLink.CheckIfLinked(opts, rootKey, linkedWallet)
	}
	return w.devIWalletLink.CheckIfLinked(opts, rootKey, linkedWallet)
}

func (w *IWalletLink) LinkWalletToRootKey(opts *bind.TransactOpts, wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	if w.v3IWalletLink != nil {
		return w.v3IWalletLink.LinkWalletToRootKey(opts, wallet.v3(), rootWallet.v3(), nonce)
	}
	return w.devIWalletLink.LinkWalletToRootKey(opts, wallet.dev(), rootWallet.dev(), nonce)
}

type EntitlementChecker struct {
	v3EntitlementChecker  *v3.EntitlementChecker
	devEntitlementChecker *dev.EntitlementChecker
}

func DeployEntitlementChecker(auth *bind.TransactOpts, backend bind.ContractBackend, version config.ContractVersion) (common.Address, *types.Transaction, *EntitlementChecker, error) {
	if version == "v3" {
		address, tx, v3Checker, err := v3.DeployEntitlementChecker(auth, backend)
		return address, tx, &EntitlementChecker{v3EntitlementChecker: v3Checker}, err
	} else {
		address, tx, devChecker, err := dev.DeployEntitlementChecker(auth, backend)
		return address, tx, &EntitlementChecker{devEntitlementChecker: devChecker}, err
	}
}

type MockEntitlementChecker struct {
	v3MockEntitlementChecker  *v3.MockEntitlementChecker
	devMockEntitlementChecker *dev.MockEntitlementChecker
}

func DeployMockEntitlementChecker(auth *bind.TransactOpts, backend bind.ContractBackend, approvedOperators []common.Address, version config.ContractVersion) (common.Address, *types.Transaction, *MockEntitlementChecker, error) {
	if version == "v3" {
		address, tx, v3Checker, err := v3.DeployMockEntitlementChecker(auth, backend, approvedOperators)
		return address, tx, &MockEntitlementChecker{v3MockEntitlementChecker: v3Checker}, err
	} else {
		address, tx, devChecker, err := dev.DeployMockEntitlementChecker(auth, backend, approvedOperators)
		return address, tx, &MockEntitlementChecker{devMockEntitlementChecker: devChecker}, err
	}
}

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

func DeployMockEntitlementGated(auth *bind.TransactOpts, backend bind.ContractBackend, checker common.Address, version config.ContractVersion) (common.Address, *types.Transaction, *MockEntitlementGated, error) {
	if version == "v3" {
		address, tx, contract, err := v3.DeployMockEntitlementGated(auth, backend, checker)
		return address, tx, &MockEntitlementGated{v3MockEntitlementGated: contract}, err
	} else {
		address, tx, contract, err := dev.DeployMockEntitlementGated(auth, backend, checker)
		return address, tx, &MockEntitlementGated{devMockEntitlementGated: contract}, err
	}
}

func NewMockEntitlementGated(address common.Address, backend bind.ContractBackend, version config.ContractVersion) (*MockEntitlementGated, error) {
	res := &MockEntitlementGated{}
	if version == "v3" {
		contract, err := v3.NewMockEntitlementGated(address, backend)
		res.v3MockEntitlementGated = contract
		return res, err
	} else {
		contract, err := dev.NewMockEntitlementGated(address, backend)
		res.devMockEntitlementGated = contract
		return res, err
	}
}

func (g *MockEntitlementGated) EntitlementCheckResultPosted(version config.ContractVersion) IEntitlementCheckResultPosted {
	if g.v3MockEntitlementGated != nil {
		return &entitlementCheckResultPosted{&v3.IEntitlementGatedEntitlementCheckResultPosted{}, nil}
	} else {
		return &entitlementCheckResultPosted{nil, &dev.IEntitlementGatedEntitlementCheckResultPosted{}}
	}
}

func (g *MockEntitlementGated) GetMetadata() *bind.MetaData {
	if g.v3MockEntitlementGated != nil {
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

func (g *MockEntitlementGated) RequestEntitlementCheck(opts *bind.TransactOpts, roleId *big.Int, ruledata IRuleData) (*types.Transaction, error) {
	if g.v3MockEntitlementGated != nil {
		return g.v3MockEntitlementGated.RequestEntitlementCheck(opts, roleId, convertRuleDataToV3(ruledata))
	} else {
		return g.devMockEntitlementGated.RequestEntitlementCheck(opts, roleId, convertRuleDataToDev(ruledata))
	}
}

type MockCustomEntitlement struct {
	v3MockCustomEntitlement  *v3.MockCustomEntitlement
	devMockCustomEntitlement *dev.MockCustomEntitlement
}

func DeployMockCustomEntitlement(auth *bind.TransactOpts, backend bind.ContractBackend, version config.ContractVersion) (common.Address, *types.Transaction, *MockCustomEntitlement, error) {
	if version == "v3" {
		address, tx, contract, err := v3.DeployMockCustomEntitlement(auth, backend)
		return address, tx, &MockCustomEntitlement{v3MockCustomEntitlement: contract}, err
	} else {
		address, tx, contract, err := dev.DeployMockCustomEntitlement(auth, backend)
		return address, tx, &MockCustomEntitlement{devMockCustomEntitlement: contract}, err
	}
}

func NewMockCustomEntitlement(address common.Address, backend bind.ContractBackend, version config.ContractVersion) (*MockCustomEntitlement, error) {
	res := &MockCustomEntitlement{}
	if version == "v3" {
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
	if m.v3MockCustomEntitlement != nil {
		return m.v3MockCustomEntitlement.SetEntitled(opts, user, userIsEntitled)
	} else {
		return m.devMockCustomEntitlement.SetEntitled(opts, user, userIsEntitled)
	}
}

func NewIEntitlementGated(address common.Address, backend bind.ContractBackend, version config.ContractVersion) (*IEntitlementGated, error) {
	res := &IEntitlementGated{}
	if version == "v3" {
		contract, err := v3.NewIEntitlementGated(address, backend)
		res.v3IEntitlementGated = contract
		return res, err
	} else {
		contract, err := dev.NewIEntitlementGated(address, backend)
		res.devIEntitlementGated = contract
		return res, err
	}
}

func (g *IEntitlementGated) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, roleId *big.Int, result uint8) (*types.Transaction, error) {
	if g.v3IEntitlementGated != nil {
		return g.v3IEntitlementGated.PostEntitlementCheckResult(opts, transactionId, roleId, result)
	} else {
		return g.devIEntitlementGated.PostEntitlementCheckResult(opts, transactionId, roleId, result)
	}
}

func (g *IEntitlementGated) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *IEntitlementGatedEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {
	if g.v3IEntitlementGated != nil {
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

func (g *IEntitlementGated) GetRuleData(opts *bind.CallOpts, transactionId [32]byte, roleId *big.Int) (*IRuleData, error) {
	var ruleData IRuleData
	if g.v3IEntitlementGated != nil {
		v3RuleData, err := g.v3IEntitlementGated.GetRuleData(opts, transactionId, roleId)
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
		devRuleDtata, err := g.devIEntitlementGated.GetRuleData(opts, transactionId, roleId)
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

func NewICustomEntitlement(address common.Address, backend bind.ContractBackend, version config.ContractVersion) (*ICustomEntitlement, error) {
	res := &ICustomEntitlement{}
	if version == "v3" {
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
	if c.v3ICustomEntitlement != nil {
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
	if c.v3ICustomEntitlement != nil {
		return c.v3ICustomEntitlement.IsEntitled(opts, user)
	} else {
		return c.devICustomEntitlement.IsEntitled(opts, user)
	}
}

func (g *MockEntitlementGated) EntitlementGatedMetaData() *bind.MetaData {
	if g.v3MockEntitlementGated != nil {
		return v3.IEntitlementGatedMetaData
	} else {
		return dev.IEntitlementGatedMetaData
	}
}

type EntitlementGatedMetaData struct {
	v3IEntitlementGatedMetaData  *bind.MetaData
	devIEntitlementGatedMetaData *bind.MetaData
}

func NewEntitlementGatedMetaData(version config.ContractVersion) EntitlementGatedMetaData {
	if version == "v3" {
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

func NewIEntitlementChecker(address common.Address, backend bind.ContractBackend, version config.ContractVersion) (*IEntitlementChecker, error) {
	res := &IEntitlementChecker{}
	if version == "v3" {
		contract, err := v3.NewIEntitlementChecker(address, backend)
		res.v3IEntitlementChecker = contract
		return res, err
	} else {
		contract, err := dev.NewIEntitlementChecker(address, backend)
		res.devIEntitlementChecker = contract
		return res, err
	}
}

func (c *IEntitlementChecker) IsValidNode(opts *bind.CallOpts, node common.Address) (bool, error) {
	if c.v3IEntitlementChecker != nil {
		return c.v3IEntitlementChecker.IsValidNode(opts, node)
	}
	return c.devIEntitlementChecker.IsValidNode(opts, node)
}

func (c *IEntitlementChecker) GetMetadata() *bind.MetaData {
	if v3.IEntitlementCheckerMetaData != nil {
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
	RoleId() *big.Int
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

func (e *entitlementCheckRequestEvent) RoleId() *big.Int {
	if e.v3Inner != nil {
		return e.v3Inner.RoleId
	}
	return e.devInner.RoleId
}

func (e *entitlementCheckRequestEvent) Raw() interface{} {
	if e.v3Inner != nil {
		return e.v3Inner
	}
	return e.devInner

}

func (c *IEntitlementChecker) EntitlementCheckRequestEvent() IEntitlementCheckRequestEvent {
	if c.v3IEntitlementChecker != nil {
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
	if c.v3IEntitlementChecker != nil {
		return c.v3IEntitlementChecker.GetNodeCount(opts)
	} else {
		return c.devIEntitlementChecker.GetNodeCount(opts)
	}
}

func (c *IEntitlementChecker) RegisterNode(opts *bind.TransactOpts, node common.Address) (*types.Transaction, error) {
	if c.v3IEntitlementChecker != nil {
		return c.v3IEntitlementChecker.RegisterNode(opts, node)
	} else {
		return c.devIEntitlementChecker.RegisterNode(opts, node)
	}
}

func (c *IEntitlementChecker) UnregisterNode(opts *bind.TransactOpts, node common.Address) (*types.Transaction, error) {
	if c.v3IEntitlementChecker != nil {
		return c.v3IEntitlementChecker.UnregisterNode(opts, node)
	} else {
		return c.devIEntitlementChecker.UnregisterNode(opts, node)
	}
}

func (c *IEntitlementChecker) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *IEntitlementCheckerEntitlementCheckRequested, nodeAddress []common.Address) (event.Subscription, error) {
	if c.v3IEntitlementChecker != nil {
		v3Sink := make(chan *v3.IEntitlementCheckerEntitlementCheckRequested)
		sub, err := c.v3IEntitlementChecker.WatchEntitlementCheckRequested(opts, v3Sink)
		go func() {
			for v3Event := range v3Sink {
				shimEvent := convertV3ToShimCheckRequested(v3Event)
				sink <- shimEvent
			}
		}()
		return sub, err
	} else {
		devSink := make(chan *dev.IEntitlementCheckerEntitlementCheckRequested)
		sub, err := c.devIEntitlementChecker.WatchEntitlementCheckRequested(opts, devSink)
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
