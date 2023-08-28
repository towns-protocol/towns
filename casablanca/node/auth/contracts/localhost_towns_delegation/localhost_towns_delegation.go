// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_towns_delegation

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

// IDelegationBaseDelegationInfo is an auto generated low-level Go binding around an user-defined struct.
type IDelegationBaseDelegationInfo struct {
	Vault    common.Address
	Delegate common.Address
}

// LocalhostTownsDelegationMetaData contains all meta data concerning the LocalhostTownsDelegation contract.
var LocalhostTownsDelegationMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"DelegateAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"DelegateForAll\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"RevokeAllDelegates\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"RevokeDelegate\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__Delegation_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"checkDelegateForAll\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"delegateForAll\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"getDelegatesForAll\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"delegates\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"getDelegationsByDelegate\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"internalType\":\"structIDelegationBase.DelegationInfo[]\",\"name\":\"info\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"revokeAllDelegates\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"revokeDelegate\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// LocalhostTownsDelegationABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostTownsDelegationMetaData.ABI instead.
var LocalhostTownsDelegationABI = LocalhostTownsDelegationMetaData.ABI

// LocalhostTownsDelegation is an auto generated Go binding around an Ethereum contract.
type LocalhostTownsDelegation struct {
	LocalhostTownsDelegationCaller     // Read-only binding to the contract
	LocalhostTownsDelegationTransactor // Write-only binding to the contract
	LocalhostTownsDelegationFilterer   // Log filterer for contract events
}

// LocalhostTownsDelegationCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostTownsDelegationCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsDelegationTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostTownsDelegationTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsDelegationFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostTownsDelegationFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsDelegationSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostTownsDelegationSession struct {
	Contract     *LocalhostTownsDelegation // Generic contract binding to set the session for
	CallOpts     bind.CallOpts             // Call options to use throughout this session
	TransactOpts bind.TransactOpts         // Transaction auth options to use throughout this session
}

// LocalhostTownsDelegationCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostTownsDelegationCallerSession struct {
	Contract *LocalhostTownsDelegationCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                   // Call options to use throughout this session
}

// LocalhostTownsDelegationTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostTownsDelegationTransactorSession struct {
	Contract     *LocalhostTownsDelegationTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                   // Transaction auth options to use throughout this session
}

// LocalhostTownsDelegationRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostTownsDelegationRaw struct {
	Contract *LocalhostTownsDelegation // Generic contract binding to access the raw methods on
}

// LocalhostTownsDelegationCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostTownsDelegationCallerRaw struct {
	Contract *LocalhostTownsDelegationCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostTownsDelegationTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostTownsDelegationTransactorRaw struct {
	Contract *LocalhostTownsDelegationTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostTownsDelegation creates a new instance of LocalhostTownsDelegation, bound to a specific deployed contract.
func NewLocalhostTownsDelegation(address common.Address, backend bind.ContractBackend) (*LocalhostTownsDelegation, error) {
	contract, err := bindLocalhostTownsDelegation(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegation{LocalhostTownsDelegationCaller: LocalhostTownsDelegationCaller{contract: contract}, LocalhostTownsDelegationTransactor: LocalhostTownsDelegationTransactor{contract: contract}, LocalhostTownsDelegationFilterer: LocalhostTownsDelegationFilterer{contract: contract}}, nil
}

// NewLocalhostTownsDelegationCaller creates a new read-only instance of LocalhostTownsDelegation, bound to a specific deployed contract.
func NewLocalhostTownsDelegationCaller(address common.Address, caller bind.ContractCaller) (*LocalhostTownsDelegationCaller, error) {
	contract, err := bindLocalhostTownsDelegation(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationCaller{contract: contract}, nil
}

// NewLocalhostTownsDelegationTransactor creates a new write-only instance of LocalhostTownsDelegation, bound to a specific deployed contract.
func NewLocalhostTownsDelegationTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostTownsDelegationTransactor, error) {
	contract, err := bindLocalhostTownsDelegation(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationTransactor{contract: contract}, nil
}

// NewLocalhostTownsDelegationFilterer creates a new log filterer instance of LocalhostTownsDelegation, bound to a specific deployed contract.
func NewLocalhostTownsDelegationFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostTownsDelegationFilterer, error) {
	contract, err := bindLocalhostTownsDelegation(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationFilterer{contract: contract}, nil
}

// bindLocalhostTownsDelegation binds a generic wrapper to an already deployed contract.
func bindLocalhostTownsDelegation(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(LocalhostTownsDelegationABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsDelegation *LocalhostTownsDelegationRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsDelegation.Contract.LocalhostTownsDelegationCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsDelegation *LocalhostTownsDelegationRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.LocalhostTownsDelegationTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsDelegation *LocalhostTownsDelegationRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.LocalhostTownsDelegationTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsDelegation *LocalhostTownsDelegationCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsDelegation.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.contract.Transact(opts, method, params...)
}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationCaller) CheckDelegateForAll(opts *bind.CallOpts, delegate common.Address, vault common.Address) (bool, error) {
	var out []interface{}
	err := _LocalhostTownsDelegation.contract.Call(opts, &out, "checkDelegateForAll", delegate, vault)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationSession) CheckDelegateForAll(delegate common.Address, vault common.Address) (bool, error) {
	return _LocalhostTownsDelegation.Contract.CheckDelegateForAll(&_LocalhostTownsDelegation.CallOpts, delegate, vault)
}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationCallerSession) CheckDelegateForAll(delegate common.Address, vault common.Address) (bool, error) {
	return _LocalhostTownsDelegation.Contract.CheckDelegateForAll(&_LocalhostTownsDelegation.CallOpts, delegate, vault)
}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationCaller) GetDelegatesForAll(opts *bind.CallOpts, vault common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _LocalhostTownsDelegation.contract.Call(opts, &out, "getDelegatesForAll", vault)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationSession) GetDelegatesForAll(vault common.Address) ([]common.Address, error) {
	return _LocalhostTownsDelegation.Contract.GetDelegatesForAll(&_LocalhostTownsDelegation.CallOpts, vault)
}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationCallerSession) GetDelegatesForAll(vault common.Address) ([]common.Address, error) {
	return _LocalhostTownsDelegation.Contract.GetDelegatesForAll(&_LocalhostTownsDelegation.CallOpts, vault)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationCaller) GetDelegationsByDelegate(opts *bind.CallOpts, delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	var out []interface{}
	err := _LocalhostTownsDelegation.contract.Call(opts, &out, "getDelegationsByDelegate", delegate)

	if err != nil {
		return *new([]IDelegationBaseDelegationInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IDelegationBaseDelegationInfo)).(*[]IDelegationBaseDelegationInfo)

	return out0, err

}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationSession) GetDelegationsByDelegate(delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	return _LocalhostTownsDelegation.Contract.GetDelegationsByDelegate(&_LocalhostTownsDelegation.CallOpts, delegate)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationCallerSession) GetDelegationsByDelegate(delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	return _LocalhostTownsDelegation.Contract.GetDelegationsByDelegate(&_LocalhostTownsDelegation.CallOpts, delegate)
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactor) DelegationInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.contract.Transact(opts, "__Delegation_init")
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationSession) DelegationInit() (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.DelegationInit(&_LocalhostTownsDelegation.TransactOpts)
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactorSession) DelegationInit() (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.DelegationInit(&_LocalhostTownsDelegation.TransactOpts)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactor) DelegateForAll(opts *bind.TransactOpts, delegate common.Address, value bool) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.contract.Transact(opts, "delegateForAll", delegate, value)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationSession) DelegateForAll(delegate common.Address, value bool) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.DelegateForAll(&_LocalhostTownsDelegation.TransactOpts, delegate, value)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactorSession) DelegateForAll(delegate common.Address, value bool) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.DelegateForAll(&_LocalhostTownsDelegation.TransactOpts, delegate, value)
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactor) RevokeAllDelegates(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.contract.Transact(opts, "revokeAllDelegates")
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationSession) RevokeAllDelegates() (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.RevokeAllDelegates(&_LocalhostTownsDelegation.TransactOpts)
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactorSession) RevokeAllDelegates() (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.RevokeAllDelegates(&_LocalhostTownsDelegation.TransactOpts)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactor) RevokeDelegate(opts *bind.TransactOpts, delegate common.Address) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.contract.Transact(opts, "revokeDelegate", delegate)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationSession) RevokeDelegate(delegate common.Address) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.RevokeDelegate(&_LocalhostTownsDelegation.TransactOpts, delegate)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_LocalhostTownsDelegation *LocalhostTownsDelegationTransactorSession) RevokeDelegate(delegate common.Address) (*types.Transaction, error) {
	return _LocalhostTownsDelegation.Contract.RevokeDelegate(&_LocalhostTownsDelegation.TransactOpts, delegate)
}

// LocalhostTownsDelegationDelegateForAllIterator is returned from FilterDelegateForAll and is used to iterate over the raw logs and unpacked data for DelegateForAll events raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationDelegateForAllIterator struct {
	Event *LocalhostTownsDelegationDelegateForAll // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsDelegationDelegateForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsDelegationDelegateForAll)
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
		it.Event = new(LocalhostTownsDelegationDelegateForAll)
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
func (it *LocalhostTownsDelegationDelegateForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsDelegationDelegateForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsDelegationDelegateForAll represents a DelegateForAll event raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationDelegateForAll struct {
	Vault    common.Address
	Delegate common.Address
	Value    bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterDelegateForAll is a free log retrieval operation binding the contract event 0x58781eab4a0743ab1c285a238be846a235f06cdb5b968030573a635e5f8c92fa.
//
// Solidity: event DelegateForAll(address vault, address delegate, bool value)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) FilterDelegateForAll(opts *bind.FilterOpts) (*LocalhostTownsDelegationDelegateForAllIterator, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.FilterLogs(opts, "DelegateForAll")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationDelegateForAllIterator{contract: _LocalhostTownsDelegation.contract, event: "DelegateForAll", logs: logs, sub: sub}, nil
}

// WatchDelegateForAll is a free log subscription operation binding the contract event 0x58781eab4a0743ab1c285a238be846a235f06cdb5b968030573a635e5f8c92fa.
//
// Solidity: event DelegateForAll(address vault, address delegate, bool value)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) WatchDelegateForAll(opts *bind.WatchOpts, sink chan<- *LocalhostTownsDelegationDelegateForAll) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.WatchLogs(opts, "DelegateForAll")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsDelegationDelegateForAll)
				if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "DelegateForAll", log); err != nil {
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

// ParseDelegateForAll is a log parse operation binding the contract event 0x58781eab4a0743ab1c285a238be846a235f06cdb5b968030573a635e5f8c92fa.
//
// Solidity: event DelegateForAll(address vault, address delegate, bool value)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) ParseDelegateForAll(log types.Log) (*LocalhostTownsDelegationDelegateForAll, error) {
	event := new(LocalhostTownsDelegationDelegateForAll)
	if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "DelegateForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsDelegationInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationInitializedIterator struct {
	Event *LocalhostTownsDelegationInitialized // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsDelegationInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsDelegationInitialized)
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
		it.Event = new(LocalhostTownsDelegationInitialized)
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
func (it *LocalhostTownsDelegationInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsDelegationInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsDelegationInitialized represents a Initialized event raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) FilterInitialized(opts *bind.FilterOpts) (*LocalhostTownsDelegationInitializedIterator, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationInitializedIterator{contract: _LocalhostTownsDelegation.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *LocalhostTownsDelegationInitialized) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsDelegationInitialized)
				if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "Initialized", log); err != nil {
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

// ParseInitialized is a log parse operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) ParseInitialized(log types.Log) (*LocalhostTownsDelegationInitialized, error) {
	event := new(LocalhostTownsDelegationInitialized)
	if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsDelegationInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationInterfaceAddedIterator struct {
	Event *LocalhostTownsDelegationInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsDelegationInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsDelegationInterfaceAdded)
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
		it.Event = new(LocalhostTownsDelegationInterfaceAdded)
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
func (it *LocalhostTownsDelegationInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsDelegationInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsDelegationInterfaceAdded represents a InterfaceAdded event raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*LocalhostTownsDelegationInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsDelegation.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationInterfaceAddedIterator{contract: _LocalhostTownsDelegation.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *LocalhostTownsDelegationInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsDelegation.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsDelegationInterfaceAdded)
				if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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

// ParseInterfaceAdded is a log parse operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) ParseInterfaceAdded(log types.Log) (*LocalhostTownsDelegationInterfaceAdded, error) {
	event := new(LocalhostTownsDelegationInterfaceAdded)
	if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsDelegationInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationInterfaceRemovedIterator struct {
	Event *LocalhostTownsDelegationInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsDelegationInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsDelegationInterfaceRemoved)
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
		it.Event = new(LocalhostTownsDelegationInterfaceRemoved)
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
func (it *LocalhostTownsDelegationInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsDelegationInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsDelegationInterfaceRemoved represents a InterfaceRemoved event raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*LocalhostTownsDelegationInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsDelegation.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationInterfaceRemovedIterator{contract: _LocalhostTownsDelegation.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *LocalhostTownsDelegationInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsDelegation.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsDelegationInterfaceRemoved)
				if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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

// ParseInterfaceRemoved is a log parse operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) ParseInterfaceRemoved(log types.Log) (*LocalhostTownsDelegationInterfaceRemoved, error) {
	event := new(LocalhostTownsDelegationInterfaceRemoved)
	if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsDelegationRevokeAllDelegatesIterator is returned from FilterRevokeAllDelegates and is used to iterate over the raw logs and unpacked data for RevokeAllDelegates events raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationRevokeAllDelegatesIterator struct {
	Event *LocalhostTownsDelegationRevokeAllDelegates // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsDelegationRevokeAllDelegatesIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsDelegationRevokeAllDelegates)
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
		it.Event = new(LocalhostTownsDelegationRevokeAllDelegates)
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
func (it *LocalhostTownsDelegationRevokeAllDelegatesIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsDelegationRevokeAllDelegatesIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsDelegationRevokeAllDelegates represents a RevokeAllDelegates event raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationRevokeAllDelegates struct {
	Vault common.Address
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterRevokeAllDelegates is a free log retrieval operation binding the contract event 0x32d74befd0b842e19694e3e3af46263e18bcce41352c8b600ff0002b49edf662.
//
// Solidity: event RevokeAllDelegates(address vault)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) FilterRevokeAllDelegates(opts *bind.FilterOpts) (*LocalhostTownsDelegationRevokeAllDelegatesIterator, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.FilterLogs(opts, "RevokeAllDelegates")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationRevokeAllDelegatesIterator{contract: _LocalhostTownsDelegation.contract, event: "RevokeAllDelegates", logs: logs, sub: sub}, nil
}

// WatchRevokeAllDelegates is a free log subscription operation binding the contract event 0x32d74befd0b842e19694e3e3af46263e18bcce41352c8b600ff0002b49edf662.
//
// Solidity: event RevokeAllDelegates(address vault)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) WatchRevokeAllDelegates(opts *bind.WatchOpts, sink chan<- *LocalhostTownsDelegationRevokeAllDelegates) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.WatchLogs(opts, "RevokeAllDelegates")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsDelegationRevokeAllDelegates)
				if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "RevokeAllDelegates", log); err != nil {
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

// ParseRevokeAllDelegates is a log parse operation binding the contract event 0x32d74befd0b842e19694e3e3af46263e18bcce41352c8b600ff0002b49edf662.
//
// Solidity: event RevokeAllDelegates(address vault)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) ParseRevokeAllDelegates(log types.Log) (*LocalhostTownsDelegationRevokeAllDelegates, error) {
	event := new(LocalhostTownsDelegationRevokeAllDelegates)
	if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "RevokeAllDelegates", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsDelegationRevokeDelegateIterator is returned from FilterRevokeDelegate and is used to iterate over the raw logs and unpacked data for RevokeDelegate events raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationRevokeDelegateIterator struct {
	Event *LocalhostTownsDelegationRevokeDelegate // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsDelegationRevokeDelegateIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsDelegationRevokeDelegate)
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
		it.Event = new(LocalhostTownsDelegationRevokeDelegate)
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
func (it *LocalhostTownsDelegationRevokeDelegateIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsDelegationRevokeDelegateIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsDelegationRevokeDelegate represents a RevokeDelegate event raised by the LocalhostTownsDelegation contract.
type LocalhostTownsDelegationRevokeDelegate struct {
	Vault    common.Address
	Delegate common.Address
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterRevokeDelegate is a free log retrieval operation binding the contract event 0x3e34a3ee53064fb79c0ee57448f03774a627a9270b0c41286efb7d8e32dcde93.
//
// Solidity: event RevokeDelegate(address vault, address delegate)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) FilterRevokeDelegate(opts *bind.FilterOpts) (*LocalhostTownsDelegationRevokeDelegateIterator, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.FilterLogs(opts, "RevokeDelegate")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsDelegationRevokeDelegateIterator{contract: _LocalhostTownsDelegation.contract, event: "RevokeDelegate", logs: logs, sub: sub}, nil
}

// WatchRevokeDelegate is a free log subscription operation binding the contract event 0x3e34a3ee53064fb79c0ee57448f03774a627a9270b0c41286efb7d8e32dcde93.
//
// Solidity: event RevokeDelegate(address vault, address delegate)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) WatchRevokeDelegate(opts *bind.WatchOpts, sink chan<- *LocalhostTownsDelegationRevokeDelegate) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsDelegation.contract.WatchLogs(opts, "RevokeDelegate")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsDelegationRevokeDelegate)
				if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "RevokeDelegate", log); err != nil {
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

// ParseRevokeDelegate is a log parse operation binding the contract event 0x3e34a3ee53064fb79c0ee57448f03774a627a9270b0c41286efb7d8e32dcde93.
//
// Solidity: event RevokeDelegate(address vault, address delegate)
func (_LocalhostTownsDelegation *LocalhostTownsDelegationFilterer) ParseRevokeDelegate(log types.Log) (*LocalhostTownsDelegationRevokeDelegate, error) {
	event := new(LocalhostTownsDelegationRevokeDelegate)
	if err := _LocalhostTownsDelegation.contract.UnpackLog(event, "RevokeDelegate", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
