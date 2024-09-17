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

// ICrossChainEntitlementParameter is an auto generated low-level Go binding around an user-defined struct.
type ICrossChainEntitlementParameter struct {
	Name        string
	Primitive   string
	Description string
}

// ICrossChainEntitlementMetaData contains all meta data concerning the ICrossChainEntitlement contract.
var ICrossChainEntitlementMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"parameters\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"parameters\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structICrossChainEntitlement.Parameter[]\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"primitive\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"description\",\"type\":\"string\",\"internalType\":\"string\"}]}],\"stateMutability\":\"view\"}]",
}

// ICrossChainEntitlementABI is the input ABI used to generate the binding from.
// Deprecated: Use ICrossChainEntitlementMetaData.ABI instead.
var ICrossChainEntitlementABI = ICrossChainEntitlementMetaData.ABI

// ICrossChainEntitlement is an auto generated Go binding around an Ethereum contract.
type ICrossChainEntitlement struct {
	ICrossChainEntitlementCaller     // Read-only binding to the contract
	ICrossChainEntitlementTransactor // Write-only binding to the contract
	ICrossChainEntitlementFilterer   // Log filterer for contract events
}

// ICrossChainEntitlementCaller is an auto generated read-only Go binding around an Ethereum contract.
type ICrossChainEntitlementCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ICrossChainEntitlementTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ICrossChainEntitlementTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ICrossChainEntitlementFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ICrossChainEntitlementFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ICrossChainEntitlementSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type ICrossChainEntitlementSession struct {
	Contract     *ICrossChainEntitlement // Generic contract binding to set the session for
	CallOpts     bind.CallOpts           // Call options to use throughout this session
	TransactOpts bind.TransactOpts       // Transaction auth options to use throughout this session
}

// ICrossChainEntitlementCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type ICrossChainEntitlementCallerSession struct {
	Contract *ICrossChainEntitlementCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                 // Call options to use throughout this session
}

// ICrossChainEntitlementTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type ICrossChainEntitlementTransactorSession struct {
	Contract     *ICrossChainEntitlementTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                 // Transaction auth options to use throughout this session
}

// ICrossChainEntitlementRaw is an auto generated low-level Go binding around an Ethereum contract.
type ICrossChainEntitlementRaw struct {
	Contract *ICrossChainEntitlement // Generic contract binding to access the raw methods on
}

// ICrossChainEntitlementCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type ICrossChainEntitlementCallerRaw struct {
	Contract *ICrossChainEntitlementCaller // Generic read-only contract binding to access the raw methods on
}

// ICrossChainEntitlementTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type ICrossChainEntitlementTransactorRaw struct {
	Contract *ICrossChainEntitlementTransactor // Generic write-only contract binding to access the raw methods on
}

// NewICrossChainEntitlement creates a new instance of ICrossChainEntitlement, bound to a specific deployed contract.
func NewICrossChainEntitlement(address common.Address, backend bind.ContractBackend) (*ICrossChainEntitlement, error) {
	contract, err := bindICrossChainEntitlement(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &ICrossChainEntitlement{ICrossChainEntitlementCaller: ICrossChainEntitlementCaller{contract: contract}, ICrossChainEntitlementTransactor: ICrossChainEntitlementTransactor{contract: contract}, ICrossChainEntitlementFilterer: ICrossChainEntitlementFilterer{contract: contract}}, nil
}

// NewICrossChainEntitlementCaller creates a new read-only instance of ICrossChainEntitlement, bound to a specific deployed contract.
func NewICrossChainEntitlementCaller(address common.Address, caller bind.ContractCaller) (*ICrossChainEntitlementCaller, error) {
	contract, err := bindICrossChainEntitlement(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ICrossChainEntitlementCaller{contract: contract}, nil
}

// NewICrossChainEntitlementTransactor creates a new write-only instance of ICrossChainEntitlement, bound to a specific deployed contract.
func NewICrossChainEntitlementTransactor(address common.Address, transactor bind.ContractTransactor) (*ICrossChainEntitlementTransactor, error) {
	contract, err := bindICrossChainEntitlement(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ICrossChainEntitlementTransactor{contract: contract}, nil
}

// NewICrossChainEntitlementFilterer creates a new log filterer instance of ICrossChainEntitlement, bound to a specific deployed contract.
func NewICrossChainEntitlementFilterer(address common.Address, filterer bind.ContractFilterer) (*ICrossChainEntitlementFilterer, error) {
	contract, err := bindICrossChainEntitlement(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ICrossChainEntitlementFilterer{contract: contract}, nil
}

// bindICrossChainEntitlement binds a generic wrapper to an already deployed contract.
func bindICrossChainEntitlement(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := ICrossChainEntitlementMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ICrossChainEntitlement *ICrossChainEntitlementRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ICrossChainEntitlement.Contract.ICrossChainEntitlementCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ICrossChainEntitlement *ICrossChainEntitlementRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ICrossChainEntitlement.Contract.ICrossChainEntitlementTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ICrossChainEntitlement *ICrossChainEntitlementRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ICrossChainEntitlement.Contract.ICrossChainEntitlementTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_ICrossChainEntitlement *ICrossChainEntitlementCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _ICrossChainEntitlement.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_ICrossChainEntitlement *ICrossChainEntitlementTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _ICrossChainEntitlement.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_ICrossChainEntitlement *ICrossChainEntitlementTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _ICrossChainEntitlement.Contract.contract.Transact(opts, method, params...)
}

// IsEntitled is a free data retrieval call binding the contract method 0x16089f65.
//
// Solidity: function isEntitled(address[] users, bytes parameters) view returns(bool)
func (_ICrossChainEntitlement *ICrossChainEntitlementCaller) IsEntitled(opts *bind.CallOpts, users []common.Address, parameters []byte) (bool, error) {
	var out []interface{}
	err := _ICrossChainEntitlement.contract.Call(opts, &out, "isEntitled", users, parameters)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0x16089f65.
//
// Solidity: function isEntitled(address[] users, bytes parameters) view returns(bool)
func (_ICrossChainEntitlement *ICrossChainEntitlementSession) IsEntitled(users []common.Address, parameters []byte) (bool, error) {
	return _ICrossChainEntitlement.Contract.IsEntitled(&_ICrossChainEntitlement.CallOpts, users, parameters)
}

// IsEntitled is a free data retrieval call binding the contract method 0x16089f65.
//
// Solidity: function isEntitled(address[] users, bytes parameters) view returns(bool)
func (_ICrossChainEntitlement *ICrossChainEntitlementCallerSession) IsEntitled(users []common.Address, parameters []byte) (bool, error) {
	return _ICrossChainEntitlement.Contract.IsEntitled(&_ICrossChainEntitlement.CallOpts, users, parameters)
}

// Parameters is a free data retrieval call binding the contract method 0x89035730.
//
// Solidity: function parameters() view returns((string,string,string)[])
func (_ICrossChainEntitlement *ICrossChainEntitlementCaller) Parameters(opts *bind.CallOpts) ([]ICrossChainEntitlementParameter, error) {
	var out []interface{}
	err := _ICrossChainEntitlement.contract.Call(opts, &out, "parameters")

	if err != nil {
		return *new([]ICrossChainEntitlementParameter), err
	}

	out0 := *abi.ConvertType(out[0], new([]ICrossChainEntitlementParameter)).(*[]ICrossChainEntitlementParameter)

	return out0, err

}

// Parameters is a free data retrieval call binding the contract method 0x89035730.
//
// Solidity: function parameters() view returns((string,string,string)[])
func (_ICrossChainEntitlement *ICrossChainEntitlementSession) Parameters() ([]ICrossChainEntitlementParameter, error) {
	return _ICrossChainEntitlement.Contract.Parameters(&_ICrossChainEntitlement.CallOpts)
}

// Parameters is a free data retrieval call binding the contract method 0x89035730.
//
// Solidity: function parameters() view returns((string,string,string)[])
func (_ICrossChainEntitlement *ICrossChainEntitlementCallerSession) Parameters() ([]ICrossChainEntitlementParameter, error) {
	return _ICrossChainEntitlement.Contract.Parameters(&_ICrossChainEntitlement.CallOpts)
}
