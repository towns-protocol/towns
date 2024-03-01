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

// IEntitlmentMetaData contains all meta data concerning the IEntitlment contract.
var IEntitlmentMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"description\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getEntitlementDataByRoleId\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"initialize\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isCrosschain\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"permission\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"moduleType\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]}]",
}

// IEntitlmentABI is the input ABI used to generate the binding from.
// Deprecated: Use IEntitlmentMetaData.ABI instead.
var IEntitlmentABI = IEntitlmentMetaData.ABI

// IEntitlment is an auto generated Go binding around an Ethereum contract.
type IEntitlment struct {
	IEntitlmentCaller     // Read-only binding to the contract
	IEntitlmentTransactor // Write-only binding to the contract
	IEntitlmentFilterer   // Log filterer for contract events
}

// IEntitlmentCaller is an auto generated read-only Go binding around an Ethereum contract.
type IEntitlmentCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlmentTransactor is an auto generated write-only Go binding around an Ethereum contract.
type IEntitlmentTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlmentFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type IEntitlmentFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlmentSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type IEntitlmentSession struct {
	Contract     *IEntitlment      // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// IEntitlmentCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type IEntitlmentCallerSession struct {
	Contract *IEntitlmentCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts      // Call options to use throughout this session
}

// IEntitlmentTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type IEntitlmentTransactorSession struct {
	Contract     *IEntitlmentTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// IEntitlmentRaw is an auto generated low-level Go binding around an Ethereum contract.
type IEntitlmentRaw struct {
	Contract *IEntitlment // Generic contract binding to access the raw methods on
}

// IEntitlmentCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type IEntitlmentCallerRaw struct {
	Contract *IEntitlmentCaller // Generic read-only contract binding to access the raw methods on
}

// IEntitlmentTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type IEntitlmentTransactorRaw struct {
	Contract *IEntitlmentTransactor // Generic write-only contract binding to access the raw methods on
}

// NewIEntitlment creates a new instance of IEntitlment, bound to a specific deployed contract.
func NewIEntitlment(address common.Address, backend bind.ContractBackend) (*IEntitlment, error) {
	contract, err := bindIEntitlment(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &IEntitlment{IEntitlmentCaller: IEntitlmentCaller{contract: contract}, IEntitlmentTransactor: IEntitlmentTransactor{contract: contract}, IEntitlmentFilterer: IEntitlmentFilterer{contract: contract}}, nil
}

// NewIEntitlmentCaller creates a new read-only instance of IEntitlment, bound to a specific deployed contract.
func NewIEntitlmentCaller(address common.Address, caller bind.ContractCaller) (*IEntitlmentCaller, error) {
	contract, err := bindIEntitlment(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &IEntitlmentCaller{contract: contract}, nil
}

// NewIEntitlmentTransactor creates a new write-only instance of IEntitlment, bound to a specific deployed contract.
func NewIEntitlmentTransactor(address common.Address, transactor bind.ContractTransactor) (*IEntitlmentTransactor, error) {
	contract, err := bindIEntitlment(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &IEntitlmentTransactor{contract: contract}, nil
}

// NewIEntitlmentFilterer creates a new log filterer instance of IEntitlment, bound to a specific deployed contract.
func NewIEntitlmentFilterer(address common.Address, filterer bind.ContractFilterer) (*IEntitlmentFilterer, error) {
	contract, err := bindIEntitlment(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &IEntitlmentFilterer{contract: contract}, nil
}

// bindIEntitlment binds a generic wrapper to an already deployed contract.
func bindIEntitlment(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := IEntitlmentMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IEntitlment *IEntitlmentRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IEntitlment.Contract.IEntitlmentCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IEntitlment *IEntitlmentRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IEntitlment.Contract.IEntitlmentTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IEntitlment *IEntitlmentRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IEntitlment.Contract.IEntitlmentTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IEntitlment *IEntitlmentCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IEntitlment.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IEntitlment *IEntitlmentTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IEntitlment.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IEntitlment *IEntitlmentTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IEntitlment.Contract.contract.Transact(opts, method, params...)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IEntitlment *IEntitlmentCaller) Description(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IEntitlment.contract.Call(opts, &out, "description")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IEntitlment *IEntitlmentSession) Description() (string, error) {
	return _IEntitlment.Contract.Description(&_IEntitlment.CallOpts)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_IEntitlment *IEntitlmentCallerSession) Description() (string, error) {
	return _IEntitlment.Contract.Description(&_IEntitlment.CallOpts)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IEntitlment *IEntitlmentCaller) GetEntitlementDataByRoleId(opts *bind.CallOpts, roleId *big.Int) ([]byte, error) {
	var out []interface{}
	err := _IEntitlment.contract.Call(opts, &out, "getEntitlementDataByRoleId", roleId)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IEntitlment *IEntitlmentSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _IEntitlment.Contract.GetEntitlementDataByRoleId(&_IEntitlment.CallOpts, roleId)
}

// GetEntitlementDataByRoleId is a free data retrieval call binding the contract method 0x1eee07b2.
//
// Solidity: function getEntitlementDataByRoleId(uint256 roleId) view returns(bytes)
func (_IEntitlment *IEntitlmentCallerSession) GetEntitlementDataByRoleId(roleId *big.Int) ([]byte, error) {
	return _IEntitlment.Contract.GetEntitlementDataByRoleId(&_IEntitlment.CallOpts, roleId)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IEntitlment *IEntitlmentCaller) IsCrosschain(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _IEntitlment.contract.Call(opts, &out, "isCrosschain")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IEntitlment *IEntitlmentSession) IsCrosschain() (bool, error) {
	return _IEntitlment.Contract.IsCrosschain(&_IEntitlment.CallOpts)
}

// IsCrosschain is a free data retrieval call binding the contract method 0x2e1b61e4.
//
// Solidity: function isCrosschain() view returns(bool)
func (_IEntitlment *IEntitlmentCallerSession) IsCrosschain() (bool, error) {
	return _IEntitlment.Contract.IsCrosschain(&_IEntitlment.CallOpts)
}

// IsEntitled is a free data retrieval call binding the contract method 0xa7b72871.
//
// Solidity: function isEntitled(string channelId, address[] user, bytes32 permission) view returns(bool)
func (_IEntitlment *IEntitlmentCaller) IsEntitled(opts *bind.CallOpts, channelId string, user []common.Address, permission [32]byte) (bool, error) {
	var out []interface{}
	err := _IEntitlment.contract.Call(opts, &out, "isEntitled", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0xa7b72871.
//
// Solidity: function isEntitled(string channelId, address[] user, bytes32 permission) view returns(bool)
func (_IEntitlment *IEntitlmentSession) IsEntitled(channelId string, user []common.Address, permission [32]byte) (bool, error) {
	return _IEntitlment.Contract.IsEntitled(&_IEntitlment.CallOpts, channelId, user, permission)
}

// IsEntitled is a free data retrieval call binding the contract method 0xa7b72871.
//
// Solidity: function isEntitled(string channelId, address[] user, bytes32 permission) view returns(bool)
func (_IEntitlment *IEntitlmentCallerSession) IsEntitled(channelId string, user []common.Address, permission [32]byte) (bool, error) {
	return _IEntitlment.Contract.IsEntitled(&_IEntitlment.CallOpts, channelId, user, permission)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IEntitlment *IEntitlmentCaller) ModuleType(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IEntitlment.contract.Call(opts, &out, "moduleType")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IEntitlment *IEntitlmentSession) ModuleType() (string, error) {
	return _IEntitlment.Contract.ModuleType(&_IEntitlment.CallOpts)
}

// ModuleType is a free data retrieval call binding the contract method 0x6465e69f.
//
// Solidity: function moduleType() view returns(string)
func (_IEntitlment *IEntitlmentCallerSession) ModuleType() (string, error) {
	return _IEntitlment.Contract.ModuleType(&_IEntitlment.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IEntitlment *IEntitlmentCaller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _IEntitlment.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IEntitlment *IEntitlmentSession) Name() (string, error) {
	return _IEntitlment.Contract.Name(&_IEntitlment.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_IEntitlment *IEntitlmentCallerSession) Name() (string, error) {
	return _IEntitlment.Contract.Name(&_IEntitlment.CallOpts)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IEntitlment *IEntitlmentTransactor) Initialize(opts *bind.TransactOpts, space common.Address) (*types.Transaction, error) {
	return _IEntitlment.contract.Transact(opts, "initialize", space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IEntitlment *IEntitlmentSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _IEntitlment.Contract.Initialize(&_IEntitlment.TransactOpts, space)
}

// Initialize is a paid mutator transaction binding the contract method 0xc4d66de8.
//
// Solidity: function initialize(address space) returns()
func (_IEntitlment *IEntitlmentTransactorSession) Initialize(space common.Address) (*types.Transaction, error) {
	return _IEntitlment.Contract.Initialize(&_IEntitlment.TransactOpts, space)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IEntitlment *IEntitlmentTransactor) RemoveEntitlement(opts *bind.TransactOpts, roleId *big.Int) (*types.Transaction, error) {
	return _IEntitlment.contract.Transact(opts, "removeEntitlement", roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IEntitlment *IEntitlmentSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _IEntitlment.Contract.RemoveEntitlement(&_IEntitlment.TransactOpts, roleId)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xf0c111f9.
//
// Solidity: function removeEntitlement(uint256 roleId) returns()
func (_IEntitlment *IEntitlmentTransactorSession) RemoveEntitlement(roleId *big.Int) (*types.Transaction, error) {
	return _IEntitlment.Contract.RemoveEntitlement(&_IEntitlment.TransactOpts, roleId)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IEntitlment *IEntitlmentTransactor) SetEntitlement(opts *bind.TransactOpts, roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IEntitlment.contract.Transact(opts, "setEntitlement", roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IEntitlment *IEntitlmentSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IEntitlment.Contract.SetEntitlement(&_IEntitlment.TransactOpts, roleId, entitlementData)
}

// SetEntitlement is a paid mutator transaction binding the contract method 0xef8be574.
//
// Solidity: function setEntitlement(uint256 roleId, bytes entitlementData) returns()
func (_IEntitlment *IEntitlmentTransactorSession) SetEntitlement(roleId *big.Int, entitlementData []byte) (*types.Transaction, error) {
	return _IEntitlment.Contract.SetEntitlement(&_IEntitlment.TransactOpts, roleId, entitlementData)
}
