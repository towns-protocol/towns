// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sepolia_towns_pausable

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

// SepoliaTownsPausableMetaData contains all meta data concerning the SepoliaTownsPausable contract.
var SepoliaTownsPausableMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// SepoliaTownsPausableABI is the input ABI used to generate the binding from.
// Deprecated: Use SepoliaTownsPausableMetaData.ABI instead.
var SepoliaTownsPausableABI = SepoliaTownsPausableMetaData.ABI

// SepoliaTownsPausable is an auto generated Go binding around an Ethereum contract.
type SepoliaTownsPausable struct {
	SepoliaTownsPausableCaller     // Read-only binding to the contract
	SepoliaTownsPausableTransactor // Write-only binding to the contract
	SepoliaTownsPausableFilterer   // Log filterer for contract events
}

// SepoliaTownsPausableCaller is an auto generated read-only Go binding around an Ethereum contract.
type SepoliaTownsPausableCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsPausableTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SepoliaTownsPausableTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsPausableFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SepoliaTownsPausableFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsPausableSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SepoliaTownsPausableSession struct {
	Contract     *SepoliaTownsPausable // Generic contract binding to set the session for
	CallOpts     bind.CallOpts         // Call options to use throughout this session
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// SepoliaTownsPausableCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SepoliaTownsPausableCallerSession struct {
	Contract *SepoliaTownsPausableCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts               // Call options to use throughout this session
}

// SepoliaTownsPausableTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SepoliaTownsPausableTransactorSession struct {
	Contract     *SepoliaTownsPausableTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts               // Transaction auth options to use throughout this session
}

// SepoliaTownsPausableRaw is an auto generated low-level Go binding around an Ethereum contract.
type SepoliaTownsPausableRaw struct {
	Contract *SepoliaTownsPausable // Generic contract binding to access the raw methods on
}

// SepoliaTownsPausableCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SepoliaTownsPausableCallerRaw struct {
	Contract *SepoliaTownsPausableCaller // Generic read-only contract binding to access the raw methods on
}

// SepoliaTownsPausableTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SepoliaTownsPausableTransactorRaw struct {
	Contract *SepoliaTownsPausableTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSepoliaTownsPausable creates a new instance of SepoliaTownsPausable, bound to a specific deployed contract.
func NewSepoliaTownsPausable(address common.Address, backend bind.ContractBackend) (*SepoliaTownsPausable, error) {
	contract, err := bindSepoliaTownsPausable(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsPausable{SepoliaTownsPausableCaller: SepoliaTownsPausableCaller{contract: contract}, SepoliaTownsPausableTransactor: SepoliaTownsPausableTransactor{contract: contract}, SepoliaTownsPausableFilterer: SepoliaTownsPausableFilterer{contract: contract}}, nil
}

// NewSepoliaTownsPausableCaller creates a new read-only instance of SepoliaTownsPausable, bound to a specific deployed contract.
func NewSepoliaTownsPausableCaller(address common.Address, caller bind.ContractCaller) (*SepoliaTownsPausableCaller, error) {
	contract, err := bindSepoliaTownsPausable(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsPausableCaller{contract: contract}, nil
}

// NewSepoliaTownsPausableTransactor creates a new write-only instance of SepoliaTownsPausable, bound to a specific deployed contract.
func NewSepoliaTownsPausableTransactor(address common.Address, transactor bind.ContractTransactor) (*SepoliaTownsPausableTransactor, error) {
	contract, err := bindSepoliaTownsPausable(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsPausableTransactor{contract: contract}, nil
}

// NewSepoliaTownsPausableFilterer creates a new log filterer instance of SepoliaTownsPausable, bound to a specific deployed contract.
func NewSepoliaTownsPausableFilterer(address common.Address, filterer bind.ContractFilterer) (*SepoliaTownsPausableFilterer, error) {
	contract, err := bindSepoliaTownsPausable(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsPausableFilterer{contract: contract}, nil
}

// bindSepoliaTownsPausable binds a generic wrapper to an already deployed contract.
func bindSepoliaTownsPausable(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := SepoliaTownsPausableMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsPausable *SepoliaTownsPausableRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsPausable.Contract.SepoliaTownsPausableCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsPausable *SepoliaTownsPausableRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsPausable.Contract.SepoliaTownsPausableTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsPausable *SepoliaTownsPausableRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsPausable.Contract.SepoliaTownsPausableTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsPausable *SepoliaTownsPausableCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsPausable.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsPausable *SepoliaTownsPausableTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsPausable.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsPausable *SepoliaTownsPausableTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsPausable.Contract.contract.Transact(opts, method, params...)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_SepoliaTownsPausable *SepoliaTownsPausableCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _SepoliaTownsPausable.contract.Call(opts, &out, "paused")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_SepoliaTownsPausable *SepoliaTownsPausableSession) Paused() (bool, error) {
	return _SepoliaTownsPausable.Contract.Paused(&_SepoliaTownsPausable.CallOpts)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_SepoliaTownsPausable *SepoliaTownsPausableCallerSession) Paused() (bool, error) {
	return _SepoliaTownsPausable.Contract.Paused(&_SepoliaTownsPausable.CallOpts)
}

// SepoliaTownsPausablePausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the SepoliaTownsPausable contract.
type SepoliaTownsPausablePausedIterator struct {
	Event *SepoliaTownsPausablePaused // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsPausablePausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsPausablePaused)
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
		it.Event = new(SepoliaTownsPausablePaused)
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
func (it *SepoliaTownsPausablePausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsPausablePausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsPausablePaused represents a Paused event raised by the SepoliaTownsPausable contract.
type SepoliaTownsPausablePaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaTownsPausable *SepoliaTownsPausableFilterer) FilterPaused(opts *bind.FilterOpts) (*SepoliaTownsPausablePausedIterator, error) {

	logs, sub, err := _SepoliaTownsPausable.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsPausablePausedIterator{contract: _SepoliaTownsPausable.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaTownsPausable *SepoliaTownsPausableFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *SepoliaTownsPausablePaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsPausable.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsPausablePaused)
				if err := _SepoliaTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_SepoliaTownsPausable *SepoliaTownsPausableFilterer) ParsePaused(log types.Log) (*SepoliaTownsPausablePaused, error) {
	event := new(SepoliaTownsPausablePaused)
	if err := _SepoliaTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsPausableUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the SepoliaTownsPausable contract.
type SepoliaTownsPausableUnpausedIterator struct {
	Event *SepoliaTownsPausableUnpaused // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsPausableUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsPausableUnpaused)
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
		it.Event = new(SepoliaTownsPausableUnpaused)
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
func (it *SepoliaTownsPausableUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsPausableUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsPausableUnpaused represents a Unpaused event raised by the SepoliaTownsPausable contract.
type SepoliaTownsPausableUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaTownsPausable *SepoliaTownsPausableFilterer) FilterUnpaused(opts *bind.FilterOpts) (*SepoliaTownsPausableUnpausedIterator, error) {

	logs, sub, err := _SepoliaTownsPausable.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsPausableUnpausedIterator{contract: _SepoliaTownsPausable.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaTownsPausable *SepoliaTownsPausableFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *SepoliaTownsPausableUnpaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsPausable.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsPausableUnpaused)
				if err := _SepoliaTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_SepoliaTownsPausable *SepoliaTownsPausableFilterer) ParseUnpaused(log types.Log) (*SepoliaTownsPausableUnpaused, error) {
	event := new(SepoliaTownsPausableUnpaused)
	if err := _SepoliaTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
