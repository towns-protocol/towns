// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package goerli_towns_delegation

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

// GoerliTownsDelegationMetaData contains all meta data concerning the GoerliTownsDelegation contract.
var GoerliTownsDelegationMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"DelegateAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"DelegateForAll\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"RevokeAllDelegates\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"RevokeDelegate\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__Delegation_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"checkDelegateForAll\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"delegateForAll\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"getDelegatesForAll\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"delegates\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"getDelegationsByDelegate\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"internalType\":\"structIDelegationBase.DelegationInfo[]\",\"name\":\"info\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"revokeAllDelegates\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"revokeDelegate\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// GoerliTownsDelegationABI is the input ABI used to generate the binding from.
// Deprecated: Use GoerliTownsDelegationMetaData.ABI instead.
var GoerliTownsDelegationABI = GoerliTownsDelegationMetaData.ABI

// GoerliTownsDelegation is an auto generated Go binding around an Ethereum contract.
type GoerliTownsDelegation struct {
	GoerliTownsDelegationCaller     // Read-only binding to the contract
	GoerliTownsDelegationTransactor // Write-only binding to the contract
	GoerliTownsDelegationFilterer   // Log filterer for contract events
}

// GoerliTownsDelegationCaller is an auto generated read-only Go binding around an Ethereum contract.
type GoerliTownsDelegationCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsDelegationTransactor is an auto generated write-only Go binding around an Ethereum contract.
type GoerliTownsDelegationTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsDelegationFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type GoerliTownsDelegationFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsDelegationSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type GoerliTownsDelegationSession struct {
	Contract     *GoerliTownsDelegation // Generic contract binding to set the session for
	CallOpts     bind.CallOpts          // Call options to use throughout this session
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// GoerliTownsDelegationCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type GoerliTownsDelegationCallerSession struct {
	Contract *GoerliTownsDelegationCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                // Call options to use throughout this session
}

// GoerliTownsDelegationTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type GoerliTownsDelegationTransactorSession struct {
	Contract     *GoerliTownsDelegationTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                // Transaction auth options to use throughout this session
}

// GoerliTownsDelegationRaw is an auto generated low-level Go binding around an Ethereum contract.
type GoerliTownsDelegationRaw struct {
	Contract *GoerliTownsDelegation // Generic contract binding to access the raw methods on
}

// GoerliTownsDelegationCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type GoerliTownsDelegationCallerRaw struct {
	Contract *GoerliTownsDelegationCaller // Generic read-only contract binding to access the raw methods on
}

// GoerliTownsDelegationTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type GoerliTownsDelegationTransactorRaw struct {
	Contract *GoerliTownsDelegationTransactor // Generic write-only contract binding to access the raw methods on
}

// NewGoerliTownsDelegation creates a new instance of GoerliTownsDelegation, bound to a specific deployed contract.
func NewGoerliTownsDelegation(address common.Address, backend bind.ContractBackend) (*GoerliTownsDelegation, error) {
	contract, err := bindGoerliTownsDelegation(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegation{GoerliTownsDelegationCaller: GoerliTownsDelegationCaller{contract: contract}, GoerliTownsDelegationTransactor: GoerliTownsDelegationTransactor{contract: contract}, GoerliTownsDelegationFilterer: GoerliTownsDelegationFilterer{contract: contract}}, nil
}

// NewGoerliTownsDelegationCaller creates a new read-only instance of GoerliTownsDelegation, bound to a specific deployed contract.
func NewGoerliTownsDelegationCaller(address common.Address, caller bind.ContractCaller) (*GoerliTownsDelegationCaller, error) {
	contract, err := bindGoerliTownsDelegation(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationCaller{contract: contract}, nil
}

// NewGoerliTownsDelegationTransactor creates a new write-only instance of GoerliTownsDelegation, bound to a specific deployed contract.
func NewGoerliTownsDelegationTransactor(address common.Address, transactor bind.ContractTransactor) (*GoerliTownsDelegationTransactor, error) {
	contract, err := bindGoerliTownsDelegation(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationTransactor{contract: contract}, nil
}

// NewGoerliTownsDelegationFilterer creates a new log filterer instance of GoerliTownsDelegation, bound to a specific deployed contract.
func NewGoerliTownsDelegationFilterer(address common.Address, filterer bind.ContractFilterer) (*GoerliTownsDelegationFilterer, error) {
	contract, err := bindGoerliTownsDelegation(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationFilterer{contract: contract}, nil
}

// bindGoerliTownsDelegation binds a generic wrapper to an already deployed contract.
func bindGoerliTownsDelegation(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(GoerliTownsDelegationABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsDelegation *GoerliTownsDelegationRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsDelegation.Contract.GoerliTownsDelegationCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsDelegation *GoerliTownsDelegationRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.GoerliTownsDelegationTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsDelegation *GoerliTownsDelegationRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.GoerliTownsDelegationTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsDelegation *GoerliTownsDelegationCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsDelegation.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.contract.Transact(opts, method, params...)
}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_GoerliTownsDelegation *GoerliTownsDelegationCaller) CheckDelegateForAll(opts *bind.CallOpts, delegate common.Address, vault common.Address) (bool, error) {
	var out []interface{}
	err := _GoerliTownsDelegation.contract.Call(opts, &out, "checkDelegateForAll", delegate, vault)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_GoerliTownsDelegation *GoerliTownsDelegationSession) CheckDelegateForAll(delegate common.Address, vault common.Address) (bool, error) {
	return _GoerliTownsDelegation.Contract.CheckDelegateForAll(&_GoerliTownsDelegation.CallOpts, delegate, vault)
}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_GoerliTownsDelegation *GoerliTownsDelegationCallerSession) CheckDelegateForAll(delegate common.Address, vault common.Address) (bool, error) {
	return _GoerliTownsDelegation.Contract.CheckDelegateForAll(&_GoerliTownsDelegation.CallOpts, delegate, vault)
}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_GoerliTownsDelegation *GoerliTownsDelegationCaller) GetDelegatesForAll(opts *bind.CallOpts, vault common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _GoerliTownsDelegation.contract.Call(opts, &out, "getDelegatesForAll", vault)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_GoerliTownsDelegation *GoerliTownsDelegationSession) GetDelegatesForAll(vault common.Address) ([]common.Address, error) {
	return _GoerliTownsDelegation.Contract.GetDelegatesForAll(&_GoerliTownsDelegation.CallOpts, vault)
}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_GoerliTownsDelegation *GoerliTownsDelegationCallerSession) GetDelegatesForAll(vault common.Address) ([]common.Address, error) {
	return _GoerliTownsDelegation.Contract.GetDelegatesForAll(&_GoerliTownsDelegation.CallOpts, vault)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_GoerliTownsDelegation *GoerliTownsDelegationCaller) GetDelegationsByDelegate(opts *bind.CallOpts, delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	var out []interface{}
	err := _GoerliTownsDelegation.contract.Call(opts, &out, "getDelegationsByDelegate", delegate)

	if err != nil {
		return *new([]IDelegationBaseDelegationInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IDelegationBaseDelegationInfo)).(*[]IDelegationBaseDelegationInfo)

	return out0, err

}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_GoerliTownsDelegation *GoerliTownsDelegationSession) GetDelegationsByDelegate(delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	return _GoerliTownsDelegation.Contract.GetDelegationsByDelegate(&_GoerliTownsDelegation.CallOpts, delegate)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_GoerliTownsDelegation *GoerliTownsDelegationCallerSession) GetDelegationsByDelegate(delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	return _GoerliTownsDelegation.Contract.GetDelegationsByDelegate(&_GoerliTownsDelegation.CallOpts, delegate)
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactor) DelegationInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsDelegation.contract.Transact(opts, "__Delegation_init")
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationSession) DelegationInit() (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.DelegationInit(&_GoerliTownsDelegation.TransactOpts)
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactorSession) DelegationInit() (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.DelegationInit(&_GoerliTownsDelegation.TransactOpts)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactor) DelegateForAll(opts *bind.TransactOpts, delegate common.Address, value bool) (*types.Transaction, error) {
	return _GoerliTownsDelegation.contract.Transact(opts, "delegateForAll", delegate, value)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationSession) DelegateForAll(delegate common.Address, value bool) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.DelegateForAll(&_GoerliTownsDelegation.TransactOpts, delegate, value)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactorSession) DelegateForAll(delegate common.Address, value bool) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.DelegateForAll(&_GoerliTownsDelegation.TransactOpts, delegate, value)
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactor) RevokeAllDelegates(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsDelegation.contract.Transact(opts, "revokeAllDelegates")
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationSession) RevokeAllDelegates() (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.RevokeAllDelegates(&_GoerliTownsDelegation.TransactOpts)
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactorSession) RevokeAllDelegates() (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.RevokeAllDelegates(&_GoerliTownsDelegation.TransactOpts)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactor) RevokeDelegate(opts *bind.TransactOpts, delegate common.Address) (*types.Transaction, error) {
	return _GoerliTownsDelegation.contract.Transact(opts, "revokeDelegate", delegate)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationSession) RevokeDelegate(delegate common.Address) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.RevokeDelegate(&_GoerliTownsDelegation.TransactOpts, delegate)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_GoerliTownsDelegation *GoerliTownsDelegationTransactorSession) RevokeDelegate(delegate common.Address) (*types.Transaction, error) {
	return _GoerliTownsDelegation.Contract.RevokeDelegate(&_GoerliTownsDelegation.TransactOpts, delegate)
}

// GoerliTownsDelegationDelegateForAllIterator is returned from FilterDelegateForAll and is used to iterate over the raw logs and unpacked data for DelegateForAll events raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationDelegateForAllIterator struct {
	Event *GoerliTownsDelegationDelegateForAll // Event containing the contract specifics and raw log

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
func (it *GoerliTownsDelegationDelegateForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsDelegationDelegateForAll)
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
		it.Event = new(GoerliTownsDelegationDelegateForAll)
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
func (it *GoerliTownsDelegationDelegateForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsDelegationDelegateForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsDelegationDelegateForAll represents a DelegateForAll event raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationDelegateForAll struct {
	Vault    common.Address
	Delegate common.Address
	Value    bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterDelegateForAll is a free log retrieval operation binding the contract event 0x58781eab4a0743ab1c285a238be846a235f06cdb5b968030573a635e5f8c92fa.
//
// Solidity: event DelegateForAll(address vault, address delegate, bool value)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) FilterDelegateForAll(opts *bind.FilterOpts) (*GoerliTownsDelegationDelegateForAllIterator, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.FilterLogs(opts, "DelegateForAll")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationDelegateForAllIterator{contract: _GoerliTownsDelegation.contract, event: "DelegateForAll", logs: logs, sub: sub}, nil
}

// WatchDelegateForAll is a free log subscription operation binding the contract event 0x58781eab4a0743ab1c285a238be846a235f06cdb5b968030573a635e5f8c92fa.
//
// Solidity: event DelegateForAll(address vault, address delegate, bool value)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) WatchDelegateForAll(opts *bind.WatchOpts, sink chan<- *GoerliTownsDelegationDelegateForAll) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.WatchLogs(opts, "DelegateForAll")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsDelegationDelegateForAll)
				if err := _GoerliTownsDelegation.contract.UnpackLog(event, "DelegateForAll", log); err != nil {
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
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) ParseDelegateForAll(log types.Log) (*GoerliTownsDelegationDelegateForAll, error) {
	event := new(GoerliTownsDelegationDelegateForAll)
	if err := _GoerliTownsDelegation.contract.UnpackLog(event, "DelegateForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsDelegationInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationInitializedIterator struct {
	Event *GoerliTownsDelegationInitialized // Event containing the contract specifics and raw log

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
func (it *GoerliTownsDelegationInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsDelegationInitialized)
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
		it.Event = new(GoerliTownsDelegationInitialized)
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
func (it *GoerliTownsDelegationInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsDelegationInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsDelegationInitialized represents a Initialized event raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) FilterInitialized(opts *bind.FilterOpts) (*GoerliTownsDelegationInitializedIterator, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationInitializedIterator{contract: _GoerliTownsDelegation.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *GoerliTownsDelegationInitialized) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsDelegationInitialized)
				if err := _GoerliTownsDelegation.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) ParseInitialized(log types.Log) (*GoerliTownsDelegationInitialized, error) {
	event := new(GoerliTownsDelegationInitialized)
	if err := _GoerliTownsDelegation.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsDelegationInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationInterfaceAddedIterator struct {
	Event *GoerliTownsDelegationInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *GoerliTownsDelegationInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsDelegationInterfaceAdded)
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
		it.Event = new(GoerliTownsDelegationInterfaceAdded)
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
func (it *GoerliTownsDelegationInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsDelegationInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsDelegationInterfaceAdded represents a InterfaceAdded event raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsDelegationInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsDelegation.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationInterfaceAddedIterator{contract: _GoerliTownsDelegation.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *GoerliTownsDelegationInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsDelegation.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsDelegationInterfaceAdded)
				if err := _GoerliTownsDelegation.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) ParseInterfaceAdded(log types.Log) (*GoerliTownsDelegationInterfaceAdded, error) {
	event := new(GoerliTownsDelegationInterfaceAdded)
	if err := _GoerliTownsDelegation.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsDelegationInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationInterfaceRemovedIterator struct {
	Event *GoerliTownsDelegationInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *GoerliTownsDelegationInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsDelegationInterfaceRemoved)
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
		it.Event = new(GoerliTownsDelegationInterfaceRemoved)
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
func (it *GoerliTownsDelegationInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsDelegationInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsDelegationInterfaceRemoved represents a InterfaceRemoved event raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsDelegationInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsDelegation.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationInterfaceRemovedIterator{contract: _GoerliTownsDelegation.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *GoerliTownsDelegationInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsDelegation.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsDelegationInterfaceRemoved)
				if err := _GoerliTownsDelegation.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) ParseInterfaceRemoved(log types.Log) (*GoerliTownsDelegationInterfaceRemoved, error) {
	event := new(GoerliTownsDelegationInterfaceRemoved)
	if err := _GoerliTownsDelegation.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsDelegationRevokeAllDelegatesIterator is returned from FilterRevokeAllDelegates and is used to iterate over the raw logs and unpacked data for RevokeAllDelegates events raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationRevokeAllDelegatesIterator struct {
	Event *GoerliTownsDelegationRevokeAllDelegates // Event containing the contract specifics and raw log

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
func (it *GoerliTownsDelegationRevokeAllDelegatesIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsDelegationRevokeAllDelegates)
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
		it.Event = new(GoerliTownsDelegationRevokeAllDelegates)
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
func (it *GoerliTownsDelegationRevokeAllDelegatesIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsDelegationRevokeAllDelegatesIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsDelegationRevokeAllDelegates represents a RevokeAllDelegates event raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationRevokeAllDelegates struct {
	Vault common.Address
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterRevokeAllDelegates is a free log retrieval operation binding the contract event 0x32d74befd0b842e19694e3e3af46263e18bcce41352c8b600ff0002b49edf662.
//
// Solidity: event RevokeAllDelegates(address vault)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) FilterRevokeAllDelegates(opts *bind.FilterOpts) (*GoerliTownsDelegationRevokeAllDelegatesIterator, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.FilterLogs(opts, "RevokeAllDelegates")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationRevokeAllDelegatesIterator{contract: _GoerliTownsDelegation.contract, event: "RevokeAllDelegates", logs: logs, sub: sub}, nil
}

// WatchRevokeAllDelegates is a free log subscription operation binding the contract event 0x32d74befd0b842e19694e3e3af46263e18bcce41352c8b600ff0002b49edf662.
//
// Solidity: event RevokeAllDelegates(address vault)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) WatchRevokeAllDelegates(opts *bind.WatchOpts, sink chan<- *GoerliTownsDelegationRevokeAllDelegates) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.WatchLogs(opts, "RevokeAllDelegates")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsDelegationRevokeAllDelegates)
				if err := _GoerliTownsDelegation.contract.UnpackLog(event, "RevokeAllDelegates", log); err != nil {
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
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) ParseRevokeAllDelegates(log types.Log) (*GoerliTownsDelegationRevokeAllDelegates, error) {
	event := new(GoerliTownsDelegationRevokeAllDelegates)
	if err := _GoerliTownsDelegation.contract.UnpackLog(event, "RevokeAllDelegates", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsDelegationRevokeDelegateIterator is returned from FilterRevokeDelegate and is used to iterate over the raw logs and unpacked data for RevokeDelegate events raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationRevokeDelegateIterator struct {
	Event *GoerliTownsDelegationRevokeDelegate // Event containing the contract specifics and raw log

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
func (it *GoerliTownsDelegationRevokeDelegateIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsDelegationRevokeDelegate)
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
		it.Event = new(GoerliTownsDelegationRevokeDelegate)
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
func (it *GoerliTownsDelegationRevokeDelegateIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsDelegationRevokeDelegateIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsDelegationRevokeDelegate represents a RevokeDelegate event raised by the GoerliTownsDelegation contract.
type GoerliTownsDelegationRevokeDelegate struct {
	Vault    common.Address
	Delegate common.Address
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterRevokeDelegate is a free log retrieval operation binding the contract event 0x3e34a3ee53064fb79c0ee57448f03774a627a9270b0c41286efb7d8e32dcde93.
//
// Solidity: event RevokeDelegate(address vault, address delegate)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) FilterRevokeDelegate(opts *bind.FilterOpts) (*GoerliTownsDelegationRevokeDelegateIterator, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.FilterLogs(opts, "RevokeDelegate")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsDelegationRevokeDelegateIterator{contract: _GoerliTownsDelegation.contract, event: "RevokeDelegate", logs: logs, sub: sub}, nil
}

// WatchRevokeDelegate is a free log subscription operation binding the contract event 0x3e34a3ee53064fb79c0ee57448f03774a627a9270b0c41286efb7d8e32dcde93.
//
// Solidity: event RevokeDelegate(address vault, address delegate)
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) WatchRevokeDelegate(opts *bind.WatchOpts, sink chan<- *GoerliTownsDelegationRevokeDelegate) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsDelegation.contract.WatchLogs(opts, "RevokeDelegate")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsDelegationRevokeDelegate)
				if err := _GoerliTownsDelegation.contract.UnpackLog(event, "RevokeDelegate", log); err != nil {
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
func (_GoerliTownsDelegation *GoerliTownsDelegationFilterer) ParseRevokeDelegate(log types.Log) (*GoerliTownsDelegationRevokeDelegate, error) {
	event := new(GoerliTownsDelegationRevokeDelegate)
	if err := _GoerliTownsDelegation.contract.UnpackLog(event, "RevokeDelegate", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
