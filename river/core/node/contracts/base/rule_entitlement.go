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

// IRuleEntitlementCheckOperation is an auto generated low-level Go binding around an user-defined struct.
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

// IRuleEntitlementOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementOperation struct {
	OpType uint8
	Index  uint8
}

// IRuleEntitlementRuleData is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementRuleData struct {
	Operations        []IRuleEntitlementOperation
	CheckOperations   []IRuleEntitlementCheckOperation
	LogicalOperations []IRuleEntitlementLogicalOperation
}

// RuleEntitlementMetaData contains all meta data concerning the RuleEntitlement contract.
var RuleEntitlementMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"description\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"encodeRuleData\",\"inputs\":[{\"name\":\"data\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"pure\"},{\"type\":\"function\",\"name\":\"getCheckOperations\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getEntitlementDataByRoleId\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLogicalOperations\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getOperations\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"data\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"initialize\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isCrosschain\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"permission\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"moduleType\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"error\",\"name\":\"CheckOperationsLimitReaced\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidCheckOperationIndex\",\"inputs\":[{\"name\":\"operationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"checkOperationsLength\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidLeftOperationIndex\",\"inputs\":[{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"currentOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidLogicalOperationIndex\",\"inputs\":[{\"name\":\"operationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"logicalOperationsLength\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidOperationType\",\"inputs\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"}]},{\"type\":\"error\",\"name\":\"InvalidRightOperationIndex\",\"inputs\":[{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"currentOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"LogicalOperationLimitReached\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"OperationsLimitReached\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
}

// RuleEntitlementABI is the input ABI used to generate the binding from.
// Deprecated: Use RuleEntitlementMetaData.ABI instead.
var RuleEntitlementABI = RuleEntitlementMetaData.ABI

// RuleEntitlement is an auto generated Go binding around an Ethereum contract.
type RuleEntitlement struct {
	RuleEntitlementCaller     // Read-only binding to the contract
	RuleEntitlementTransactor // Write-only binding to the contract
	RuleEntitlementFilterer   // Log filterer for contract events
}

// RuleEntitlementCaller is an auto generated read-only Go binding around an Ethereum contract.
type RuleEntitlementCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RuleEntitlementTransactor is an auto generated write-only Go binding around an Ethereum contract.
type RuleEntitlementTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RuleEntitlementFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type RuleEntitlementFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RuleEntitlementSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type RuleEntitlementSession struct {
	Contract     *RuleEntitlement  // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// RuleEntitlementCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type RuleEntitlementCallerSession struct {
	Contract *RuleEntitlementCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts          // Call options to use throughout this session
}

// RuleEntitlementTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type RuleEntitlementTransactorSession struct {
	Contract     *RuleEntitlementTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// RuleEntitlementRaw is an auto generated low-level Go binding around an Ethereum contract.
type RuleEntitlementRaw struct {
	Contract *RuleEntitlement // Generic contract binding to access the raw methods on
}

// RuleEntitlementCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type RuleEntitlementCallerRaw struct {
	Contract *RuleEntitlementCaller // Generic read-only contract binding to access the raw methods on
}

// RuleEntitlementTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type RuleEntitlementTransactorRaw struct {
	Contract *RuleEntitlementTransactor // Generic write-only contract binding to access the raw methods on
}

// NewRuleEntitlement creates a new instance of RuleEntitlement, bound to a specific deployed contract.
func NewRuleEntitlement(address common.Address, backend bind.ContractBackend) (*RuleEntitlement, error) {
	contract, err := bindRuleEntitlement(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlement{RuleEntitlementCaller: RuleEntitlementCaller{contract: contract}, RuleEntitlementTransactor: RuleEntitlementTransactor{contract: contract}, RuleEntitlementFilterer: RuleEntitlementFilterer{contract: contract}}, nil
}

// NewRuleEntitlementCaller creates a new read-only instance of RuleEntitlement, bound to a specific deployed contract.
func NewRuleEntitlementCaller(address common.Address, caller bind.ContractCaller) (*RuleEntitlementCaller, error) {
	contract, err := bindRuleEntitlement(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlementCaller{contract: contract}, nil
}

// NewRuleEntitlementTransactor creates a new write-only instance of RuleEntitlement, bound to a specific deployed contract.
func NewRuleEntitlementTransactor(address common.Address, transactor bind.ContractTransactor) (*RuleEntitlementTransactor, error) {
	contract, err := bindRuleEntitlement(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlementTransactor{contract: contract}, nil
}

// NewRuleEntitlementFilterer creates a new log filterer instance of RuleEntitlement, bound to a specific deployed contract.
func NewRuleEntitlementFilterer(address common.Address, filterer bind.ContractFilterer) (*RuleEntitlementFilterer, error) {
	contract, err := bindRuleEntitlement(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &RuleEntitlementFilterer{contract: contract}, nil
}

// bindRuleEntitlement binds a generic wrapper to an already deployed contract.
func bindRuleEntitlement(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := RuleEntitlementMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RuleEntitlement *RuleEntitlementRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RuleEntitlement.Contract.RuleEntitlementCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RuleEntitlement *RuleEntitlementRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.RuleEntitlementTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RuleEntitlement *RuleEntitlementRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.RuleEntitlementTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RuleEntitlement *RuleEntitlementCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RuleEntitlement.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RuleEntitlement *RuleEntitlementTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RuleEntitlement *RuleEntitlementTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.contract.Transact(opts, method, params...)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_RuleEntitlement *RuleEntitlementCaller) Description(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "description")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_RuleEntitlement *RuleEntitlementSession) Description() (string, error) {
	return _RuleEntitlement.Contract.Description(&_RuleEntitlement.CallOpts)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_RuleEntitlement *RuleEntitlementCallerSession) Description() (string, error) {
	return _RuleEntitlement.Contract.Description(&_RuleEntitlement.CallOpts)
}

// EncodeRuleData is a free data retrieval call binding the contract method 0x5d115072.
//
// Solidity: function encodeRuleData(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_RuleEntitlement *RuleEntitlementCaller) EncodeRuleData(opts *bind.CallOpts, data IRuleEntitlementRuleData) ([]byte, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "encodeRuleData", data)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// EncodeRuleData is a free data retrieval call binding the contract method 0x5d115072.
//
// Solidity: function encodeRuleData(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_RuleEntitlement *RuleEntitlementSession) EncodeRuleData(data IRuleEntitlementRuleData) ([]byte, error) {
	return _RuleEntitlement.Contract.EncodeRuleData(&_RuleEntitlement.CallOpts, data)
}

// EncodeRuleData is a free data retrieval call binding the contract method 0x5d115072.
//
// Solidity: function encodeRuleData(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_RuleEntitlement *RuleEntitlementCallerSession) EncodeRuleData(data IRuleEntitlementRuleData) ([]byte, error) {
	return _RuleEntitlement.Contract.EncodeRuleData(&_RuleEntitlement.CallOpts, data)
}

// GetCheckOperations is a free data retrieval call binding the contract method 0xe3eeace1.
//
// Solidity: function getCheckOperations(uint256 roleId) view returns((uint8,uint256,address,uint256)[])
func (_RuleEntitlement *RuleEntitlementCaller) GetCheckOperations(opts *bind.CallOpts, roleId *big.Int) ([]IRuleEntitlementCheckOperation, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "getCheckOperations", roleId)

	if err != nil {
		return *new([]IRuleEntitlementCheckOperation), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRuleEntitlementCheckOperation)).(*[]IRuleEntitlementCheckOperation)

	return out0, err

}

// GetCheckOperations is a free data retrieval call binding the contract method 0xe3eeace1.
//
// Solidity: function getCheckOperations(uint256 roleId) view returns((uint8,uint256,address,uint256)[])
func (_RuleEntitlement *RuleEntitlementSession) GetCheckOperations(roleId *big.Int) ([]IRuleEntitlementCheckOperation, error) {
	return _RuleEntitlement.Contract.GetCheckOperations(&_RuleEntitlement.CallOpts, roleId)
}

// GetCheckOperations is a free data retrieval call binding the contract method 0xe3eeace1.
//
// Solidity: function getCheckOperations(uint256 roleId) view returns((uint8,uint256,address,uint256)[])
func (_RuleEntitlement *RuleEntitlementCallerSession) GetCheckOperations(roleId *big.Int) ([]IRuleEntitlementCheckOperation, error) {
	return _RuleEntitlement.Contract.GetCheckOperations(&_RuleEntitlement.CallOpts, roleId)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_RuleEntitlement *RuleEntitlementCaller) GetEntitlementDataByRoleId(opts *bind.CallOpts, roleId *big.Int) ([]byte, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "getEntitlementDataByRoleId", roleId)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_RuleEntitlement *RuleEntitlementSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _RuleEntitlement.Contract.GetEntitlementDataByRoleId(&_RuleEntitlement.CallOpts, roleId)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_RuleEntitlement *RuleEntitlementCallerSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _RuleEntitlement.Contract.GetEntitlementDataByRoleId(&_RuleEntitlement.CallOpts, roleId)
}

// GetLogicalOperations is a free data retrieval call binding the contract method 0x545f09d3.
//
// Solidity: function getLogicalOperations(uint256 roleId) view returns((uint8,uint8,uint8)[])
func (_RuleEntitlement *RuleEntitlementCaller) GetLogicalOperations(opts *bind.CallOpts, roleId *big.Int) ([]IRuleEntitlementLogicalOperation, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "getLogicalOperations", roleId)

	if err != nil {
		return *new([]IRuleEntitlementLogicalOperation), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRuleEntitlementLogicalOperation)).(*[]IRuleEntitlementLogicalOperation)

	return out0, err

}

// GetLogicalOperations is a free data retrieval call binding the contract method 0x545f09d3.
//
// Solidity: function getLogicalOperations(uint256 roleId) view returns((uint8,uint8,uint8)[])
func (_RuleEntitlement *RuleEntitlementSession) GetLogicalOperations(roleId *big.Int) ([]IRuleEntitlementLogicalOperation, error) {
	return _RuleEntitlement.Contract.GetLogicalOperations(&_RuleEntitlement.CallOpts, roleId)
}

// GetLogicalOperations is a free data retrieval call binding the contract method 0x545f09d3.
//
// Solidity: function getLogicalOperations(uint256 roleId) view returns((uint8,uint8,uint8)[])
func (_RuleEntitlement *RuleEntitlementCallerSession) GetLogicalOperations(roleId *big.Int) ([]IRuleEntitlementLogicalOperation, error) {
	return _RuleEntitlement.Contract.GetLogicalOperations(&_RuleEntitlement.CallOpts, roleId)
}

// GetOperations is a free data retrieval call binding the contract method 0x5ad4d49e.
//
// Solidity: function getOperations(uint256 roleId) view returns((uint8,uint8)[])
func (_RuleEntitlement *RuleEntitlementCaller) GetOperations(opts *bind.CallOpts, roleId *big.Int) ([]IRuleEntitlementOperation, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "getOperations", roleId)

	if err != nil {
		return *new([]IRuleEntitlementOperation), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRuleEntitlementOperation)).(*[]IRuleEntitlementOperation)

	return out0, err

}

// GetOperations is a free data retrieval call binding the contract method 0x5ad4d49e.
//
// Solidity: function getOperations(uint256 roleId) view returns((uint8,uint8)[])
func (_RuleEntitlement *RuleEntitlementSession) GetOperations(roleId *big.Int) ([]IRuleEntitlementOperation, error) {
	return _RuleEntitlement.Contract.GetOperations(&_RuleEntitlement.CallOpts, roleId)
}

// GetOperations is a free data retrieval call binding the contract method 0x5ad4d49e.
//
// Solidity: function getOperations(uint256 roleId) view returns((uint8,uint8)[])
func (_RuleEntitlement *RuleEntitlementCallerSession) GetOperations(roleId *big.Int) ([]IRuleEntitlementOperation, error) {
	return _RuleEntitlement.Contract.GetOperations(&_RuleEntitlement.CallOpts, roleId)
}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data)
func (_RuleEntitlement *RuleEntitlementCaller) GetRuleData(opts *bind.CallOpts, roleId *big.Int) (IRuleEntitlementRuleData, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "getRuleData", roleId)

	if err != nil {
		return *new(IRuleEntitlementRuleData), err
	}

	out0 := *abi.ConvertType(out[0], new(IRuleEntitlementRuleData)).(*IRuleEntitlementRuleData)

	return out0, err

}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data)
func (_RuleEntitlement *RuleEntitlementSession) GetRuleData(roleId *big.Int) (IRuleEntitlementRuleData, error) {
	return _RuleEntitlement.Contract.GetRuleData(&_RuleEntitlement.CallOpts, roleId)
}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data)
func (_RuleEntitlement *RuleEntitlementCallerSession) GetRuleData(roleId *big.Int) (IRuleEntitlementRuleData, error) {
	return _RuleEntitlement.Contract.GetRuleData(&_RuleEntitlement.CallOpts, roleId)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_RuleEntitlement *RuleEntitlementCaller) IsCrosschain(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "isCrosschain")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_RuleEntitlement *RuleEntitlementSession) IsCrosschain() (bool, error) {
	return _RuleEntitlement.Contract.IsCrosschain(&_RuleEntitlement.CallOpts)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_RuleEntitlement *RuleEntitlementCallerSession) IsCrosschain() (bool, error) {
	return _RuleEntitlement.Contract.IsCrosschain(&_RuleEntitlement.CallOpts)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_RuleEntitlement *RuleEntitlementCaller) IsEntitled(opts *bind.CallOpts, channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "isEntitled", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_RuleEntitlement *RuleEntitlementSession) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _RuleEntitlement.Contract.IsEntitled(&_RuleEntitlement.CallOpts, channelId, user, permission)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_RuleEntitlement *RuleEntitlementCallerSession) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _RuleEntitlement.Contract.IsEntitled(&_RuleEntitlement.CallOpts, channelId, user, permission)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_RuleEntitlement *RuleEntitlementCaller) ModuleType(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "moduleType")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_RuleEntitlement *RuleEntitlementSession) ModuleType() (string, error) {
	return _RuleEntitlement.Contract.ModuleType(&_RuleEntitlement.CallOpts)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_RuleEntitlement *RuleEntitlementCallerSession) ModuleType() (string, error) {
	return _RuleEntitlement.Contract.ModuleType(&_RuleEntitlement.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_RuleEntitlement *RuleEntitlementCaller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _RuleEntitlement.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_RuleEntitlement *RuleEntitlementSession) Name() (string, error) {
	return _RuleEntitlement.Contract.Name(&_RuleEntitlement.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_RuleEntitlement *RuleEntitlementCallerSession) Name() (string, error) {
	return _RuleEntitlement.Contract.Name(&_RuleEntitlement.CallOpts)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_RuleEntitlement *RuleEntitlementTransactor) Initialize(opts *bind.TransactOpts, space common.Address) (*types.Transaction, error) {
	return _RuleEntitlement.contract.Transact(opts, "initialize", space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_RuleEntitlement *RuleEntitlementSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.Initialize(&_RuleEntitlement.TransactOpts, space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_RuleEntitlement *RuleEntitlementTransactorSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.Initialize(&_RuleEntitlement.TransactOpts, space)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_RuleEntitlement *RuleEntitlementTransactor) RemoveEntitlement(opts *bind.TransactOpts, roleId *big.Int) (*types.Transaction, error) {
	return _RuleEntitlement.contract.Transact(opts, "removeEntitlement", roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_RuleEntitlement *RuleEntitlementSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.RemoveEntitlement(&_RuleEntitlement.TransactOpts, roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_RuleEntitlement *RuleEntitlementTransactorSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.RemoveEntitlement(&_RuleEntitlement.TransactOpts, roleId)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_RuleEntitlement *RuleEntitlementTransactor) SetEntitlement(opts *bind.TransactOpts, roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _RuleEntitlement.contract.Transact(opts, "setEntitlement", roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_RuleEntitlement *RuleEntitlementSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.SetEntitlement(&_RuleEntitlement.TransactOpts, roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_RuleEntitlement *RuleEntitlementTransactorSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _RuleEntitlement.Contract.SetEntitlement(&_RuleEntitlement.TransactOpts, roleId, entitlementData)
}
