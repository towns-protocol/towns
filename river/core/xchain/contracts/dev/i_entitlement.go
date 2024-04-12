// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package dev

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

// IEntitlementMetaData contains all meta data concerning the IEntitlement contract.
var IEntitlementMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"description\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getEntitlementDataByRoleId\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"initialize\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isCrosschain\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"permission\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"moduleType\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]}]",
}

// IEntitlementABI is the input ABI used to generate the binding from.
// Deprecated: Use IEntitlementMetaData.ABI instead.
var IEntitlementABI = IEntitlementMetaData.ABI

// IEntitlement is an auto generated Go binding around an Ethereum contract.
type IEntitlement struct {
	IEntitlementCaller     // Read-only binding to the contract
	IEntitlementTransactor // Write-only binding to the contract
	IEntitlementFilterer   // Log filterer for contract events
}

// IEntitlementCaller is an auto generated read-only Go binding around an Ethereum contract.
type IEntitlementCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlementTransactor is an auto generated write-only Go binding around an Ethereum contract.
type IEntitlementTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlementFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type IEntitlementFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlementSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type IEntitlementSession struct {
	Contract     *IEntitlement     // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// IEntitlementCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type IEntitlementCallerSession struct {
	Contract *IEntitlementCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts       // Call options to use throughout this session
}

// IEntitlementTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type IEntitlementTransactorSession struct {
	Contract     *IEntitlementTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts       // Transaction auth options to use throughout this session
}

// IEntitlementRaw is an auto generated low-level Go binding around an Ethereum contract.
type IEntitlementRaw struct {
	Contract *IEntitlement // Generic contract binding to access the raw methods on
}

// IEntitlementCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type IEntitlementCallerRaw struct {
	Contract *IEntitlementCaller // Generic read-only contract binding to access the raw methods on
}

// IEntitlementTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type IEntitlementTransactorRaw struct {
	Contract *IEntitlementTransactor // Generic write-only contract binding to access the raw methods on
}

// NewIEntitlement creates a new instance of IEntitlement, bound to a specific deployed contract.
func NewIEntitlement(address common.Address, backend bind.ContractBackend) (*IEntitlement, error) {
	contract, err := bindIEntitlement(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &IEntitlement{IEntitlementCaller: IEntitlementCaller{contract: contract}, IEntitlementTransactor: IEntitlementTransactor{contract: contract}, IEntitlementFilterer: IEntitlementFilterer{contract: contract}}, nil
}

// NewIEntitlementCaller creates a new read-only instance of IEntitlement, bound to a specific deployed contract.
func NewIEntitlementCaller(address common.Address, caller bind.ContractCaller) (*IEntitlementCaller, error) {
	contract, err := bindIEntitlement(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &IEntitlementCaller{contract: contract}, nil
}

// NewIEntitlementTransactor creates a new write-only instance of IEntitlement, bound to a specific deployed contract.
func NewIEntitlementTransactor(address common.Address, transactor bind.ContractTransactor) (*IEntitlementTransactor, error) {
	contract, err := bindIEntitlement(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &IEntitlementTransactor{contract: contract}, nil
}

// NewIEntitlementFilterer creates a new log filterer instance of IEntitlement, bound to a specific deployed contract.
func NewIEntitlementFilterer(address common.Address, filterer bind.ContractFilterer) (*IEntitlementFilterer, error) {
	contract, err := bindIEntitlement(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &IEntitlementFilterer{contract: contract}, nil
}

// bindIEntitlement binds a generic wrapper to an already deployed contract.
func bindIEntitlement(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := IEntitlementMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IEntitlement *IEntitlementRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IEntitlement.Contract.IEntitlementCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IEntitlement *IEntitlementRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IEntitlement.Contract.IEntitlementTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IEntitlement *IEntitlementRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IEntitlement.Contract.IEntitlementTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IEntitlement *IEntitlementCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IEntitlement.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IEntitlement *IEntitlementTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IEntitlement.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IEntitlement *IEntitlementTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IEntitlement.Contract.contract.Transact(opts, method, params...)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IEntitlement *IEntitlementCaller) Description(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IEntitlement.contract.Call(opts, &out, "description")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IEntitlement *IEntitlementSession) Description() (string, error) {
	return _IEntitlement.Contract.Description(&_IEntitlement.CallOpts)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IEntitlement *IEntitlementCallerSession) Description() (string, error) {
	return _IEntitlement.Contract.Description(&_IEntitlement.CallOpts)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IEntitlement *IEntitlementCaller) GetEntitlementDataByRoleId(opts *bind.CallOpts, roleId *big.Int) ([]byte, error) {
	var out []interface{}
	err := _IEntitlement.contract.Call(opts, &out, "getEntitlementDataByRoleId", roleId)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IEntitlement *IEntitlementSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _IEntitlement.Contract.GetEntitlementDataByRoleId(&_IEntitlement.CallOpts, roleId)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IEntitlement *IEntitlementCallerSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _IEntitlement.Contract.GetEntitlementDataByRoleId(&_IEntitlement.CallOpts, roleId)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IEntitlement *IEntitlementCaller) IsCrosschain(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _IEntitlement.contract.Call(opts, &out, "isCrosschain")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IEntitlement *IEntitlementSession) IsCrosschain() (bool, error) {
	return _IEntitlement.Contract.IsCrosschain(&_IEntitlement.CallOpts)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IEntitlement *IEntitlementCallerSession) IsCrosschain() (bool, error) {
	return _IEntitlement.Contract.IsCrosschain(&_IEntitlement.CallOpts)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_IEntitlement *IEntitlementCaller) IsEntitled(opts *bind.CallOpts, channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	var out []interface{}
	err := _IEntitlement.contract.Call(opts, &out, "isEntitled", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_IEntitlement *IEntitlementSession) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _IEntitlement.Contract.IsEntitled(&_IEntitlement.CallOpts, channelId, user, permission)
}

// IsEntitled is a free data retrieval call binding the contract method 0x0cf0b533.
//
// Solidity: function isEntitled(bytes32 channelId, address[] user, bytes32 permission) view returns(bool)
func (_IEntitlement *IEntitlementCallerSession) IsEntitled(channelId [32]byte, user []common.Address, permission [32]byte) (bool, error) {
	return _IEntitlement.Contract.IsEntitled(&_IEntitlement.CallOpts, channelId, user, permission)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IEntitlement *IEntitlementCaller) ModuleType(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IEntitlement.contract.Call(opts, &out, "moduleType")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IEntitlement *IEntitlementSession) ModuleType() (string, error) {
	return _IEntitlement.Contract.ModuleType(&_IEntitlement.CallOpts)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IEntitlement *IEntitlementCallerSession) ModuleType() (string, error) {
	return _IEntitlement.Contract.ModuleType(&_IEntitlement.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IEntitlement *IEntitlementCaller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IEntitlement.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IEntitlement *IEntitlementSession) Name() (string, error) {
	return _IEntitlement.Contract.Name(&_IEntitlement.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IEntitlement *IEntitlementCallerSession) Name() (string, error) {
	return _IEntitlement.Contract.Name(&_IEntitlement.CallOpts)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IEntitlement *IEntitlementTransactor) Initialize(opts *bind.TransactOpts, space common.Address) (*types.Transaction, error) {
	return _IEntitlement.contract.Transact(opts, "initialize", space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IEntitlement *IEntitlementSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _IEntitlement.Contract.Initialize(&_IEntitlement.TransactOpts, space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IEntitlement *IEntitlementTransactorSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _IEntitlement.Contract.Initialize(&_IEntitlement.TransactOpts, space)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IEntitlement *IEntitlementTransactor) RemoveEntitlement(opts *bind.TransactOpts, roleId *big.Int) (*types.Transaction, error) {
	return _IEntitlement.contract.Transact(opts, "removeEntitlement", roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IEntitlement *IEntitlementSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _IEntitlement.Contract.RemoveEntitlement(&_IEntitlement.TransactOpts, roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IEntitlement *IEntitlementTransactorSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _IEntitlement.Contract.RemoveEntitlement(&_IEntitlement.TransactOpts, roleId)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IEntitlement *IEntitlementTransactor) SetEntitlement(opts *bind.TransactOpts, roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IEntitlement.contract.Transact(opts, "setEntitlement", roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IEntitlement *IEntitlementSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IEntitlement.Contract.SetEntitlement(&_IEntitlement.TransactOpts, roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IEntitlement *IEntitlementTransactorSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IEntitlement.Contract.SetEntitlement(&_IEntitlement.TransactOpts, roleId, entitlementData)
}
