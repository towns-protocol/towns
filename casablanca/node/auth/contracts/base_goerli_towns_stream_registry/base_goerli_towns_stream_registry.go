// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_goerli_towns_stream_registry

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

// BaseGoerliTownsStreamRegistryMetaData contains all meta data concerning the BaseGoerliTownsStreamRegistry contract.
var BaseGoerliTownsStreamRegistryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"newNodeId\",\"type\":\"string\"}],\"name\":\"addNodeToStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"newNodeIds\",\"type\":\"string[]\"}],\"name\":\"addNodesToStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"}],\"name\":\"getStreamNodes\",\"outputs\":[{\"internalType\":\"string[]\",\"name\":\"\",\"type\":\"string[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"nodeId\",\"type\":\"string\"}],\"name\":\"removeNodeFromStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"streamIdHash\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"nodeId\",\"type\":\"string\"}],\"name\":\"valueExists\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// BaseGoerliTownsStreamRegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseGoerliTownsStreamRegistryMetaData.ABI instead.
var BaseGoerliTownsStreamRegistryABI = BaseGoerliTownsStreamRegistryMetaData.ABI

// BaseGoerliTownsStreamRegistry is an auto generated Go binding around an Ethereum contract.
type BaseGoerliTownsStreamRegistry struct {
	BaseGoerliTownsStreamRegistryCaller     // Read-only binding to the contract
	BaseGoerliTownsStreamRegistryTransactor // Write-only binding to the contract
	BaseGoerliTownsStreamRegistryFilterer   // Log filterer for contract events
}

// BaseGoerliTownsStreamRegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseGoerliTownsStreamRegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsStreamRegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseGoerliTownsStreamRegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsStreamRegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseGoerliTownsStreamRegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsStreamRegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseGoerliTownsStreamRegistrySession struct {
	Contract     *BaseGoerliTownsStreamRegistry // Generic contract binding to set the session for
	CallOpts     bind.CallOpts                  // Call options to use throughout this session
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// BaseGoerliTownsStreamRegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseGoerliTownsStreamRegistryCallerSession struct {
	Contract *BaseGoerliTownsStreamRegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                        // Call options to use throughout this session
}

// BaseGoerliTownsStreamRegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseGoerliTownsStreamRegistryTransactorSession struct {
	Contract     *BaseGoerliTownsStreamRegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                        // Transaction auth options to use throughout this session
}

// BaseGoerliTownsStreamRegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseGoerliTownsStreamRegistryRaw struct {
	Contract *BaseGoerliTownsStreamRegistry // Generic contract binding to access the raw methods on
}

// BaseGoerliTownsStreamRegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseGoerliTownsStreamRegistryCallerRaw struct {
	Contract *BaseGoerliTownsStreamRegistryCaller // Generic read-only contract binding to access the raw methods on
}

// BaseGoerliTownsStreamRegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseGoerliTownsStreamRegistryTransactorRaw struct {
	Contract *BaseGoerliTownsStreamRegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseGoerliTownsStreamRegistry creates a new instance of BaseGoerliTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseGoerliTownsStreamRegistry(address common.Address, backend bind.ContractBackend) (*BaseGoerliTownsStreamRegistry, error) {
	contract, err := bindBaseGoerliTownsStreamRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsStreamRegistry{BaseGoerliTownsStreamRegistryCaller: BaseGoerliTownsStreamRegistryCaller{contract: contract}, BaseGoerliTownsStreamRegistryTransactor: BaseGoerliTownsStreamRegistryTransactor{contract: contract}, BaseGoerliTownsStreamRegistryFilterer: BaseGoerliTownsStreamRegistryFilterer{contract: contract}}, nil
}

// NewBaseGoerliTownsStreamRegistryCaller creates a new read-only instance of BaseGoerliTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseGoerliTownsStreamRegistryCaller(address common.Address, caller bind.ContractCaller) (*BaseGoerliTownsStreamRegistryCaller, error) {
	contract, err := bindBaseGoerliTownsStreamRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsStreamRegistryCaller{contract: contract}, nil
}

// NewBaseGoerliTownsStreamRegistryTransactor creates a new write-only instance of BaseGoerliTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseGoerliTownsStreamRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseGoerliTownsStreamRegistryTransactor, error) {
	contract, err := bindBaseGoerliTownsStreamRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsStreamRegistryTransactor{contract: contract}, nil
}

// NewBaseGoerliTownsStreamRegistryFilterer creates a new log filterer instance of BaseGoerliTownsStreamRegistry, bound to a specific deployed contract.
func NewBaseGoerliTownsStreamRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseGoerliTownsStreamRegistryFilterer, error) {
	contract, err := bindBaseGoerliTownsStreamRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsStreamRegistryFilterer{contract: contract}, nil
}

// bindBaseGoerliTownsStreamRegistry binds a generic wrapper to an already deployed contract.
func bindBaseGoerliTownsStreamRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseGoerliTownsStreamRegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsStreamRegistry.Contract.BaseGoerliTownsStreamRegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.BaseGoerliTownsStreamRegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.BaseGoerliTownsStreamRegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsStreamRegistry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.contract.Transact(opts, method, params...)
}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) GetStreamNodes(opts *bind.CallOpts, streamIdHash string) ([]string, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "getStreamNodes", streamIdHash)

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) GetStreamNodes(streamIdHash string) ([]string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStreamNodes(&_BaseGoerliTownsStreamRegistry.CallOpts, streamIdHash)
}

// GetStreamNodes is a free data retrieval call binding the contract method 0x4bb7481b.
//
// Solidity: function getStreamNodes(string streamIdHash) view returns(string[])
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) GetStreamNodes(streamIdHash string) ([]string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStreamNodes(&_BaseGoerliTownsStreamRegistry.CallOpts, streamIdHash)
}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) ValueExists(opts *bind.CallOpts, streamIdHash string, nodeId string) (bool, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "valueExists", streamIdHash, nodeId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) ValueExists(streamIdHash string, nodeId string) (bool, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ValueExists(&_BaseGoerliTownsStreamRegistry.CallOpts, streamIdHash, nodeId)
}

// ValueExists is a free data retrieval call binding the contract method 0xef7eb93e.
//
// Solidity: function valueExists(string streamIdHash, string nodeId) view returns(bool)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) ValueExists(streamIdHash string, nodeId string) (bool, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ValueExists(&_BaseGoerliTownsStreamRegistry.CallOpts, streamIdHash, nodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactor) AddNodeToStream(opts *bind.TransactOpts, streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.contract.Transact(opts, "addNodeToStream", streamIdHash, newNodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) AddNodeToStream(streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.AddNodeToStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, streamIdHash, newNodeId)
}

// AddNodeToStream is a paid mutator transaction binding the contract method 0x74469214.
//
// Solidity: function addNodeToStream(string streamIdHash, string newNodeId) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactorSession) AddNodeToStream(streamIdHash string, newNodeId string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.AddNodeToStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, streamIdHash, newNodeId)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactor) AddNodesToStream(opts *bind.TransactOpts, streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.contract.Transact(opts, "addNodesToStream", streamIdHash, newNodeIds)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) AddNodesToStream(streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.AddNodesToStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, streamIdHash, newNodeIds)
}

// AddNodesToStream is a paid mutator transaction binding the contract method 0xd0481c6c.
//
// Solidity: function addNodesToStream(string streamIdHash, string[] newNodeIds) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactorSession) AddNodesToStream(streamIdHash string, newNodeIds []string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.AddNodesToStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, streamIdHash, newNodeIds)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactor) RemoveNodeFromStream(opts *bind.TransactOpts, streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.contract.Transact(opts, "removeNodeFromStream", streamIdHash, nodeId)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) RemoveNodeFromStream(streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.RemoveNodeFromStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, streamIdHash, nodeId)
}

// RemoveNodeFromStream is a paid mutator transaction binding the contract method 0xa21c1252.
//
// Solidity: function removeNodeFromStream(string streamIdHash, string nodeId) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactorSession) RemoveNodeFromStream(streamIdHash string, nodeId string) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.RemoveNodeFromStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, streamIdHash, nodeId)
}
