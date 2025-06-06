// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package river

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

// SetStreamReplicationFactor is an auto generated low-level Go binding around an user-defined struct.
type SetStreamReplicationFactor struct {
	StreamId          [32]byte
	Nodes             []common.Address
	ReplicationFactor uint8
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
	ABI: "[{\"type\":\"function\",\"name\":\"addStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getPaginatedStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreamsOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"streams\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCountOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamWithGenesis\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"placeStreamOnNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeStreamFromNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblockBatch\",\"inputs\":[{\"name\":\"miniblocks\",\"type\":\"tuple[]\",\"internalType\":\"structSetMiniblock[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamReplicationFactor\",\"inputs\":[{\"name\":\"requests\",\"type\":\"tuple[]\",\"internalType\":\"structSetStreamReplicationFactor[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"replicationFactor\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"syncNodesOnStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdateFailed\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"reason\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamUpdated\",\"inputs\":[{\"name\":\"eventType\",\"type\":\"uint8\",\"indexed\":true,\"internalType\":\"enumIStreamRegistryBase.StreamEventType\"},{\"name\":\"data\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"}],\"anonymous\":false}]",
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

// GetPaginatedStreamsOnNode is a free data retrieval call binding the contract method 0x22bbda64.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetPaginatedStreamsOnNode(opts *bind.CallOpts, nodeAddress common.Address, start *big.Int, stop *big.Int) ([]StreamWithId, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getPaginatedStreamsOnNode", nodeAddress, start, stop)

	if err != nil {
		return *new([]StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)

	return out0, err

}

// GetPaginatedStreamsOnNode is a free data retrieval call binding the contract method 0x22bbda64.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (_StreamRegistryV1 *StreamRegistryV1Session) GetPaginatedStreamsOnNode(nodeAddress common.Address, start *big.Int, stop *big.Int) ([]StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetPaginatedStreamsOnNode(&_StreamRegistryV1.CallOpts, nodeAddress, start, stop)
}

// GetPaginatedStreamsOnNode is a free data retrieval call binding the contract method 0x22bbda64.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetPaginatedStreamsOnNode(nodeAddress common.Address, start *big.Int, stop *big.Int) ([]StreamWithId, error) {
	return _StreamRegistryV1.Contract.GetPaginatedStreamsOnNode(&_StreamRegistryV1.CallOpts, nodeAddress, start, stop)
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

// GetStreamCountOnNode is a free data retrieval call binding the contract method 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (_StreamRegistryV1 *StreamRegistryV1Caller) GetStreamCountOnNode(opts *bind.CallOpts, nodeAddress common.Address) (*big.Int, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "getStreamCountOnNode", nodeAddress)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamCountOnNode is a free data retrieval call binding the contract method 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (_StreamRegistryV1 *StreamRegistryV1Session) GetStreamCountOnNode(nodeAddress common.Address) (*big.Int, error) {
	return _StreamRegistryV1.Contract.GetStreamCountOnNode(&_StreamRegistryV1.CallOpts, nodeAddress)
}

// GetStreamCountOnNode is a free data retrieval call binding the contract method 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) GetStreamCountOnNode(nodeAddress common.Address) (*big.Int, error) {
	return _StreamRegistryV1.Contract.GetStreamCountOnNode(&_StreamRegistryV1.CallOpts, nodeAddress)
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

// IsStream is a free data retrieval call binding the contract method 0xd0c27c4f.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (_StreamRegistryV1 *StreamRegistryV1Caller) IsStream(opts *bind.CallOpts, streamId [32]byte) (bool, error) {
	var out []interface{}
	err := _StreamRegistryV1.contract.Call(opts, &out, "isStream", streamId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsStream is a free data retrieval call binding the contract method 0xd0c27c4f.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (_StreamRegistryV1 *StreamRegistryV1Session) IsStream(streamId [32]byte) (bool, error) {
	return _StreamRegistryV1.Contract.IsStream(&_StreamRegistryV1.CallOpts, streamId)
}

// IsStream is a free data retrieval call binding the contract method 0xd0c27c4f.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (_StreamRegistryV1 *StreamRegistryV1CallerSession) IsStream(streamId [32]byte) (bool, error) {
	return _StreamRegistryV1.Contract.IsStream(&_StreamRegistryV1.CallOpts, streamId)
}

// AddStream is a paid mutator transaction binding the contract method 0xb2e76b8e.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) AddStream(opts *bind.TransactOpts, streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "addStream", streamId, genesisMiniblockHash, stream)
}

// AddStream is a paid mutator transaction binding the contract method 0xb2e76b8e.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) AddStream(streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.AddStream(&_StreamRegistryV1.TransactOpts, streamId, genesisMiniblockHash, stream)
}

// AddStream is a paid mutator transaction binding the contract method 0xb2e76b8e.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) AddStream(streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.AddStream(&_StreamRegistryV1.TransactOpts, streamId, genesisMiniblockHash, stream)
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

// SetStreamReplicationFactor is a paid mutator transaction binding the contract method 0x5c665ce9.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) SetStreamReplicationFactor(opts *bind.TransactOpts, requests []SetStreamReplicationFactor) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "setStreamReplicationFactor", requests)
}

// SetStreamReplicationFactor is a paid mutator transaction binding the contract method 0x5c665ce9.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) SetStreamReplicationFactor(requests []SetStreamReplicationFactor) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SetStreamReplicationFactor(&_StreamRegistryV1.TransactOpts, requests)
}

// SetStreamReplicationFactor is a paid mutator transaction binding the contract method 0x5c665ce9.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) SetStreamReplicationFactor(requests []SetStreamReplicationFactor) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SetStreamReplicationFactor(&_StreamRegistryV1.TransactOpts, requests)
}

// SyncNodesOnStreams is a paid mutator transaction binding the contract method 0x03cc8793.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (_StreamRegistryV1 *StreamRegistryV1Transactor) SyncNodesOnStreams(opts *bind.TransactOpts, start *big.Int, stop *big.Int) (*types.Transaction, error) {
	return _StreamRegistryV1.contract.Transact(opts, "syncNodesOnStreams", start, stop)
}

// SyncNodesOnStreams is a paid mutator transaction binding the contract method 0x03cc8793.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (_StreamRegistryV1 *StreamRegistryV1Session) SyncNodesOnStreams(start *big.Int, stop *big.Int) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SyncNodesOnStreams(&_StreamRegistryV1.TransactOpts, start, stop)
}

// SyncNodesOnStreams is a paid mutator transaction binding the contract method 0x03cc8793.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (_StreamRegistryV1 *StreamRegistryV1TransactorSession) SyncNodesOnStreams(start *big.Int, stop *big.Int) (*types.Transaction, error) {
	return _StreamRegistryV1.Contract.SyncNodesOnStreams(&_StreamRegistryV1.TransactOpts, start, stop)
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

// StreamRegistryV1StreamUpdatedIterator is returned from FilterStreamUpdated and is used to iterate over the raw logs and unpacked data for StreamUpdated events raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamUpdatedIterator struct {
	Event *StreamRegistryV1StreamUpdated // Event containing the contract specifics and raw log

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
func (it *StreamRegistryV1StreamUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(StreamRegistryV1StreamUpdated)
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
		it.Event = new(StreamRegistryV1StreamUpdated)
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
func (it *StreamRegistryV1StreamUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *StreamRegistryV1StreamUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// StreamRegistryV1StreamUpdated represents a StreamUpdated event raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamUpdated struct {
	EventType uint8
	Data      []byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterStreamUpdated is a free log retrieval operation binding the contract event 0x378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb.
//
// Solidity: event StreamUpdated(uint8 indexed eventType, bytes data)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) FilterStreamUpdated(opts *bind.FilterOpts, eventType []uint8) (*StreamRegistryV1StreamUpdatedIterator, error) {

	var eventTypeRule []interface{}
	for _, eventTypeItem := range eventType {
		eventTypeRule = append(eventTypeRule, eventTypeItem)
	}

	logs, sub, err := _StreamRegistryV1.contract.FilterLogs(opts, "StreamUpdated", eventTypeRule)
	if err != nil {
		return nil, err
	}
	return &StreamRegistryV1StreamUpdatedIterator{contract: _StreamRegistryV1.contract, event: "StreamUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamUpdated is a free log subscription operation binding the contract event 0x378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb.
//
// Solidity: event StreamUpdated(uint8 indexed eventType, bytes data)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) WatchStreamUpdated(opts *bind.WatchOpts, sink chan<- *StreamRegistryV1StreamUpdated, eventType []uint8) (event.Subscription, error) {

	var eventTypeRule []interface{}
	for _, eventTypeItem := range eventType {
		eventTypeRule = append(eventTypeRule, eventTypeItem)
	}

	logs, sub, err := _StreamRegistryV1.contract.WatchLogs(opts, "StreamUpdated", eventTypeRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(StreamRegistryV1StreamUpdated)
				if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamUpdated", log); err != nil {
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

// ParseStreamUpdated is a log parse operation binding the contract event 0x378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb.
//
// Solidity: event StreamUpdated(uint8 indexed eventType, bytes data)
func (_StreamRegistryV1 *StreamRegistryV1Filterer) ParseStreamUpdated(log types.Log) (*StreamRegistryV1StreamUpdated, error) {
	event := new(StreamRegistryV1StreamUpdated)
	if err := _StreamRegistryV1.contract.UnpackLog(event, "StreamUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
