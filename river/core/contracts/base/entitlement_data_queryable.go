// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base

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

// IEntitlementDataQueryableBaseEntitlementData is an auto generated low-level Go binding around an user-defined struct.
type IEntitlementDataQueryableBaseEntitlementData struct {
	EntitlementType string
	EntitlementData []byte
}

// EntitlementDataQueryableMetaData contains all meta data concerning the EntitlementDataQueryable contract.
var EntitlementDataQueryableMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"getChannelEntitlementDataByPermission\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"permission\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIEntitlementDataQueryableBase.EntitlementData[]\",\"components\":[{\"name\":\"entitlementType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getEntitlementDataByPermission\",\"inputs\":[{\"name\":\"permission\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIEntitlementDataQueryableBase.EntitlementData[]\",\"components\":[{\"name\":\"entitlementType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"}]",
}

// EntitlementDataQueryableABI is the input ABI used to generate the binding from.
// Deprecated: Use EntitlementDataQueryableMetaData.ABI instead.
var EntitlementDataQueryableABI = EntitlementDataQueryableMetaData.ABI

// EntitlementDataQueryable is an auto generated Go binding around an Ethereum contract.
type EntitlementDataQueryable struct {
	EntitlementDataQueryableCaller     // Read-only binding to the contract
	EntitlementDataQueryableTransactor // Write-only binding to the contract
	EntitlementDataQueryableFilterer   // Log filterer for contract events
}

// EntitlementDataQueryableCaller is an auto generated read-only Go binding around an Ethereum contract.
type EntitlementDataQueryableCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementDataQueryableTransactor is an auto generated write-only Go binding around an Ethereum contract.
type EntitlementDataQueryableTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementDataQueryableFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type EntitlementDataQueryableFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementDataQueryableSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type EntitlementDataQueryableSession struct {
	Contract     *EntitlementDataQueryable // Generic contract binding to set the session for
	CallOpts     bind.CallOpts             // Call options to use throughout this session
	TransactOpts bind.TransactOpts         // Transaction auth options to use throughout this session
}

// EntitlementDataQueryableCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type EntitlementDataQueryableCallerSession struct {
	Contract *EntitlementDataQueryableCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                   // Call options to use throughout this session
}

// EntitlementDataQueryableTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type EntitlementDataQueryableTransactorSession struct {
	Contract     *EntitlementDataQueryableTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                   // Transaction auth options to use throughout this session
}

// EntitlementDataQueryableRaw is an auto generated low-level Go binding around an Ethereum contract.
type EntitlementDataQueryableRaw struct {
	Contract *EntitlementDataQueryable // Generic contract binding to access the raw methods on
}

// EntitlementDataQueryableCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type EntitlementDataQueryableCallerRaw struct {
	Contract *EntitlementDataQueryableCaller // Generic read-only contract binding to access the raw methods on
}

// EntitlementDataQueryableTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type EntitlementDataQueryableTransactorRaw struct {
	Contract *EntitlementDataQueryableTransactor // Generic write-only contract binding to access the raw methods on
}

// NewEntitlementDataQueryable creates a new instance of EntitlementDataQueryable, bound to a specific deployed contract.
func NewEntitlementDataQueryable(address common.Address, backend bind.ContractBackend) (*EntitlementDataQueryable, error) {
	contract, err := bindEntitlementDataQueryable(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &EntitlementDataQueryable{EntitlementDataQueryableCaller: EntitlementDataQueryableCaller{contract: contract}, EntitlementDataQueryableTransactor: EntitlementDataQueryableTransactor{contract: contract}, EntitlementDataQueryableFilterer: EntitlementDataQueryableFilterer{contract: contract}}, nil
}

// NewEntitlementDataQueryableCaller creates a new read-only instance of EntitlementDataQueryable, bound to a specific deployed contract.
func NewEntitlementDataQueryableCaller(address common.Address, caller bind.ContractCaller) (*EntitlementDataQueryableCaller, error) {
	contract, err := bindEntitlementDataQueryable(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementDataQueryableCaller{contract: contract}, nil
}

// NewEntitlementDataQueryableTransactor creates a new write-only instance of EntitlementDataQueryable, bound to a specific deployed contract.
func NewEntitlementDataQueryableTransactor(address common.Address, transactor bind.ContractTransactor) (*EntitlementDataQueryableTransactor, error) {
	contract, err := bindEntitlementDataQueryable(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementDataQueryableTransactor{contract: contract}, nil
}

// NewEntitlementDataQueryableFilterer creates a new log filterer instance of EntitlementDataQueryable, bound to a specific deployed contract.
func NewEntitlementDataQueryableFilterer(address common.Address, filterer bind.ContractFilterer) (*EntitlementDataQueryableFilterer, error) {
	contract, err := bindEntitlementDataQueryable(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &EntitlementDataQueryableFilterer{contract: contract}, nil
}

// bindEntitlementDataQueryable binds a generic wrapper to an already deployed contract.
func bindEntitlementDataQueryable(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := EntitlementDataQueryableMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementDataQueryable *EntitlementDataQueryableRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementDataQueryable.Contract.EntitlementDataQueryableCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementDataQueryable *EntitlementDataQueryableRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementDataQueryable.Contract.EntitlementDataQueryableTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementDataQueryable *EntitlementDataQueryableRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementDataQueryable.Contract.EntitlementDataQueryableTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementDataQueryable *EntitlementDataQueryableCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementDataQueryable.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementDataQueryable *EntitlementDataQueryableTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementDataQueryable.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementDataQueryable *EntitlementDataQueryableTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementDataQueryable.Contract.contract.Transact(opts, method, params...)
}

// GetChannelEntitlementDataByPermission is a free data retrieval call binding the contract method 0x40cd83fb.
//
// Solidity: function getChannelEntitlementDataByPermission(bytes32 channelId, string permission) view returns((string,bytes)[])
func (_EntitlementDataQueryable *EntitlementDataQueryableCaller) GetChannelEntitlementDataByPermission(opts *bind.CallOpts, channelId [32]byte, permission string) ([]IEntitlementDataQueryableBaseEntitlementData, error) {
	var out []interface{}
	err := _EntitlementDataQueryable.contract.Call(opts, &out, "getChannelEntitlementDataByPermission", channelId, permission)

	if err != nil {
		return *new([]IEntitlementDataQueryableBaseEntitlementData), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementDataQueryableBaseEntitlementData)).(*[]IEntitlementDataQueryableBaseEntitlementData)

	return out0, err

}

// GetChannelEntitlementDataByPermission is a free data retrieval call binding the contract method 0x40cd83fb.
//
// Solidity: function getChannelEntitlementDataByPermission(bytes32 channelId, string permission) view returns((string,bytes)[])
func (_EntitlementDataQueryable *EntitlementDataQueryableSession) GetChannelEntitlementDataByPermission(channelId [32]byte, permission string) ([]IEntitlementDataQueryableBaseEntitlementData, error) {
	return _EntitlementDataQueryable.Contract.GetChannelEntitlementDataByPermission(&_EntitlementDataQueryable.CallOpts, channelId, permission)
}

// GetChannelEntitlementDataByPermission is a free data retrieval call binding the contract method 0x40cd83fb.
//
// Solidity: function getChannelEntitlementDataByPermission(bytes32 channelId, string permission) view returns((string,bytes)[])
func (_EntitlementDataQueryable *EntitlementDataQueryableCallerSession) GetChannelEntitlementDataByPermission(channelId [32]byte, permission string) ([]IEntitlementDataQueryableBaseEntitlementData, error) {
	return _EntitlementDataQueryable.Contract.GetChannelEntitlementDataByPermission(&_EntitlementDataQueryable.CallOpts, channelId, permission)
}

// GetEntitlementDataByPermission is a free data retrieval call binding the contract method 0xdb0a69a8.
//
// Solidity: function getEntitlementDataByPermission(string permission) view returns((string,bytes)[])
func (_EntitlementDataQueryable *EntitlementDataQueryableCaller) GetEntitlementDataByPermission(opts *bind.CallOpts, permission string) ([]IEntitlementDataQueryableBaseEntitlementData, error) {
	var out []interface{}
	err := _EntitlementDataQueryable.contract.Call(opts, &out, "getEntitlementDataByPermission", permission)

	if err != nil {
		return *new([]IEntitlementDataQueryableBaseEntitlementData), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementDataQueryableBaseEntitlementData)).(*[]IEntitlementDataQueryableBaseEntitlementData)

	return out0, err

}

// GetEntitlementDataByPermission is a free data retrieval call binding the contract method 0xdb0a69a8.
//
// Solidity: function getEntitlementDataByPermission(string permission) view returns((string,bytes)[])
func (_EntitlementDataQueryable *EntitlementDataQueryableSession) GetEntitlementDataByPermission(permission string) ([]IEntitlementDataQueryableBaseEntitlementData, error) {
	return _EntitlementDataQueryable.Contract.GetEntitlementDataByPermission(&_EntitlementDataQueryable.CallOpts, permission)
}

// GetEntitlementDataByPermission is a free data retrieval call binding the contract method 0xdb0a69a8.
//
// Solidity: function getEntitlementDataByPermission(string permission) view returns((string,bytes)[])
func (_EntitlementDataQueryable *EntitlementDataQueryableCallerSession) GetEntitlementDataByPermission(permission string) ([]IEntitlementDataQueryableBaseEntitlementData, error) {
	return _EntitlementDataQueryable.Contract.GetEntitlementDataByPermission(&_EntitlementDataQueryable.CallOpts, permission)
}
