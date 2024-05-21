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
	_	= errors.New
	_	= big.NewInt
	_	= strings.NewReader
	_	= ethereum.NotFound
	_	= bind.Bind
	_	= common.Big1
	_	= types.BloomLookup
	_	= event.NewSubscription
	_	= abi.ConvertType
)

// IEntitlementsManagerBaseEntitlement is an auto generated low-level Go binding around an user-defined struct.
type IEntitlementsManagerBaseEntitlement struct {
	Name		string
	ModuleAddress	common.Address
	ModuleType	string
	IsImmutable	bool
}

// EntitlementsManagerMetaData contains all meta data concerning the EntitlementsManager contract.
var EntitlementsManagerMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"addEntitlementModule\",\"inputs\":[{\"name\":\"entitlement\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"addImmutableEntitlements\",\"inputs\":[{\"name\":\"entitlements\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getEntitlement\",\"inputs\":[{\"name\":\"entitlement\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"entitlements\",\"type\":\"tuple\",\"internalType\":\"structIEntitlementsManagerBase.Entitlement\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"moduleAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"moduleType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"isImmutable\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getEntitlements\",\"inputs\":[],\"outputs\":[{\"name\":\"entitlements\",\"type\":\"tuple[]\",\"internalType\":\"structIEntitlementsManagerBase.Entitlement[]\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"moduleAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"moduleType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"isImmutable\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitledToChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permission\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitledToSpace\",\"inputs\":[{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permission\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeEntitlementModule\",\"inputs\":[{\"name\":\"entitlement\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementModuleAdded\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"entitlement\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementModuleRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"entitlement\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false}]",
}

// EntitlementsManagerABI is the input ABI used to generate the binding from.
// Deprecated: Use EntitlementsManagerMetaData.ABI instead.
var EntitlementsManagerABI = EntitlementsManagerMetaData.ABI

// EntitlementsManager is an auto generated Go binding around an Ethereum contract.
type EntitlementsManager struct {
	EntitlementsManagerCaller	// Read-only binding to the contract
	EntitlementsManagerTransactor	// Write-only binding to the contract
	EntitlementsManagerFilterer	// Log filterer for contract events
}

// EntitlementsManagerCaller is an auto generated read-only Go binding around an Ethereum contract.
type EntitlementsManagerCaller struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// EntitlementsManagerTransactor is an auto generated write-only Go binding around an Ethereum contract.
type EntitlementsManagerTransactor struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// EntitlementsManagerFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type EntitlementsManagerFilterer struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// EntitlementsManagerSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type EntitlementsManagerSession struct {
	Contract	*EntitlementsManager	// Generic contract binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// EntitlementsManagerCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type EntitlementsManagerCallerSession struct {
	Contract	*EntitlementsManagerCaller	// Generic contract caller binding to set the session for
	CallOpts	bind.CallOpts			// Call options to use throughout this session
}

// EntitlementsManagerTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type EntitlementsManagerTransactorSession struct {
	Contract	*EntitlementsManagerTransactor	// Generic contract transactor binding to set the session for
	TransactOpts	bind.TransactOpts		// Transaction auth options to use throughout this session
}

// EntitlementsManagerRaw is an auto generated low-level Go binding around an Ethereum contract.
type EntitlementsManagerRaw struct {
	Contract *EntitlementsManager	// Generic contract binding to access the raw methods on
}

// EntitlementsManagerCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type EntitlementsManagerCallerRaw struct {
	Contract *EntitlementsManagerCaller	// Generic read-only contract binding to access the raw methods on
}

// EntitlementsManagerTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type EntitlementsManagerTransactorRaw struct {
	Contract *EntitlementsManagerTransactor	// Generic write-only contract binding to access the raw methods on
}

// NewEntitlementsManager creates a new instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManager(address common.Address, backend bind.ContractBackend) (*EntitlementsManager, error) {
	contract, err := bindEntitlementsManager(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManager{EntitlementsManagerCaller: EntitlementsManagerCaller{contract: contract}, EntitlementsManagerTransactor: EntitlementsManagerTransactor{contract: contract}, EntitlementsManagerFilterer: EntitlementsManagerFilterer{contract: contract}}, nil
}

// NewEntitlementsManagerCaller creates a new read-only instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManagerCaller(address common.Address, caller bind.ContractCaller) (*EntitlementsManagerCaller, error) {
	contract, err := bindEntitlementsManager(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerCaller{contract: contract}, nil
}

// NewEntitlementsManagerTransactor creates a new write-only instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManagerTransactor(address common.Address, transactor bind.ContractTransactor) (*EntitlementsManagerTransactor, error) {
	contract, err := bindEntitlementsManager(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerTransactor{contract: contract}, nil
}

// NewEntitlementsManagerFilterer creates a new log filterer instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManagerFilterer(address common.Address, filterer bind.ContractFilterer) (*EntitlementsManagerFilterer, error) {
	contract, err := bindEntitlementsManager(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerFilterer{contract: contract}, nil
}

// bindEntitlementsManager binds a generic wrapper to an already deployed contract.
func bindEntitlementsManager(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := EntitlementsManagerMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementsManager *EntitlementsManagerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementsManager.Contract.EntitlementsManagerCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementsManager *EntitlementsManagerRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.EntitlementsManagerTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementsManager *EntitlementsManagerRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.EntitlementsManagerTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementsManager *EntitlementsManagerCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementsManager.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementsManager *EntitlementsManagerTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementsManager *EntitlementsManagerTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool) entitlements)
func (_EntitlementsManager *EntitlementsManagerCaller) GetEntitlement(opts *bind.CallOpts, entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "getEntitlement", entitlement)

	if err != nil {
		return *new(IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementsManagerBaseEntitlement)).(*IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool) entitlements)
func (_EntitlementsManager *EntitlementsManagerSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlement(&_EntitlementsManager.CallOpts, entitlement)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool) entitlements)
func (_EntitlementsManager *EntitlementsManagerCallerSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlement(&_EntitlementsManager.CallOpts, entitlement)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[] entitlements)
func (_EntitlementsManager *EntitlementsManagerCaller) GetEntitlements(opts *bind.CallOpts) ([]IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "getEntitlements")

	if err != nil {
		return *new([]IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementsManagerBaseEntitlement)).(*[]IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[] entitlements)
func (_EntitlementsManager *EntitlementsManagerSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlements(&_EntitlementsManager.CallOpts)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[] entitlements)
func (_EntitlementsManager *EntitlementsManagerCallerSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlements(&_EntitlementsManager.CallOpts)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0x367287e3.
//
// Solidity: function isEntitledToChannel(bytes32 channelId, address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCaller) IsEntitledToChannel(opts *bind.CallOpts, channelId [32]byte, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "isEntitledToChannel", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0x367287e3.
//
// Solidity: function isEntitledToChannel(bytes32 channelId, address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerSession) IsEntitledToChannel(channelId [32]byte, user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToChannel(&_EntitlementsManager.CallOpts, channelId, user, permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0x367287e3.
//
// Solidity: function isEntitledToChannel(bytes32 channelId, address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCallerSession) IsEntitledToChannel(channelId [32]byte, user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToChannel(&_EntitlementsManager.CallOpts, channelId, user, permission)
}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCaller) IsEntitledToSpace(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "isEntitledToSpace", user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerSession) IsEntitledToSpace(user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToSpace(&_EntitlementsManager.CallOpts, user, permission)
}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCallerSession) IsEntitledToSpace(user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToSpace(&_EntitlementsManager.CallOpts, user, permission)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactor) AddEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.contract.Transact(opts, "addEntitlementModule", entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactorSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_EntitlementsManager *EntitlementsManagerTransactor) AddImmutableEntitlements(opts *bind.TransactOpts, entitlements []common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.contract.Transact(opts, "addImmutableEntitlements", entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_EntitlementsManager *EntitlementsManagerSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddImmutableEntitlements(&_EntitlementsManager.TransactOpts, entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_EntitlementsManager *EntitlementsManagerTransactorSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddImmutableEntitlements(&_EntitlementsManager.TransactOpts, entitlements)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactor) RemoveEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.contract.Transact(opts, "removeEntitlementModule", entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.RemoveEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactorSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.RemoveEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// EntitlementsManagerEntitlementModuleAddedIterator is returned from FilterEntitlementModuleAdded and is used to iterate over the raw logs and unpacked data for EntitlementModuleAdded events raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleAddedIterator struct {
	Event	*EntitlementsManagerEntitlementModuleAdded	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *EntitlementsManagerEntitlementModuleAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerEntitlementModuleAdded)
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
		it.Event = new(EntitlementsManagerEntitlementModuleAdded)
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
func (it *EntitlementsManagerEntitlementModuleAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerEntitlementModuleAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerEntitlementModuleAdded represents a EntitlementModuleAdded event raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleAdded struct {
	Caller		common.Address
	Entitlement	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterEntitlementModuleAdded is a free log retrieval operation binding the contract event 0x055c4c0e6f85afe96beaac6c9d650859c001e6ef93103856624cce6ceba811b4.
//
// Solidity: event EntitlementModuleAdded(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterEntitlementModuleAdded(opts *bind.FilterOpts, caller []common.Address) (*EntitlementsManagerEntitlementModuleAddedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "EntitlementModuleAdded", callerRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerEntitlementModuleAddedIterator{contract: _EntitlementsManager.contract, event: "EntitlementModuleAdded", logs: logs, sub: sub}, nil
}

// WatchEntitlementModuleAdded is a free log subscription operation binding the contract event 0x055c4c0e6f85afe96beaac6c9d650859c001e6ef93103856624cce6ceba811b4.
//
// Solidity: event EntitlementModuleAdded(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchEntitlementModuleAdded(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerEntitlementModuleAdded, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "EntitlementModuleAdded", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerEntitlementModuleAdded)
				if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleAdded", log); err != nil {
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

// ParseEntitlementModuleAdded is a log parse operation binding the contract event 0x055c4c0e6f85afe96beaac6c9d650859c001e6ef93103856624cce6ceba811b4.
//
// Solidity: event EntitlementModuleAdded(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseEntitlementModuleAdded(log types.Log) (*EntitlementsManagerEntitlementModuleAdded, error) {
	event := new(EntitlementsManagerEntitlementModuleAdded)
	if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerEntitlementModuleRemovedIterator is returned from FilterEntitlementModuleRemoved and is used to iterate over the raw logs and unpacked data for EntitlementModuleRemoved events raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleRemovedIterator struct {
	Event	*EntitlementsManagerEntitlementModuleRemoved	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *EntitlementsManagerEntitlementModuleRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerEntitlementModuleRemoved)
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
		it.Event = new(EntitlementsManagerEntitlementModuleRemoved)
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
func (it *EntitlementsManagerEntitlementModuleRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerEntitlementModuleRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerEntitlementModuleRemoved represents a EntitlementModuleRemoved event raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleRemoved struct {
	Caller		common.Address
	Entitlement	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterEntitlementModuleRemoved is a free log retrieval operation binding the contract event 0xa8e3e13a35b592afaa9d213d12c7ea06384518ada9733585d20883cfafcf249b.
//
// Solidity: event EntitlementModuleRemoved(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterEntitlementModuleRemoved(opts *bind.FilterOpts, caller []common.Address) (*EntitlementsManagerEntitlementModuleRemovedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "EntitlementModuleRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerEntitlementModuleRemovedIterator{contract: _EntitlementsManager.contract, event: "EntitlementModuleRemoved", logs: logs, sub: sub}, nil
}

// WatchEntitlementModuleRemoved is a free log subscription operation binding the contract event 0xa8e3e13a35b592afaa9d213d12c7ea06384518ada9733585d20883cfafcf249b.
//
// Solidity: event EntitlementModuleRemoved(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchEntitlementModuleRemoved(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerEntitlementModuleRemoved, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "EntitlementModuleRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerEntitlementModuleRemoved)
				if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleRemoved", log); err != nil {
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

// ParseEntitlementModuleRemoved is a log parse operation binding the contract event 0xa8e3e13a35b592afaa9d213d12c7ea06384518ada9733585d20883cfafcf249b.
//
// Solidity: event EntitlementModuleRemoved(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseEntitlementModuleRemoved(log types.Log) (*EntitlementsManagerEntitlementModuleRemoved, error) {
	event := new(EntitlementsManagerEntitlementModuleRemoved)
	if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
