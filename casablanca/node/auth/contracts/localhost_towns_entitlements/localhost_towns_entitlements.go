// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_towns_entitlements

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

// IEntitlementsBaseEntitlement is an auto generated low-level Go binding around an user-defined struct.
type IEntitlementsBaseEntitlement struct {
	Name          string
	ModuleAddress common.Address
	ModuleType    string
	IsImmutable   bool
}

// LocalhostTownsEntitlementsMetaData contains all meta data concerning the LocalhostTownsEntitlements contract.
var LocalhostTownsEntitlementsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__ImmutableEntitlement\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementInterface\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"addEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"entitlements\",\"type\":\"address[]\"}],\"name\":\"addImmutableEntitlements\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"getEntitlement\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsBase.Entitlement\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getEntitlements\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsBase.Entitlement[]\",\"name\":\"\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToChannel\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToTown\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"removeEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// LocalhostTownsEntitlementsABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostTownsEntitlementsMetaData.ABI instead.
var LocalhostTownsEntitlementsABI = LocalhostTownsEntitlementsMetaData.ABI

// LocalhostTownsEntitlements is an auto generated Go binding around an Ethereum contract.
type LocalhostTownsEntitlements struct {
	LocalhostTownsEntitlementsCaller     // Read-only binding to the contract
	LocalhostTownsEntitlementsTransactor // Write-only binding to the contract
	LocalhostTownsEntitlementsFilterer   // Log filterer for contract events
}

// LocalhostTownsEntitlementsCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostTownsEntitlementsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsEntitlementsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostTownsEntitlementsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsEntitlementsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostTownsEntitlementsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsEntitlementsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostTownsEntitlementsSession struct {
	Contract     *LocalhostTownsEntitlements // Generic contract binding to set the session for
	CallOpts     bind.CallOpts               // Call options to use throughout this session
	TransactOpts bind.TransactOpts           // Transaction auth options to use throughout this session
}

// LocalhostTownsEntitlementsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostTownsEntitlementsCallerSession struct {
	Contract *LocalhostTownsEntitlementsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                     // Call options to use throughout this session
}

// LocalhostTownsEntitlementsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostTownsEntitlementsTransactorSession struct {
	Contract     *LocalhostTownsEntitlementsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                     // Transaction auth options to use throughout this session
}

// LocalhostTownsEntitlementsRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostTownsEntitlementsRaw struct {
	Contract *LocalhostTownsEntitlements // Generic contract binding to access the raw methods on
}

// LocalhostTownsEntitlementsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostTownsEntitlementsCallerRaw struct {
	Contract *LocalhostTownsEntitlementsCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostTownsEntitlementsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostTownsEntitlementsTransactorRaw struct {
	Contract *LocalhostTownsEntitlementsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostTownsEntitlements creates a new instance of LocalhostTownsEntitlements, bound to a specific deployed contract.
func NewLocalhostTownsEntitlements(address common.Address, backend bind.ContractBackend) (*LocalhostTownsEntitlements, error) {
	contract, err := bindLocalhostTownsEntitlements(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsEntitlements{LocalhostTownsEntitlementsCaller: LocalhostTownsEntitlementsCaller{contract: contract}, LocalhostTownsEntitlementsTransactor: LocalhostTownsEntitlementsTransactor{contract: contract}, LocalhostTownsEntitlementsFilterer: LocalhostTownsEntitlementsFilterer{contract: contract}}, nil
}

// NewLocalhostTownsEntitlementsCaller creates a new read-only instance of LocalhostTownsEntitlements, bound to a specific deployed contract.
func NewLocalhostTownsEntitlementsCaller(address common.Address, caller bind.ContractCaller) (*LocalhostTownsEntitlementsCaller, error) {
	contract, err := bindLocalhostTownsEntitlements(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsEntitlementsCaller{contract: contract}, nil
}

// NewLocalhostTownsEntitlementsTransactor creates a new write-only instance of LocalhostTownsEntitlements, bound to a specific deployed contract.
func NewLocalhostTownsEntitlementsTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostTownsEntitlementsTransactor, error) {
	contract, err := bindLocalhostTownsEntitlements(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsEntitlementsTransactor{contract: contract}, nil
}

// NewLocalhostTownsEntitlementsFilterer creates a new log filterer instance of LocalhostTownsEntitlements, bound to a specific deployed contract.
func NewLocalhostTownsEntitlementsFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostTownsEntitlementsFilterer, error) {
	contract, err := bindLocalhostTownsEntitlements(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsEntitlementsFilterer{contract: contract}, nil
}

// bindLocalhostTownsEntitlements binds a generic wrapper to an already deployed contract.
func bindLocalhostTownsEntitlements(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LocalhostTownsEntitlementsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsEntitlements.Contract.LocalhostTownsEntitlementsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.LocalhostTownsEntitlementsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.LocalhostTownsEntitlementsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsEntitlements.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCaller) GetEntitlement(opts *bind.CallOpts, entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	var out []interface{}
	err := _LocalhostTownsEntitlements.contract.Call(opts, &out, "getEntitlement", entitlement)

	if err != nil {
		return *new(IEntitlementsBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementsBaseEntitlement)).(*IEntitlementsBaseEntitlement)

	return out0, err

}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsSession) GetEntitlement(entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	return _LocalhostTownsEntitlements.Contract.GetEntitlement(&_LocalhostTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCallerSession) GetEntitlement(entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	return _LocalhostTownsEntitlements.Contract.GetEntitlement(&_LocalhostTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCaller) GetEntitlements(opts *bind.CallOpts) ([]IEntitlementsBaseEntitlement, error) {
	var out []interface{}
	err := _LocalhostTownsEntitlements.contract.Call(opts, &out, "getEntitlements")

	if err != nil {
		return *new([]IEntitlementsBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementsBaseEntitlement)).(*[]IEntitlementsBaseEntitlement)

	return out0, err

}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsSession) GetEntitlements() ([]IEntitlementsBaseEntitlement, error) {
	return _LocalhostTownsEntitlements.Contract.GetEntitlements(&_LocalhostTownsEntitlements.CallOpts)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCallerSession) GetEntitlements() ([]IEntitlementsBaseEntitlement, error) {
	return _LocalhostTownsEntitlements.Contract.GetEntitlements(&_LocalhostTownsEntitlements.CallOpts)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCaller) IsEntitledToChannel(opts *bind.CallOpts, channelId string, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _LocalhostTownsEntitlements.contract.Call(opts, &out, "isEntitledToChannel", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _LocalhostTownsEntitlements.Contract.IsEntitledToChannel(&_LocalhostTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCallerSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _LocalhostTownsEntitlements.Contract.IsEntitledToChannel(&_LocalhostTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCaller) IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _LocalhostTownsEntitlements.contract.Call(opts, &out, "isEntitledToTown", user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _LocalhostTownsEntitlements.Contract.IsEntitledToTown(&_LocalhostTownsEntitlements.CallOpts, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsCallerSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _LocalhostTownsEntitlements.Contract.IsEntitledToTown(&_LocalhostTownsEntitlements.CallOpts, user, permission)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactor) AddEntitlement(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.contract.Transact(opts, "addEntitlement", entitlement)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsSession) AddEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.AddEntitlement(&_LocalhostTownsEntitlements.TransactOpts, entitlement)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactorSession) AddEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.AddEntitlement(&_LocalhostTownsEntitlements.TransactOpts, entitlement)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactor) AddImmutableEntitlements(opts *bind.TransactOpts, entitlements []common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.contract.Transact(opts, "addImmutableEntitlements", entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.AddImmutableEntitlements(&_LocalhostTownsEntitlements.TransactOpts, entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactorSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.AddImmutableEntitlements(&_LocalhostTownsEntitlements.TransactOpts, entitlements)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactor) RemoveEntitlement(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.contract.Transact(opts, "removeEntitlement", entitlement)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsSession) RemoveEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.RemoveEntitlement(&_LocalhostTownsEntitlements.TransactOpts, entitlement)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsTransactorSession) RemoveEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _LocalhostTownsEntitlements.Contract.RemoveEntitlement(&_LocalhostTownsEntitlements.TransactOpts, entitlement)
}

// LocalhostTownsEntitlementsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the LocalhostTownsEntitlements contract.
type LocalhostTownsEntitlementsOwnershipTransferredIterator struct {
	Event *LocalhostTownsEntitlementsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsEntitlementsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsEntitlementsOwnershipTransferred)
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
		it.Event = new(LocalhostTownsEntitlementsOwnershipTransferred)
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
func (it *LocalhostTownsEntitlementsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsEntitlementsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsEntitlementsOwnershipTransferred represents a OwnershipTransferred event raised by the LocalhostTownsEntitlements contract.
type LocalhostTownsEntitlementsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*LocalhostTownsEntitlementsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _LocalhostTownsEntitlements.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsEntitlementsOwnershipTransferredIterator{contract: _LocalhostTownsEntitlements.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *LocalhostTownsEntitlementsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _LocalhostTownsEntitlements.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsEntitlementsOwnershipTransferred)
				if err := _LocalhostTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) ParseOwnershipTransferred(log types.Log) (*LocalhostTownsEntitlementsOwnershipTransferred, error) {
	event := new(LocalhostTownsEntitlementsOwnershipTransferred)
	if err := _LocalhostTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsEntitlementsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the LocalhostTownsEntitlements contract.
type LocalhostTownsEntitlementsPausedIterator struct {
	Event *LocalhostTownsEntitlementsPaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsEntitlementsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsEntitlementsPaused)
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
		it.Event = new(LocalhostTownsEntitlementsPaused)
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
func (it *LocalhostTownsEntitlementsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsEntitlementsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsEntitlementsPaused represents a Paused event raised by the LocalhostTownsEntitlements contract.
type LocalhostTownsEntitlementsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) FilterPaused(opts *bind.FilterOpts) (*LocalhostTownsEntitlementsPausedIterator, error) {

	logs, sub, err := _LocalhostTownsEntitlements.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsEntitlementsPausedIterator{contract: _LocalhostTownsEntitlements.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownsEntitlementsPaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsEntitlements.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsEntitlementsPaused)
				if err := _LocalhostTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) ParsePaused(log types.Log) (*LocalhostTownsEntitlementsPaused, error) {
	event := new(LocalhostTownsEntitlementsPaused)
	if err := _LocalhostTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsEntitlementsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the LocalhostTownsEntitlements contract.
type LocalhostTownsEntitlementsUnpausedIterator struct {
	Event *LocalhostTownsEntitlementsUnpaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsEntitlementsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsEntitlementsUnpaused)
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
		it.Event = new(LocalhostTownsEntitlementsUnpaused)
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
func (it *LocalhostTownsEntitlementsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsEntitlementsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsEntitlementsUnpaused represents a Unpaused event raised by the LocalhostTownsEntitlements contract.
type LocalhostTownsEntitlementsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*LocalhostTownsEntitlementsUnpausedIterator, error) {

	logs, sub, err := _LocalhostTownsEntitlements.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsEntitlementsUnpausedIterator{contract: _LocalhostTownsEntitlements.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownsEntitlementsUnpaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsEntitlements.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsEntitlementsUnpaused)
				if err := _LocalhostTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_LocalhostTownsEntitlements *LocalhostTownsEntitlementsFilterer) ParseUnpaused(log types.Log) (*LocalhostTownsEntitlementsUnpaused, error) {
	event := new(LocalhostTownsEntitlementsUnpaused)
	if err := _LocalhostTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
