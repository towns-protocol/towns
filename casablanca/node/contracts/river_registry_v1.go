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

// IRiverRegistryBaseNode is an auto generated low-level Go binding around an user-defined struct.
type IRiverRegistryBaseNode struct {
	NodeAddress common.Address
	Url         string
	Status      uint8
}

// IRiverRegistryBaseStream is an auto generated low-level Go binding around an user-defined struct.
type IRiverRegistryBaseStream struct {
	StreamId             string
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
	GenesisMiniblock     []byte
	LastMiniblockHash    [32]byte
	LastMiniblockNum     uint64
}

// RiverRegistryV1MetaData contains all meta data concerning the RiverRegistryV1 contract.
var RiverRegistryV1MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Node[]\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreamIds\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreams\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Stream[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Node\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamIdHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Stream\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblock\",\"inputs\":[{\"name\":\"streamIdHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeStatusUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUrlUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamAllocated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"}],\"anonymous\":false}]",
}

// RiverRegistryV1ABI is the input ABI used to generate the binding from.
// Deprecated: Use RiverRegistryV1MetaData.ABI instead.
var RiverRegistryV1ABI = RiverRegistryV1MetaData.ABI

// RiverRegistryV1 is an auto generated Go binding around an Ethereum contract.
type RiverRegistryV1 struct {
	RiverRegistryV1Caller     // Read-only binding to the contract
	RiverRegistryV1Transactor // Write-only binding to the contract
	RiverRegistryV1Filterer   // Log filterer for contract events
}

// RiverRegistryV1Caller is an auto generated read-only Go binding around an Ethereum contract.
type RiverRegistryV1Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverRegistryV1Transactor is an auto generated write-only Go binding around an Ethereum contract.
type RiverRegistryV1Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverRegistryV1Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type RiverRegistryV1Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverRegistryV1Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type RiverRegistryV1Session struct {
	Contract     *RiverRegistryV1  // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// RiverRegistryV1CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type RiverRegistryV1CallerSession struct {
	Contract *RiverRegistryV1Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts          // Call options to use throughout this session
}

// RiverRegistryV1TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type RiverRegistryV1TransactorSession struct {
	Contract     *RiverRegistryV1Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// RiverRegistryV1Raw is an auto generated low-level Go binding around an Ethereum contract.
type RiverRegistryV1Raw struct {
	Contract *RiverRegistryV1 // Generic contract binding to access the raw methods on
}

// RiverRegistryV1CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type RiverRegistryV1CallerRaw struct {
	Contract *RiverRegistryV1Caller // Generic read-only contract binding to access the raw methods on
}

// RiverRegistryV1TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type RiverRegistryV1TransactorRaw struct {
	Contract *RiverRegistryV1Transactor // Generic write-only contract binding to access the raw methods on
}

// NewRiverRegistryV1 creates a new instance of RiverRegistryV1, bound to a specific deployed contract.
func NewRiverRegistryV1(address common.Address, backend bind.ContractBackend) (*RiverRegistryV1, error) {
	contract, err := bindRiverRegistryV1(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1{RiverRegistryV1Caller: RiverRegistryV1Caller{contract: contract}, RiverRegistryV1Transactor: RiverRegistryV1Transactor{contract: contract}, RiverRegistryV1Filterer: RiverRegistryV1Filterer{contract: contract}}, nil
}

// NewRiverRegistryV1Caller creates a new read-only instance of RiverRegistryV1, bound to a specific deployed contract.
func NewRiverRegistryV1Caller(address common.Address, caller bind.ContractCaller) (*RiverRegistryV1Caller, error) {
	contract, err := bindRiverRegistryV1(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1Caller{contract: contract}, nil
}

// NewRiverRegistryV1Transactor creates a new write-only instance of RiverRegistryV1, bound to a specific deployed contract.
func NewRiverRegistryV1Transactor(address common.Address, transactor bind.ContractTransactor) (*RiverRegistryV1Transactor, error) {
	contract, err := bindRiverRegistryV1(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1Transactor{contract: contract}, nil
}

// NewRiverRegistryV1Filterer creates a new log filterer instance of RiverRegistryV1, bound to a specific deployed contract.
func NewRiverRegistryV1Filterer(address common.Address, filterer bind.ContractFilterer) (*RiverRegistryV1Filterer, error) {
	contract, err := bindRiverRegistryV1(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1Filterer{contract: contract}, nil
}

// bindRiverRegistryV1 binds a generic wrapper to an already deployed contract.
func bindRiverRegistryV1(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := RiverRegistryV1MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RiverRegistryV1 *RiverRegistryV1Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RiverRegistryV1.Contract.RiverRegistryV1Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RiverRegistryV1 *RiverRegistryV1Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.RiverRegistryV1Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RiverRegistryV1 *RiverRegistryV1Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.RiverRegistryV1Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RiverRegistryV1 *RiverRegistryV1CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RiverRegistryV1.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RiverRegistryV1 *RiverRegistryV1TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RiverRegistryV1 *RiverRegistryV1TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.contract.Transact(opts, method, params...)
}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetAllNodeAddresses(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getAllNodeAddresses")

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_RiverRegistryV1 *RiverRegistryV1Session) GetAllNodeAddresses() ([]common.Address, error) {
	return _RiverRegistryV1.Contract.GetAllNodeAddresses(&_RiverRegistryV1.CallOpts)
}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetAllNodeAddresses() ([]common.Address, error) {
	return _RiverRegistryV1.Contract.GetAllNodeAddresses(&_RiverRegistryV1.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((address,string,uint8)[])
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetAllNodes(opts *bind.CallOpts) ([]IRiverRegistryBaseNode, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getAllNodes")

	if err != nil {
		return *new([]IRiverRegistryBaseNode), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRiverRegistryBaseNode)).(*[]IRiverRegistryBaseNode)

	return out0, err

}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((address,string,uint8)[])
func (_RiverRegistryV1 *RiverRegistryV1Session) GetAllNodes() ([]IRiverRegistryBaseNode, error) {
	return _RiverRegistryV1.Contract.GetAllNodes(&_RiverRegistryV1.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((address,string,uint8)[])
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetAllNodes() ([]IRiverRegistryBaseNode, error) {
	return _RiverRegistryV1.Contract.GetAllNodes(&_RiverRegistryV1.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(string[])
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetAllStreamIds(opts *bind.CallOpts) ([]string, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getAllStreamIds")

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(string[])
func (_RiverRegistryV1 *RiverRegistryV1Session) GetAllStreamIds() ([]string, error) {
	return _RiverRegistryV1.Contract.GetAllStreamIds(&_RiverRegistryV1.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(string[])
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetAllStreamIds() ([]string, error) {
	return _RiverRegistryV1.Contract.GetAllStreamIds(&_RiverRegistryV1.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((string,address[],bytes32,bytes,bytes32,uint64)[])
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetAllStreams(opts *bind.CallOpts) ([]IRiverRegistryBaseStream, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getAllStreams")

	if err != nil {
		return *new([]IRiverRegistryBaseStream), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRiverRegistryBaseStream)).(*[]IRiverRegistryBaseStream)

	return out0, err

}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((string,address[],bytes32,bytes,bytes32,uint64)[])
func (_RiverRegistryV1 *RiverRegistryV1Session) GetAllStreams() ([]IRiverRegistryBaseStream, error) {
	return _RiverRegistryV1.Contract.GetAllStreams(&_RiverRegistryV1.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((string,address[],bytes32,bytes,bytes32,uint64)[])
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetAllStreams() ([]IRiverRegistryBaseStream, error) {
	return _RiverRegistryV1.Contract.GetAllStreams(&_RiverRegistryV1.CallOpts)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((address,string,uint8))
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetNode(opts *bind.CallOpts, nodeAddress common.Address) (IRiverRegistryBaseNode, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getNode", nodeAddress)

	if err != nil {
		return *new(IRiverRegistryBaseNode), err
	}

	out0 := *abi.ConvertType(out[0], new(IRiverRegistryBaseNode)).(*IRiverRegistryBaseNode)

	return out0, err

}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((address,string,uint8))
func (_RiverRegistryV1 *RiverRegistryV1Session) GetNode(nodeAddress common.Address) (IRiverRegistryBaseNode, error) {
	return _RiverRegistryV1.Contract.GetNode(&_RiverRegistryV1.CallOpts, nodeAddress)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((address,string,uint8))
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetNode(nodeAddress common.Address) (IRiverRegistryBaseNode, error) {
	return _RiverRegistryV1.Contract.GetNode(&_RiverRegistryV1.CallOpts, nodeAddress)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetNodeCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getNodeCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_RiverRegistryV1 *RiverRegistryV1Session) GetNodeCount() (*big.Int, error) {
	return _RiverRegistryV1.Contract.GetNodeCount(&_RiverRegistryV1.CallOpts)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetNodeCount() (*big.Int, error) {
	return _RiverRegistryV1.Contract.GetNodeCount(&_RiverRegistryV1.CallOpts)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamIdHash) view returns((string,address[],bytes32,bytes,bytes32,uint64))
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetStream(opts *bind.CallOpts, streamIdHash [32]byte) (IRiverRegistryBaseStream, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getStream", streamIdHash)

	if err != nil {
		return *new(IRiverRegistryBaseStream), err
	}

	out0 := *abi.ConvertType(out[0], new(IRiverRegistryBaseStream)).(*IRiverRegistryBaseStream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamIdHash) view returns((string,address[],bytes32,bytes,bytes32,uint64))
func (_RiverRegistryV1 *RiverRegistryV1Session) GetStream(streamIdHash [32]byte) (IRiverRegistryBaseStream, error) {
	return _RiverRegistryV1.Contract.GetStream(&_RiverRegistryV1.CallOpts, streamIdHash)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamIdHash) view returns((string,address[],bytes32,bytes,bytes32,uint64))
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetStream(streamIdHash [32]byte) (IRiverRegistryBaseStream, error) {
	return _RiverRegistryV1.Contract.GetStream(&_RiverRegistryV1.CallOpts, streamIdHash)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_RiverRegistryV1 *RiverRegistryV1Caller) GetStreamCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "getStreamCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_RiverRegistryV1 *RiverRegistryV1Session) GetStreamCount() (*big.Int, error) {
	return _RiverRegistryV1.Contract.GetStreamCount(&_RiverRegistryV1.CallOpts)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) GetStreamCount() (*big.Int, error) {
	return _RiverRegistryV1.Contract.GetStreamCount(&_RiverRegistryV1.CallOpts)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_RiverRegistryV1 *RiverRegistryV1Caller) IsOperator(opts *bind.CallOpts, operator common.Address) (bool, error) {
	var out []interface{}
	err := _RiverRegistryV1.contract.Call(opts, &out, "isOperator", operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_RiverRegistryV1 *RiverRegistryV1Session) IsOperator(operator common.Address) (bool, error) {
	return _RiverRegistryV1.Contract.IsOperator(&_RiverRegistryV1.CallOpts, operator)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_RiverRegistryV1 *RiverRegistryV1CallerSession) IsOperator(operator common.Address) (bool, error) {
	return _RiverRegistryV1.Contract.IsOperator(&_RiverRegistryV1.CallOpts, operator)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xe5d78f6a.
//
// Solidity: function allocateStream(string streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryV1 *RiverRegistryV1Transactor) AllocateStream(opts *bind.TransactOpts, streamId string, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryV1.contract.Transact(opts, "allocateStream", streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xe5d78f6a.
//
// Solidity: function allocateStream(string streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryV1 *RiverRegistryV1Session) AllocateStream(streamId string, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.AllocateStream(&_RiverRegistryV1.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xe5d78f6a.
//
// Solidity: function allocateStream(string streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryV1 *RiverRegistryV1TransactorSession) AllocateStream(streamId string, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.AllocateStream(&_RiverRegistryV1.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_RiverRegistryV1 *RiverRegistryV1Transactor) ApproveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryV1.contract.Transact(opts, "approveOperator", operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_RiverRegistryV1 *RiverRegistryV1Session) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.ApproveOperator(&_RiverRegistryV1.TransactOpts, operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_RiverRegistryV1 *RiverRegistryV1TransactorSession) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.ApproveOperator(&_RiverRegistryV1.TransactOpts, operator)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xbb9b342d.
//
// Solidity: function registerNode(address nodeAddress, string url) returns()
func (_RiverRegistryV1 *RiverRegistryV1Transactor) RegisterNode(opts *bind.TransactOpts, nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryV1.contract.Transact(opts, "registerNode", nodeAddress, url)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xbb9b342d.
//
// Solidity: function registerNode(address nodeAddress, string url) returns()
func (_RiverRegistryV1 *RiverRegistryV1Session) RegisterNode(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.RegisterNode(&_RiverRegistryV1.TransactOpts, nodeAddress, url)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xbb9b342d.
//
// Solidity: function registerNode(address nodeAddress, string url) returns()
func (_RiverRegistryV1 *RiverRegistryV1TransactorSession) RegisterNode(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.RegisterNode(&_RiverRegistryV1.TransactOpts, nodeAddress, url)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_RiverRegistryV1 *RiverRegistryV1Transactor) RemoveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryV1.contract.Transact(opts, "removeOperator", operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_RiverRegistryV1 *RiverRegistryV1Session) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.RemoveOperator(&_RiverRegistryV1.TransactOpts, operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_RiverRegistryV1 *RiverRegistryV1TransactorSession) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.RemoveOperator(&_RiverRegistryV1.TransactOpts, operator)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xfc7a9223.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamIdHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum) returns()
func (_RiverRegistryV1 *RiverRegistryV1Transactor) SetStreamLastMiniblock(opts *bind.TransactOpts, streamIdHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64) (*types.Transaction, error) {
	return _RiverRegistryV1.contract.Transact(opts, "setStreamLastMiniblock", streamIdHash, lastMiniblockHash, lastMiniblockNum)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xfc7a9223.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamIdHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum) returns()
func (_RiverRegistryV1 *RiverRegistryV1Session) SetStreamLastMiniblock(streamIdHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.SetStreamLastMiniblock(&_RiverRegistryV1.TransactOpts, streamIdHash, lastMiniblockHash, lastMiniblockNum)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xfc7a9223.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamIdHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum) returns()
func (_RiverRegistryV1 *RiverRegistryV1TransactorSession) SetStreamLastMiniblock(streamIdHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64) (*types.Transaction, error) {
	return _RiverRegistryV1.Contract.SetStreamLastMiniblock(&_RiverRegistryV1.TransactOpts, streamIdHash, lastMiniblockHash, lastMiniblockNum)
}

// RiverRegistryV1NodeAddedIterator is returned from FilterNodeAdded and is used to iterate over the raw logs and unpacked data for NodeAdded events raised by the RiverRegistryV1 contract.
type RiverRegistryV1NodeAddedIterator struct {
	Event *RiverRegistryV1NodeAdded // Event containing the contract specifics and raw log

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
func (it *RiverRegistryV1NodeAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryV1NodeAdded)
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
		it.Event = new(RiverRegistryV1NodeAdded)
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
func (it *RiverRegistryV1NodeAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryV1NodeAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryV1NodeAdded represents a NodeAdded event raised by the RiverRegistryV1 contract.
type RiverRegistryV1NodeAdded struct {
	NodeAddress common.Address
	Url         string
	Status      uint8
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeAdded is a free log retrieval operation binding the contract event 0xd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e561.
//
// Solidity: event NodeAdded(address indexed nodeAddress, string url, uint8 status)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) FilterNodeAdded(opts *bind.FilterOpts, nodeAddress []common.Address) (*RiverRegistryV1NodeAddedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.FilterLogs(opts, "NodeAdded", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1NodeAddedIterator{contract: _RiverRegistryV1.contract, event: "NodeAdded", logs: logs, sub: sub}, nil
}

// WatchNodeAdded is a free log subscription operation binding the contract event 0xd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e561.
//
// Solidity: event NodeAdded(address indexed nodeAddress, string url, uint8 status)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) WatchNodeAdded(opts *bind.WatchOpts, sink chan<- *RiverRegistryV1NodeAdded, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.WatchLogs(opts, "NodeAdded", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryV1NodeAdded)
				if err := _RiverRegistryV1.contract.UnpackLog(event, "NodeAdded", log); err != nil {
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

// ParseNodeAdded is a log parse operation binding the contract event 0xd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e561.
//
// Solidity: event NodeAdded(address indexed nodeAddress, string url, uint8 status)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) ParseNodeAdded(log types.Log) (*RiverRegistryV1NodeAdded, error) {
	event := new(RiverRegistryV1NodeAdded)
	if err := _RiverRegistryV1.contract.UnpackLog(event, "NodeAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryV1NodeStatusUpdatedIterator is returned from FilterNodeStatusUpdated and is used to iterate over the raw logs and unpacked data for NodeStatusUpdated events raised by the RiverRegistryV1 contract.
type RiverRegistryV1NodeStatusUpdatedIterator struct {
	Event *RiverRegistryV1NodeStatusUpdated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryV1NodeStatusUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryV1NodeStatusUpdated)
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
		it.Event = new(RiverRegistryV1NodeStatusUpdated)
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
func (it *RiverRegistryV1NodeStatusUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryV1NodeStatusUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryV1NodeStatusUpdated represents a NodeStatusUpdated event raised by the RiverRegistryV1 contract.
type RiverRegistryV1NodeStatusUpdated struct {
	NodeAddress common.Address
	Status      uint8
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeStatusUpdated is a free log retrieval operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) FilterNodeStatusUpdated(opts *bind.FilterOpts, nodeAddress []common.Address) (*RiverRegistryV1NodeStatusUpdatedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.FilterLogs(opts, "NodeStatusUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1NodeStatusUpdatedIterator{contract: _RiverRegistryV1.contract, event: "NodeStatusUpdated", logs: logs, sub: sub}, nil
}

// WatchNodeStatusUpdated is a free log subscription operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) WatchNodeStatusUpdated(opts *bind.WatchOpts, sink chan<- *RiverRegistryV1NodeStatusUpdated, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.WatchLogs(opts, "NodeStatusUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryV1NodeStatusUpdated)
				if err := _RiverRegistryV1.contract.UnpackLog(event, "NodeStatusUpdated", log); err != nil {
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

// ParseNodeStatusUpdated is a log parse operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) ParseNodeStatusUpdated(log types.Log) (*RiverRegistryV1NodeStatusUpdated, error) {
	event := new(RiverRegistryV1NodeStatusUpdated)
	if err := _RiverRegistryV1.contract.UnpackLog(event, "NodeStatusUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryV1NodeUrlUpdatedIterator is returned from FilterNodeUrlUpdated and is used to iterate over the raw logs and unpacked data for NodeUrlUpdated events raised by the RiverRegistryV1 contract.
type RiverRegistryV1NodeUrlUpdatedIterator struct {
	Event *RiverRegistryV1NodeUrlUpdated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryV1NodeUrlUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryV1NodeUrlUpdated)
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
		it.Event = new(RiverRegistryV1NodeUrlUpdated)
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
func (it *RiverRegistryV1NodeUrlUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryV1NodeUrlUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryV1NodeUrlUpdated represents a NodeUrlUpdated event raised by the RiverRegistryV1 contract.
type RiverRegistryV1NodeUrlUpdated struct {
	NodeAddress common.Address
	Url         string
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeUrlUpdated is a free log retrieval operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) FilterNodeUrlUpdated(opts *bind.FilterOpts, nodeAddress []common.Address) (*RiverRegistryV1NodeUrlUpdatedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.FilterLogs(opts, "NodeUrlUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1NodeUrlUpdatedIterator{contract: _RiverRegistryV1.contract, event: "NodeUrlUpdated", logs: logs, sub: sub}, nil
}

// WatchNodeUrlUpdated is a free log subscription operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) WatchNodeUrlUpdated(opts *bind.WatchOpts, sink chan<- *RiverRegistryV1NodeUrlUpdated, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.WatchLogs(opts, "NodeUrlUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryV1NodeUrlUpdated)
				if err := _RiverRegistryV1.contract.UnpackLog(event, "NodeUrlUpdated", log); err != nil {
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

// ParseNodeUrlUpdated is a log parse operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) ParseNodeUrlUpdated(log types.Log) (*RiverRegistryV1NodeUrlUpdated, error) {
	event := new(RiverRegistryV1NodeUrlUpdated)
	if err := _RiverRegistryV1.contract.UnpackLog(event, "NodeUrlUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryV1OperatorAddedIterator is returned from FilterOperatorAdded and is used to iterate over the raw logs and unpacked data for OperatorAdded events raised by the RiverRegistryV1 contract.
type RiverRegistryV1OperatorAddedIterator struct {
	Event *RiverRegistryV1OperatorAdded // Event containing the contract specifics and raw log

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
func (it *RiverRegistryV1OperatorAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryV1OperatorAdded)
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
		it.Event = new(RiverRegistryV1OperatorAdded)
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
func (it *RiverRegistryV1OperatorAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryV1OperatorAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryV1OperatorAdded represents a OperatorAdded event raised by the RiverRegistryV1 contract.
type RiverRegistryV1OperatorAdded struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorAdded is a free log retrieval operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) FilterOperatorAdded(opts *bind.FilterOpts, operatorAddress []common.Address) (*RiverRegistryV1OperatorAddedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.FilterLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1OperatorAddedIterator{contract: _RiverRegistryV1.contract, event: "OperatorAdded", logs: logs, sub: sub}, nil
}

// WatchOperatorAdded is a free log subscription operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) WatchOperatorAdded(opts *bind.WatchOpts, sink chan<- *RiverRegistryV1OperatorAdded, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.WatchLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryV1OperatorAdded)
				if err := _RiverRegistryV1.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
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

// ParseOperatorAdded is a log parse operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) ParseOperatorAdded(log types.Log) (*RiverRegistryV1OperatorAdded, error) {
	event := new(RiverRegistryV1OperatorAdded)
	if err := _RiverRegistryV1.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryV1OperatorRemovedIterator is returned from FilterOperatorRemoved and is used to iterate over the raw logs and unpacked data for OperatorRemoved events raised by the RiverRegistryV1 contract.
type RiverRegistryV1OperatorRemovedIterator struct {
	Event *RiverRegistryV1OperatorRemoved // Event containing the contract specifics and raw log

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
func (it *RiverRegistryV1OperatorRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryV1OperatorRemoved)
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
		it.Event = new(RiverRegistryV1OperatorRemoved)
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
func (it *RiverRegistryV1OperatorRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryV1OperatorRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryV1OperatorRemoved represents a OperatorRemoved event raised by the RiverRegistryV1 contract.
type RiverRegistryV1OperatorRemoved struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorRemoved is a free log retrieval operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) FilterOperatorRemoved(opts *bind.FilterOpts, operatorAddress []common.Address) (*RiverRegistryV1OperatorRemovedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.FilterLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1OperatorRemovedIterator{contract: _RiverRegistryV1.contract, event: "OperatorRemoved", logs: logs, sub: sub}, nil
}

// WatchOperatorRemoved is a free log subscription operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) WatchOperatorRemoved(opts *bind.WatchOpts, sink chan<- *RiverRegistryV1OperatorRemoved, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryV1.contract.WatchLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryV1OperatorRemoved)
				if err := _RiverRegistryV1.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
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

// ParseOperatorRemoved is a log parse operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) ParseOperatorRemoved(log types.Log) (*RiverRegistryV1OperatorRemoved, error) {
	event := new(RiverRegistryV1OperatorRemoved)
	if err := _RiverRegistryV1.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryV1StreamAllocatedIterator is returned from FilterStreamAllocated and is used to iterate over the raw logs and unpacked data for StreamAllocated events raised by the RiverRegistryV1 contract.
type RiverRegistryV1StreamAllocatedIterator struct {
	Event *RiverRegistryV1StreamAllocated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryV1StreamAllocatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryV1StreamAllocated)
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
		it.Event = new(RiverRegistryV1StreamAllocated)
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
func (it *RiverRegistryV1StreamAllocatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryV1StreamAllocatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryV1StreamAllocated represents a StreamAllocated event raised by the RiverRegistryV1 contract.
type RiverRegistryV1StreamAllocated struct {
	StreamId             string
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
	Raw                  types.Log // Blockchain specific contextual infos
}

// FilterStreamAllocated is a free log retrieval operation binding the contract event 0xa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e.
//
// Solidity: event StreamAllocated(string streamId, address[] nodes, bytes32 genesisMiniblockHash)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) FilterStreamAllocated(opts *bind.FilterOpts) (*RiverRegistryV1StreamAllocatedIterator, error) {

	logs, sub, err := _RiverRegistryV1.contract.FilterLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1StreamAllocatedIterator{contract: _RiverRegistryV1.contract, event: "StreamAllocated", logs: logs, sub: sub}, nil
}

// WatchStreamAllocated is a free log subscription operation binding the contract event 0xa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e.
//
// Solidity: event StreamAllocated(string streamId, address[] nodes, bytes32 genesisMiniblockHash)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) WatchStreamAllocated(opts *bind.WatchOpts, sink chan<- *RiverRegistryV1StreamAllocated) (event.Subscription, error) {

	logs, sub, err := _RiverRegistryV1.contract.WatchLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryV1StreamAllocated)
				if err := _RiverRegistryV1.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
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

// ParseStreamAllocated is a log parse operation binding the contract event 0xa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e.
//
// Solidity: event StreamAllocated(string streamId, address[] nodes, bytes32 genesisMiniblockHash)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) ParseStreamAllocated(log types.Log) (*RiverRegistryV1StreamAllocated, error) {
	event := new(RiverRegistryV1StreamAllocated)
	if err := _RiverRegistryV1.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryV1StreamLastMiniblockUpdatedIterator is returned from FilterStreamLastMiniblockUpdated and is used to iterate over the raw logs and unpacked data for StreamLastMiniblockUpdated events raised by the RiverRegistryV1 contract.
type RiverRegistryV1StreamLastMiniblockUpdatedIterator struct {
	Event *RiverRegistryV1StreamLastMiniblockUpdated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryV1StreamLastMiniblockUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryV1StreamLastMiniblockUpdated)
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
		it.Event = new(RiverRegistryV1StreamLastMiniblockUpdated)
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
func (it *RiverRegistryV1StreamLastMiniblockUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryV1StreamLastMiniblockUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryV1StreamLastMiniblockUpdated represents a StreamLastMiniblockUpdated event raised by the RiverRegistryV1 contract.
type RiverRegistryV1StreamLastMiniblockUpdated struct {
	StreamId          string
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	Raw               types.Log // Blockchain specific contextual infos
}

// FilterStreamLastMiniblockUpdated is a free log retrieval operation binding the contract event 0x751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a90865.
//
// Solidity: event StreamLastMiniblockUpdated(string streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) FilterStreamLastMiniblockUpdated(opts *bind.FilterOpts) (*RiverRegistryV1StreamLastMiniblockUpdatedIterator, error) {

	logs, sub, err := _RiverRegistryV1.contract.FilterLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryV1StreamLastMiniblockUpdatedIterator{contract: _RiverRegistryV1.contract, event: "StreamLastMiniblockUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamLastMiniblockUpdated is a free log subscription operation binding the contract event 0x751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a90865.
//
// Solidity: event StreamLastMiniblockUpdated(string streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) WatchStreamLastMiniblockUpdated(opts *bind.WatchOpts, sink chan<- *RiverRegistryV1StreamLastMiniblockUpdated) (event.Subscription, error) {

	logs, sub, err := _RiverRegistryV1.contract.WatchLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryV1StreamLastMiniblockUpdated)
				if err := _RiverRegistryV1.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
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

// ParseStreamLastMiniblockUpdated is a log parse operation binding the contract event 0x751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a90865.
//
// Solidity: event StreamLastMiniblockUpdated(string streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum)
func (_RiverRegistryV1 *RiverRegistryV1Filterer) ParseStreamLastMiniblockUpdated(log types.Log) (*RiverRegistryV1StreamLastMiniblockUpdated, error) {
	event := new(RiverRegistryV1StreamLastMiniblockUpdated)
	if err := _RiverRegistryV1.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
