// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_goerli_towns_entitlements

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

// IEntitlementsManagerBaseEntitlement is an auto generated low-level Go binding around an user-defined struct.
type IEntitlementsManagerBaseEntitlement struct {
	Name          string
	ModuleAddress common.Address
	ModuleType    string
	IsImmutable   bool
}

// BaseGoerliTownsEntitlementsMetaData contains all meta data concerning the BaseGoerliTownsEntitlements contract.
var BaseGoerliTownsEntitlementsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__ImmutableEntitlement\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementInterface\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"addEntitlementModule\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"entitlements\",\"type\":\"address[]\"}],\"name\":\"addImmutableEntitlements\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"getEntitlement\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsManagerBase.Entitlement\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getEntitlements\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsManagerBase.Entitlement[]\",\"name\":\"\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToChannel\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToTown\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"removeEntitlementModule\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// BaseGoerliTownsEntitlementsABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseGoerliTownsEntitlementsMetaData.ABI instead.
var BaseGoerliTownsEntitlementsABI = BaseGoerliTownsEntitlementsMetaData.ABI

// BaseGoerliTownsEntitlements is an auto generated Go binding around an Ethereum contract.
type BaseGoerliTownsEntitlements struct {
	BaseGoerliTownsEntitlementsCaller     // Read-only binding to the contract
	BaseGoerliTownsEntitlementsTransactor // Write-only binding to the contract
	BaseGoerliTownsEntitlementsFilterer   // Log filterer for contract events
}

// BaseGoerliTownsEntitlementsCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseGoerliTownsEntitlementsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsEntitlementsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseGoerliTownsEntitlementsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsEntitlementsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseGoerliTownsEntitlementsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsEntitlementsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseGoerliTownsEntitlementsSession struct {
	Contract     *BaseGoerliTownsEntitlements // Generic contract binding to set the session for
	CallOpts     bind.CallOpts                // Call options to use throughout this session
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// BaseGoerliTownsEntitlementsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseGoerliTownsEntitlementsCallerSession struct {
	Contract *BaseGoerliTownsEntitlementsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                      // Call options to use throughout this session
}

// BaseGoerliTownsEntitlementsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseGoerliTownsEntitlementsTransactorSession struct {
	Contract     *BaseGoerliTownsEntitlementsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                      // Transaction auth options to use throughout this session
}

// BaseGoerliTownsEntitlementsRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseGoerliTownsEntitlementsRaw struct {
	Contract *BaseGoerliTownsEntitlements // Generic contract binding to access the raw methods on
}

// BaseGoerliTownsEntitlementsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseGoerliTownsEntitlementsCallerRaw struct {
	Contract *BaseGoerliTownsEntitlementsCaller // Generic read-only contract binding to access the raw methods on
}

// BaseGoerliTownsEntitlementsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseGoerliTownsEntitlementsTransactorRaw struct {
	Contract *BaseGoerliTownsEntitlementsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseGoerliTownsEntitlements creates a new instance of BaseGoerliTownsEntitlements, bound to a specific deployed contract.
func NewBaseGoerliTownsEntitlements(address common.Address, backend bind.ContractBackend) (*BaseGoerliTownsEntitlements, error) {
	contract, err := bindBaseGoerliTownsEntitlements(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsEntitlements{BaseGoerliTownsEntitlementsCaller: BaseGoerliTownsEntitlementsCaller{contract: contract}, BaseGoerliTownsEntitlementsTransactor: BaseGoerliTownsEntitlementsTransactor{contract: contract}, BaseGoerliTownsEntitlementsFilterer: BaseGoerliTownsEntitlementsFilterer{contract: contract}}, nil
}

// NewBaseGoerliTownsEntitlementsCaller creates a new read-only instance of BaseGoerliTownsEntitlements, bound to a specific deployed contract.
func NewBaseGoerliTownsEntitlementsCaller(address common.Address, caller bind.ContractCaller) (*BaseGoerliTownsEntitlementsCaller, error) {
	contract, err := bindBaseGoerliTownsEntitlements(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsEntitlementsCaller{contract: contract}, nil
}

// NewBaseGoerliTownsEntitlementsTransactor creates a new write-only instance of BaseGoerliTownsEntitlements, bound to a specific deployed contract.
func NewBaseGoerliTownsEntitlementsTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseGoerliTownsEntitlementsTransactor, error) {
	contract, err := bindBaseGoerliTownsEntitlements(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsEntitlementsTransactor{contract: contract}, nil
}

// NewBaseGoerliTownsEntitlementsFilterer creates a new log filterer instance of BaseGoerliTownsEntitlements, bound to a specific deployed contract.
func NewBaseGoerliTownsEntitlementsFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseGoerliTownsEntitlementsFilterer, error) {
	contract, err := bindBaseGoerliTownsEntitlements(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsEntitlementsFilterer{contract: contract}, nil
}

// bindBaseGoerliTownsEntitlements binds a generic wrapper to an already deployed contract.
func bindBaseGoerliTownsEntitlements(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseGoerliTownsEntitlementsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsEntitlements.Contract.BaseGoerliTownsEntitlementsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.BaseGoerliTownsEntitlementsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.BaseGoerliTownsEntitlementsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsEntitlements.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCaller) GetEntitlement(opts *bind.CallOpts, entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _BaseGoerliTownsEntitlements.contract.Call(opts, &out, "getEntitlement", entitlement)

	if err != nil {
		return *new(IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementsManagerBaseEntitlement)).(*IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _BaseGoerliTownsEntitlements.Contract.GetEntitlement(&_BaseGoerliTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCallerSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _BaseGoerliTownsEntitlements.Contract.GetEntitlement(&_BaseGoerliTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCaller) GetEntitlements(opts *bind.CallOpts) ([]IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _BaseGoerliTownsEntitlements.contract.Call(opts, &out, "getEntitlements")

	if err != nil {
		return *new([]IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementsManagerBaseEntitlement)).(*[]IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _BaseGoerliTownsEntitlements.Contract.GetEntitlements(&_BaseGoerliTownsEntitlements.CallOpts)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCallerSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _BaseGoerliTownsEntitlements.Contract.GetEntitlements(&_BaseGoerliTownsEntitlements.CallOpts)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCaller) IsEntitledToChannel(opts *bind.CallOpts, channelId string, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _BaseGoerliTownsEntitlements.contract.Call(opts, &out, "isEntitledToChannel", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _BaseGoerliTownsEntitlements.Contract.IsEntitledToChannel(&_BaseGoerliTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCallerSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _BaseGoerliTownsEntitlements.Contract.IsEntitledToChannel(&_BaseGoerliTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCaller) IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _BaseGoerliTownsEntitlements.contract.Call(opts, &out, "isEntitledToTown", user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _BaseGoerliTownsEntitlements.Contract.IsEntitledToTown(&_BaseGoerliTownsEntitlements.CallOpts, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsCallerSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _BaseGoerliTownsEntitlements.Contract.IsEntitledToTown(&_BaseGoerliTownsEntitlements.CallOpts, user, permission)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactor) AddEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.contract.Transact(opts, "addEntitlementModule", entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.AddEntitlementModule(&_BaseGoerliTownsEntitlements.TransactOpts, entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactorSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.AddEntitlementModule(&_BaseGoerliTownsEntitlements.TransactOpts, entitlement)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactor) AddImmutableEntitlements(opts *bind.TransactOpts, entitlements []common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.contract.Transact(opts, "addImmutableEntitlements", entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.AddImmutableEntitlements(&_BaseGoerliTownsEntitlements.TransactOpts, entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactorSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.AddImmutableEntitlements(&_BaseGoerliTownsEntitlements.TransactOpts, entitlements)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactor) RemoveEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.contract.Transact(opts, "removeEntitlementModule", entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.RemoveEntitlementModule(&_BaseGoerliTownsEntitlements.TransactOpts, entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsTransactorSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsEntitlements.Contract.RemoveEntitlementModule(&_BaseGoerliTownsEntitlements.TransactOpts, entitlement)
}

// BaseGoerliTownsEntitlementsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the BaseGoerliTownsEntitlements contract.
type BaseGoerliTownsEntitlementsOwnershipTransferredIterator struct {
	Event *BaseGoerliTownsEntitlementsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsEntitlementsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsEntitlementsOwnershipTransferred)
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
		it.Event = new(BaseGoerliTownsEntitlementsOwnershipTransferred)
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
func (it *BaseGoerliTownsEntitlementsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsEntitlementsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsEntitlementsOwnershipTransferred represents a OwnershipTransferred event raised by the BaseGoerliTownsEntitlements contract.
type BaseGoerliTownsEntitlementsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*BaseGoerliTownsEntitlementsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseGoerliTownsEntitlements.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsEntitlementsOwnershipTransferredIterator{contract: _BaseGoerliTownsEntitlements.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsEntitlementsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseGoerliTownsEntitlements.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsEntitlementsOwnershipTransferred)
				if err := _BaseGoerliTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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

// ParseOwnershipTransferred is a log parse operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) ParseOwnershipTransferred(log types.Log) (*BaseGoerliTownsEntitlementsOwnershipTransferred, error) {
	event := new(BaseGoerliTownsEntitlementsOwnershipTransferred)
	if err := _BaseGoerliTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsEntitlementsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseGoerliTownsEntitlements contract.
type BaseGoerliTownsEntitlementsPausedIterator struct {
	Event *BaseGoerliTownsEntitlementsPaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsEntitlementsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsEntitlementsPaused)
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
		it.Event = new(BaseGoerliTownsEntitlementsPaused)
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
func (it *BaseGoerliTownsEntitlementsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsEntitlementsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsEntitlementsPaused represents a Paused event raised by the BaseGoerliTownsEntitlements contract.
type BaseGoerliTownsEntitlementsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseGoerliTownsEntitlementsPausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsEntitlements.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsEntitlementsPausedIterator{contract: _BaseGoerliTownsEntitlements.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsEntitlementsPaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsEntitlements.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsEntitlementsPaused)
				if err := _BaseGoerliTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
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

// ParsePaused is a log parse operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) ParsePaused(log types.Log) (*BaseGoerliTownsEntitlementsPaused, error) {
	event := new(BaseGoerliTownsEntitlementsPaused)
	if err := _BaseGoerliTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsEntitlementsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseGoerliTownsEntitlements contract.
type BaseGoerliTownsEntitlementsUnpausedIterator struct {
	Event *BaseGoerliTownsEntitlementsUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsEntitlementsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsEntitlementsUnpaused)
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
		it.Event = new(BaseGoerliTownsEntitlementsUnpaused)
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
func (it *BaseGoerliTownsEntitlementsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsEntitlementsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsEntitlementsUnpaused represents a Unpaused event raised by the BaseGoerliTownsEntitlements contract.
type BaseGoerliTownsEntitlementsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseGoerliTownsEntitlementsUnpausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsEntitlements.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsEntitlementsUnpausedIterator{contract: _BaseGoerliTownsEntitlements.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsEntitlementsUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsEntitlements.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsEntitlementsUnpaused)
				if err := _BaseGoerliTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
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

// ParseUnpaused is a log parse operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsEntitlements *BaseGoerliTownsEntitlementsFilterer) ParseUnpaused(log types.Log) (*BaseGoerliTownsEntitlementsUnpaused, error) {
	event := new(BaseGoerliTownsEntitlementsUnpaused)
	if err := _BaseGoerliTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
