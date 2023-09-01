// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sepolia_towns_entitlements

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

// SepoliaTownsEntitlementsMetaData contains all meta data concerning the SepoliaTownsEntitlements contract.
var SepoliaTownsEntitlementsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__EntitlementDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__ImmutableEntitlement\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementsService__InvalidEntitlementInterface\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"addEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"entitlements\",\"type\":\"address[]\"}],\"name\":\"addImmutableEntitlements\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"getEntitlement\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsBase.Entitlement\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getEntitlements\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"isImmutable\",\"type\":\"bool\"}],\"internalType\":\"structIEntitlementsBase.Entitlement[]\",\"name\":\"\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToChannel\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"permission\",\"type\":\"string\"}],\"name\":\"isEntitledToTown\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"entitlement\",\"type\":\"address\"}],\"name\":\"removeEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// SepoliaTownsEntitlementsABI is the input ABI used to generate the binding from.
// Deprecated: Use SepoliaTownsEntitlementsMetaData.ABI instead.
var SepoliaTownsEntitlementsABI = SepoliaTownsEntitlementsMetaData.ABI

// SepoliaTownsEntitlements is an auto generated Go binding around an Ethereum contract.
type SepoliaTownsEntitlements struct {
	SepoliaTownsEntitlementsCaller     // Read-only binding to the contract
	SepoliaTownsEntitlementsTransactor // Write-only binding to the contract
	SepoliaTownsEntitlementsFilterer   // Log filterer for contract events
}

// SepoliaTownsEntitlementsCaller is an auto generated read-only Go binding around an Ethereum contract.
type SepoliaTownsEntitlementsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsEntitlementsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SepoliaTownsEntitlementsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsEntitlementsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SepoliaTownsEntitlementsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsEntitlementsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SepoliaTownsEntitlementsSession struct {
	Contract     *SepoliaTownsEntitlements // Generic contract binding to set the session for
	CallOpts     bind.CallOpts             // Call options to use throughout this session
	TransactOpts bind.TransactOpts         // Transaction auth options to use throughout this session
}

// SepoliaTownsEntitlementsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SepoliaTownsEntitlementsCallerSession struct {
	Contract *SepoliaTownsEntitlementsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                   // Call options to use throughout this session
}

// SepoliaTownsEntitlementsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SepoliaTownsEntitlementsTransactorSession struct {
	Contract     *SepoliaTownsEntitlementsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                   // Transaction auth options to use throughout this session
}

// SepoliaTownsEntitlementsRaw is an auto generated low-level Go binding around an Ethereum contract.
type SepoliaTownsEntitlementsRaw struct {
	Contract *SepoliaTownsEntitlements // Generic contract binding to access the raw methods on
}

// SepoliaTownsEntitlementsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SepoliaTownsEntitlementsCallerRaw struct {
	Contract *SepoliaTownsEntitlementsCaller // Generic read-only contract binding to access the raw methods on
}

// SepoliaTownsEntitlementsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SepoliaTownsEntitlementsTransactorRaw struct {
	Contract *SepoliaTownsEntitlementsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSepoliaTownsEntitlements creates a new instance of SepoliaTownsEntitlements, bound to a specific deployed contract.
func NewSepoliaTownsEntitlements(address common.Address, backend bind.ContractBackend) (*SepoliaTownsEntitlements, error) {
	contract, err := bindSepoliaTownsEntitlements(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsEntitlements{SepoliaTownsEntitlementsCaller: SepoliaTownsEntitlementsCaller{contract: contract}, SepoliaTownsEntitlementsTransactor: SepoliaTownsEntitlementsTransactor{contract: contract}, SepoliaTownsEntitlementsFilterer: SepoliaTownsEntitlementsFilterer{contract: contract}}, nil
}

// NewSepoliaTownsEntitlementsCaller creates a new read-only instance of SepoliaTownsEntitlements, bound to a specific deployed contract.
func NewSepoliaTownsEntitlementsCaller(address common.Address, caller bind.ContractCaller) (*SepoliaTownsEntitlementsCaller, error) {
	contract, err := bindSepoliaTownsEntitlements(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsEntitlementsCaller{contract: contract}, nil
}

// NewSepoliaTownsEntitlementsTransactor creates a new write-only instance of SepoliaTownsEntitlements, bound to a specific deployed contract.
func NewSepoliaTownsEntitlementsTransactor(address common.Address, transactor bind.ContractTransactor) (*SepoliaTownsEntitlementsTransactor, error) {
	contract, err := bindSepoliaTownsEntitlements(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsEntitlementsTransactor{contract: contract}, nil
}

// NewSepoliaTownsEntitlementsFilterer creates a new log filterer instance of SepoliaTownsEntitlements, bound to a specific deployed contract.
func NewSepoliaTownsEntitlementsFilterer(address common.Address, filterer bind.ContractFilterer) (*SepoliaTownsEntitlementsFilterer, error) {
	contract, err := bindSepoliaTownsEntitlements(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsEntitlementsFilterer{contract: contract}, nil
}

// bindSepoliaTownsEntitlements binds a generic wrapper to an already deployed contract.
func bindSepoliaTownsEntitlements(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := SepoliaTownsEntitlementsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsEntitlements.Contract.SepoliaTownsEntitlementsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.SepoliaTownsEntitlementsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.SepoliaTownsEntitlementsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsEntitlements.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCaller) GetEntitlement(opts *bind.CallOpts, entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	var out []interface{}
	err := _SepoliaTownsEntitlements.contract.Call(opts, &out, "getEntitlement", entitlement)

	if err != nil {
		return *new(IEntitlementsBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementsBaseEntitlement)).(*IEntitlementsBaseEntitlement)

	return out0, err

}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsSession) GetEntitlement(entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	return _SepoliaTownsEntitlements.Contract.GetEntitlement(&_SepoliaTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCallerSession) GetEntitlement(entitlement common.Address) (IEntitlementsBaseEntitlement, error) {
	return _SepoliaTownsEntitlements.Contract.GetEntitlement(&_SepoliaTownsEntitlements.CallOpts, entitlement)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCaller) GetEntitlements(opts *bind.CallOpts) ([]IEntitlementsBaseEntitlement, error) {
	var out []interface{}
	err := _SepoliaTownsEntitlements.contract.Call(opts, &out, "getEntitlements")

	if err != nil {
		return *new([]IEntitlementsBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementsBaseEntitlement)).(*[]IEntitlementsBaseEntitlement)

	return out0, err

}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsSession) GetEntitlements() ([]IEntitlementsBaseEntitlement, error) {
	return _SepoliaTownsEntitlements.Contract.GetEntitlements(&_SepoliaTownsEntitlements.CallOpts)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCallerSession) GetEntitlements() ([]IEntitlementsBaseEntitlement, error) {
	return _SepoliaTownsEntitlements.Contract.GetEntitlements(&_SepoliaTownsEntitlements.CallOpts)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCaller) IsEntitledToChannel(opts *bind.CallOpts, channelId string, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _SepoliaTownsEntitlements.contract.Call(opts, &out, "isEntitledToChannel", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _SepoliaTownsEntitlements.Contract.IsEntitledToChannel(&_SepoliaTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCallerSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _SepoliaTownsEntitlements.Contract.IsEntitledToChannel(&_SepoliaTownsEntitlements.CallOpts, channelId, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCaller) IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _SepoliaTownsEntitlements.contract.Call(opts, &out, "isEntitledToTown", user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _SepoliaTownsEntitlements.Contract.IsEntitledToTown(&_SepoliaTownsEntitlements.CallOpts, user, permission)
}

// IsEntitledToTown is a free data retrieval call binding the contract method 0x4ff8eb71.
//
// Solidity: function isEntitledToTown(address user, string permission) view returns(bool)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsCallerSession) IsEntitledToTown(user common.Address, permission string) (bool, error) {
	return _SepoliaTownsEntitlements.Contract.IsEntitledToTown(&_SepoliaTownsEntitlements.CallOpts, user, permission)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactor) AddEntitlement(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.contract.Transact(opts, "addEntitlement", entitlement)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsSession) AddEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.AddEntitlement(&_SepoliaTownsEntitlements.TransactOpts, entitlement)
}

// AddEntitlement is a paid mutator transaction binding the contract method 0x2c90a840.
//
// Solidity: function addEntitlement(address entitlement) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactorSession) AddEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.AddEntitlement(&_SepoliaTownsEntitlements.TransactOpts, entitlement)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactor) AddImmutableEntitlements(opts *bind.TransactOpts, entitlements []common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.contract.Transact(opts, "addImmutableEntitlements", entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.AddImmutableEntitlements(&_SepoliaTownsEntitlements.TransactOpts, entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactorSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.AddImmutableEntitlements(&_SepoliaTownsEntitlements.TransactOpts, entitlements)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactor) RemoveEntitlement(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.contract.Transact(opts, "removeEntitlement", entitlement)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsSession) RemoveEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.RemoveEntitlement(&_SepoliaTownsEntitlements.TransactOpts, entitlement)
}

// RemoveEntitlement is a paid mutator transaction binding the contract method 0xc9b968cd.
//
// Solidity: function removeEntitlement(address entitlement) returns()
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsTransactorSession) RemoveEntitlement(entitlement common.Address) (*types.Transaction, error) {
	return _SepoliaTownsEntitlements.Contract.RemoveEntitlement(&_SepoliaTownsEntitlements.TransactOpts, entitlement)
}

// SepoliaTownsEntitlementsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the SepoliaTownsEntitlements contract.
type SepoliaTownsEntitlementsOwnershipTransferredIterator struct {
	Event *SepoliaTownsEntitlementsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsEntitlementsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsEntitlementsOwnershipTransferred)
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
		it.Event = new(SepoliaTownsEntitlementsOwnershipTransferred)
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
func (it *SepoliaTownsEntitlementsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsEntitlementsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsEntitlementsOwnershipTransferred represents a OwnershipTransferred event raised by the SepoliaTownsEntitlements contract.
type SepoliaTownsEntitlementsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*SepoliaTownsEntitlementsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _SepoliaTownsEntitlements.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsEntitlementsOwnershipTransferredIterator{contract: _SepoliaTownsEntitlements.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *SepoliaTownsEntitlementsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _SepoliaTownsEntitlements.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsEntitlementsOwnershipTransferred)
				if err := _SepoliaTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) ParseOwnershipTransferred(log types.Log) (*SepoliaTownsEntitlementsOwnershipTransferred, error) {
	event := new(SepoliaTownsEntitlementsOwnershipTransferred)
	if err := _SepoliaTownsEntitlements.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsEntitlementsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the SepoliaTownsEntitlements contract.
type SepoliaTownsEntitlementsPausedIterator struct {
	Event *SepoliaTownsEntitlementsPaused // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsEntitlementsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsEntitlementsPaused)
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
		it.Event = new(SepoliaTownsEntitlementsPaused)
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
func (it *SepoliaTownsEntitlementsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsEntitlementsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsEntitlementsPaused represents a Paused event raised by the SepoliaTownsEntitlements contract.
type SepoliaTownsEntitlementsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) FilterPaused(opts *bind.FilterOpts) (*SepoliaTownsEntitlementsPausedIterator, error) {

	logs, sub, err := _SepoliaTownsEntitlements.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsEntitlementsPausedIterator{contract: _SepoliaTownsEntitlements.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *SepoliaTownsEntitlementsPaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsEntitlements.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsEntitlementsPaused)
				if err := _SepoliaTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) ParsePaused(log types.Log) (*SepoliaTownsEntitlementsPaused, error) {
	event := new(SepoliaTownsEntitlementsPaused)
	if err := _SepoliaTownsEntitlements.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsEntitlementsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the SepoliaTownsEntitlements contract.
type SepoliaTownsEntitlementsUnpausedIterator struct {
	Event *SepoliaTownsEntitlementsUnpaused // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsEntitlementsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsEntitlementsUnpaused)
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
		it.Event = new(SepoliaTownsEntitlementsUnpaused)
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
func (it *SepoliaTownsEntitlementsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsEntitlementsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsEntitlementsUnpaused represents a Unpaused event raised by the SepoliaTownsEntitlements contract.
type SepoliaTownsEntitlementsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*SepoliaTownsEntitlementsUnpausedIterator, error) {

	logs, sub, err := _SepoliaTownsEntitlements.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsEntitlementsUnpausedIterator{contract: _SepoliaTownsEntitlements.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *SepoliaTownsEntitlementsUnpaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsEntitlements.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsEntitlementsUnpaused)
				if err := _SepoliaTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_SepoliaTownsEntitlements *SepoliaTownsEntitlementsFilterer) ParseUnpaused(log types.Log) (*SepoliaTownsEntitlementsUnpaused, error) {
	event := new(SepoliaTownsEntitlementsUnpaused)
	if err := _SepoliaTownsEntitlements.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
