// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_towns_stream_registry

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

// LocalhostTownsStreamRegistryMetaData contains all meta data concerning the LocalhostTownsStreamRegistry contract.
var LocalhostTownsStreamRegistryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"newNodeId\",\"type\":\"string\"}],\"name\":\"addNodeToStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"newNodeIds\",\"type\":\"string[]\"}],\"name\":\"addNodesToStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"}],\"name\":\"getStreamNodes\",\"outputs\":[{\"internalType\":\"string[]\",\"name\":\"\",\"type\":\"string[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"nodeId\",\"type\":\"string\"}],\"name\":\"removeNodeFromStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"nodeId\",\"type\":\"string\"}],\"name\":\"valueExists\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// LocalhostTownsStreamRegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostTownsStreamRegistryMetaData.ABI instead.
var LocalhostTownsStreamRegistryABI = LocalhostTownsStreamRegistryMetaData.ABI

// LocalhostTownsStreamRegistry is an auto generated Go binding around an Ethereum contract.
type LocalhostTownsStreamRegistry struct {
	LocalhostTownsStreamRegistryCaller     // Read-only binding to the contract
	LocalhostTownsStreamRegistryTransactor // Write-only binding to the contract
	LocalhostTownsStreamRegistryFilterer   // Log filterer for contract events
}

// LocalhostTownsStreamRegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostTownsStreamRegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsStreamRegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostTownsStreamRegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsStreamRegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostTownsStreamRegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsStreamRegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostTownsStreamRegistrySession struct {
	Contract     *LocalhostTownsStreamRegistry // Generic contract binding to set the session for
	CallOpts     bind.CallOpts                 // Call options to use throughout this session
	TransactOpts bind.TransactOpts             // Transaction auth options to use throughout this session
}

// LocalhostTownsStreamRegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostTownsStreamRegistryCallerSession struct {
	Contract *LocalhostTownsStreamRegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                       // Call options to use throughout this session
}

// LocalhostTownsStreamRegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostTownsStreamRegistryTransactorSession struct {
	Contract     *LocalhostTownsStreamRegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                       // Transaction auth options to use throughout this session
}

// LocalhostTownsStreamRegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostTownsStreamRegistryRaw struct {
	Contract *LocalhostTownsStreamRegistry // Generic contract binding to access the raw methods on
}

// LocalhostTownsStreamRegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostTownsStreamRegistryCallerRaw struct {
	Contract *LocalhostTownsStreamRegistryCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostTownsStreamRegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostTownsStreamRegistryTransactorRaw struct {
	Contract *LocalhostTownsStreamRegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostTownsStreamRegistry creates a new instance of LocalhostTownsStreamRegistry, bound to a specific deployed contract.
func NewLocalhostTownsStreamRegistry(address common.Address, backend bind.ContractBackend) (*LocalhostTownsStreamRegistry, error) {
	contract, err := bindLocalhostTownsStreamRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsStreamRegistry{LocalhostTownsStreamRegistryCaller: LocalhostTownsStreamRegistryCaller{contract: contract}, LocalhostTownsStreamRegistryTransactor: LocalhostTownsStreamRegistryTransactor{contract: contract}, LocalhostTownsStreamRegistryFilterer: LocalhostTownsStreamRegistryFilterer{contract: contract}}, nil
}

// NewLocalhostTownsStreamRegistryCaller creates a new read-only instance of LocalhostTownsStreamRegistry, bound to a specific deployed contract.
func NewLocalhostTownsStreamRegistryCaller(address common.Address, caller bind.ContractCaller) (*LocalhostTownsStreamRegistryCaller, error) {
	contract, err := bindLocalhostTownsStreamRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsStreamRegistryCaller{contract: contract}, nil
}

// NewLocalhostTownsStreamRegistryTransactor creates a new write-only instance of LocalhostTownsStreamRegistry, bound to a specific deployed contract.
func NewLocalhostTownsStreamRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostTownsStreamRegistryTransactor, error) {
	contract, err := bindLocalhostTownsStreamRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsStreamRegistryTransactor{contract: contract}, nil
}

// NewLocalhostTownsStreamRegistryFilterer creates a new log filterer instance of LocalhostTownsStreamRegistry, bound to a specific deployed contract.
func NewLocalhostTownsStreamRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostTownsStreamRegistryFilterer, error) {
	contract, err := bindLocalhostTownsStreamRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsStreamRegistryFilterer{contract: contract}, nil
}

// bindLocalhostTownsStreamRegistry binds a generic wrapper to an already deployed contract.
func bindLocalhostTownsStreamRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LocalhostTownsStreamRegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsStreamRegistry.Contract.LocalhostTownsStreamRegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.LocalhostTownsStreamRegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.LocalhostTownsStreamRegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsStreamRegistry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.contract.Transact(opts, method, params...)
}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) GetStreamNodes(opts *bind.CallOpts, streamIdHash string) ([]string, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "getStreamNodes", streamIdHash)

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) GetStreamNodes(streamIdHash string) ([]string, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStreamNodes(&_LocalhostTownsStreamRegistry.CallOpts, streamIdHash)
}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) GetStreamNodes(streamIdHash string) ([]string, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStreamNodes(&_LocalhostTownsStreamRegistry.CallOpts, streamIdHash)
}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) ValueExists(opts *bind.CallOpts, streamIdHash string, nodeId string) (bool, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "valueExists", streamIdHash, nodeId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) ValueExists(streamIdHash string, nodeId string) (bool, error) {
	return _LocalhostTownsStreamRegistry.Contract.ValueExists(&_LocalhostTownsStreamRegistry.CallOpts, streamIdHash, nodeId)
}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) ValueExists(streamIdHash string, nodeId string) (bool, error) {
	return _LocalhostTownsStreamRegistry.Contract.ValueExists(&_LocalhostTownsStreamRegistry.CallOpts, streamIdHash, nodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactor) AddNodeToStream(opts *bind.TransactOpts, streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.contract.Transact(opts, "addNodeToStream", streamIdHash, newNodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) AddNodeToStream(streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.AddNodeToStream(&_LocalhostTownsStreamRegistry.TransactOpts, streamIdHash, newNodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactorSession) AddNodeToStream(streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.AddNodeToStream(&_LocalhostTownsStreamRegistry.TransactOpts, streamIdHash, newNodeId)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactor) AddNodesToStream(opts *bind.TransactOpts, streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.contract.Transact(opts, "addNodesToStream", streamIdHash, newNodeIds)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) AddNodesToStream(streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.AddNodesToStream(&_LocalhostTownsStreamRegistry.TransactOpts, streamIdHash, newNodeIds)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactorSession) AddNodesToStream(streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.AddNodesToStream(&_LocalhostTownsStreamRegistry.TransactOpts, streamIdHash, newNodeIds)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactor) RemoveNodeFromStream(opts *bind.TransactOpts, streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.contract.Transact(opts, "removeNodeFromStream", streamIdHash, nodeId)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) RemoveNodeFromStream(streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.RemoveNodeFromStream(&_LocalhostTownsStreamRegistry.TransactOpts, streamIdHash, nodeId)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactorSession) RemoveNodeFromStream(streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.RemoveNodeFromStream(&_LocalhostTownsStreamRegistry.TransactOpts, streamIdHash, nodeId)
}
