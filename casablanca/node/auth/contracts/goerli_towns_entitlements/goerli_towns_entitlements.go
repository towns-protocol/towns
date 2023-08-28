// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package goerli_towns_entitlements

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
)

// IEntitlementsBaseEntitlement is an auto generated low-level Go binding around an user-defined struct.
type IEntitlementsBaseEntitlement struct {
	Name          string
	ModuleAddress common.Address
	ModuleType    string
	IsImmutable   bool
}

// GoerliTownsEntitlementsMetaData contains all meta data concerning the GoerliTownsEntitlements contract.
var GoerliTownsEntitlementsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__ImmutableEntitlement\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementInterface\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"addEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"entitlements\",\"type\":\"address[]\"}],\"name\":\"addImmutableEntitlements\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"getEntitlement\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsBase.Entitlement\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getEntitlements\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsBase.Entitlement[]\",\"name\":\"\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToChannel\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToTown\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"removeEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// GoerliTownsEntitlementsABI is the input ABI used to generate the binding from.
// Deprecated: Use GoerliTownsEntitlementsMetaData.ABI instead.
var GoerliTownsEntitlementsABI = GoerliTownsEntitlementsMetaData.ABI

// GoerliTownsEntitlements is an auto generated Go binding around an Ethereum contract.
type GoerliTownsEntitlements struct {
	GoerliTownsEntitlementsCaller     // Read-only binding to the contract
	GoerliTownsEntitlementsTransactor // Write-only binding to the contract
	GoerliTownsEntitlementsFilterer   // Log filterer for contract events
}

// GoerliTownsEntitlementsCaller is an auto generated read-only Go binding around an Ethereum contract.
type GoerliTownsEntitlementsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsEntitlementsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type GoerliTownsEntitlementsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsEntitlementsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type GoerliTownsEntitlementsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsEntitlementsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type GoerliTownsEntitlementsSession struct {
	Contract     *GoerliTownsEntitlements // Generic contract binding to set the session for
	CallOpts     bind.CallOpts            // Call options to use throughout this session
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// GoerliTownsEntitlementsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type GoerliTownsEntitlementsCallerSession struct {
	Contract *GoerliTownsEntitlementsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                  // Call options to use throughout this session
}

// GoerliTownsEntitlementsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type GoerliTownsEntitlementsTransactorSession struct {
	Contract     *GoerliTownsEntitlementsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                  // Transaction auth options to use throughout this session
}

// GoerliTownsEntitlementsRaw is an auto generated low-level Go binding around an Ethereum contract.
type GoerliTownsEntitlementsRaw struct {
	Contract *GoerliTownsEntitlements // Generic contract binding to access the raw methods on
}

// GoerliTownsEntitlementsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type GoerliTownsEntitlementsCallerRaw struct {
	Contract *GoerliTownsEntitlementsCaller // Generic read-only contract binding to access the raw methods on
}

// GoerliTownsEntitlementsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type GoerliTownsEntitlementsTransactorRaw struct {
	Contract *GoerliTownsEntitlementsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewGoerliTownsEntitlements creates a new instance of GoerliTownsEntitlements, bound to a specific deployed contract.
func NewGoerliTownsEntitlements(address common.Address, backend bind.ContractBackend) (*GoerliTownsEntitlements, error) {
	contract, err := bindGoerliTownsEntitlements(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsEntitlements{GoerliTownsEntitlementsCaller: GoerliTownsEntitlementsCaller{contract: contract}, GoerliTownsEntitlementsTransactor: GoerliTownsEntitlementsTransactor{contract: contract}, GoerliTownsEntitlementsFilterer: GoerliTownsEntitlementsFilterer{contract: contract}}, nil
}

// NewGoerliTownsEntitlementsCaller creates a new read-only instance of GoerliTownsEntitlements, bound to a specific deployed contract.
func NewGoerliTownsEntitlementsCaller(address common.Address, caller bind.ContractCaller) (*GoerliTownsEntitlementsCaller, error) {
	contract, err := bindGoerliTownsEntitlements(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsEntitlementsCaller{contract: contract}, nil
}

// NewGoerliTownsEntitlementsTransactor creates a new write-only instance of GoerliTownsEntitlements, bound to a specific deployed contract.
func NewGoerliTownsEntitlementsTransactor(address common.Address, transactor bind.ContractTransactor) (*GoerliTownsEntitlementsTransactor, error) {
	contract, err := bindGoerliTownsEntitlements(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsEntitlementsTransactor{contract: contract}, nil
}

// NewGoerliTownsEntitlementsFilterer creates a new log filterer instance of GoerliTownsEntitlements, bound to a specific deployed contract.
func NewGoerliTownsEntitlementsFilterer(address common.Address, filterer bind.ContractFilterer) (*GoerliTownsEntitlementsFilterer, error) {
	contract, err := bindGoerliTownsEntitlements(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsEntitlementsFilterer{contract: contract}, nil
}

// bindGoerliTownsEntitlements binds a generic wrapper to an already deployed contract.
func bindGoerliTownsEntitlements(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(GoerliTownsEntitlementsABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsEntitlements.Contract.GoerliTownsEntitlementsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.GoerliTownsEntitlementsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.GoerliTownsEntitlementsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsEntitlements.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCaller) GetEntitlement(opts *bind.CallOpts, entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	var out []interface{}
	err := _GoerliTownsEntitlements.contract.Call(opts, &out, "getEntitlement", entitlement)

	if err != nil {
		return *new(IEntitlementsBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementsBaseEntitlement)).(*IEntitlementsBaseEntitlement)

	return out0, err

}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsSession) GetEntitlement(entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	return _GoerliTownsEntitlements.Contract.GetEntitlement(&_GoerliTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCallerSession) GetEntitlement(entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	return _GoerliTownsEntitlements.Contract.GetEntitlement(&_GoerliTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCaller) GetEntitlements(opts *bind.CallOpts) ([]IEntitlementsBaseEntitlement, error) {
	var out []interface{}
	err := _GoerliTownsEntitlements.contract.Call(opts, &out, "getEntitlements")

	if err != nil {
		return *new([]IEntitlementsBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementsBaseEntitlement)).(*[]IEntitlementsBaseEntitlement)

	return out0, err

}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsSession) GetEntitlements() ([]IEntitlementsBaseEntitlement, error) {
	return _GoerliTownsEntitlements.Contract.GetEntitlements(&_GoerliTownsEntitlements.CallOpts)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCallerSession) GetEntitlements() ([]IEntitlementsBaseEntitlement, error) {
	return _GoerliTownsEntitlements.Contract.GetEntitlements(&_GoerliTownsEntitlements.CallOpts)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCaller) IsEntitledToChannel(opts *bind.CallOpts, channelId string, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _GoerliTownsEntitlements.contract.Call(opts, &out, "isEntitledToChannel", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _GoerliTownsEntitlements.Contract.IsEntitledToChannel(&_GoerliTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCallerSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _GoerliTownsEntitlements.Contract.IsEntitledToChannel(&_GoerliTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCaller) IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _GoerliTownsEntitlements.contract.Call(opts, &out, "isEntitledToTown", user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _GoerliTownsEntitlements.Contract.IsEntitledToTown(&_GoerliTownsEntitlements.CallOpts, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsCallerSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _GoerliTownsEntitlements.Contract.IsEntitledToTown(&_GoerliTownsEntitlements.CallOpts, user, permission)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactor) AddEntitlement(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.contract.Transact(opts, "addEntitlement", entitlement)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsSession) AddEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.AddEntitlement(&_GoerliTownsEntitlements.TransactOpts, entitlement)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactorSession) AddEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.AddEntitlement(&_GoerliTownsEntitlements.TransactOpts, entitlement)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactor) AddImmutableEntitlements(opts *bind.TransactOpts, entitlements []common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.contract.Transact(opts, "addImmutableEntitlements", entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.AddImmutableEntitlements(&_GoerliTownsEntitlements.TransactOpts, entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactorSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.AddImmutableEntitlements(&_GoerliTownsEntitlements.TransactOpts, entitlements)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactor) RemoveEntitlement(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.contract.Transact(opts, "removeEntitlement", entitlement)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsSession) RemoveEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.RemoveEntitlement(&_GoerliTownsEntitlements.TransactOpts, entitlement)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsTransactorSession) RemoveEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _GoerliTownsEntitlements.Contract.RemoveEntitlement(&_GoerliTownsEntitlements.TransactOpts, entitlement)
}

// GoerliTownsEntitlementsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the GoerliTownsEntitlements contract.
type GoerliTownsEntitlementsOwnershipTransferredIterator struct {
	Event *GoerliTownsEntitlementsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *GoerliTownsEntitlementsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsEntitlementsOwnershipTransferred)
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
		it.Event = new(GoerliTownsEntitlementsOwnershipTransferred)
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
func (it *GoerliTownsEntitlementsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsEntitlementsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsEntitlementsOwnershipTransferred represents a OwnershipTransferred event raised by the GoerliTownsEntitlements contract.
type GoerliTownsEntitlementsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*GoerliTownsEntitlementsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _GoerliTownsEntitlements.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsEntitlementsOwnershipTransferredIterator{contract: _GoerliTownsEntitlements.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *GoerliTownsEntitlementsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _GoerliTownsEntitlements.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsEntitlementsOwnershipTransferred)
				if err := _GoerliTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) ParseOwnershipTransferred(log types.Log) (*GoerliTownsEntitlementsOwnershipTransferred, error) {
	event := new(GoerliTownsEntitlementsOwnershipTransferred)
	if err := _GoerliTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsEntitlementsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the GoerliTownsEntitlements contract.
type GoerliTownsEntitlementsPausedIterator struct {
	Event *GoerliTownsEntitlementsPaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsEntitlementsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsEntitlementsPaused)
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
		it.Event = new(GoerliTownsEntitlementsPaused)
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
func (it *GoerliTownsEntitlementsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsEntitlementsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsEntitlementsPaused represents a Paused event raised by the GoerliTownsEntitlements contract.
type GoerliTownsEntitlementsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) FilterPaused(opts *bind.FilterOpts) (*GoerliTownsEntitlementsPausedIterator, error) {

	logs, sub, err := _GoerliTownsEntitlements.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsEntitlementsPausedIterator{contract: _GoerliTownsEntitlements.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsEntitlementsPaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsEntitlements.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsEntitlementsPaused)
				if err := _GoerliTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) ParsePaused(log types.Log) (*GoerliTownsEntitlementsPaused, error) {
	event := new(GoerliTownsEntitlementsPaused)
	if err := _GoerliTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsEntitlementsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the GoerliTownsEntitlements contract.
type GoerliTownsEntitlementsUnpausedIterator struct {
	Event *GoerliTownsEntitlementsUnpaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsEntitlementsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsEntitlementsUnpaused)
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
		it.Event = new(GoerliTownsEntitlementsUnpaused)
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
func (it *GoerliTownsEntitlementsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsEntitlementsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsEntitlementsUnpaused represents a Unpaused event raised by the GoerliTownsEntitlements contract.
type GoerliTownsEntitlementsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*GoerliTownsEntitlementsUnpausedIterator, error) {

	logs, sub, err := _GoerliTownsEntitlements.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsEntitlementsUnpausedIterator{contract: _GoerliTownsEntitlements.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsEntitlementsUnpaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsEntitlements.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsEntitlementsUnpaused)
				if err := _GoerliTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_GoerliTownsEntitlements *GoerliTownsEntitlementsFilterer) ParseUnpaused(log types.Log) (*GoerliTownsEntitlementsUnpaused, error) {
	event := new(GoerliTownsEntitlementsUnpaused)
	if err := _GoerliTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
