// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package v3

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

// TownsPausableMetaData contains all meta data concerning the TownsPausable contract.
var TownsPausableMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// TownsPausableABI is the input ABI used to generate the binding from.
// Deprecated: Use TownsPausableMetaData.ABI instead.
var TownsPausableABI = TownsPausableMetaData.ABI

// TownsPausable is an auto generated Go binding around an Ethereum contract.
type TownsPausable struct {
	TownsPausableCaller     // Read-only binding to the contract
	TownsPausableTransactor // Write-only binding to the contract
	TownsPausableFilterer   // Log filterer for contract events
}

// TownsPausableCaller is an auto generated read-only Go binding around an Ethereum contract.
type TownsPausableCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownsPausableTransactor is an auto generated write-only Go binding around an Ethereum contract.
type TownsPausableTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownsPausableFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type TownsPausableFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownsPausableSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type TownsPausableSession struct {
	Contract     *TownsPausable // Generic contract binding to set the session for
	CallOpts     bind.CallOpts            // Call options to use throughout this session
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// TownsPausableCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type TownsPausableCallerSession struct {
	Contract *TownsPausableCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                  // Call options to use throughout this session
}

// TownsPausableTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type TownsPausableTransactorSession struct {
	Contract     *TownsPausableTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                  // Transaction auth options to use throughout this session
}

// TownsPausableRaw is an auto generated low-level Go binding around an Ethereum contract.
type TownsPausableRaw struct {
	Contract *TownsPausable // Generic contract binding to access the raw methods on
}

// TownsPausableCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type TownsPausableCallerRaw struct {
	Contract *TownsPausableCaller // Generic read-only contract binding to access the raw methods on
}

// TownsPausableTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type TownsPausableTransactorRaw struct {
	Contract *TownsPausableTransactor // Generic write-only contract binding to access the raw methods on
}

// NewTownsPausable creates a new instance of TownsPausable, bound to a specific deployed contract.
func NewTownsPausable(address common.Address, backend bind.ContractBackend) (*TownsPausable, error) {
	contract, err := bindTownsPausable(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &TownsPausable{TownsPausableCaller: TownsPausableCaller{contract: contract}, TownsPausableTransactor: TownsPausableTransactor{contract: contract}, TownsPausableFilterer: TownsPausableFilterer{contract: contract}}, nil
}

// NewTownsPausableCaller creates a new read-only instance of TownsPausable, bound to a specific deployed contract.
func NewTownsPausableCaller(address common.Address, caller bind.ContractCaller) (*TownsPausableCaller, error) {
	contract, err := bindTownsPausable(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &TownsPausableCaller{contract: contract}, nil
}

// NewTownsPausableTransactor creates a new write-only instance of TownsPausable, bound to a specific deployed contract.
func NewTownsPausableTransactor(address common.Address, transactor bind.ContractTransactor) (*TownsPausableTransactor, error) {
	contract, err := bindTownsPausable(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &TownsPausableTransactor{contract: contract}, nil
}

// NewTownsPausableFilterer creates a new log filterer instance of TownsPausable, bound to a specific deployed contract.
func NewTownsPausableFilterer(address common.Address, filterer bind.ContractFilterer) (*TownsPausableFilterer, error) {
	contract, err := bindTownsPausable(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &TownsPausableFilterer{contract: contract}, nil
}

// bindTownsPausable binds a generic wrapper to an already deployed contract.
func bindTownsPausable(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := TownsPausableMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TownsPausable *TownsPausableRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TownsPausable.Contract.TownsPausableCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TownsPausable *TownsPausableRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TownsPausable.Contract.TownsPausableTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TownsPausable *TownsPausableRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TownsPausable.Contract.TownsPausableTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TownsPausable *TownsPausableCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TownsPausable.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TownsPausable *TownsPausableTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TownsPausable.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TownsPausable *TownsPausableTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TownsPausable.Contract.contract.Transact(opts, method, params...)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_TownsPausable *TownsPausableCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _TownsPausable.contract.Call(opts, &out, "paused")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_TownsPausable *TownsPausableSession) Paused() (bool, error) {
	return _TownsPausable.Contract.Paused(&_TownsPausable.CallOpts)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_TownsPausable *TownsPausableCallerSession) Paused() (bool, error) {
	return _TownsPausable.Contract.Paused(&_TownsPausable.CallOpts)
}

// TownsPausablePausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the TownsPausable contract.
type TownsPausablePausedIterator struct {
	Event *TownsPausablePaused // Event containing the contract specifics and raw log

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
func (it *TownsPausablePausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsPausablePaused)
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
		it.Event = new(TownsPausablePaused)
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
func (it *TownsPausablePausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsPausablePausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsPausablePaused represents a Paused event raised by the TownsPausable contract.
type TownsPausablePaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_TownsPausable *TownsPausableFilterer) FilterPaused(opts *bind.FilterOpts) (*TownsPausablePausedIterator, error) {

	logs, sub, err := _TownsPausable.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &TownsPausablePausedIterator{contract: _TownsPausable.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_TownsPausable *TownsPausableFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *TownsPausablePaused) (event.Subscription, error) {

	logs, sub, err := _TownsPausable.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsPausablePaused)
				if err := _TownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_TownsPausable *TownsPausableFilterer) ParsePaused(log types.Log) (*TownsPausablePaused, error) {
	event := new(TownsPausablePaused)
	if err := _TownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownsPausableUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the TownsPausable contract.
type TownsPausableUnpausedIterator struct {
	Event *TownsPausableUnpaused // Event containing the contract specifics and raw log

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
func (it *TownsPausableUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsPausableUnpaused)
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
		it.Event = new(TownsPausableUnpaused)
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
func (it *TownsPausableUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsPausableUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsPausableUnpaused represents a Unpaused event raised by the TownsPausable contract.
type TownsPausableUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_TownsPausable *TownsPausableFilterer) FilterUnpaused(opts *bind.FilterOpts) (*TownsPausableUnpausedIterator, error) {

	logs, sub, err := _TownsPausable.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &TownsPausableUnpausedIterator{contract: _TownsPausable.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_TownsPausable *TownsPausableFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *TownsPausableUnpaused) (event.Subscription, error) {

	logs, sub, err := _TownsPausable.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsPausableUnpaused)
				if err := _TownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_TownsPausable *TownsPausableFilterer) ParseUnpaused(log types.Log) (*TownsPausableUnpaused, error) {
	event := new(TownsPausableUnpaused)
	if err := _TownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
