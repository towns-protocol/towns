// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_towns_entitlements

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

// BaseTownsEntitlementsMetaData contains all meta data concerning the BaseTownsEntitlements contract.
var BaseTownsEntitlementsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__ImmutableEntitlement\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementInterface\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"addEntitlementModule\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"entitlements\",\"type\":\"address[]\"}],\"name\":\"addImmutableEntitlements\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"getEntitlement\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsManagerBase.Entitlement\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getEntitlements\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsManagerBase.Entitlement[]\",\"name\":\"\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToChannel\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToTown\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"removeEntitlementModule\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// BaseTownsEntitlementsABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseTownsEntitlementsMetaData.ABI instead.
var BaseTownsEntitlementsABI = BaseTownsEntitlementsMetaData.ABI

// BaseTownsEntitlements is an auto generated Go binding around an Ethereum contract.
type BaseTownsEntitlements struct {
	BaseTownsEntitlementsCaller     // Read-only binding to the contract
	BaseTownsEntitlementsTransactor // Write-only binding to the contract
	BaseTownsEntitlementsFilterer   // Log filterer for contract events
}

// BaseTownsEntitlementsCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseTownsEntitlementsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsEntitlementsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseTownsEntitlementsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsEntitlementsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseTownsEntitlementsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsEntitlementsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseTownsEntitlementsSession struct {
	Contract     *BaseTownsEntitlements // Generic contract binding to set the session for
	CallOpts     bind.CallOpts          // Call options to use throughout this session
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// BaseTownsEntitlementsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseTownsEntitlementsCallerSession struct {
	Contract *BaseTownsEntitlementsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                // Call options to use throughout this session
}

// BaseTownsEntitlementsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseTownsEntitlementsTransactorSession struct {
	Contract     *BaseTownsEntitlementsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                // Transaction auth options to use throughout this session
}

// BaseTownsEntitlementsRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseTownsEntitlementsRaw struct {
	Contract *BaseTownsEntitlements // Generic contract binding to access the raw methods on
}

// BaseTownsEntitlementsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseTownsEntitlementsCallerRaw struct {
	Contract *BaseTownsEntitlementsCaller // Generic read-only contract binding to access the raw methods on
}

// BaseTownsEntitlementsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseTownsEntitlementsTransactorRaw struct {
	Contract *BaseTownsEntitlementsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseTownsEntitlements creates a new instance of BaseTownsEntitlements, bound to a specific deployed contract.
func NewBaseTownsEntitlements(address common.Address, backend bind.ContractBackend) (*BaseTownsEntitlements, error) {
	contract, err := bindBaseTownsEntitlements(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseTownsEntitlements{BaseTownsEntitlementsCaller: BaseTownsEntitlementsCaller{contract: contract}, BaseTownsEntitlementsTransactor: BaseTownsEntitlementsTransactor{contract: contract}, BaseTownsEntitlementsFilterer: BaseTownsEntitlementsFilterer{contract: contract}}, nil
}

// NewBaseTownsEntitlementsCaller creates a new read-only instance of BaseTownsEntitlements, bound to a specific deployed contract.
func NewBaseTownsEntitlementsCaller(address common.Address, caller bind.ContractCaller) (*BaseTownsEntitlementsCaller, error) {
	contract, err := bindBaseTownsEntitlements(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsEntitlementsCaller{contract: contract}, nil
}

// NewBaseTownsEntitlementsTransactor creates a new write-only instance of BaseTownsEntitlements, bound to a specific deployed contract.
func NewBaseTownsEntitlementsTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseTownsEntitlementsTransactor, error) {
	contract, err := bindBaseTownsEntitlements(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsEntitlementsTransactor{contract: contract}, nil
}

// NewBaseTownsEntitlementsFilterer creates a new log filterer instance of BaseTownsEntitlements, bound to a specific deployed contract.
func NewBaseTownsEntitlementsFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseTownsEntitlementsFilterer, error) {
	contract, err := bindBaseTownsEntitlements(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseTownsEntitlementsFilterer{contract: contract}, nil
}

// bindBaseTownsEntitlements binds a generic wrapper to an already deployed contract.
func bindBaseTownsEntitlements(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseTownsEntitlementsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsEntitlements *BaseTownsEntitlementsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsEntitlements.Contract.BaseTownsEntitlementsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsEntitlements *BaseTownsEntitlementsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.BaseTownsEntitlementsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsEntitlements *BaseTownsEntitlementsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.BaseTownsEntitlementsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsEntitlements *BaseTownsEntitlementsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsEntitlements.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_BaseTownsEntitlements *BaseTownsEntitlementsCaller) GetEntitlement(opts *bind.CallOpts, entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _BaseTownsEntitlements.contract.Call(opts, &out, "getEntitlement", entitlement)

	if err != nil {
		return *new(IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementsManagerBaseEntitlement)).(*IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_BaseTownsEntitlements *BaseTownsEntitlementsSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _BaseTownsEntitlements.Contract.GetEntitlement(&_BaseTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_BaseTownsEntitlements *BaseTownsEntitlementsCallerSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _BaseTownsEntitlements.Contract.GetEntitlement(&_BaseTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_BaseTownsEntitlements *BaseTownsEntitlementsCaller) GetEntitlements(opts *bind.CallOpts) ([]IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _BaseTownsEntitlements.contract.Call(opts, &out, "getEntitlements")

	if err != nil {
		return *new([]IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementsManagerBaseEntitlement)).(*[]IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_BaseTownsEntitlements *BaseTownsEntitlementsSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _BaseTownsEntitlements.Contract.GetEntitlements(&_BaseTownsEntitlements.CallOpts)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_BaseTownsEntitlements *BaseTownsEntitlementsCallerSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _BaseTownsEntitlements.Contract.GetEntitlements(&_BaseTownsEntitlements.CallOpts)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_BaseTownsEntitlements *BaseTownsEntitlementsCaller) IsEntitledToChannel(opts *bind.CallOpts, channelId string, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _BaseTownsEntitlements.contract.Call(opts, &out, "isEntitledToChannel", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_BaseTownsEntitlements *BaseTownsEntitlementsSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _BaseTownsEntitlements.Contract.IsEntitledToChannel(&_BaseTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_BaseTownsEntitlements *BaseTownsEntitlementsCallerSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _BaseTownsEntitlements.Contract.IsEntitledToChannel(&_BaseTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_BaseTownsEntitlements *BaseTownsEntitlementsCaller) IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _BaseTownsEntitlements.contract.Call(opts, &out, "isEntitledToTown", user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_BaseTownsEntitlements *BaseTownsEntitlementsSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _BaseTownsEntitlements.Contract.IsEntitledToTown(&_BaseTownsEntitlements.CallOpts, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_BaseTownsEntitlements *BaseTownsEntitlementsCallerSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _BaseTownsEntitlements.Contract.IsEntitledToTown(&_BaseTownsEntitlements.CallOpts, user, permission)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactor) AddEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.contract.Transact(opts, "addEntitlementModule", entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.AddEntitlementModule(&_BaseTownsEntitlements.TransactOpts, entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactorSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.AddEntitlementModule(&_BaseTownsEntitlements.TransactOpts, entitlement)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactor) AddImmutableEntitlements(opts *bind.TransactOpts, entitlements []common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.contract.Transact(opts, "addImmutableEntitlements", entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.AddImmutableEntitlements(&_BaseTownsEntitlements.TransactOpts, entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactorSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.AddImmutableEntitlements(&_BaseTownsEntitlements.TransactOpts, entitlements)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactor) RemoveEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.contract.Transact(opts, "removeEntitlementModule", entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.RemoveEntitlementModule(&_BaseTownsEntitlements.TransactOpts, entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_BaseTownsEntitlements *BaseTownsEntitlementsTransactorSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _BaseTownsEntitlements.Contract.RemoveEntitlementModule(&_BaseTownsEntitlements.TransactOpts, entitlement)
}

// BaseTownsEntitlementsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the BaseTownsEntitlements contract.
type BaseTownsEntitlementsOwnershipTransferredIterator struct {
	Event *BaseTownsEntitlementsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *BaseTownsEntitlementsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsEntitlementsOwnershipTransferred)
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
		it.Event = new(BaseTownsEntitlementsOwnershipTransferred)
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
func (it *BaseTownsEntitlementsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsEntitlementsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsEntitlementsOwnershipTransferred represents a OwnershipTransferred event raised by the BaseTownsEntitlements contract.
type BaseTownsEntitlementsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*BaseTownsEntitlementsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseTownsEntitlements.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsEntitlementsOwnershipTransferredIterator{contract: _BaseTownsEntitlements.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *BaseTownsEntitlementsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseTownsEntitlements.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsEntitlementsOwnershipTransferred)
				if err := _BaseTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) ParseOwnershipTransferred(log types.Log) (*BaseTownsEntitlementsOwnershipTransferred, error) {
	event := new(BaseTownsEntitlementsOwnershipTransferred)
	if err := _BaseTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsEntitlementsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseTownsEntitlements contract.
type BaseTownsEntitlementsPausedIterator struct {
	Event *BaseTownsEntitlementsPaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsEntitlementsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsEntitlementsPaused)
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
		it.Event = new(BaseTownsEntitlementsPaused)
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
func (it *BaseTownsEntitlementsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsEntitlementsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsEntitlementsPaused represents a Paused event raised by the BaseTownsEntitlements contract.
type BaseTownsEntitlementsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseTownsEntitlementsPausedIterator, error) {

	logs, sub, err := _BaseTownsEntitlements.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsEntitlementsPausedIterator{contract: _BaseTownsEntitlements.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseTownsEntitlementsPaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsEntitlements.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsEntitlementsPaused)
				if err := _BaseTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) ParsePaused(log types.Log) (*BaseTownsEntitlementsPaused, error) {
	event := new(BaseTownsEntitlementsPaused)
	if err := _BaseTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsEntitlementsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseTownsEntitlements contract.
type BaseTownsEntitlementsUnpausedIterator struct {
	Event *BaseTownsEntitlementsUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsEntitlementsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsEntitlementsUnpaused)
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
		it.Event = new(BaseTownsEntitlementsUnpaused)
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
func (it *BaseTownsEntitlementsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsEntitlementsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsEntitlementsUnpaused represents a Unpaused event raised by the BaseTownsEntitlements contract.
type BaseTownsEntitlementsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseTownsEntitlementsUnpausedIterator, error) {

	logs, sub, err := _BaseTownsEntitlements.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsEntitlementsUnpausedIterator{contract: _BaseTownsEntitlements.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseTownsEntitlementsUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsEntitlements.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsEntitlementsUnpaused)
				if err := _BaseTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_BaseTownsEntitlements *BaseTownsEntitlementsFilterer) ParseUnpaused(log types.Log) (*BaseTownsEntitlementsUnpaused, error) {
	event := new(BaseTownsEntitlementsUnpaused)
	if err := _BaseTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
