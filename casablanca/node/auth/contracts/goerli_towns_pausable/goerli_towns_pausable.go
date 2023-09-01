// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package goerli_towns_pausable

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

// GoerliTownsPausableMetaData contains all meta data concerning the GoerliTownsPausable contract.
var GoerliTownsPausableMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// GoerliTownsPausableABI is the input ABI used to generate the binding from.
// Deprecated: Use GoerliTownsPausableMetaData.ABI instead.
var GoerliTownsPausableABI = GoerliTownsPausableMetaData.ABI

// GoerliTownsPausable is an auto generated Go binding around an Ethereum contract.
type GoerliTownsPausable struct {
	GoerliTownsPausableCaller     // Read-only binding to the contract
	GoerliTownsPausableTransactor // Write-only binding to the contract
	GoerliTownsPausableFilterer   // Log filterer for contract events
}

// GoerliTownsPausableCaller is an auto generated read-only Go binding around an Ethereum contract.
type GoerliTownsPausableCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsPausableTransactor is an auto generated write-only Go binding around an Ethereum contract.
type GoerliTownsPausableTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsPausableFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type GoerliTownsPausableFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsPausableSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type GoerliTownsPausableSession struct {
	Contract     *GoerliTownsPausable // Generic contract binding to set the session for
	CallOpts     bind.CallOpts        // Call options to use throughout this session
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// GoerliTownsPausableCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type GoerliTownsPausableCallerSession struct {
	Contract *GoerliTownsPausableCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts              // Call options to use throughout this session
}

// GoerliTownsPausableTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type GoerliTownsPausableTransactorSession struct {
	Contract     *GoerliTownsPausableTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// GoerliTownsPausableRaw is an auto generated low-level Go binding around an Ethereum contract.
type GoerliTownsPausableRaw struct {
	Contract *GoerliTownsPausable // Generic contract binding to access the raw methods on
}

// GoerliTownsPausableCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type GoerliTownsPausableCallerRaw struct {
	Contract *GoerliTownsPausableCaller // Generic read-only contract binding to access the raw methods on
}

// GoerliTownsPausableTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type GoerliTownsPausableTransactorRaw struct {
	Contract *GoerliTownsPausableTransactor // Generic write-only contract binding to access the raw methods on
}

// NewGoerliTownsPausable creates a new instance of GoerliTownsPausable, bound to a specific deployed contract.
func NewGoerliTownsPausable(address common.Address, backend bind.ContractBackend) (*GoerliTownsPausable, error) {
	contract, err := bindGoerliTownsPausable(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsPausable{GoerliTownsPausableCaller: GoerliTownsPausableCaller{contract: contract}, GoerliTownsPausableTransactor: GoerliTownsPausableTransactor{contract: contract}, GoerliTownsPausableFilterer: GoerliTownsPausableFilterer{contract: contract}}, nil
}

// NewGoerliTownsPausableCaller creates a new read-only instance of GoerliTownsPausable, bound to a specific deployed contract.
func NewGoerliTownsPausableCaller(address common.Address, caller bind.ContractCaller) (*GoerliTownsPausableCaller, error) {
	contract, err := bindGoerliTownsPausable(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsPausableCaller{contract: contract}, nil
}

// NewGoerliTownsPausableTransactor creates a new write-only instance of GoerliTownsPausable, bound to a specific deployed contract.
func NewGoerliTownsPausableTransactor(address common.Address, transactor bind.ContractTransactor) (*GoerliTownsPausableTransactor, error) {
	contract, err := bindGoerliTownsPausable(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsPausableTransactor{contract: contract}, nil
}

// NewGoerliTownsPausableFilterer creates a new log filterer instance of GoerliTownsPausable, bound to a specific deployed contract.
func NewGoerliTownsPausableFilterer(address common.Address, filterer bind.ContractFilterer) (*GoerliTownsPausableFilterer, error) {
	contract, err := bindGoerliTownsPausable(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsPausableFilterer{contract: contract}, nil
}

// bindGoerliTownsPausable binds a generic wrapper to an already deployed contract.
func bindGoerliTownsPausable(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := GoerliTownsPausableMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsPausable *GoerliTownsPausableRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsPausable.Contract.GoerliTownsPausableCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsPausable *GoerliTownsPausableRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsPausable.Contract.GoerliTownsPausableTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsPausable *GoerliTownsPausableRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsPausable.Contract.GoerliTownsPausableTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsPausable *GoerliTownsPausableCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsPausable.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsPausable *GoerliTownsPausableTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsPausable.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsPausable *GoerliTownsPausableTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsPausable.Contract.contract.Transact(opts, method, params...)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_GoerliTownsPausable *GoerliTownsPausableCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _GoerliTownsPausable.contract.Call(opts, &out, "paused")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_GoerliTownsPausable *GoerliTownsPausableSession) Paused() (bool, error) {
	return _GoerliTownsPausable.Contract.Paused(&_GoerliTownsPausable.CallOpts)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_GoerliTownsPausable *GoerliTownsPausableCallerSession) Paused() (bool, error) {
	return _GoerliTownsPausable.Contract.Paused(&_GoerliTownsPausable.CallOpts)
}

// GoerliTownsPausablePausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the GoerliTownsPausable contract.
type GoerliTownsPausablePausedIterator struct {
	Event *GoerliTownsPausablePaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsPausablePausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsPausablePaused)
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
		it.Event = new(GoerliTownsPausablePaused)
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
func (it *GoerliTownsPausablePausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsPausablePausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsPausablePaused represents a Paused event raised by the GoerliTownsPausable contract.
type GoerliTownsPausablePaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsPausable *GoerliTownsPausableFilterer) FilterPaused(opts *bind.FilterOpts) (*GoerliTownsPausablePausedIterator, error) {

	logs, sub, err := _GoerliTownsPausable.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsPausablePausedIterator{contract: _GoerliTownsPausable.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsPausable *GoerliTownsPausableFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsPausablePaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsPausable.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsPausablePaused)
				if err := _GoerliTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_GoerliTownsPausable *GoerliTownsPausableFilterer) ParsePaused(log types.Log) (*GoerliTownsPausablePaused, error) {
	event := new(GoerliTownsPausablePaused)
	if err := _GoerliTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsPausableUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the GoerliTownsPausable contract.
type GoerliTownsPausableUnpausedIterator struct {
	Event *GoerliTownsPausableUnpaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsPausableUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsPausableUnpaused)
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
		it.Event = new(GoerliTownsPausableUnpaused)
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
func (it *GoerliTownsPausableUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsPausableUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsPausableUnpaused represents a Unpaused event raised by the GoerliTownsPausable contract.
type GoerliTownsPausableUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsPausable *GoerliTownsPausableFilterer) FilterUnpaused(opts *bind.FilterOpts) (*GoerliTownsPausableUnpausedIterator, error) {

	logs, sub, err := _GoerliTownsPausable.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsPausableUnpausedIterator{contract: _GoerliTownsPausable.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsPausable *GoerliTownsPausableFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsPausableUnpaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsPausable.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsPausableUnpaused)
				if err := _GoerliTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_GoerliTownsPausable *GoerliTownsPausableFilterer) ParseUnpaused(log types.Log) (*GoerliTownsPausableUnpaused, error) {
	event := new(GoerliTownsPausableUnpaused)
	if err := _GoerliTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
