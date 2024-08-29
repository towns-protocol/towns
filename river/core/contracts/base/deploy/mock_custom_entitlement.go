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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setEntitled\",\"inputs\":[{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"userIsEntitled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"}]",
	Bin: "0x608060405234801561001057600080fd5b50610377806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c806301ffc9a7146100465780633f4c4d831461007e578063ddc6e68e14610093575b600080fd5b61006a6100543660046101c5565b6001600160e01b031916636ee3734760e11b1490565b604051901515815260200160405180910390f35b61009161008c3660046102cd565b6100a6565b005b61006a6100a1366004610324565b610130565b60005b825181101561012b57816000808584815181106100c8576100c8610361565b60200260200101516040516020016100ef91906001600160a01b0391909116815260200190565b60408051808303601f19018152918152815160209283012083529082019290925201600020805460ff19169115159190911790556001016100a9565b505050565b6000805b82518110156101bc5760008084838151811061015257610152610361565b602002602001015160405160200161017991906001600160a01b0391909116815260200190565b60408051601f198184030181529181528151602092830120835290820192909252016000205460ff1615156001036101b45750600192915050565b600101610134565b50600092915050565b6000602082840312156101d757600080fd5b81356001600160e01b0319811681146101ef57600080fd5b9392505050565b634e487b7160e01b600052604160045260246000fd5b80356001600160a01b038116811461022357600080fd5b919050565b600082601f83011261023957600080fd5b8135602067ffffffffffffffff80831115610256576102566101f6565b8260051b604051601f19603f8301168101818110848211171561027b5761027b6101f6565b604052938452602081870181019490810192508785111561029b57600080fd5b6020870191505b848210156102c2576102b38261020c565b835291830191908301906102a2565b979650505050505050565b600080604083850312156102e057600080fd5b823567ffffffffffffffff8111156102f757600080fd5b61030385828601610228565b9250506020830135801515811461031957600080fd5b809150509250929050565b60006020828403121561033657600080fd5b813567ffffffffffffffff81111561034d57600080fd5b61035984828501610228565b949350505050565b634e487b7160e01b600052603260045260246000fd",
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

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementCaller) SupportsInterface(opts *bind.CallOpts, interfaceId [4]byte) (bool, error) {
	var out []interface{}
	err := _MockCustomEntitlement.contract.Call(opts, &out, "supportsInterface", interfaceId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementSession) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockCustomEntitlement.Contract.SupportsInterface(&_MockCustomEntitlement.CallOpts, interfaceId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockCustomEntitlement *MockCustomEntitlementCallerSession) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockCustomEntitlement.Contract.SupportsInterface(&_MockCustomEntitlement.CallOpts, interfaceId)
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
