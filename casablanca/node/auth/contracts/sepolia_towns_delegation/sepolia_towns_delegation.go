// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sepolia_towns_delegation

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

// SepoliaTownsDelegationMetaData contains all meta data concerning the SepoliaTownsDelegation contract.
var SepoliaTownsDelegationMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"DelegateAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"DelegateForAll\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"RevokeAllDelegates\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"RevokeDelegate\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__Delegation_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"checkDelegateForAll\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"delegateForAll\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"}],\"name\":\"getDelegatesForAll\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"delegates\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"getDelegationsByDelegate\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"vault\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"internalType\":\"structIDelegationBase.DelegationInfo[]\",\"name\":\"info\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"revokeAllDelegates\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"delegate\",\"type\":\"address\"}],\"name\":\"revokeDelegate\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// SepoliaTownsDelegationABI is the input ABI used to generate the binding from.
// Deprecated: Use SepoliaTownsDelegationMetaData.ABI instead.
var SepoliaTownsDelegationABI = SepoliaTownsDelegationMetaData.ABI

// SepoliaTownsDelegation is an auto generated Go binding around an Ethereum contract.
type SepoliaTownsDelegation struct {
	SepoliaTownsDelegationCaller     // Read-only binding to the contract
	SepoliaTownsDelegationTransactor // Write-only binding to the contract
	SepoliaTownsDelegationFilterer   // Log filterer for contract events
}

// SepoliaTownsDelegationCaller is an auto generated read-only Go binding around an Ethereum contract.
type SepoliaTownsDelegationCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsDelegationTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SepoliaTownsDelegationTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsDelegationFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SepoliaTownsDelegationFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsDelegationSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SepoliaTownsDelegationSession struct {
	Contract     *SepoliaTownsDelegation // Generic contract binding to set the session for
	CallOpts     bind.CallOpts           // Call options to use throughout this session
	TransactOpts bind.TransactOpts       // Transaction auth options to use throughout this session
}

// SepoliaTownsDelegationCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SepoliaTownsDelegationCallerSession struct {
	Contract *SepoliaTownsDelegationCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                 // Call options to use throughout this session
}

// SepoliaTownsDelegationTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SepoliaTownsDelegationTransactorSession struct {
	Contract     *SepoliaTownsDelegationTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                 // Transaction auth options to use throughout this session
}

// SepoliaTownsDelegationRaw is an auto generated low-level Go binding around an Ethereum contract.
type SepoliaTownsDelegationRaw struct {
	Contract *SepoliaTownsDelegation // Generic contract binding to access the raw methods on
}

// SepoliaTownsDelegationCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SepoliaTownsDelegationCallerRaw struct {
	Contract *SepoliaTownsDelegationCaller // Generic read-only contract binding to access the raw methods on
}

// SepoliaTownsDelegationTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SepoliaTownsDelegationTransactorRaw struct {
	Contract *SepoliaTownsDelegationTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSepoliaTownsDelegation creates a new instance of SepoliaTownsDelegation, bound to a specific deployed contract.
func NewSepoliaTownsDelegation(address common.Address, backend bind.ContractBackend) (*SepoliaTownsDelegation, error) {
	contract, err := bindSepoliaTownsDelegation(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegation{SepoliaTownsDelegationCaller: SepoliaTownsDelegationCaller{contract: contract}, SepoliaTownsDelegationTransactor: SepoliaTownsDelegationTransactor{contract: contract}, SepoliaTownsDelegationFilterer: SepoliaTownsDelegationFilterer{contract: contract}}, nil
}

// NewSepoliaTownsDelegationCaller creates a new read-only instance of SepoliaTownsDelegation, bound to a specific deployed contract.
func NewSepoliaTownsDelegationCaller(address common.Address, caller bind.ContractCaller) (*SepoliaTownsDelegationCaller, error) {
	contract, err := bindSepoliaTownsDelegation(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationCaller{contract: contract}, nil
}

// NewSepoliaTownsDelegationTransactor creates a new write-only instance of SepoliaTownsDelegation, bound to a specific deployed contract.
func NewSepoliaTownsDelegationTransactor(address common.Address, transactor bind.ContractTransactor) (*SepoliaTownsDelegationTransactor, error) {
	contract, err := bindSepoliaTownsDelegation(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationTransactor{contract: contract}, nil
}

// NewSepoliaTownsDelegationFilterer creates a new log filterer instance of SepoliaTownsDelegation, bound to a specific deployed contract.
func NewSepoliaTownsDelegationFilterer(address common.Address, filterer bind.ContractFilterer) (*SepoliaTownsDelegationFilterer, error) {
	contract, err := bindSepoliaTownsDelegation(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationFilterer{contract: contract}, nil
}

// bindSepoliaTownsDelegation binds a generic wrapper to an already deployed contract.
func bindSepoliaTownsDelegation(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(SepoliaTownsDelegationABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsDelegation *SepoliaTownsDelegationRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsDelegation.Contract.SepoliaTownsDelegationCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsDelegation *SepoliaTownsDelegationRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.SepoliaTownsDelegationTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsDelegation *SepoliaTownsDelegationRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.SepoliaTownsDelegationTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsDelegation *SepoliaTownsDelegationCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsDelegation.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.contract.Transact(opts, method, params...)
}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationCaller) CheckDelegateForAll(opts *bind.CallOpts, delegate common.Address, vault common.Address) (bool, error) {
	var out []interface{}
	err := _SepoliaTownsDelegation.contract.Call(opts, &out, "checkDelegateForAll", delegate, vault)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationSession) CheckDelegateForAll(delegate common.Address, vault common.Address) (bool, error) {
	return _SepoliaTownsDelegation.Contract.CheckDelegateForAll(&_SepoliaTownsDelegation.CallOpts, delegate, vault)
}

// CheckDelegateForAll is a free data retrieval call binding the contract method 0x9c395bc2.
//
// Solidity: function checkDelegateForAll(address delegate, address vault) view returns(bool)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationCallerSession) CheckDelegateForAll(delegate common.Address, vault common.Address) (bool, error) {
	return _SepoliaTownsDelegation.Contract.CheckDelegateForAll(&_SepoliaTownsDelegation.CallOpts, delegate, vault)
}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationCaller) GetDelegatesForAll(opts *bind.CallOpts, vault common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _SepoliaTownsDelegation.contract.Call(opts, &out, "getDelegatesForAll", vault)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationSession) GetDelegatesForAll(vault common.Address) ([]common.Address, error) {
	return _SepoliaTownsDelegation.Contract.GetDelegatesForAll(&_SepoliaTownsDelegation.CallOpts, vault)
}

// GetDelegatesForAll is a free data retrieval call binding the contract method 0x1b61f675.
//
// Solidity: function getDelegatesForAll(address vault) view returns(address[] delegates)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationCallerSession) GetDelegatesForAll(vault common.Address) ([]common.Address, error) {
	return _SepoliaTownsDelegation.Contract.GetDelegatesForAll(&_SepoliaTownsDelegation.CallOpts, vault)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationCaller) GetDelegationsByDelegate(opts *bind.CallOpts, delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	var out []interface{}
	err := _SepoliaTownsDelegation.contract.Call(opts, &out, "getDelegationsByDelegate", delegate)

	if err != nil {
		return *new([]IDelegationBaseDelegationInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IDelegationBaseDelegationInfo)).(*[]IDelegationBaseDelegationInfo)

	return out0, err

}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationSession) GetDelegationsByDelegate(delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	return _SepoliaTownsDelegation.Contract.GetDelegationsByDelegate(&_SepoliaTownsDelegation.CallOpts, delegate)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((address,address)[] info)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationCallerSession) GetDelegationsByDelegate(delegate common.Address) ([]IDelegationBaseDelegationInfo, error) {
	return _SepoliaTownsDelegation.Contract.GetDelegationsByDelegate(&_SepoliaTownsDelegation.CallOpts, delegate)
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactor) DelegationInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.contract.Transact(opts, "__Delegation_init")
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationSession) DelegationInit() (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.DelegationInit(&_SepoliaTownsDelegation.TransactOpts)
}

// DelegationInit is a paid mutator transaction binding the contract method 0xd51c3337.
//
// Solidity: function __Delegation_init() returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactorSession) DelegationInit() (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.DelegationInit(&_SepoliaTownsDelegation.TransactOpts)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactor) DelegateForAll(opts *bind.TransactOpts, delegate common.Address, value bool) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.contract.Transact(opts, "delegateForAll", delegate, value)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationSession) DelegateForAll(delegate common.Address, value bool) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.DelegateForAll(&_SepoliaTownsDelegation.TransactOpts, delegate, value)
}

// DelegateForAll is a paid mutator transaction binding the contract method 0x685ee3e8.
//
// Solidity: function delegateForAll(address delegate, bool value) returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactorSession) DelegateForAll(delegate common.Address, value bool) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.DelegateForAll(&_SepoliaTownsDelegation.TransactOpts, delegate, value)
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactor) RevokeAllDelegates(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.contract.Transact(opts, "revokeAllDelegates")
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationSession) RevokeAllDelegates() (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.RevokeAllDelegates(&_SepoliaTownsDelegation.TransactOpts)
}

// RevokeAllDelegates is a paid mutator transaction binding the contract method 0x36137872.
//
// Solidity: function revokeAllDelegates() returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactorSession) RevokeAllDelegates() (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.RevokeAllDelegates(&_SepoliaTownsDelegation.TransactOpts)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactor) RevokeDelegate(opts *bind.TransactOpts, delegate common.Address) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.contract.Transact(opts, "revokeDelegate", delegate)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationSession) RevokeDelegate(delegate common.Address) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.RevokeDelegate(&_SepoliaTownsDelegation.TransactOpts, delegate)
}

// RevokeDelegate is a paid mutator transaction binding the contract method 0xfa352c00.
//
// Solidity: function revokeDelegate(address delegate) returns()
func (_SepoliaTownsDelegation *SepoliaTownsDelegationTransactorSession) RevokeDelegate(delegate common.Address) (*types.Transaction, error) {
	return _SepoliaTownsDelegation.Contract.RevokeDelegate(&_SepoliaTownsDelegation.TransactOpts, delegate)
}

// SepoliaTownsDelegationDelegateForAllIterator is returned from FilterDelegateForAll and is used to iterate over the raw logs and unpacked data for DelegateForAll events raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationDelegateForAllIterator struct {
	Event *SepoliaTownsDelegationDelegateForAll // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsDelegationDelegateForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsDelegationDelegateForAll)
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
		it.Event = new(SepoliaTownsDelegationDelegateForAll)
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
func (it *SepoliaTownsDelegationDelegateForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsDelegationDelegateForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsDelegationDelegateForAll represents a DelegateForAll event raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationDelegateForAll struct {
	Vault    common.Address
	Delegate common.Address
	Value    bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterDelegateForAll is a free log retrieval operation binding the contract event 0x58781eab4a0743ab1c285a238be846a235f06cdb5b968030573a635e5f8c92fa.
//
// Solidity: event DelegateForAll(address vault, address delegate, bool value)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) FilterDelegateForAll(opts *bind.FilterOpts) (*SepoliaTownsDelegationDelegateForAllIterator, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.FilterLogs(opts, "DelegateForAll")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationDelegateForAllIterator{contract: _SepoliaTownsDelegation.contract, event: "DelegateForAll", logs: logs, sub: sub}, nil
}

// WatchDelegateForAll is a free log subscription operation binding the contract event 0x58781eab4a0743ab1c285a238be846a235f06cdb5b968030573a635e5f8c92fa.
//
// Solidity: event DelegateForAll(address vault, address delegate, bool value)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) WatchDelegateForAll(opts *bind.WatchOpts, sink chan<- *SepoliaTownsDelegationDelegateForAll) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.WatchLogs(opts, "DelegateForAll")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsDelegationDelegateForAll)
				if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "DelegateForAll", log); err != nil {
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
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) ParseDelegateForAll(log types.Log) (*SepoliaTownsDelegationDelegateForAll, error) {
	event := new(SepoliaTownsDelegationDelegateForAll)
	if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "DelegateForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsDelegationInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationInitializedIterator struct {
	Event *SepoliaTownsDelegationInitialized // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsDelegationInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsDelegationInitialized)
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
		it.Event = new(SepoliaTownsDelegationInitialized)
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
func (it *SepoliaTownsDelegationInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsDelegationInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsDelegationInitialized represents a Initialized event raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) FilterInitialized(opts *bind.FilterOpts) (*SepoliaTownsDelegationInitializedIterator, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationInitializedIterator{contract: _SepoliaTownsDelegation.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *SepoliaTownsDelegationInitialized) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsDelegationInitialized)
				if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) ParseInitialized(log types.Log) (*SepoliaTownsDelegationInitialized, error) {
	event := new(SepoliaTownsDelegationInitialized)
	if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsDelegationInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationInterfaceAddedIterator struct {
	Event *SepoliaTownsDelegationInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsDelegationInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsDelegationInterfaceAdded)
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
		it.Event = new(SepoliaTownsDelegationInterfaceAdded)
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
func (it *SepoliaTownsDelegationInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsDelegationInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsDelegationInterfaceAdded represents a InterfaceAdded event raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*SepoliaTownsDelegationInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsDelegation.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationInterfaceAddedIterator{contract: _SepoliaTownsDelegation.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *SepoliaTownsDelegationInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsDelegation.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsDelegationInterfaceAdded)
				if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) ParseInterfaceAdded(log types.Log) (*SepoliaTownsDelegationInterfaceAdded, error) {
	event := new(SepoliaTownsDelegationInterfaceAdded)
	if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsDelegationInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationInterfaceRemovedIterator struct {
	Event *SepoliaTownsDelegationInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsDelegationInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsDelegationInterfaceRemoved)
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
		it.Event = new(SepoliaTownsDelegationInterfaceRemoved)
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
func (it *SepoliaTownsDelegationInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsDelegationInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsDelegationInterfaceRemoved represents a InterfaceRemoved event raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*SepoliaTownsDelegationInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsDelegation.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationInterfaceRemovedIterator{contract: _SepoliaTownsDelegation.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *SepoliaTownsDelegationInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsDelegation.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsDelegationInterfaceRemoved)
				if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) ParseInterfaceRemoved(log types.Log) (*SepoliaTownsDelegationInterfaceRemoved, error) {
	event := new(SepoliaTownsDelegationInterfaceRemoved)
	if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsDelegationRevokeAllDelegatesIterator is returned from FilterRevokeAllDelegates and is used to iterate over the raw logs and unpacked data for RevokeAllDelegates events raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationRevokeAllDelegatesIterator struct {
	Event *SepoliaTownsDelegationRevokeAllDelegates // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsDelegationRevokeAllDelegatesIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsDelegationRevokeAllDelegates)
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
		it.Event = new(SepoliaTownsDelegationRevokeAllDelegates)
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
func (it *SepoliaTownsDelegationRevokeAllDelegatesIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsDelegationRevokeAllDelegatesIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsDelegationRevokeAllDelegates represents a RevokeAllDelegates event raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationRevokeAllDelegates struct {
	Vault common.Address
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterRevokeAllDelegates is a free log retrieval operation binding the contract event 0x32d74befd0b842e19694e3e3af46263e18bcce41352c8b600ff0002b49edf662.
//
// Solidity: event RevokeAllDelegates(address vault)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) FilterRevokeAllDelegates(opts *bind.FilterOpts) (*SepoliaTownsDelegationRevokeAllDelegatesIterator, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.FilterLogs(opts, "RevokeAllDelegates")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationRevokeAllDelegatesIterator{contract: _SepoliaTownsDelegation.contract, event: "RevokeAllDelegates", logs: logs, sub: sub}, nil
}

// WatchRevokeAllDelegates is a free log subscription operation binding the contract event 0x32d74befd0b842e19694e3e3af46263e18bcce41352c8b600ff0002b49edf662.
//
// Solidity: event RevokeAllDelegates(address vault)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) WatchRevokeAllDelegates(opts *bind.WatchOpts, sink chan<- *SepoliaTownsDelegationRevokeAllDelegates) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.WatchLogs(opts, "RevokeAllDelegates")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsDelegationRevokeAllDelegates)
				if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "RevokeAllDelegates", log); err != nil {
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
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) ParseRevokeAllDelegates(log types.Log) (*SepoliaTownsDelegationRevokeAllDelegates, error) {
	event := new(SepoliaTownsDelegationRevokeAllDelegates)
	if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "RevokeAllDelegates", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsDelegationRevokeDelegateIterator is returned from FilterRevokeDelegate and is used to iterate over the raw logs and unpacked data for RevokeDelegate events raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationRevokeDelegateIterator struct {
	Event *SepoliaTownsDelegationRevokeDelegate // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsDelegationRevokeDelegateIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsDelegationRevokeDelegate)
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
		it.Event = new(SepoliaTownsDelegationRevokeDelegate)
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
func (it *SepoliaTownsDelegationRevokeDelegateIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsDelegationRevokeDelegateIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsDelegationRevokeDelegate represents a RevokeDelegate event raised by the SepoliaTownsDelegation contract.
type SepoliaTownsDelegationRevokeDelegate struct {
	Vault    common.Address
	Delegate common.Address
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterRevokeDelegate is a free log retrieval operation binding the contract event 0x3e34a3ee53064fb79c0ee57448f03774a627a9270b0c41286efb7d8e32dcde93.
//
// Solidity: event RevokeDelegate(address vault, address delegate)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) FilterRevokeDelegate(opts *bind.FilterOpts) (*SepoliaTownsDelegationRevokeDelegateIterator, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.FilterLogs(opts, "RevokeDelegate")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsDelegationRevokeDelegateIterator{contract: _SepoliaTownsDelegation.contract, event: "RevokeDelegate", logs: logs, sub: sub}, nil
}

// WatchRevokeDelegate is a free log subscription operation binding the contract event 0x3e34a3ee53064fb79c0ee57448f03774a627a9270b0c41286efb7d8e32dcde93.
//
// Solidity: event RevokeDelegate(address vault, address delegate)
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) WatchRevokeDelegate(opts *bind.WatchOpts, sink chan<- *SepoliaTownsDelegationRevokeDelegate) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsDelegation.contract.WatchLogs(opts, "RevokeDelegate")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsDelegationRevokeDelegate)
				if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "RevokeDelegate", log); err != nil {
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
func (_SepoliaTownsDelegation *SepoliaTownsDelegationFilterer) ParseRevokeDelegate(log types.Log) (*SepoliaTownsDelegationRevokeDelegate, error) {
	event := new(SepoliaTownsDelegationRevokeDelegate)
	if err := _SepoliaTownsDelegation.contract.UnpackLog(event, "RevokeDelegate", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
