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

// MockCustomEntitlementMetaData contains all meta data concerning the MockCustomEntitlement contract.
var MockCustomEntitlementMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setEntitled\",\"inputs\":[{\"name\":\"user\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"userIsEntitled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"}]",
	Bin: "0x608060405234801561001057600080fd5b506102c1806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80633f4c4d831461003b578063ddc6e68e14610050575b600080fd5b61004e6100493660046101e0565b610077565b005b61006361005e366004610237565b6100c4565b604051901515815260200160405180910390f35b806000808460405160200161008c9190610274565b60408051808303601f19018152918152815160209283012083529082019290925201600020805460ff19169115159190911790555050565b6000806000836040516020016100da9190610274565b60408051601f198184030181529181528151602092830120835290820192909252016000205460ff1692915050565b634e487b7160e01b600052604160045260246000fd5b80356001600160a01b038116811461013657600080fd5b919050565b600082601f83011261014c57600080fd5b8135602067ffffffffffffffff8083111561016957610169610109565b8260051b604051601f19603f8301168101818110848211171561018e5761018e610109565b60405293845260208187018101949081019250878511156101ae57600080fd5b6020870191505b848210156101d5576101c68261011f565b835291830191908301906101b5565b979650505050505050565b600080604083850312156101f357600080fd5b823567ffffffffffffffff81111561020a57600080fd5b6102168582860161013b565b9250506020830135801515811461022c57600080fd5b809150509250929050565b60006020828403121561024957600080fd5b813567ffffffffffffffff81111561026057600080fd5b61026c8482850161013b565b949350505050565b6020808252825182820181905260009190848201906040850190845b818110156102b55783516001600160a01b031683529284019291840191600101610290565b5090969550505050505056",
}

// MockCustomEntitlementABI is the input ABI used to generate the binding from.
// Deprecated: Use MockCustomEntitlementMetaData.ABI instead.
var MockCustomEntitlementABI = MockCustomEntitlementMetaData.ABI

// MockCustomEntitlementBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockCustomEntitlementMetaData.Bin instead.
var MockCustomEntitlementBin = MockCustomEntitlementMetaData.Bin

// DeployMockCustomEntitlement deploys a new Ethereum contract, binding an instance of MockCustomEntitlement to it.
func DeployMockCustomEntitlement(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *MockCustomEntitlement, error) {
	parsed, err := MockCustomEntitlementMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockCustomEntitlementBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockCustomEntitlement{MockCustomEntitlementCaller: MockCustomEntitlementCaller{contract: contract}, MockCustomEntitlementTransactor: MockCustomEntitlementTransactor{contract: contract}, MockCustomEntitlementFilterer: MockCustomEntitlementFilterer{contract: contract}}, nil
}

// MockCustomEntitlement is an auto generated Go binding around an Ethereum contract.
type MockCustomEntitlement struct {
	MockCustomEntitlementCaller     // Read-only binding to the contract
	MockCustomEntitlementTransactor // Write-only binding to the contract
	MockCustomEntitlementFilterer   // Log filterer for contract events
}

// MockCustomEntitlementCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockCustomEntitlementCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockCustomEntitlementTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockCustomEntitlementTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockCustomEntitlementFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockCustomEntitlementFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockCustomEntitlementSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockCustomEntitlementSession struct {
	Contract     *MockCustomEntitlement // Generic contract binding to set the session for
	CallOpts     bind.CallOpts          // Call options to use throughout this session
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// MockCustomEntitlementCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockCustomEntitlementCallerSession struct {
	Contract *MockCustomEntitlementCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                // Call options to use throughout this session
}

// MockCustomEntitlementTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockCustomEntitlementTransactorSession struct {
	Contract     *MockCustomEntitlementTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                // Transaction auth options to use throughout this session
}

// MockCustomEntitlementRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockCustomEntitlementRaw struct {
	Contract *MockCustomEntitlement // Generic contract binding to access the raw methods on
}

// MockCustomEntitlementCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockCustomEntitlementCallerRaw struct {
	Contract *MockCustomEntitlementCaller // Generic read-only contract binding to access the raw methods on
}

// MockCustomEntitlementTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockCustomEntitlementTransactorRaw struct {
	Contract *MockCustomEntitlementTransactor // Generic write-only contract binding to access the raw methods on
}

// NewMockCustomEntitlement creates a new instance of MockCustomEntitlement, bound to a specific deployed contract.
func NewMockCustomEntitlement(address common.Address, backend bind.ContractBackend) (*MockCustomEntitlement, error) {
	contract, err := bindMockCustomEntitlement(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockCustomEntitlement{MockCustomEntitlementCaller: MockCustomEntitlementCaller{contract: contract}, MockCustomEntitlementTransactor: MockCustomEntitlementTransactor{contract: contract}, MockCustomEntitlementFilterer: MockCustomEntitlementFilterer{contract: contract}}, nil
}

// NewMockCustomEntitlementCaller creates a new read-only instance of MockCustomEntitlement, bound to a specific deployed contract.
func NewMockCustomEntitlementCaller(address common.Address, caller bind.ContractCaller) (*MockCustomEntitlementCaller, error) {
	contract, err := bindMockCustomEntitlement(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockCustomEntitlementCaller{contract: contract}, nil
}

// NewMockCustomEntitlementTransactor creates a new write-only instance of MockCustomEntitlement, bound to a specific deployed contract.
func NewMockCustomEntitlementTransactor(address common.Address, transactor bind.ContractTransactor) (*MockCustomEntitlementTransactor, error) {
	contract, err := bindMockCustomEntitlement(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockCustomEntitlementTransactor{contract: contract}, nil
}

// NewMockCustomEntitlementFilterer creates a new log filterer instance of MockCustomEntitlement, bound to a specific deployed contract.
func NewMockCustomEntitlementFilterer(address common.Address, filterer bind.ContractFilterer) (*MockCustomEntitlementFilterer, error) {
	contract, err := bindMockCustomEntitlement(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockCustomEntitlementFilterer{contract: contract}, nil
}

// bindMockCustomEntitlement binds a generic wrapper to an already deployed contract.
func bindMockCustomEntitlement(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockCustomEntitlementMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockCustomEntitlement *MockCustomEntitlementRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockCustomEntitlement.Contract.MockCustomEntitlementCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockCustomEntitlement *MockCustomEntitlementRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.MockCustomEntitlementTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockCustomEntitlement *MockCustomEntitlementRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.MockCustomEntitlementTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockCustomEntitlement *MockCustomEntitlementCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockCustomEntitlement.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockCustomEntitlement *MockCustomEntitlementTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockCustomEntitlement *MockCustomEntitlementTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.contract.Transact(opts, method, params...)
}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] user) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementCaller) IsEntitled(opts *bind.CallOpts, user []common.Address) (bool, error) {
	var out []interface{}
	err := _MockCustomEntitlement.contract.Call(opts, &out, "isEntitled", user)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] user) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementSession) IsEntitled(user []common.Address) (bool, error) {
	return _MockCustomEntitlement.Contract.IsEntitled(&_MockCustomEntitlement.CallOpts, user)
}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] user) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementCallerSession) IsEntitled(user []common.Address) (bool, error) {
	return _MockCustomEntitlement.Contract.IsEntitled(&_MockCustomEntitlement.CallOpts, user)
}

// SetEntitled is a paid mutator transaction binding the contract method 0x3f4c4d83.
//
// Solidity: function setEntitled(address[] user, bool userIsEntitled) returns()
func (_MockCustomEntitlement *MockCustomEntitlementTransactor) SetEntitled(opts *bind.TransactOpts, user []common.Address, userIsEntitled bool) (*types.Transaction, error) {
	return _MockCustomEntitlement.contract.Transact(opts, "setEntitled", user, userIsEntitled)
}

// SetEntitled is a paid mutator transaction binding the contract method 0x3f4c4d83.
//
// Solidity: function setEntitled(address[] user, bool userIsEntitled) returns()
func (_MockCustomEntitlement *MockCustomEntitlementSession) SetEntitled(user []common.Address, userIsEntitled bool) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.SetEntitled(&_MockCustomEntitlement.TransactOpts, user, userIsEntitled)
}

// SetEntitled is a paid mutator transaction binding the contract method 0x3f4c4d83.
//
// Solidity: function setEntitled(address[] user, bool userIsEntitled) returns()
func (_MockCustomEntitlement *MockCustomEntitlementTransactorSession) SetEntitled(user []common.Address, userIsEntitled bool) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.SetEntitled(&_MockCustomEntitlement.TransactOpts, user, userIsEntitled)
}
