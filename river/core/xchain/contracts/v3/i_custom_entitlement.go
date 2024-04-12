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

// ICustomEntitlementMetaData contains all meta data concerning the ICustomEntitlement contract.
var ICustomEntitlementMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"}]",
}

// ICustomEntitlementABI is the input ABI used to generate the binding from.
// Deprecated: Use ICustomEntitlementMetaData.ABI instead.
var ICustomEntitlementABI = ICustomEntitlementMetaData.ABI

// ICustomEntitlement is an auto generated Go binding around an Ethereum contract.
type ICustomEntitlement struct {
	ICustomEntitlementCaller     // Read-only binding to the contract
	ICustomEntitlementTransactor // Write-only binding to the contract
	ICustomEntitlementFilterer   // Log filterer for contract events
}

// ICustomEntitlementCaller is an auto generated read-only Go binding around an Ethereum contract.
type ICustomEntitlementCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ICustomEntitlementTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ICustomEntitlementTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ICustomEntitlementFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ICustomEntitlementFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ICustomEntitlementSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type ICustomEntitlementSession struct {
	Contract     *ICustomEntitlement // Generic contract binding to set the session for
	CallOpts     bind.CallOpts       // Call options to use throughout this session
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// ICustomEntitlementCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type ICustomEntitlementCallerSession struct {
	Contract *ICustomEntitlementCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts             // Call options to use throughout this session
}

// ICustomEntitlementTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type ICustomEntitlementTransactorSession struct {
	Contract     *ICustomEntitlementTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts             // Transaction auth options to use throughout this session
}

// ICustomEntitlementRaw is an auto generated low-level Go binding around an Ethereum contract.
type ICustomEntitlementRaw struct {
	Contract *ICustomEntitlement // Generic contract binding to access the raw methods on
}

// ICustomEntitlementCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type ICustomEntitlementCallerRaw struct {
	Contract *ICustomEntitlementCaller // Generic read-only contract binding to access the raw methods on
}

// ICustomEntitlementTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type ICustomEntitlementTransactorRaw struct {
	Contract *ICustomEntitlementTransactor // Generic write-only contract binding to access the raw methods on
}

// NewICustomEntitlement creates a new instance of ICustomEntitlement, bound to a specific deployed contract.
func NewICustomEntitlement(address common.Address, backend bind.ContractBackend) (*ICustomEntitlement, error) {
	contract, err := bindICustomEntitlement(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &ICustomEntitlement{ICustomEntitlementCaller: ICustomEntitlementCaller{contract: contract}, ICustomEntitlementTransactor: ICustomEntitlementTransactor{contract: contract}, ICustomEntitlementFilterer: ICustomEntitlementFilterer{contract: contract}}, nil
}

// NewICustomEntitlementCaller creates a new read-only instance of ICustomEntitlement, bound to a specific deployed contract.
func NewICustomEntitlementCaller(address common.Address, caller bind.ContractCaller) (*ICustomEntitlementCaller, error) {
	contract, err := bindICustomEntitlement(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ICustomEntitlementCaller{contract: contract}, nil
}

// NewICustomEntitlementTransactor creates a new write-only instance of ICustomEntitlement, bound to a specific deployed contract.
func NewICustomEntitlementTransactor(address common.Address, transactor bind.ContractTransactor) (*ICustomEntitlementTransactor, error) {
	contract, err := bindICustomEntitlement(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ICustomEntitlementTransactor{contract: contract}, nil
}

// NewICustomEntitlementFilterer creates a new log filterer instance of ICustomEntitlement, bound to a specific deployed contract.
func NewICustomEntitlementFilterer(address common.Address, filterer bind.ContractFilterer) (*ICustomEntitlementFilterer, error) {
	contract, err := bindICustomEntitlement(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ICustomEntitlementFilterer{contract: contract}, nil
}

// bindICustomEntitlement binds a generic wrapper to an already deployed contract.
func bindICustomEntitlement(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := ICustomEntitlementMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ICustomEntitlement *ICustomEntitlementRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ICustomEntitlement.Contract.ICustomEntitlementCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ICustomEntitlement *ICustomEntitlementRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ICustomEntitlement.Contract.ICustomEntitlementTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ICustomEntitlement *ICustomEntitlementRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ICustomEntitlement.Contract.ICustomEntitlementTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ICustomEntitlement *ICustomEntitlementCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ICustomEntitlement.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ICustomEntitlement *ICustomEntitlementTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ICustomEntitlement.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ICustomEntitlement *ICustomEntitlementTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ICustomEntitlement.Contract.contract.Transact(opts, method, params...)
}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] user) view returns(bool)
func (_ICustomEntitlement *ICustomEntitlementCaller) IsEntitled(opts *bind.CallOpts, user []common.Address) (bool, error) {
	var out []interface{}
	err := _ICustomEntitlement.contract.Call(opts, &out, "isEntitled", user)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] user) view returns(bool)
func (_ICustomEntitlement *ICustomEntitlementSession) IsEntitled(user []common.Address) (bool, error) {
	return _ICustomEntitlement.Contract.IsEntitled(&_ICustomEntitlement.CallOpts, user)
}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] user) view returns(bool)
func (_ICustomEntitlement *ICustomEntitlementCallerSession) IsEntitled(user []common.Address) (bool, error) {
	return _ICustomEntitlement.Contract.IsEntitled(&_ICustomEntitlement.CallOpts, user)
}
