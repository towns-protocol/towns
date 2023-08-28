// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_towns_pausable

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

// LocalhostTownsPausableMetaData contains all meta data concerning the LocalhostTownsPausable contract.
var LocalhostTownsPausableMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// LocalhostTownsPausableABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostTownsPausableMetaData.ABI instead.
var LocalhostTownsPausableABI = LocalhostTownsPausableMetaData.ABI

// LocalhostTownsPausable is an auto generated Go binding around an Ethereum contract.
type LocalhostTownsPausable struct {
	LocalhostTownsPausableCaller     // Read-only binding to the contract
	LocalhostTownsPausableTransactor // Write-only binding to the contract
	LocalhostTownsPausableFilterer   // Log filterer for contract events
}

// LocalhostTownsPausableCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostTownsPausableCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsPausableTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostTownsPausableTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsPausableFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostTownsPausableFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsPausableSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostTownsPausableSession struct {
	Contract     *LocalhostTownsPausable // Generic contract binding to set the session for
	CallOpts     bind.CallOpts           // Call options to use throughout this session
	TransactOpts bind.TransactOpts       // Transaction auth options to use throughout this session
}

// LocalhostTownsPausableCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostTownsPausableCallerSession struct {
	Contract *LocalhostTownsPausableCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                 // Call options to use throughout this session
}

// LocalhostTownsPausableTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostTownsPausableTransactorSession struct {
	Contract     *LocalhostTownsPausableTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                 // Transaction auth options to use throughout this session
}

// LocalhostTownsPausableRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostTownsPausableRaw struct {
	Contract *LocalhostTownsPausable // Generic contract binding to access the raw methods on
}

// LocalhostTownsPausableCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostTownsPausableCallerRaw struct {
	Contract *LocalhostTownsPausableCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostTownsPausableTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostTownsPausableTransactorRaw struct {
	Contract *LocalhostTownsPausableTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostTownsPausable creates a new instance of LocalhostTownsPausable, bound to a specific deployed contract.
func NewLocalhostTownsPausable(address common.Address, backend bind.ContractBackend) (*LocalhostTownsPausable, error) {
	contract, err := bindLocalhostTownsPausable(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsPausable{LocalhostTownsPausableCaller: LocalhostTownsPausableCaller{contract: contract}, LocalhostTownsPausableTransactor: LocalhostTownsPausableTransactor{contract: contract}, LocalhostTownsPausableFilterer: LocalhostTownsPausableFilterer{contract: contract}}, nil
}

// NewLocalhostTownsPausableCaller creates a new read-only instance of LocalhostTownsPausable, bound to a specific deployed contract.
func NewLocalhostTownsPausableCaller(address common.Address, caller bind.ContractCaller) (*LocalhostTownsPausableCaller, error) {
	contract, err := bindLocalhostTownsPausable(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsPausableCaller{contract: contract}, nil
}

// NewLocalhostTownsPausableTransactor creates a new write-only instance of LocalhostTownsPausable, bound to a specific deployed contract.
func NewLocalhostTownsPausableTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostTownsPausableTransactor, error) {
	contract, err := bindLocalhostTownsPausable(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsPausableTransactor{contract: contract}, nil
}

// NewLocalhostTownsPausableFilterer creates a new log filterer instance of LocalhostTownsPausable, bound to a specific deployed contract.
func NewLocalhostTownsPausableFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostTownsPausableFilterer, error) {
	contract, err := bindLocalhostTownsPausable(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsPausableFilterer{contract: contract}, nil
}

// bindLocalhostTownsPausable binds a generic wrapper to an already deployed contract.
func bindLocalhostTownsPausable(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(LocalhostTownsPausableABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsPausable *LocalhostTownsPausableRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsPausable.Contract.LocalhostTownsPausableCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsPausable *LocalhostTownsPausableRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsPausable.Contract.LocalhostTownsPausableTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsPausable *LocalhostTownsPausableRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsPausable.Contract.LocalhostTownsPausableTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsPausable *LocalhostTownsPausableCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsPausable.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsPausable *LocalhostTownsPausableTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsPausable.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsPausable *LocalhostTownsPausableTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsPausable.Contract.contract.Transact(opts, method, params...)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_LocalhostTownsPausable *LocalhostTownsPausableCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _LocalhostTownsPausable.contract.Call(opts, &out, "paused")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_LocalhostTownsPausable *LocalhostTownsPausableSession) Paused() (bool, error) {
	return _LocalhostTownsPausable.Contract.Paused(&_LocalhostTownsPausable.CallOpts)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_LocalhostTownsPausable *LocalhostTownsPausableCallerSession) Paused() (bool, error) {
	return _LocalhostTownsPausable.Contract.Paused(&_LocalhostTownsPausable.CallOpts)
}

// LocalhostTownsPausablePausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the LocalhostTownsPausable contract.
type LocalhostTownsPausablePausedIterator struct {
	Event *LocalhostTownsPausablePaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsPausablePausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsPausablePaused)
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
		it.Event = new(LocalhostTownsPausablePaused)
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
func (it *LocalhostTownsPausablePausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsPausablePausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsPausablePaused represents a Paused event raised by the LocalhostTownsPausable contract.
type LocalhostTownsPausablePaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownsPausable *LocalhostTownsPausableFilterer) FilterPaused(opts *bind.FilterOpts) (*LocalhostTownsPausablePausedIterator, error) {

	logs, sub, err := _LocalhostTownsPausable.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsPausablePausedIterator{contract: _LocalhostTownsPausable.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownsPausable *LocalhostTownsPausableFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownsPausablePaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsPausable.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsPausablePaused)
				if err := _LocalhostTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_LocalhostTownsPausable *LocalhostTownsPausableFilterer) ParsePaused(log types.Log) (*LocalhostTownsPausablePaused, error) {
	event := new(LocalhostTownsPausablePaused)
	if err := _LocalhostTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsPausableUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the LocalhostTownsPausable contract.
type LocalhostTownsPausableUnpausedIterator struct {
	Event *LocalhostTownsPausableUnpaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsPausableUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsPausableUnpaused)
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
		it.Event = new(LocalhostTownsPausableUnpaused)
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
func (it *LocalhostTownsPausableUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsPausableUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsPausableUnpaused represents a Unpaused event raised by the LocalhostTownsPausable contract.
type LocalhostTownsPausableUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownsPausable *LocalhostTownsPausableFilterer) FilterUnpaused(opts *bind.FilterOpts) (*LocalhostTownsPausableUnpausedIterator, error) {

	logs, sub, err := _LocalhostTownsPausable.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsPausableUnpausedIterator{contract: _LocalhostTownsPausable.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownsPausable *LocalhostTownsPausableFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownsPausableUnpaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsPausable.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsPausableUnpaused)
				if err := _LocalhostTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_LocalhostTownsPausable *LocalhostTownsPausableFilterer) ParseUnpaused(log types.Log) (*LocalhostTownsPausableUnpaused, error) {
	event := new(LocalhostTownsPausableUnpaused)
	if err := _LocalhostTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
