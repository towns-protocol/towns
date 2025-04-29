// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// IRuleEntitlementBaseCheckOperationV2 is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseCheckOperationV2 struct {
	OpType          uint8
	ChainId         *big.Int
	ContractAddress common.Address
	Params          []byte
}

// IRuleEntitlementBaseLogicalOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseLogicalOperation struct {
	LogOpType           uint8
	LeftOperationIndex  uint8
	RightOperationIndex uint8
}

// IRuleEntitlementBaseOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseOperation struct {
	OpType uint8
	Index  uint8
}

// IRuleEntitlementBaseRuleDataV2 is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseRuleDataV2 struct {
	Operations        []IRuleEntitlementBaseOperation
	CheckOperations   []IRuleEntitlementBaseCheckOperationV2
	LogicalOperations []IRuleEntitlementBaseLogicalOperation
}

// RuleEntitlementV2MetaData contains all meta data concerning the RuleEntitlementV2 contract.
var RuleEntitlementV2MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"description\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"encodeRuleData\",\"inputs\":[{\"name\":\"data\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"pure\"},{\"type\":\"function\",\"name\":\"getEntitlementDataByRoleId\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleDataV2\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"data\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"initialize\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isCrosschain\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"permission\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"moduleType\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"error\",\"name\":\"CheckOperationsLimitReaced\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidCheckOperationIndex\",\"inputs\":[{\"name\":\"operationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"checkOperationsLength\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidLeftOperationIndex\",\"inputs\":[{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"currentOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidLogicalOperationIndex\",\"inputs\":[{\"name\":\"operationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"logicalOperationsLength\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidOperationType\",\"inputs\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"}]},{\"type\":\"error\",\"name\":\"InvalidRightOperationIndex\",\"inputs\":[{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"currentOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"LogicalOperationLimitReached\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"OperationsLimitReached\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
}

// RuleEntitlementV2ABI is the input ABI used to generate the binding from.
// Deprecated: Use RuleEntitlementV2MetaData.ABI instead.
var RuleEntitlementV2ABI = RuleEntitlementV2MetaData.ABI

// RuleEntitlementV2 is an auto generated Go binding around an Ethereum contract.
type RuleEntitlementV2 struct {
	RuleEntitlementV2Caller     // Read-only binding to the contract
	RuleEntitlementV2Transactor // Write-only binding to the contract
	RuleEntitlementV2Filterer   // Log filterer for contract events
}

// RuleEntitlementV2Caller is an auto generated read-only Go binding around an Ethereum contract.
type RuleEntitlementV2Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RuleEntitlementV2Transactor is an auto generated write-only Go binding around an Ethereum contract.
type RuleEntitlementV2Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RuleEntitlementV2Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type RuleEntitlementV2Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RuleEntitlementV2Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type RuleEntitlementV2Session struct {
	Contract     *RuleEntitlementV2 // Generic contract binding to set the session for
	CallOpts     bind.CallOpts      // Call options to use throughout this session
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// RuleEntitlementV2CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type RuleEntitlementV2CallerSession struct {
	Contract *RuleEntitlementV2Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts            // Call options to use throughout this session
}

// RuleEntitlementV2TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type RuleEntitlementV2TransactorSession struct {
	Contract     *RuleEntitlementV2Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// RuleEntitlementV2Raw is an auto generated low-level Go binding around an Ethereum contract.
type RuleEntitlementV2Raw struct {
	Contract *RuleEntitlementV2 // Generic contract binding to access the raw methods on
}

// RuleEntitlementV2CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type RuleEntitlementV2CallerRaw struct {
	Contract *RuleEntitlementV2Caller // Generic read-only contract binding to access the raw methods on
}

// RuleEntitlementV2TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type RuleEntitlementV2TransactorRaw struct {
	Contract *RuleEntitlementV2Transactor // Generic write-only contract binding to access the raw methods on
}

// NewRuleEntitlementV2 creates a new instance of RuleEntitlementV2, bound to a specific deployed contract.
func NewRuleEntitlementV2(address common.Address, backend bind.ContractBackend) (*RuleEntitlementV2, error) {
	contract, err := bindRuleEntitlementV2(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlementV2{RuleEntitlementV2Caller: RuleEntitlementV2Caller{contract: contract}, RuleEntitlementV2Transactor: RuleEntitlementV2Transactor{contract: contract}, RuleEntitlementV2Filterer: RuleEntitlementV2Filterer{contract: contract}}, nil
}

// NewRuleEntitlementV2Caller creates a new read-only instance of RuleEntitlementV2, bound to a specific deployed contract.
func NewRuleEntitlementV2Caller(address common.Address, caller bind.ContractCaller) (*RuleEntitlementV2Caller, error) {
	contract, err := bindRuleEntitlementV2(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlementV2Caller{contract: contract}, nil
}

// NewRuleEntitlementV2Transactor creates a new write-only instance of RuleEntitlementV2, bound to a specific deployed contract.
func NewRuleEntitlementV2Transactor(address common.Address, transactor bind.ContractTransactor) (*RuleEntitlementV2Transactor, error) {
	contract, err := bindRuleEntitlementV2(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlementV2Transactor{contract: contract}, nil
}

// NewRuleEntitlementV2Filterer creates a new log filterer instance of RuleEntitlementV2, bound to a specific deployed contract.
func NewRuleEntitlementV2Filterer(address common.Address, filterer bind.ContractFilterer) (*RuleEntitlementV2Filterer, error) {
	contract, err := bindRuleEntitlementV2(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlementV2Filterer{contract: contract}, nil
}

// bindRuleEntitlementV2 binds a generic wrapper to an already deployed contract.
func bindRuleEntitlementV2(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := RuleEntitlementV2MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RuleEntitlementV2 *RuleEntitlementV2Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RuleEntitlementV2.Contract.RuleEntitlementV2Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RuleEntitlementV2 *RuleEntitlementV2Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.RuleEntitlementV2Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RuleEntitlementV2 *RuleEntitlementV2Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.RuleEntitlementV2Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RuleEntitlementV2 *RuleEntitlementV2CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RuleEntitlementV2.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RuleEntitlementV2 *RuleEntitlementV2TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RuleEntitlementV2 *RuleEntitlementV2TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.contract.Transact(opts, method, params...)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) Description(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "description")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) Description() (string, error) {
	return _RuleEntitlementV2.Contract.Description(&_RuleEntitlementV2.CallOpts)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) Description() (string, error) {
	return _RuleEntitlementV2.Contract.Description(&_RuleEntitlementV2.CallOpts)
}

// EncodeRuleData is a free data retrieval call binding the contract method 0x27bbccbc.
//
// Solidity: function encodeRuleData(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) EncodeRuleData(opts *bind.CallOpts, data IRuleEntitlementBaseRuleDataV2) ([]byte, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "encodeRuleData", data)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// EncodeRuleData is a free data retrieval call binding the contract method 0x27bbccbc.
//
// Solidity: function encodeRuleData(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) EncodeRuleData(data IRuleEntitlementBaseRuleDataV2) ([]byte, error) {
	return _RuleEntitlementV2.Contract.EncodeRuleData(&_RuleEntitlementV2.CallOpts, data)
}

// EncodeRuleData is a free data retrieval call binding the contract method 0x27bbccbc.
//
// Solidity: function encodeRuleData(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) EncodeRuleData(data IRuleEntitlementBaseRuleDataV2) ([]byte, error) {
	return _RuleEntitlementV2.Contract.EncodeRuleData(&_RuleEntitlementV2.CallOpts, data)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) GetEntitlementDataByRoleId(opts *bind.CallOpts, roleId *big.Int) ([]byte, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "getEntitlementDataByRoleId", roleId)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _RuleEntitlementV2.Contract.GetEntitlementDataByRoleId(&_RuleEntitlementV2.CallOpts, roleId)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _RuleEntitlementV2.Contract.GetEntitlementDataByRoleId(&_RuleEntitlementV2.CallOpts, roleId)
}

// GetRuleDataV2 is a free data retrieval call binding the contract method 0x68ab7dd6.
//
// Solidity: function getRuleDataV2(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) data)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) GetRuleDataV2(opts *bind.CallOpts, roleId *big.Int) (IRuleEntitlementBaseRuleDataV2, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "getRuleDataV2", roleId)

	if err != nil {
		return *new(IRuleEntitlementBaseRuleDataV2), err
	}

	out0 := *abi.ConvertType(out[0], new(IRuleEntitlementBaseRuleDataV2)).(*IRuleEntitlementBaseRuleDataV2)

	return out0, err

}

// GetRuleDataV2 is a free data retrieval call binding the contract method 0x68ab7dd6.
//
// Solidity: function getRuleDataV2(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) data)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) GetRuleDataV2(roleId *big.Int) (IRuleEntitlementBaseRuleDataV2, error) {
	return _RuleEntitlementV2.Contract.GetRuleDataV2(&_RuleEntitlementV2.CallOpts, roleId)
}

// GetRuleDataV2 is a free data retrieval call binding the contract method 0x68ab7dd6.
//
// Solidity: function getRuleDataV2(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) data)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) GetRuleDataV2(roleId *big.Int) (IRuleEntitlementBaseRuleDataV2, error) {
	return _RuleEntitlementV2.Contract.GetRuleDataV2(&_RuleEntitlementV2.CallOpts, roleId)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) IsCrosschain(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "isCrosschain")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) IsCrosschain() (bool, error) {
	return _RuleEntitlementV2.Contract.IsCrosschain(&_RuleEntitlementV2.CallOpts)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) IsCrosschain() (bool, error) {
	return _RuleEntitlementV2.Contract.IsCrosschain(&_RuleEntitlementV2.CallOpts)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) IsEntitled(opts *bind.CallOpts, channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "isEntitled", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _RuleEntitlementV2.Contract.IsEntitled(&_RuleEntitlementV2.CallOpts, channelId, user, permission)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _RuleEntitlementV2.Contract.IsEntitled(&_RuleEntitlementV2.CallOpts, channelId, user, permission)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) ModuleType(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "moduleType")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) ModuleType() (string, error) {
	return _RuleEntitlementV2.Contract.ModuleType(&_RuleEntitlementV2.CallOpts)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) ModuleType() (string, error) {
	return _RuleEntitlementV2.Contract.ModuleType(&_RuleEntitlementV2.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2Caller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _RuleEntitlementV2.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2Session) Name() (string, error) {
	return _RuleEntitlementV2.Contract.Name(&_RuleEntitlementV2.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_RuleEntitlementV2 *RuleEntitlementV2CallerSession) Name() (string, error) {
	return _RuleEntitlementV2.Contract.Name(&_RuleEntitlementV2.CallOpts)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2Transactor) Initialize(opts *bind.TransactOpts, space common.Address) (*types.Transaction, error) {
	return _RuleEntitlementV2.contract.Transact(opts, "initialize", space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2Session) Initialize(space common.Address) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.Initialize(&_RuleEntitlementV2.TransactOpts, space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2TransactorSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.Initialize(&_RuleEntitlementV2.TransactOpts, space)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2Transactor) RemoveEntitlement(opts *bind.TransactOpts, roleId *big.Int) (*types.Transaction, error) {
	return _RuleEntitlementV2.contract.Transact(opts, "removeEntitlement", roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2Session) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.RemoveEntitlement(&_RuleEntitlementV2.TransactOpts, roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2TransactorSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.RemoveEntitlement(&_RuleEntitlementV2.TransactOpts, roleId)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2Transactor) SetEntitlement(opts *bind.TransactOpts, roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _RuleEntitlementV2.contract.Transact(opts, "setEntitlement", roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2Session) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.SetEntitlement(&_RuleEntitlementV2.TransactOpts, roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_RuleEntitlementV2 *RuleEntitlementV2TransactorSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _RuleEntitlementV2.Contract.SetEntitlement(&_RuleEntitlementV2.TransactOpts, roleId, entitlementData)
}
