// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_towns_stream_registry

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

// BaseTownsStreamRegistryMetaData contains all meta data concerning the BaseTownsStreamRegistry contract.
var BaseTownsStreamRegistryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"newNodeId\",\"type\":\"string\"}],\"name\":\"addNodeToStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"newNodeIds\",\"type\":\"string[]\"}],\"name\":\"addNodesToStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"}],\"name\":\"getStreamNodes\",\"outputs\":[{\"internalType\":\"string[]\",\"name\":\"\",\"type\":\"string[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"nodeId\",\"type\":\"string\"}],\"name\":\"removeNodeFromStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"nodeId\",\"type\":\"string\"}],\"name\":\"valueExists\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// BaseTownsStreamRegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseTownsStreamRegistryMetaData.ABI instead.
var BaseTownsStreamRegistryABI = BaseTownsStreamRegistryMetaData.ABI

// BaseTownsStreamRegistry is an auto generated Go binding around an Ethereum contract.
type BaseTownsStreamRegistry struct {
	BaseTownsStreamRegistryCaller     // Read-only binding to the contract
	BaseTownsStreamRegistryTransactor // Write-only binding to the contract
	BaseTownsStreamRegistryFilterer   // Log filterer for contract events
}

// BaseTownsStreamRegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseTownsStreamRegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsStreamRegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseTownsStreamRegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsStreamRegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseTownsStreamRegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsStreamRegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseTownsStreamRegistrySession struct {
	Contract     *BaseTownsStreamRegistry // Generic contract binding to set the session for
	CallOpts     bind.CallOpts            // Call options to use throughout this session
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// BaseTownsStreamRegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseTownsStreamRegistryCallerSession struct {
	Contract *BaseTownsStreamRegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                  // Call options to use throughout this session
}

// BaseTownsStreamRegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseTownsStreamRegistryTransactorSession struct {
	Contract     *BaseTownsStreamRegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                  // Transaction auth options to use throughout this session
}

// BaseTownsStreamRegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseTownsStreamRegistryRaw struct {
	Contract *BaseTownsStreamRegistry // Generic contract binding to access the raw methods on
}

// BaseTownsStreamRegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseTownsStreamRegistryCallerRaw struct {
	Contract *BaseTownsStreamRegistryCaller // Generic read-only contract binding to access the raw methods on
}

// BaseTownsStreamRegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseTownsStreamRegistryTransactorRaw struct {
	Contract *BaseTownsStreamRegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseTownsStreamRegistry creates a new instance of BaseTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseTownsStreamRegistry(address common.Address, backend bind.ContractBackend) (*BaseTownsStreamRegistry, error) {
	contract, err := bindBaseTownsStreamRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseTownsStreamRegistry{BaseTownsStreamRegistryCaller: BaseTownsStreamRegistryCaller{contract: contract}, BaseTownsStreamRegistryTransactor: BaseTownsStreamRegistryTransactor{contract: contract}, BaseTownsStreamRegistryFilterer: BaseTownsStreamRegistryFilterer{contract: contract}}, nil
}

// NewBaseTownsStreamRegistryCaller creates a new read-only instance of BaseTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseTownsStreamRegistryCaller(address common.Address, caller bind.ContractCaller) (*BaseTownsStreamRegistryCaller, error) {
	contract, err := bindBaseTownsStreamRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsStreamRegistryCaller{contract: contract}, nil
}

// NewBaseTownsStreamRegistryTransactor creates a new write-only instance of BaseTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseTownsStreamRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseTownsStreamRegistryTransactor, error) {
	contract, err := bindBaseTownsStreamRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsStreamRegistryTransactor{contract: contract}, nil
}

// NewBaseTownsStreamRegistryFilterer creates a new log filterer instance of BaseTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseTownsStreamRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseTownsStreamRegistryFilterer, error) {
	contract, err := bindBaseTownsStreamRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseTownsStreamRegistryFilterer{contract: contract}, nil
}

// bindBaseTownsStreamRegistry binds a generic wrapper to an already deployed contract.
func bindBaseTownsStreamRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseTownsStreamRegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsStreamRegistry.Contract.BaseTownsStreamRegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.BaseTownsStreamRegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.BaseTownsStreamRegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsStreamRegistry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.contract.Transact(opts, method, params...)
}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryCaller) GetStreamNodes(opts *bind.CallOpts, streamIdHash string) ([]string, error) {
	var out []interface{}
	err := _BaseTownsStreamRegistry.contract.Call(opts, &out, "getStreamNodes", streamIdHash)

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistrySession) GetStreamNodes(streamIdHash string) ([]string, error) {
	return _BaseTownsStreamRegistry.Contract.GetStreamNodes(&_BaseTownsStreamRegistry.CallOpts, streamIdHash)
}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryCallerSession) GetStreamNodes(streamIdHash string) ([]string, error) {
	return _BaseTownsStreamRegistry.Contract.GetStreamNodes(&_BaseTownsStreamRegistry.CallOpts, streamIdHash)
}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryCaller) ValueExists(opts *bind.CallOpts, streamIdHash string, nodeId string) (bool, error) {
	var out []interface{}
	err := _BaseTownsStreamRegistry.contract.Call(opts, &out, "valueExists", streamIdHash, nodeId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistrySession) ValueExists(streamIdHash string, nodeId string) (bool, error) {
	return _BaseTownsStreamRegistry.Contract.ValueExists(&_BaseTownsStreamRegistry.CallOpts, streamIdHash, nodeId)
}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryCallerSession) ValueExists(streamIdHash string, nodeId string) (bool, error) {
	return _BaseTownsStreamRegistry.Contract.ValueExists(&_BaseTownsStreamRegistry.CallOpts, streamIdHash, nodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactor) AddNodeToStream(opts *bind.TransactOpts, streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.contract.Transact(opts, "addNodeToStream", streamIdHash, newNodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistrySession) AddNodeToStream(streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.AddNodeToStream(&_BaseTownsStreamRegistry.TransactOpts, streamIdHash, newNodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactorSession) AddNodeToStream(streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.AddNodeToStream(&_BaseTownsStreamRegistry.TransactOpts, streamIdHash, newNodeId)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactor) AddNodesToStream(opts *bind.TransactOpts, streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.contract.Transact(opts, "addNodesToStream", streamIdHash, newNodeIds)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistrySession) AddNodesToStream(streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.AddNodesToStream(&_BaseTownsStreamRegistry.TransactOpts, streamIdHash, newNodeIds)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactorSession) AddNodesToStream(streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.AddNodesToStream(&_BaseTownsStreamRegistry.TransactOpts, streamIdHash, newNodeIds)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactor) RemoveNodeFromStream(opts *bind.TransactOpts, streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.contract.Transact(opts, "removeNodeFromStream", streamIdHash, nodeId)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistrySession) RemoveNodeFromStream(streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.RemoveNodeFromStream(&_BaseTownsStreamRegistry.TransactOpts, streamIdHash, nodeId)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_BaseTownsStreamRegistry *BaseTownsStreamRegistryTransactorSession) RemoveNodeFromStream(streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _BaseTownsStreamRegistry.Contract.RemoveNodeFromStream(&_BaseTownsStreamRegistry.TransactOpts, streamIdHash, nodeId)
}
