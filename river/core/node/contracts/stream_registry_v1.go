// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contracts

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

// SetMiniblock is an auto generated low-level Go binding around an user-defined struct.
type SetMiniblock struct {
	StreamId          [32]byte
	PrevMiniBlockHash [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	IsSealed          bool
}

// Stream is an auto generated low-level Go binding around an user-defined struct.
type Stream struct {
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	Reserved0         uint64
	Flags             uint64
	Nodes             []common.Address
}

// StreamWithId is an auto generated low-level Go binding around an user-defined struct.
type StreamWithId struct {
	Id     [32]byte
	Stream Stream
}

// StreamRegistryV1MetaData contains all meta data concerning the StreamRegistryV1 contract.
var StreamRegistryV1MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllStreamIds\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32[]\",\"internalType\":\"bytes32[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreams\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamByIndex\",\"inputs\":[{\"name\":\"i\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStreamWithId\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamWithGenesis\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamsOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"placeStreamOnNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeStreamFromNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblock\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblockBatch\",\"inputs\":[{\"name\":\"miniblocks\",\"type\":\"tuple[]\",\"internalType\":\"structSetMiniblock[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"StreamAllocated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdateFailed\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"reason\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamPlacementUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"isAdded\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false}]",
}

// StreamRegistryV1ABI is the input ABI used to generate the binding from.
// Deprecated: Use StreamRegistryV1MetaData.ABI instead.
var StreamRegistryV1ABI = StreamRegistryV1MetaData.ABI

// StreamRegistryV1 is an auto generated Go binding around an Ethereum contract.
type StreamRegistryV1 struct {
	StreamRegistryV1Caller     // Read-only binding to the contract
	StreamRegistryV1Transactor // Write-only binding to the contract
	StreamRegistryV1Filterer   // Log filterer for contract events
}

// StreamRegistryV1Caller is an auto generated read-only Go binding around an Ethereum contract.
type StreamRegistryV1Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// StreamRegistryV1Transactor is an auto generated write-only Go binding around an Ethereum contract.
type StreamRegistryV1Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// StreamRegistryV1Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type StreamRegistryV1Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// StreamRegistryV1Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type StreamRegistryV1Session struct {
	Contract     *StreamRegistryV1 // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// StreamRegistryV1CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type StreamRegistryV1CallerSession struct {
	Contract *StreamRegistryV1Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts           // Call options to use throughout this session
}

// StreamRegistryV1TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type StreamRegistryV1TransactorSession struct {
	Contract     *StreamRegistryV1Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts           // Transaction auth options to use throughout this session
}

// StreamRegistryV1Raw is an auto generated low-level Go binding around an Ethereum contract.
type StreamRegistryV1Raw struct {
	Contract *StreamRegistryV1 // Generic contract binding to access the raw methods on
}

// StreamRegistryV1CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type StreamRegistryV1CallerRaw struct {
	Contract *StreamRegistryV1Caller // Generic read-only contract binding to access the raw methods on
}

// StreamRegistryV1TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type StreamRegistryV1TransactorRaw struct {
	Contract *StreamRegistryV1Transactor // Generic write-only contract binding to access the raw methods on
}

// NewStreamRegistryV1 creates a new instance of StreamRegistryV1, bound to a specific deployed contract.
func NewStreamRegistryV1(address common.Address, backend bind.ContractBackend) (*StreamRegistryV1, error) {
	contract, err := bindStreamRegistryV1(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1{StreamRegistryV1Caller: StreamRegistryV1Caller{contract: contract}, StreamRegistryV1Transactor: StreamRegistryV1Transactor{contract: contract}, StreamRegistryV1Filterer: StreamRegistryV1Filterer{contract: contract}}, nil
}

// NewStreamRegistryV1Caller creates a new read-only instance of StreamRegistryV1, bound to a specific deployed contract.
func NewStreamRegistryV1Caller(address common.Address, caller bind.ContractCaller) (*StreamRegistryV1Caller, error) {
	contract, err := bindStreamRegistryV1(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1Caller{contract: contract}, nil
}

// NewStreamRegistryV1Transactor creates a new write-only instance of StreamRegistryV1, bound to a specific deployed contract.
func NewStreamRegistryV1Transactor(address common.Address, transactor bind.ContractTransactor) (*StreamRegistryV1Transactor, error) {
	contract, err := bindStreamRegistryV1(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1Transactor{contract: contract}, nil
}

// NewStreamRegistryV1Filterer creates a new log filterer instance of StreamRegistryV1, bound to a specific deployed contract.
func NewStreamRegistryV1Filterer(address common.Address, filterer bind.ContractFilterer) (*StreamRegistryV1Filterer, error) {
	contract, err := bindStreamRegistryV1(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1Filterer{contract: contract}, nil
}

// bindStreamRegistryV1 binds a generic wrapper to an already deployed contract.
func bindStreamRegistryV1(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := StreamRegistryV1MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_StreamRegistryV1 *StreamRegistryV1Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _StreamRegistryV1.Contract.StreamRegistryV1Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_StreamRegistryV1 *StreamRegistryV1Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.StreamRegistryV1Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_StreamRegistryV1 *StreamRegistryV1Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.StreamRegistryV1Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_StreamRegistryV1 *StreamRegistryV1CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _StreamRegistryV1.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_StreamRegistryV1 *StreamRegistryV1TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_StreamRegistryV1 *StreamRegistryV1TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.contract.Transact(opts, method, params...)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetAllStreamIds(opts *bind.CallOpts) ([][32]byte, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getAllStreamIds")

	if err != nil {
		return *new([][32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([][32]byte)).(*[][32]byte)

	return out0, err

}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_StreamRegistryV1 *StreamRegistryV1Session) GetAllStreamIds() ([][32]byte, error) {
	return _StreamRegistryV1.Contract.GetAllStreamIds(&_StreamRegistryV1.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetAllStreamIds() ([][32]byte, error) {
	return _StreamRegistryV1.Contract.GetAllStreamIds(&_StreamRegistryV1.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetAllStreams(opts *bind.CallOpts) ([]StreamWithId, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getAllStreams")

	if err != nil {
		return *new([]StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)

	return out0, err

}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_StreamRegistryV1 *StreamRegistryV1Session) GetAllStreams() ([]StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetAllStreams(&_StreamRegistryV1.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetAllStreams() ([]StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetAllStreams(&_StreamRegistryV1.CallOpts)
}

// GetPaginatedStreams is a free data retrieval call binding the contract method 0xca78c41a.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetPaginatedStreams(opts *bind.CallOpts, start *big.Int, stop *big.Int) ([]StreamWithId, bool, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getPaginatedStreams", start, stop)

	if err != nil {
		return *new([]StreamWithId), *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)
	out1 := *abi.ConvertType(out[1], new(bool)).(*bool)

	return out0, out1, err

}

// GetPaginatedStreams is a free data retrieval call binding the contract method 0xca78c41a.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (_StreamRegistryV1 *StreamRegistryV1Session) GetPaginatedStreams(start *big.Int, stop *big.Int) ([]StreamWithId, bool, error) {
	return _StreamRegistryV1.Contract.GetPaginatedStreams(&_StreamRegistryV1.CallOpts, start, stop)
}

// GetPaginatedStreams is a free data retrieval call binding the contract method 0xca78c41a.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetPaginatedStreams(start *big.Int, stop *big.Int) ([]StreamWithId, bool, error) {
	return _StreamRegistryV1.Contract.GetPaginatedStreams(&_StreamRegistryV1.CallOpts, start, stop)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetStream(opts *bind.CallOpts, streamId [32]byte) (Stream, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getStream", streamId)

	if err != nil {
		return *new(Stream), err
	}

	out0 := *abi.ConvertType(out[0], new(Stream)).(*Stream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (_StreamRegistryV1 *StreamRegistryV1Session) GetStream(streamId [32]byte) (Stream, error) {
	return _StreamRegistryV1.Contract.GetStream(&_StreamRegistryV1.CallOpts, streamId)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetStream(streamId [32]byte) (Stream, error) {
	return _StreamRegistryV1.Contract.GetStream(&_StreamRegistryV1.CallOpts, streamId)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 i) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[])))
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetStreamByIndex(opts *bind.CallOpts, i *big.Int) (StreamWithId, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getStreamByIndex", i)

	if err != nil {
		return *new(StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamWithId)).(*StreamWithId)

	return out0, err

}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 i) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[])))
func (_StreamRegistryV1 *StreamRegistryV1Session) GetStreamByIndex(i *big.Int) (StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetStreamByIndex(&_StreamRegistryV1.CallOpts, i)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 i) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[])))
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetStreamByIndex(i *big.Int) (StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetStreamByIndex(&_StreamRegistryV1.CallOpts, i)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetStreamCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getStreamCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_StreamRegistryV1 *StreamRegistryV1Session) GetStreamCount() (*big.Int, error) {
	return _StreamRegistryV1.Contract.GetStreamCount(&_StreamRegistryV1.CallOpts)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetStreamCount() (*big.Int, error) {
	return _StreamRegistryV1.Contract.GetStreamCount(&_StreamRegistryV1.CallOpts)
}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetStreamWithGenesis(opts *bind.CallOpts, streamId [32]byte) (Stream, [32]byte, []byte, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getStreamWithGenesis", streamId)

	if err != nil {
		return *new(Stream), *new([32]byte), *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new(Stream)).(*Stream)
	out1 := *abi.ConvertType(out[1], new([32]byte)).(*[32]byte)
	out2 := *abi.ConvertType(out[2], new([]byte)).(*[]byte)

	return out0, out1, out2, err

}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (_StreamRegistryV1 *StreamRegistryV1Session) GetStreamWithGenesis(streamId [32]byte) (Stream, [32]byte, []byte, error) {
	return _StreamRegistryV1.Contract.GetStreamWithGenesis(&_StreamRegistryV1.CallOpts, streamId)
}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetStreamWithGenesis(streamId [32]byte) (Stream, [32]byte, []byte, error) {
	return _StreamRegistryV1.Contract.GetStreamWithGenesis(&_StreamRegistryV1.CallOpts, streamId)
}

// GetStreamsOnNode is a free data retrieval call binding the contract method 0x32705ac4.
//
// Solidity: function getStreamsOnNode(address nodeAddress) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetStreamsOnNode(opts *bind.CallOpts, nodeAddress common.Address) ([]StreamWithId, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getStreamsOnNode", nodeAddress)

	if err != nil {
		return *new([]StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)

	return out0, err

}

// GetStreamsOnNode is a free data retrieval call binding the contract method 0x32705ac4.
//
// Solidity: function getStreamsOnNode(address nodeAddress) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_StreamRegistryV1 *StreamRegistryV1Session) GetStreamsOnNode(nodeAddress common.Address) ([]StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetStreamsOnNode(&_StreamRegistryV1.CallOpts, nodeAddress)
}

// GetStreamsOnNode is a free data retrieval call binding the contract method 0x32705ac4.
//
// Solidity: function getStreamsOnNode(address nodeAddress) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetStreamsOnNode(nodeAddress common.Address) ([]StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetStreamsOnNode(&_StreamRegistryV1.CallOpts, nodeAddress)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) AllocateStream(opts *bind.TransactOpts, streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "allocateStream", streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) AllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.AllocateStream(&_StreamRegistryV1.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) AllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.AllocateStream(&_StreamRegistryV1.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// PlaceStreamOnNode is a paid mutator transaction binding the contract method 0x9ee86d38.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) PlaceStreamOnNode(opts *bind.TransactOpts, streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "placeStreamOnNode", streamId, nodeAddress)
}

// PlaceStreamOnNode is a paid mutator transaction binding the contract method 0x9ee86d38.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) PlaceStreamOnNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.PlaceStreamOnNode(&_StreamRegistryV1.TransactOpts, streamId, nodeAddress)
}

// PlaceStreamOnNode is a paid mutator transaction binding the contract method 0x9ee86d38.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) PlaceStreamOnNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.PlaceStreamOnNode(&_StreamRegistryV1.TransactOpts, streamId, nodeAddress)
}

// RemoveStreamFromNode is a paid mutator transaction binding the contract method 0xee885b12.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) RemoveStreamFromNode(opts *bind.TransactOpts, streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "removeStreamFromNode", streamId, nodeAddress)
}

// RemoveStreamFromNode is a paid mutator transaction binding the contract method 0xee885b12.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) RemoveStreamFromNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.RemoveStreamFromNode(&_StreamRegistryV1.TransactOpts, streamId, nodeAddress)
}

// RemoveStreamFromNode is a paid mutator transaction binding the contract method 0xee885b12.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) RemoveStreamFromNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.RemoveStreamFromNode(&_StreamRegistryV1.TransactOpts, streamId, nodeAddress)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xd7a3158a.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 prevMiniBlockHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) SetStreamLastMiniblock(opts *bind.TransactOpts, streamId [32]byte, prevMiniBlockHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "setStreamLastMiniblock", streamId, prevMiniBlockHash, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xd7a3158a.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 prevMiniBlockHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) SetStreamLastMiniblock(streamId [32]byte, prevMiniBlockHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SetStreamLastMiniblock(&_StreamRegistryV1.TransactOpts, streamId, prevMiniBlockHash, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xd7a3158a.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 prevMiniBlockHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) SetStreamLastMiniblock(streamId [32]byte, prevMiniBlockHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SetStreamLastMiniblock(&_StreamRegistryV1.TransactOpts, streamId, prevMiniBlockHash, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblockBatch is a paid mutator transaction binding the contract method 0xff3a14ab.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) SetStreamLastMiniblockBatch(opts *bind.TransactOpts, miniblocks []SetMiniblock) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "setStreamLastMiniblockBatch", miniblocks)
}

// SetStreamLastMiniblockBatch is a paid mutator transaction binding the contract method 0xff3a14ab.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) SetStreamLastMiniblockBatch(miniblocks []SetMiniblock) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SetStreamLastMiniblockBatch(&_StreamRegistryV1.TransactOpts, miniblocks)
}

// SetStreamLastMiniblockBatch is a paid mutator transaction binding the contract method 0xff3a14ab.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) SetStreamLastMiniblockBatch(miniblocks []SetMiniblock) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SetStreamLastMiniblockBatch(&_StreamRegistryV1.TransactOpts, miniblocks)
}

// StreamRegistryV1StreamAllocatedIterator is returned from FilterStreamAllocated and is used to iterate over the raw logs and unpacked data for StreamAllocated events raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamAllocatedIterator struct {
	Event *StreamRegistryV1StreamAllocated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *StreamRegistryV1StreamAllocatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(StreamRegistryV1StreamAllocated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(StreamRegistryV1StreamAllocated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *StreamRegistryV1StreamAllocatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *StreamRegistryV1StreamAllocatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// StreamRegistryV1StreamAllocated represents a StreamAllocated event raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamAllocated struct {
	StreamId             [32]byte
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
	GenesisMiniblock     []byte
	Raw                  types.Log // Blockchain specific contextual infos
}

// FilterStreamAllocated is a free log retrieval operation binding the contract event 0x55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) FilterStreamAllocated(opts *bind.FilterOpts) (*StreamRegistryV1StreamAllocatedIterator, error) {

	logs, sub, err := _StreamRegistryV1.contract.FilterLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1StreamAllocatedIterator{contract: _StreamRegistryV1.contract, event: "StreamAllocated", logs: logs, sub: sub}, nil
}

// WatchStreamAllocated is a free log subscription operation binding the contract event 0x55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) WatchStreamAllocated(opts *bind.WatchOpts, sink chan<- *StreamRegistryV1StreamAllocated) (event.Subscription, error) {

	logs, sub, err := _StreamRegistryV1.contract.WatchLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(StreamRegistryV1StreamAllocated)
				if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseStreamAllocated is a log parse operation binding the contract event 0x55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) ParseStreamAllocated(log types.Log) (*StreamRegistryV1StreamAllocated, error) {
	event := new(StreamRegistryV1StreamAllocated)
	if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// StreamRegistryV1StreamLastMiniblockUpdateFailedIterator is returned from FilterStreamLastMiniblockUpdateFailed and is used to iterate over the raw logs and unpacked data for StreamLastMiniblockUpdateFailed events raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamLastMiniblockUpdateFailedIterator struct {
	Event *StreamRegistryV1StreamLastMiniblockUpdateFailed // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *StreamRegistryV1StreamLastMiniblockUpdateFailedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(StreamRegistryV1StreamLastMiniblockUpdateFailed)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(StreamRegistryV1StreamLastMiniblockUpdateFailed)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *StreamRegistryV1StreamLastMiniblockUpdateFailedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *StreamRegistryV1StreamLastMiniblockUpdateFailedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// StreamRegistryV1StreamLastMiniblockUpdateFailed represents a StreamLastMiniblockUpdateFailed event raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamLastMiniblockUpdateFailed struct {
	StreamId          [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	Reason            string
	Raw               types.Log // Blockchain specific contextual infos
}

// FilterStreamLastMiniblockUpdateFailed is a free log retrieval operation binding the contract event 0x75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa.
//
// Solidity: event StreamLastMiniblockUpdateFailed(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, string reason)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) FilterStreamLastMiniblockUpdateFailed(opts *bind.FilterOpts) (*StreamRegistryV1StreamLastMiniblockUpdateFailedIterator, error) {

	logs, sub, err := _StreamRegistryV1.contract.FilterLogs(opts, "StreamLastMiniblockUpdateFailed")
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1StreamLastMiniblockUpdateFailedIterator{contract: _StreamRegistryV1.contract, event: "StreamLastMiniblockUpdateFailed", logs: logs, sub: sub}, nil
}

// WatchStreamLastMiniblockUpdateFailed is a free log subscription operation binding the contract event 0x75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa.
//
// Solidity: event StreamLastMiniblockUpdateFailed(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, string reason)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) WatchStreamLastMiniblockUpdateFailed(opts *bind.WatchOpts, sink chan<- *StreamRegistryV1StreamLastMiniblockUpdateFailed) (event.Subscription, error) {

	logs, sub, err := _StreamRegistryV1.contract.WatchLogs(opts, "StreamLastMiniblockUpdateFailed")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(StreamRegistryV1StreamLastMiniblockUpdateFailed)
				if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamLastMiniblockUpdateFailed", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseStreamLastMiniblockUpdateFailed is a log parse operation binding the contract event 0x75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa.
//
// Solidity: event StreamLastMiniblockUpdateFailed(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, string reason)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) ParseStreamLastMiniblockUpdateFailed(log types.Log) (*StreamRegistryV1StreamLastMiniblockUpdateFailed, error) {
	event := new(StreamRegistryV1StreamLastMiniblockUpdateFailed)
	if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamLastMiniblockUpdateFailed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// StreamRegistryV1StreamLastMiniblockUpdatedIterator is returned from FilterStreamLastMiniblockUpdated and is used to iterate over the raw logs and unpacked data for StreamLastMiniblockUpdated events raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamLastMiniblockUpdatedIterator struct {
	Event *StreamRegistryV1StreamLastMiniblockUpdated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *StreamRegistryV1StreamLastMiniblockUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(StreamRegistryV1StreamLastMiniblockUpdated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(StreamRegistryV1StreamLastMiniblockUpdated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *StreamRegistryV1StreamLastMiniblockUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *StreamRegistryV1StreamLastMiniblockUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// StreamRegistryV1StreamLastMiniblockUpdated represents a StreamLastMiniblockUpdated event raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamLastMiniblockUpdated struct {
	StreamId          [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	IsSealed          bool
	Raw               types.Log // Blockchain specific contextual infos
}

// FilterStreamLastMiniblockUpdated is a free log retrieval operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) FilterStreamLastMiniblockUpdated(opts *bind.FilterOpts) (*StreamRegistryV1StreamLastMiniblockUpdatedIterator, error) {

	logs, sub, err := _StreamRegistryV1.contract.FilterLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1StreamLastMiniblockUpdatedIterator{contract: _StreamRegistryV1.contract, event: "StreamLastMiniblockUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamLastMiniblockUpdated is a free log subscription operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) WatchStreamLastMiniblockUpdated(opts *bind.WatchOpts, sink chan<- *StreamRegistryV1StreamLastMiniblockUpdated) (event.Subscription, error) {

	logs, sub, err := _StreamRegistryV1.contract.WatchLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(StreamRegistryV1StreamLastMiniblockUpdated)
				if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseStreamLastMiniblockUpdated is a log parse operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) ParseStreamLastMiniblockUpdated(log types.Log) (*StreamRegistryV1StreamLastMiniblockUpdated, error) {
	event := new(StreamRegistryV1StreamLastMiniblockUpdated)
	if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// StreamRegistryV1StreamPlacementUpdatedIterator is returned from FilterStreamPlacementUpdated and is used to iterate over the raw logs and unpacked data for StreamPlacementUpdated events raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamPlacementUpdatedIterator struct {
	Event *StreamRegistryV1StreamPlacementUpdated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *StreamRegistryV1StreamPlacementUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(StreamRegistryV1StreamPlacementUpdated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(StreamRegistryV1StreamPlacementUpdated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *StreamRegistryV1StreamPlacementUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *StreamRegistryV1StreamPlacementUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// StreamRegistryV1StreamPlacementUpdated represents a StreamPlacementUpdated event raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamPlacementUpdated struct {
	StreamId    [32]byte
	NodeAddress common.Address
	IsAdded     bool
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterStreamPlacementUpdated is a free log retrieval operation binding the contract event 0xaaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f.
//
// Solidity: event StreamPlacementUpdated(bytes32 streamId, address nodeAddress, bool isAdded)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) FilterStreamPlacementUpdated(opts *bind.FilterOpts) (*StreamRegistryV1StreamPlacementUpdatedIterator, error) {

	logs, sub, err := _StreamRegistryV1.contract.FilterLogs(opts, "StreamPlacementUpdated")
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1StreamPlacementUpdatedIterator{contract: _StreamRegistryV1.contract, event: "StreamPlacementUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamPlacementUpdated is a free log subscription operation binding the contract event 0xaaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f.
//
// Solidity: event StreamPlacementUpdated(bytes32 streamId, address nodeAddress, bool isAdded)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) WatchStreamPlacementUpdated(opts *bind.WatchOpts, sink chan<- *StreamRegistryV1StreamPlacementUpdated) (event.Subscription, error) {

	logs, sub, err := _StreamRegistryV1.contract.WatchLogs(opts, "StreamPlacementUpdated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(StreamRegistryV1StreamPlacementUpdated)
				if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamPlacementUpdated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseStreamPlacementUpdated is a log parse operation binding the contract event 0xaaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f.
//
// Solidity: event StreamPlacementUpdated(bytes32 streamId, address nodeAddress, bool isAdded)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) ParseStreamPlacementUpdated(log types.Log) (*StreamRegistryV1StreamPlacementUpdated, error) {
	event := new(StreamRegistryV1StreamPlacementUpdated)
	if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamPlacementUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
