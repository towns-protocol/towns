// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_towns_pausable

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

// BaseTownsPausableMetaData contains all meta data concerning the BaseTownsPausable contract.
var BaseTownsPausableMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// BaseTownsPausableABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseTownsPausableMetaData.ABI instead.
var BaseTownsPausableABI = BaseTownsPausableMetaData.ABI

// BaseTownsPausable is an auto generated Go binding around an Ethereum contract.
type BaseTownsPausable struct {
	BaseTownsPausableCaller     // Read-only binding to the contract
	BaseTownsPausableTransactor // Write-only binding to the contract
	BaseTownsPausableFilterer   // Log filterer for contract events
}

// BaseTownsPausableCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseTownsPausableCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsPausableTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseTownsPausableTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsPausableFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseTownsPausableFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsPausableSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseTownsPausableSession struct {
	Contract     *BaseTownsPausable // Generic contract binding to set the session for
	CallOpts     bind.CallOpts      // Call options to use throughout this session
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// BaseTownsPausableCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseTownsPausableCallerSession struct {
	Contract *BaseTownsPausableCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts            // Call options to use throughout this session
}

// BaseTownsPausableTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseTownsPausableTransactorSession struct {
	Contract     *BaseTownsPausableTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// BaseTownsPausableRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseTownsPausableRaw struct {
	Contract *BaseTownsPausable // Generic contract binding to access the raw methods on
}

// BaseTownsPausableCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseTownsPausableCallerRaw struct {
	Contract *BaseTownsPausableCaller // Generic read-only contract binding to access the raw methods on
}

// BaseTownsPausableTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseTownsPausableTransactorRaw struct {
	Contract *BaseTownsPausableTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseTownsPausable creates a new instance of BaseTownsPausable, bound to a specific deployed contract.
func NewBaseTownsPausable(address common.Address, backend bind.ContractBackend) (*BaseTownsPausable, error) {
	contract, err := bindBaseTownsPausable(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseTownsPausable{BaseTownsPausableCaller: BaseTownsPausableCaller{contract: contract}, BaseTownsPausableTransactor: BaseTownsPausableTransactor{contract: contract}, BaseTownsPausableFilterer: BaseTownsPausableFilterer{contract: contract}}, nil
}

// NewBaseTownsPausableCaller creates a new read-only instance of BaseTownsPausable, bound to a specific deployed contract.
func NewBaseTownsPausableCaller(address common.Address, caller bind.ContractCaller) (*BaseTownsPausableCaller, error) {
	contract, err := bindBaseTownsPausable(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsPausableCaller{contract: contract}, nil
}

// NewBaseTownsPausableTransactor creates a new write-only instance of BaseTownsPausable, bound to a specific deployed contract.
func NewBaseTownsPausableTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseTownsPausableTransactor, error) {
	contract, err := bindBaseTownsPausable(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsPausableTransactor{contract: contract}, nil
}

// NewBaseTownsPausableFilterer creates a new log filterer instance of BaseTownsPausable, bound to a specific deployed contract.
func NewBaseTownsPausableFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseTownsPausableFilterer, error) {
	contract, err := bindBaseTownsPausable(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseTownsPausableFilterer{contract: contract}, nil
}

// bindBaseTownsPausable binds a generic wrapper to an already deployed contract.
func bindBaseTownsPausable(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseTownsPausableMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsPausable *BaseTownsPausableRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsPausable.Contract.BaseTownsPausableCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsPausable *BaseTownsPausableRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsPausable.Contract.BaseTownsPausableTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsPausable *BaseTownsPausableRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsPausable.Contract.BaseTownsPausableTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsPausable *BaseTownsPausableCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsPausable.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsPausable *BaseTownsPausableTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsPausable.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsPausable *BaseTownsPausableTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsPausable.Contract.contract.Transact(opts, method, params...)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_BaseTownsPausable *BaseTownsPausableCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _BaseTownsPausable.contract.Call(opts, &out, "paused")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_BaseTownsPausable *BaseTownsPausableSession) Paused() (bool, error) {
	return _BaseTownsPausable.Contract.Paused(&_BaseTownsPausable.CallOpts)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_BaseTownsPausable *BaseTownsPausableCallerSession) Paused() (bool, error) {
	return _BaseTownsPausable.Contract.Paused(&_BaseTownsPausable.CallOpts)
}

// BaseTownsPausablePausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseTownsPausable contract.
type BaseTownsPausablePausedIterator struct {
	Event *BaseTownsPausablePaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsPausablePausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsPausablePaused)
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
		it.Event = new(BaseTownsPausablePaused)
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
func (it *BaseTownsPausablePausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsPausablePausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsPausablePaused represents a Paused event raised by the BaseTownsPausable contract.
type BaseTownsPausablePaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsPausable *BaseTownsPausableFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseTownsPausablePausedIterator, error) {

	logs, sub, err := _BaseTownsPausable.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsPausablePausedIterator{contract: _BaseTownsPausable.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsPausable *BaseTownsPausableFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseTownsPausablePaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsPausable.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsPausablePaused)
				if err := _BaseTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_BaseTownsPausable *BaseTownsPausableFilterer) ParsePaused(log types.Log) (*BaseTownsPausablePaused, error) {
	event := new(BaseTownsPausablePaused)
	if err := _BaseTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsPausableUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseTownsPausable contract.
type BaseTownsPausableUnpausedIterator struct {
	Event *BaseTownsPausableUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsPausableUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsPausableUnpaused)
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
		it.Event = new(BaseTownsPausableUnpaused)
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
func (it *BaseTownsPausableUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsPausableUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsPausableUnpaused represents a Unpaused event raised by the BaseTownsPausable contract.
type BaseTownsPausableUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsPausable *BaseTownsPausableFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseTownsPausableUnpausedIterator, error) {

	logs, sub, err := _BaseTownsPausable.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsPausableUnpausedIterator{contract: _BaseTownsPausable.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsPausable *BaseTownsPausableFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseTownsPausableUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsPausable.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsPausableUnpaused)
				if err := _BaseTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_BaseTownsPausable *BaseTownsPausableFilterer) ParseUnpaused(log types.Log) (*BaseTownsPausableUnpaused, error) {
	event := new(BaseTownsPausableUnpaused)
	if err := _BaseTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
