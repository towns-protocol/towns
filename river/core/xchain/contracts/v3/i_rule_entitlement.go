// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package v3

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

// IRuleEntitlementMetaData contains all meta data concerning the IRuleEntitlement contract.
var IRuleEntitlementMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"description\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getCheckOperations\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getEntitlementDataByRoleId\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLogicalOperations\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getOperations\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"data\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"initialize\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isCrosschain\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"permission\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"moduleType\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setRuleData\",\"inputs\":[{\"name\":\"data\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"pure\"},{\"type\":\"error\",\"name\":\"CheckOperationsLimitReaced\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidCheckOperationIndex\",\"inputs\":[{\"name\":\"operationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"checkOperationsLength\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidLeftOperationIndex\",\"inputs\":[{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"currentOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidLogicalOperationIndex\",\"inputs\":[{\"name\":\"operationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"logicalOperationsLength\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"InvalidOperationType\",\"inputs\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"}]},{\"type\":\"error\",\"name\":\"InvalidRightOperationIndex\",\"inputs\":[{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"currentOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"type\":\"error\",\"name\":\"LogicalOperationLimitReached\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"OperationsLimitReached\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
}

// IRuleEntitlementABI is the input ABI used to generate the binding from.
// Deprecated: Use IRuleEntitlementMetaData.ABI instead.
var IRuleEntitlementABI = IRuleEntitlementMetaData.ABI

// IRuleEntitlement is an auto generated Go binding around an Ethereum contract.
type IRuleEntitlement struct {
	IRuleEntitlementCaller     // Read-only binding to the contract
	IRuleEntitlementTransactor // Write-only binding to the contract
	IRuleEntitlementFilterer   // Log filterer for contract events
}

// IRuleEntitlementCaller is an auto generated read-only Go binding around an Ethereum contract.
type IRuleEntitlementCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IRuleEntitlementTransactor is an auto generated write-only Go binding around an Ethereum contract.
type IRuleEntitlementTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IRuleEntitlementFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type IRuleEntitlementFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IRuleEntitlementSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type IRuleEntitlementSession struct {
	Contract     *IRuleEntitlement // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// IRuleEntitlementCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type IRuleEntitlementCallerSession struct {
	Contract *IRuleEntitlementCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts           // Call options to use throughout this session
}

// IRuleEntitlementTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type IRuleEntitlementTransactorSession struct {
	Contract     *IRuleEntitlementTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts           // Transaction auth options to use throughout this session
}

// IRuleEntitlementRaw is an auto generated low-level Go binding around an Ethereum contract.
type IRuleEntitlementRaw struct {
	Contract *IRuleEntitlement // Generic contract binding to access the raw methods on
}

// IRuleEntitlementCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type IRuleEntitlementCallerRaw struct {
	Contract *IRuleEntitlementCaller // Generic read-only contract binding to access the raw methods on
}

// IRuleEntitlementTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type IRuleEntitlementTransactorRaw struct {
	Contract *IRuleEntitlementTransactor // Generic write-only contract binding to access the raw methods on
}

// NewIRuleEntitlement creates a new instance of IRuleEntitlement, bound to a specific deployed contract.
func NewIRuleEntitlement(address common.Address, backend bind.ContractBackend) (*IRuleEntitlement, error) {
	contract, err := bindIRuleEntitlement(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &IRuleEntitlement{IRuleEntitlementCaller: IRuleEntitlementCaller{contract: contract}, IRuleEntitlementTransactor: IRuleEntitlementTransactor{contract: contract}, IRuleEntitlementFilterer: IRuleEntitlementFilterer{contract: contract}}, nil
}

// NewIRuleEntitlementCaller creates a new read-only instance of IRuleEntitlement, bound to a specific deployed contract.
func NewIRuleEntitlementCaller(address common.Address, caller bind.ContractCaller) (*IRuleEntitlementCaller, error) {
	contract, err := bindIRuleEntitlement(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &IRuleEntitlementCaller{contract: contract}, nil
}

// NewIRuleEntitlementTransactor creates a new write-only instance of IRuleEntitlement, bound to a specific deployed contract.
func NewIRuleEntitlementTransactor(address common.Address, transactor bind.ContractTransactor) (*IRuleEntitlementTransactor, error) {
	contract, err := bindIRuleEntitlement(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &IRuleEntitlementTransactor{contract: contract}, nil
}

// NewIRuleEntitlementFilterer creates a new log filterer instance of IRuleEntitlement, bound to a specific deployed contract.
func NewIRuleEntitlementFilterer(address common.Address, filterer bind.ContractFilterer) (*IRuleEntitlementFilterer, error) {
	contract, err := bindIRuleEntitlement(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &IRuleEntitlementFilterer{contract: contract}, nil
}

// bindIRuleEntitlement binds a generic wrapper to an already deployed contract.
func bindIRuleEntitlement(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := IRuleEntitlementMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IRuleEntitlement *IRuleEntitlementRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IRuleEntitlement.Contract.IRuleEntitlementCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IRuleEntitlement *IRuleEntitlementRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.IRuleEntitlementTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IRuleEntitlement *IRuleEntitlementRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.IRuleEntitlementTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IRuleEntitlement *IRuleEntitlementCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IRuleEntitlement.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IRuleEntitlement *IRuleEntitlementTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IRuleEntitlement *IRuleEntitlementTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.contract.Transact(opts, method, params...)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementCaller) Description(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "description")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementSession) Description() (string, error) {
	return _IRuleEntitlement.Contract.Description(&_IRuleEntitlement.CallOpts)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) Description() (string, error) {
	return _IRuleEntitlement.Contract.Description(&_IRuleEntitlement.CallOpts)
}

// GetCheckOperations is a free data retrieval call binding the contract method 0xe3eeace1.
//
// Solidity: function getCheckOperations(uint256 roleId) view returns((uint8,uint256,address,uint256)[])
func (_IRuleEntitlement *IRuleEntitlementCaller) GetCheckOperations(opts *bind.CallOpts, roleId *big.Int) ([]IRuleEntitlementCheckOperation, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "getCheckOperations", roleId)

	if err != nil {
		return *new([]IRuleEntitlementCheckOperation), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRuleEntitlementCheckOperation)).(*[]IRuleEntitlementCheckOperation)

	return out0, err

}

// GetCheckOperations is a free data retrieval call binding the contract method 0xe3eeace1.
//
// Solidity: function getCheckOperations(uint256 roleId) view returns((uint8,uint256,address,uint256)[])
func (_IRuleEntitlement *IRuleEntitlementSession) GetCheckOperations(roleId *big.Int) ([]IRuleEntitlementCheckOperation, error) {
	return _IRuleEntitlement.Contract.GetCheckOperations(&_IRuleEntitlement.CallOpts, roleId)
}

// GetCheckOperations is a free data retrieval call binding the contract method 0xe3eeace1.
//
// Solidity: function getCheckOperations(uint256 roleId) view returns((uint8,uint256,address,uint256)[])
func (_IRuleEntitlement *IRuleEntitlementCallerSession) GetCheckOperations(roleId *big.Int) ([]IRuleEntitlementCheckOperation, error) {
	return _IRuleEntitlement.Contract.GetCheckOperations(&_IRuleEntitlement.CallOpts, roleId)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IRuleEntitlement *IRuleEntitlementCaller) GetEntitlementDataByRoleId(opts *bind.CallOpts, roleId *big.Int) ([]byte, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "getEntitlementDataByRoleId", roleId)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IRuleEntitlement *IRuleEntitlementSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _IRuleEntitlement.Contract.GetEntitlementDataByRoleId(&_IRuleEntitlement.CallOpts, roleId)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _IRuleEntitlement.Contract.GetEntitlementDataByRoleId(&_IRuleEntitlement.CallOpts, roleId)
}

// GetLogicalOperations is a free data retrieval call binding the contract method 0x545f09d3.
//
// Solidity: function getLogicalOperations(uint256 roleId) view returns((uint8,uint8,uint8)[])
func (_IRuleEntitlement *IRuleEntitlementCaller) GetLogicalOperations(opts *bind.CallOpts, roleId *big.Int) ([]IRuleEntitlementLogicalOperation, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "getLogicalOperations", roleId)

	if err != nil {
		return *new([]IRuleEntitlementLogicalOperation), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRuleEntitlementLogicalOperation)).(*[]IRuleEntitlementLogicalOperation)

	return out0, err

}

// GetLogicalOperations is a free data retrieval call binding the contract method 0x545f09d3.
//
// Solidity: function getLogicalOperations(uint256 roleId) view returns((uint8,uint8,uint8)[])
func (_IRuleEntitlement *IRuleEntitlementSession) GetLogicalOperations(roleId *big.Int) ([]IRuleEntitlementLogicalOperation, error) {
	return _IRuleEntitlement.Contract.GetLogicalOperations(&_IRuleEntitlement.CallOpts, roleId)
}

// GetLogicalOperations is a free data retrieval call binding the contract method 0x545f09d3.
//
// Solidity: function getLogicalOperations(uint256 roleId) view returns((uint8,uint8,uint8)[])
func (_IRuleEntitlement *IRuleEntitlementCallerSession) GetLogicalOperations(roleId *big.Int) ([]IRuleEntitlementLogicalOperation, error) {
	return _IRuleEntitlement.Contract.GetLogicalOperations(&_IRuleEntitlement.CallOpts, roleId)
}

// GetOperations is a free data retrieval call binding the contract method 0x5ad4d49e.
//
// Solidity: function getOperations(uint256 roleId) view returns((uint8,uint8)[])
func (_IRuleEntitlement *IRuleEntitlementCaller) GetOperations(opts *bind.CallOpts, roleId *big.Int) ([]IRuleEntitlementOperation, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "getOperations", roleId)

	if err != nil {
		return *new([]IRuleEntitlementOperation), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRuleEntitlementOperation)).(*[]IRuleEntitlementOperation)

	return out0, err

}

// GetOperations is a free data retrieval call binding the contract method 0x5ad4d49e.
//
// Solidity: function getOperations(uint256 roleId) view returns((uint8,uint8)[])
func (_IRuleEntitlement *IRuleEntitlementSession) GetOperations(roleId *big.Int) ([]IRuleEntitlementOperation, error) {
	return _IRuleEntitlement.Contract.GetOperations(&_IRuleEntitlement.CallOpts, roleId)
}

// GetOperations is a free data retrieval call binding the contract method 0x5ad4d49e.
//
// Solidity: function getOperations(uint256 roleId) view returns((uint8,uint8)[])
func (_IRuleEntitlement *IRuleEntitlementCallerSession) GetOperations(roleId *big.Int) ([]IRuleEntitlementOperation, error) {
	return _IRuleEntitlement.Contract.GetOperations(&_IRuleEntitlement.CallOpts, roleId)
}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data)
func (_IRuleEntitlement *IRuleEntitlementCaller) GetRuleData(opts *bind.CallOpts, roleId *big.Int) (IRuleEntitlementRuleData, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "getRuleData", roleId)

	if err != nil {
		return *new(IRuleEntitlementRuleData), err
	}

	out0 := *abi.ConvertType(out[0], new(IRuleEntitlementRuleData)).(*IRuleEntitlementRuleData)

	return out0, err

}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data)
func (_IRuleEntitlement *IRuleEntitlementSession) GetRuleData(roleId *big.Int) (IRuleEntitlementRuleData, error) {
	return _IRuleEntitlement.Contract.GetRuleData(&_IRuleEntitlement.CallOpts, roleId)
}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) GetRuleData(roleId *big.Int) (IRuleEntitlementRuleData, error) {
	return _IRuleEntitlement.Contract.GetRuleData(&_IRuleEntitlement.CallOpts, roleId)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IRuleEntitlement *IRuleEntitlementCaller) IsCrosschain(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "isCrosschain")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IRuleEntitlement *IRuleEntitlementSession) IsCrosschain() (bool, error) {
	return _IRuleEntitlement.Contract.IsCrosschain(&_IRuleEntitlement.CallOpts)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) IsCrosschain() (bool, error) {
	return _IRuleEntitlement.Contract.IsCrosschain(&_IRuleEntitlement.CallOpts)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_IRuleEntitlement *IRuleEntitlementCaller) IsEntitled(opts *bind.CallOpts, channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "isEntitled", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_IRuleEntitlement *IRuleEntitlementSession) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _IRuleEntitlement.Contract.IsEntitled(&_IRuleEntitlement.CallOpts, channelId, user, permission)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _IRuleEntitlement.Contract.IsEntitled(&_IRuleEntitlement.CallOpts, channelId, user, permission)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementCaller) ModuleType(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "moduleType")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementSession) ModuleType() (string, error) {
	return _IRuleEntitlement.Contract.ModuleType(&_IRuleEntitlement.CallOpts)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) ModuleType() (string, error) {
	return _IRuleEntitlement.Contract.ModuleType(&_IRuleEntitlement.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementCaller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementSession) Name() (string, error) {
	return _IRuleEntitlement.Contract.Name(&_IRuleEntitlement.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) Name() (string, error) {
	return _IRuleEntitlement.Contract.Name(&_IRuleEntitlement.CallOpts)
}

// SetRuleData is a free data retrieval call binding the contract method 0xa42bffc9.
//
// Solidity: function setRuleData(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_IRuleEntitlement *IRuleEntitlementCaller) SetRuleData(opts *bind.CallOpts, data IRuleEntitlementRuleData) ([]byte, error) {
	var out []interface{}
	err := _IRuleEntitlement.contract.Call(opts, &out, "setRuleData", data)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// SetRuleData is a free data retrieval call binding the contract method 0xa42bffc9.
//
// Solidity: function setRuleData(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_IRuleEntitlement *IRuleEntitlementSession) SetRuleData(data IRuleEntitlementRuleData) ([]byte, error) {
	return _IRuleEntitlement.Contract.SetRuleData(&_IRuleEntitlement.CallOpts, data)
}

// SetRuleData is a free data retrieval call binding the contract method 0xa42bffc9.
//
// Solidity: function setRuleData(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) data) pure returns(bytes)
func (_IRuleEntitlement *IRuleEntitlementCallerSession) SetRuleData(data IRuleEntitlementRuleData) ([]byte, error) {
	return _IRuleEntitlement.Contract.SetRuleData(&_IRuleEntitlement.CallOpts, data)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IRuleEntitlement *IRuleEntitlementTransactor) Initialize(opts *bind.TransactOpts, space common.Address) (*types.Transaction, error) {
	return _IRuleEntitlement.contract.Transact(opts, "initialize", space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IRuleEntitlement *IRuleEntitlementSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.Initialize(&_IRuleEntitlement.TransactOpts, space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IRuleEntitlement *IRuleEntitlementTransactorSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.Initialize(&_IRuleEntitlement.TransactOpts, space)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IRuleEntitlement *IRuleEntitlementTransactor) RemoveEntitlement(opts *bind.TransactOpts, roleId *big.Int) (*types.Transaction, error) {
	return _IRuleEntitlement.contract.Transact(opts, "removeEntitlement", roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IRuleEntitlement *IRuleEntitlementSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.RemoveEntitlement(&_IRuleEntitlement.TransactOpts, roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IRuleEntitlement *IRuleEntitlementTransactorSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.RemoveEntitlement(&_IRuleEntitlement.TransactOpts, roleId)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IRuleEntitlement *IRuleEntitlementTransactor) SetEntitlement(opts *bind.TransactOpts, roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IRuleEntitlement.contract.Transact(opts, "setEntitlement", roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IRuleEntitlement *IRuleEntitlementSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.SetEntitlement(&_IRuleEntitlement.TransactOpts, roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IRuleEntitlement *IRuleEntitlementTransactorSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IRuleEntitlement.Contract.SetEntitlement(&_IRuleEntitlement.TransactOpts, roleId, entitlementData)
}
