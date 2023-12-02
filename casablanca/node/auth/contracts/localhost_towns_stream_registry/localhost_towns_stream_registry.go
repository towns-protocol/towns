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

// StreamRegistryStream is an auto generated low-level Go binding around an user-defined struct.
type StreamRegistryStream struct {
	StreamId             string
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
}

// LocalhostTownsStreamRegistryMetaData contains all meta data concerning the LocalhostTownsStreamRegistry contract.
var LocalhostTownsStreamRegistryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"streamId\",\"type\":\"string\"},{\"internalType\":\"address[]\",\"name\":\"nodes\",\"type\":\"address[]\"},{\"internalType\":\"bytes32\",\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\"}],\"internalType\":\"structStreamRegistry.Stream\",\"name\":\"newStream\",\"type\":\"tuple\"}],\"name\":\"allocateStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"errAlreadyExists\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"errNotFound\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"errOutOfBounds\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_streamId\",\"type\":\"string\"}],\"name\":\"getStream\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"streamId\",\"type\":\"string\"},{\"internalType\":\"address[]\",\"name\":\"nodes\",\"type\":\"address[]\"},{\"internalType\":\"bytes32\",\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\"}],\"internalType\":\"structStreamRegistry.Stream\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"index\",\"type\":\"uint256\"}],\"name\":\"getStreamByIndex\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"streamId\",\"type\":\"string\"},{\"internalType\":\"address[]\",\"name\":\"nodes\",\"type\":\"address[]\"},{\"internalType\":\"bytes32\",\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\"}],\"internalType\":\"structStreamRegistry.Stream\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getStreamsLength\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
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

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) ErrAlreadyExists(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "errAlreadyExists")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) ErrAlreadyExists() (string, error) {
	return _LocalhostTownsStreamRegistry.Contract.ErrAlreadyExists(&_LocalhostTownsStreamRegistry.CallOpts)
}

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) ErrAlreadyExists() (string, error) {
	return _LocalhostTownsStreamRegistry.Contract.ErrAlreadyExists(&_LocalhostTownsStreamRegistry.CallOpts)
}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) ErrNotFound(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "errNotFound")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) ErrNotFound() (string, error) {
	return _LocalhostTownsStreamRegistry.Contract.ErrNotFound(&_LocalhostTownsStreamRegistry.CallOpts)
}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) ErrNotFound() (string, error) {
	return _LocalhostTownsStreamRegistry.Contract.ErrNotFound(&_LocalhostTownsStreamRegistry.CallOpts)
}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) ErrOutOfBounds(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "errOutOfBounds")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) ErrOutOfBounds() (string, error) {
	return _LocalhostTownsStreamRegistry.Contract.ErrOutOfBounds(&_LocalhostTownsStreamRegistry.CallOpts)
}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) ErrOutOfBounds() (string, error) {
	return _LocalhostTownsStreamRegistry.Contract.ErrOutOfBounds(&_LocalhostTownsStreamRegistry.CallOpts)
}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) GetStream(opts *bind.CallOpts, _streamId string) (StreamRegistryStream, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "getStream", _streamId)

	if err != nil {
		return *new(StreamRegistryStream), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamRegistryStream)).(*StreamRegistryStream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) GetStream(_streamId string) (StreamRegistryStream, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStream(&_LocalhostTownsStreamRegistry.CallOpts, _streamId)
}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) GetStream(_streamId string) (StreamRegistryStream, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStream(&_LocalhostTownsStreamRegistry.CallOpts, _streamId)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) GetStreamByIndex(opts *bind.CallOpts, index *big.Int) (StreamRegistryStream, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "getStreamByIndex", index)

	if err != nil {
		return *new(StreamRegistryStream), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamRegistryStream)).(*StreamRegistryStream)

	return out0, err

}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) GetStreamByIndex(index *big.Int) (StreamRegistryStream, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStreamByIndex(&_LocalhostTownsStreamRegistry.CallOpts, index)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) GetStreamByIndex(index *big.Int) (StreamRegistryStream, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStreamByIndex(&_LocalhostTownsStreamRegistry.CallOpts, index)
}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCaller) GetStreamsLength(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _LocalhostTownsStreamRegistry.contract.Call(opts, &out, "getStreamsLength")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) GetStreamsLength() (*big.Int, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStreamsLength(&_LocalhostTownsStreamRegistry.CallOpts)
}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryCallerSession) GetStreamsLength() (*big.Int, error) {
	return _LocalhostTownsStreamRegistry.Contract.GetStreamsLength(&_LocalhostTownsStreamRegistry.CallOpts)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactor) AllocateStream(opts *bind.TransactOpts, newStream StreamRegistryStream) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.contract.Transact(opts, "allocateStream", newStream)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistrySession) AllocateStream(newStream StreamRegistryStream) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.AllocateStream(&_LocalhostTownsStreamRegistry.TransactOpts, newStream)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_LocalhostTownsStreamRegistry *LocalhostTownsStreamRegistryTransactorSession) AllocateStream(newStream StreamRegistryStream) (*types.Transaction, error) {
	return _LocalhostTownsStreamRegistry.Contract.AllocateStream(&_LocalhostTownsStreamRegistry.TransactOpts, newStream)
}
