// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package deploy

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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setEntitled\",\"inputs\":[{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"userIsEntitled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"}]",
	Bin: "0x608060405234801561001057600080fd5b50610317806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80633f4c4d831461003b578063ddc6e68e14610050575b600080fd5b61004e61004936600461026d565b610077565b005b61006361005e3660046102c4565b610101565b604051901515815260200160405180910390f35b60005b82518110156100fc578160008085848151811061009957610099610301565b60200260200101516040516020016100c091906001600160a01b0391909116815260200190565b60408051808303601f19018152918152815160209283012083529082019290925201600020805460ff191691151591909117905560010161007a565b505050565b6000805b825181101561018d5760008084838151811061012357610123610301565b602002602001015160405160200161014a91906001600160a01b0391909116815260200190565b60408051601f198184030181529181528151602092830120835290820192909252016000205460ff1615156001036101855750600192915050565b600101610105565b50600092915050565b634e487b7160e01b600052604160045260246000fd5b80356001600160a01b03811681146101c357600080fd5b919050565b600082601f8301126101d957600080fd5b8135602067ffffffffffffffff808311156101f6576101f6610196565b8260051b604051601f19603f8301168101818110848211171561021b5761021b610196565b604052938452602081870181019490810192508785111561023b57600080fd5b6020870191505b8482101561026257610253826101ac565b83529183019190830190610242565b979650505050505050565b6000806040838503121561028057600080fd5b823567ffffffffffffffff81111561029757600080fd5b6102a3858286016101c8565b925050602083013580151581146102b957600080fd5b809150509250929050565b6000602082840312156102d657600080fd5b813567ffffffffffffffff8111156102ed57600080fd5b6102f9848285016101c8565b949350505050565b634e487b7160e01b600052603260045260246000fd",
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
// Solidity: function isEntitled(address[] users) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementCaller) IsEntitled(opts *bind.CallOpts, users []common.Address) (bool, error) {
	var out []interface{}
	err := _MockCustomEntitlement.contract.Call(opts, &out, "isEntitled", users)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] users) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementSession) IsEntitled(users []common.Address) (bool, error) {
	return _MockCustomEntitlement.Contract.IsEntitled(&_MockCustomEntitlement.CallOpts, users)
}

// IsEntitled is a free data retrieval call binding the contract method 0xddc6e68e.
//
// Solidity: function isEntitled(address[] users) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementCallerSession) IsEntitled(users []common.Address) (bool, error) {
	return _MockCustomEntitlement.Contract.IsEntitled(&_MockCustomEntitlement.CallOpts, users)
}

// SetEntitled is a paid mutator transaction binding the contract method 0x3f4c4d83.
//
// Solidity: function setEntitled(address[] users, bool userIsEntitled) returns()
func (_MockCustomEntitlement *MockCustomEntitlementTransactor) SetEntitled(opts *bind.TransactOpts, users []common.Address, userIsEntitled bool) (*types.Transaction, error) {
	return _MockCustomEntitlement.contract.Transact(opts, "setEntitled", users, userIsEntitled)
}

// SetEntitled is a paid mutator transaction binding the contract method 0x3f4c4d83.
//
// Solidity: function setEntitled(address[] users, bool userIsEntitled) returns()
func (_MockCustomEntitlement *MockCustomEntitlementSession) SetEntitled(users []common.Address, userIsEntitled bool) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.SetEntitled(&_MockCustomEntitlement.TransactOpts, users, userIsEntitled)
}

// SetEntitled is a paid mutator transaction binding the contract method 0x3f4c4d83.
//
// Solidity: function setEntitled(address[] users, bool userIsEntitled) returns()
func (_MockCustomEntitlement *MockCustomEntitlementTransactorSession) SetEntitled(users []common.Address, userIsEntitled bool) (*types.Transaction, error) {
	return _MockCustomEntitlement.Contract.SetEntitled(&_MockCustomEntitlement.TransactOpts, users, userIsEntitled)
}
