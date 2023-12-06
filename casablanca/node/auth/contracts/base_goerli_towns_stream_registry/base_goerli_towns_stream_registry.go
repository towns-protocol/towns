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

// StreamRegistryStream is an auto generated low-level Go binding around an user-defined struct.
type StreamRegistryStream struct {
	StreamId             string
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
}

// BaseGoerliTownsStreamRegistryMetaData contains all meta data concerning the BaseGoerliTownsStreamRegistry contract.
var BaseGoerliTownsStreamRegistryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"streamId\",\"type\":\"string\"},{\"internalType\":\"address[]\",\"name\":\"nodes\",\"type\":\"address[]\"},{\"internalType\":\"bytes32\",\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\"}],\"internalType\":\"structStreamRegistry.Stream\",\"name\":\"newStream\",\"type\":\"tuple\"}],\"name\":\"allocateStream\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"errAlreadyExists\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"errNotFound\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"errOutOfBounds\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_streamId\",\"type\":\"string\"}],\"name\":\"getStream\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"streamId\",\"type\":\"string\"},{\"internalType\":\"address[]\",\"name\":\"nodes\",\"type\":\"address[]\"},{\"internalType\":\"bytes32\",\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\"}],\"internalType\":\"structStreamRegistry.Stream\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"index\",\"type\":\"uint256\"}],\"name\":\"getStreamByIndex\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"streamId\",\"type\":\"string\"},{\"internalType\":\"address[]\",\"name\":\"nodes\",\"type\":\"address[]\"},{\"internalType\":\"bytes32\",\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\"}],\"internalType\":\"structStreamRegistry.Stream\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getStreamsLength\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
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

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) ErrAlreadyExists(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "errAlreadyExists")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) ErrAlreadyExists() (string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ErrAlreadyExists(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) ErrAlreadyExists() (string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ErrAlreadyExists(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) ErrNotFound(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "errNotFound")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) ErrNotFound() (string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ErrNotFound(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) ErrNotFound() (string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ErrNotFound(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) ErrOutOfBounds(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "errOutOfBounds")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) ErrOutOfBounds() (string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ErrOutOfBounds(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) ErrOutOfBounds() (string, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.ErrOutOfBounds(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) GetStream(opts *bind.CallOpts, _streamId string) (StreamRegistryStream, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "getStream", _streamId)

	if err != nil {
		return *new(StreamRegistryStream), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamRegistryStream)).(*StreamRegistryStream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) GetStream(_streamId string) (StreamRegistryStream, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStream(&_BaseGoerliTownsStreamRegistry.CallOpts, _streamId)
}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) GetStream(_streamId string) (StreamRegistryStream, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStream(&_BaseGoerliTownsStreamRegistry.CallOpts, _streamId)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) GetStreamByIndex(opts *bind.CallOpts, index *big.Int) (StreamRegistryStream, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "getStreamByIndex", index)

	if err != nil {
		return *new(StreamRegistryStream), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamRegistryStream)).(*StreamRegistryStream)

	return out0, err

}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) GetStreamByIndex(index *big.Int) (StreamRegistryStream, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStreamByIndex(&_BaseGoerliTownsStreamRegistry.CallOpts, index)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) GetStreamByIndex(index *big.Int) (StreamRegistryStream, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStreamByIndex(&_BaseGoerliTownsStreamRegistry.CallOpts, index)
}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCaller) GetStreamsLength(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _BaseGoerliTownsStreamRegistry.contract.Call(opts, &out, "getStreamsLength")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) GetStreamsLength() (*big.Int, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStreamsLength(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryCallerSession) GetStreamsLength() (*big.Int, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.GetStreamsLength(&_BaseGoerliTownsStreamRegistry.CallOpts)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactor) AllocateStream(opts *bind.TransactOpts, newStream StreamRegistryStream) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.contract.Transact(opts, "allocateStream", newStream)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistrySession) AllocateStream(newStream StreamRegistryStream) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.AllocateStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, newStream)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_BaseGoerliTownsStreamRegistry *BaseGoerliTownsStreamRegistryTransactorSession) AllocateStream(newStream StreamRegistryStream) (*types.Transaction, error) {
	return _BaseGoerliTownsStreamRegistry.Contract.AllocateStream(&_BaseGoerliTownsStreamRegistry.TransactOpts, newStream)
}
