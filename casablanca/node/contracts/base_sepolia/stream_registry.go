// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_sepolia

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

// StreamRegistryMetaData contains all meta data concerning the StreamRegistry contract.
var StreamRegistryMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"newStream\",\"type\":\"tuple\",\"internalType\":\"structStreamRegistry.Stream\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"errAlreadyExists\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"errNotFound\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"errOutOfBounds\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"_streamId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStreamRegistry.Stream\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamByIndex\",\"inputs\":[{\"name\":\"index\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStreamRegistry.Stream\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamsLength\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"}]",
}

// StreamRegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use StreamRegistryMetaData.ABI instead.
var StreamRegistryABI = StreamRegistryMetaData.ABI

// StreamRegistry is an auto generated Go binding around an Ethereum contract.
type StreamRegistry struct {
	StreamRegistryCaller     // Read-only binding to the contract
	StreamRegistryTransactor // Write-only binding to the contract
	StreamRegistryFilterer   // Log filterer for contract events
}

// StreamRegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type StreamRegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// StreamRegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type StreamRegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// StreamRegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type StreamRegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// StreamRegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type StreamRegistrySession struct {
	Contract     *StreamRegistry   // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// StreamRegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type StreamRegistryCallerSession struct {
	Contract *StreamRegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts         // Call options to use throughout this session
}

// StreamRegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type StreamRegistryTransactorSession struct {
	Contract     *StreamRegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts         // Transaction auth options to use throughout this session
}

// StreamRegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type StreamRegistryRaw struct {
	Contract *StreamRegistry // Generic contract binding to access the raw methods on
}

// StreamRegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type StreamRegistryCallerRaw struct {
	Contract *StreamRegistryCaller // Generic read-only contract binding to access the raw methods on
}

// StreamRegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type StreamRegistryTransactorRaw struct {
	Contract *StreamRegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewStreamRegistry creates a new instance of StreamRegistry, bound to a specific deployed contract.
func NewStreamRegistry(address common.Address, backend bind.ContractBackend) (*StreamRegistry, error) {
	contract, err := bindStreamRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &StreamRegistry{StreamRegistryCaller: StreamRegistryCaller{contract: contract}, StreamRegistryTransactor: StreamRegistryTransactor{contract: contract}, StreamRegistryFilterer: StreamRegistryFilterer{contract: contract}}, nil
}

// NewStreamRegistryCaller creates a new read-only instance of StreamRegistry, bound to a specific deployed contract.
func NewStreamRegistryCaller(address common.Address, caller bind.ContractCaller) (*StreamRegistryCaller, error) {
	contract, err := bindStreamRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryCaller{contract: contract}, nil
}

// NewStreamRegistryTransactor creates a new write-only instance of StreamRegistry, bound to a specific deployed contract.
func NewStreamRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*StreamRegistryTransactor, error) {
	contract, err := bindStreamRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryTransactor{contract: contract}, nil
}

// NewStreamRegistryFilterer creates a new log filterer instance of StreamRegistry, bound to a specific deployed contract.
func NewStreamRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*StreamRegistryFilterer, error) {
	contract, err := bindStreamRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryFilterer{contract: contract}, nil
}

// bindStreamRegistry binds a generic wrapper to an already deployed contract.
func bindStreamRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := StreamRegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_StreamRegistry *StreamRegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _StreamRegistry.Contract.StreamRegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_StreamRegistry *StreamRegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _StreamRegistry.Contract.StreamRegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_StreamRegistry *StreamRegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _StreamRegistry.Contract.StreamRegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_StreamRegistry *StreamRegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _StreamRegistry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_StreamRegistry *StreamRegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _StreamRegistry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_StreamRegistry *StreamRegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _StreamRegistry.Contract.contract.Transact(opts, method, params...)
}

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_StreamRegistry *StreamRegistryCaller) ErrAlreadyExists(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _StreamRegistry.contract.Call(opts, &out, "errAlreadyExists")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_StreamRegistry *StreamRegistrySession) ErrAlreadyExists() (string, error) {
	return _StreamRegistry.Contract.ErrAlreadyExists(&_StreamRegistry.CallOpts)
}

// ErrAlreadyExists is a free data retrieval call binding the contract method 0xd16248f9.
//
// Solidity: function errAlreadyExists() view returns(string)
func (_StreamRegistry *StreamRegistryCallerSession) ErrAlreadyExists() (string, error) {
	return _StreamRegistry.Contract.ErrAlreadyExists(&_StreamRegistry.CallOpts)
}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_StreamRegistry *StreamRegistryCaller) ErrNotFound(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _StreamRegistry.contract.Call(opts, &out, "errNotFound")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_StreamRegistry *StreamRegistrySession) ErrNotFound() (string, error) {
	return _StreamRegistry.Contract.ErrNotFound(&_StreamRegistry.CallOpts)
}

// ErrNotFound is a free data retrieval call binding the contract method 0xd2bc97d6.
//
// Solidity: function errNotFound() view returns(string)
func (_StreamRegistry *StreamRegistryCallerSession) ErrNotFound() (string, error) {
	return _StreamRegistry.Contract.ErrNotFound(&_StreamRegistry.CallOpts)
}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_StreamRegistry *StreamRegistryCaller) ErrOutOfBounds(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _StreamRegistry.contract.Call(opts, &out, "errOutOfBounds")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_StreamRegistry *StreamRegistrySession) ErrOutOfBounds() (string, error) {
	return _StreamRegistry.Contract.ErrOutOfBounds(&_StreamRegistry.CallOpts)
}

// ErrOutOfBounds is a free data retrieval call binding the contract method 0x8a3c9ed1.
//
// Solidity: function errOutOfBounds() view returns(string)
func (_StreamRegistry *StreamRegistryCallerSession) ErrOutOfBounds() (string, error) {
	return _StreamRegistry.Contract.ErrOutOfBounds(&_StreamRegistry.CallOpts)
}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_StreamRegistry *StreamRegistryCaller) GetStream(opts *bind.CallOpts, _streamId string) (StreamRegistryStream, error) {
	var out []interface{}
	err := _StreamRegistry.contract.Call(opts, &out, "getStream", _streamId)

	if err != nil {
		return *new(StreamRegistryStream), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamRegistryStream)).(*StreamRegistryStream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_StreamRegistry *StreamRegistrySession) GetStream(_streamId string) (StreamRegistryStream, error) {
	return _StreamRegistry.Contract.GetStream(&_StreamRegistry.CallOpts, _streamId)
}

// GetStream is a free data retrieval call binding the contract method 0x5e587d7a.
//
// Solidity: function getStream(string _streamId) view returns((string,address[],bytes32))
func (_StreamRegistry *StreamRegistryCallerSession) GetStream(_streamId string) (StreamRegistryStream, error) {
	return _StreamRegistry.Contract.GetStream(&_StreamRegistry.CallOpts, _streamId)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_StreamRegistry *StreamRegistryCaller) GetStreamByIndex(opts *bind.CallOpts, index *big.Int) (StreamRegistryStream, error) {
	var out []interface{}
	err := _StreamRegistry.contract.Call(opts, &out, "getStreamByIndex", index)

	if err != nil {
		return *new(StreamRegistryStream), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamRegistryStream)).(*StreamRegistryStream)

	return out0, err

}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_StreamRegistry *StreamRegistrySession) GetStreamByIndex(index *big.Int) (StreamRegistryStream, error) {
	return _StreamRegistry.Contract.GetStreamByIndex(&_StreamRegistry.CallOpts, index)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 index) view returns((string,address[],bytes32))
func (_StreamRegistry *StreamRegistryCallerSession) GetStreamByIndex(index *big.Int) (StreamRegistryStream, error) {
	return _StreamRegistry.Contract.GetStreamByIndex(&_StreamRegistry.CallOpts, index)
}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_StreamRegistry *StreamRegistryCaller) GetStreamsLength(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _StreamRegistry.contract.Call(opts, &out, "getStreamsLength")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_StreamRegistry *StreamRegistrySession) GetStreamsLength() (*big.Int, error) {
	return _StreamRegistry.Contract.GetStreamsLength(&_StreamRegistry.CallOpts)
}

// GetStreamsLength is a free data retrieval call binding the contract method 0x80e8ecb5.
//
// Solidity: function getStreamsLength() view returns(uint256)
func (_StreamRegistry *StreamRegistryCallerSession) GetStreamsLength() (*big.Int, error) {
	return _StreamRegistry.Contract.GetStreamsLength(&_StreamRegistry.CallOpts)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_StreamRegistry *StreamRegistryTransactor) AllocateStream(opts *bind.TransactOpts, newStream StreamRegistryStream) (*types.Transaction, error) {
	return _StreamRegistry.contract.Transact(opts, "allocateStream", newStream)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_StreamRegistry *StreamRegistrySession) AllocateStream(newStream StreamRegistryStream) (*types.Transaction, error) {
	return _StreamRegistry.Contract.AllocateStream(&_StreamRegistry.TransactOpts, newStream)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xd340882f.
//
// Solidity: function allocateStream((string,address[],bytes32) newStream) returns()
func (_StreamRegistry *StreamRegistryTransactorSession) AllocateStream(newStream StreamRegistryStream) (*types.Transaction, error) {
	return _StreamRegistry.Contract.AllocateStream(&_StreamRegistry.TransactOpts, newStream)
}
