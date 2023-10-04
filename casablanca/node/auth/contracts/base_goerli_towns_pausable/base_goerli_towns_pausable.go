// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_goerli_towns_pausable

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

// BaseGoerliTownsPausableMetaData contains all meta data concerning the BaseGoerliTownsPausable contract.
var BaseGoerliTownsPausableMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// BaseGoerliTownsPausableABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseGoerliTownsPausableMetaData.ABI instead.
var BaseGoerliTownsPausableABI = BaseGoerliTownsPausableMetaData.ABI

// BaseGoerliTownsPausable is an auto generated Go binding around an Ethereum contract.
type BaseGoerliTownsPausable struct {
	BaseGoerliTownsPausableCaller     // Read-only binding to the contract
	BaseGoerliTownsPausableTransactor // Write-only binding to the contract
	BaseGoerliTownsPausableFilterer   // Log filterer for contract events
}

// BaseGoerliTownsPausableCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseGoerliTownsPausableCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsPausableTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseGoerliTownsPausableTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsPausableFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseGoerliTownsPausableFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsPausableSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseGoerliTownsPausableSession struct {
	Contract     *BaseGoerliTownsPausable // Generic contract binding to set the session for
	CallOpts     bind.CallOpts            // Call options to use throughout this session
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// BaseGoerliTownsPausableCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseGoerliTownsPausableCallerSession struct {
	Contract *BaseGoerliTownsPausableCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                  // Call options to use throughout this session
}

// BaseGoerliTownsPausableTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseGoerliTownsPausableTransactorSession struct {
	Contract     *BaseGoerliTownsPausableTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                  // Transaction auth options to use throughout this session
}

// BaseGoerliTownsPausableRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseGoerliTownsPausableRaw struct {
	Contract *BaseGoerliTownsPausable // Generic contract binding to access the raw methods on
}

// BaseGoerliTownsPausableCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseGoerliTownsPausableCallerRaw struct {
	Contract *BaseGoerliTownsPausableCaller // Generic read-only contract binding to access the raw methods on
}

// BaseGoerliTownsPausableTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseGoerliTownsPausableTransactorRaw struct {
	Contract *BaseGoerliTownsPausableTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseGoerliTownsPausable creates a new instance of BaseGoerliTownsPausable, bound to a specific deployed contract.
func NewBaseGoerliTownsPausable(address common.Address, backend bind.ContractBackend) (*BaseGoerliTownsPausable, error) {
	contract, err := bindBaseGoerliTownsPausable(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsPausable{BaseGoerliTownsPausableCaller: BaseGoerliTownsPausableCaller{contract: contract}, BaseGoerliTownsPausableTransactor: BaseGoerliTownsPausableTransactor{contract: contract}, BaseGoerliTownsPausableFilterer: BaseGoerliTownsPausableFilterer{contract: contract}}, nil
}

// NewBaseGoerliTownsPausableCaller creates a new read-only instance of BaseGoerliTownsPausable, bound to a specific deployed contract.
func NewBaseGoerliTownsPausableCaller(address common.Address, caller bind.ContractCaller) (*BaseGoerliTownsPausableCaller, error) {
	contract, err := bindBaseGoerliTownsPausable(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsPausableCaller{contract: contract}, nil
}

// NewBaseGoerliTownsPausableTransactor creates a new write-only instance of BaseGoerliTownsPausable, bound to a specific deployed contract.
func NewBaseGoerliTownsPausableTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseGoerliTownsPausableTransactor, error) {
	contract, err := bindBaseGoerliTownsPausable(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsPausableTransactor{contract: contract}, nil
}

// NewBaseGoerliTownsPausableFilterer creates a new log filterer instance of BaseGoerliTownsPausable, bound to a specific deployed contract.
func NewBaseGoerliTownsPausableFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseGoerliTownsPausableFilterer, error) {
	contract, err := bindBaseGoerliTownsPausable(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsPausableFilterer{contract: contract}, nil
}

// bindBaseGoerliTownsPausable binds a generic wrapper to an already deployed contract.
func bindBaseGoerliTownsPausable(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseGoerliTownsPausableMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsPausable.Contract.BaseGoerliTownsPausableCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsPausable.Contract.BaseGoerliTownsPausableTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsPausable.Contract.BaseGoerliTownsPausableTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsPausable.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsPausable.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsPausable.Contract.contract.Transact(opts, method, params...)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _BaseGoerliTownsPausable.contract.Call(opts, &out, "paused")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableSession) Paused() (bool, error) {
	return _BaseGoerliTownsPausable.Contract.Paused(&_BaseGoerliTownsPausable.CallOpts)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableCallerSession) Paused() (bool, error) {
	return _BaseGoerliTownsPausable.Contract.Paused(&_BaseGoerliTownsPausable.CallOpts)
}

// BaseGoerliTownsPausablePausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseGoerliTownsPausable contract.
type BaseGoerliTownsPausablePausedIterator struct {
	Event *BaseGoerliTownsPausablePaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsPausablePausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsPausablePaused)
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
		it.Event = new(BaseGoerliTownsPausablePaused)
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
func (it *BaseGoerliTownsPausablePausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsPausablePausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsPausablePaused represents a Paused event raised by the BaseGoerliTownsPausable contract.
type BaseGoerliTownsPausablePaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseGoerliTownsPausablePausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsPausable.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsPausablePausedIterator{contract: _BaseGoerliTownsPausable.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsPausablePaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsPausable.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsPausablePaused)
				if err := _BaseGoerliTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableFilterer) ParsePaused(log types.Log) (*BaseGoerliTownsPausablePaused, error) {
	event := new(BaseGoerliTownsPausablePaused)
	if err := _BaseGoerliTownsPausable.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsPausableUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseGoerliTownsPausable contract.
type BaseGoerliTownsPausableUnpausedIterator struct {
	Event *BaseGoerliTownsPausableUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsPausableUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsPausableUnpaused)
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
		it.Event = new(BaseGoerliTownsPausableUnpaused)
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
func (it *BaseGoerliTownsPausableUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsPausableUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsPausableUnpaused represents a Unpaused event raised by the BaseGoerliTownsPausable contract.
type BaseGoerliTownsPausableUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseGoerliTownsPausableUnpausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsPausable.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsPausableUnpausedIterator{contract: _BaseGoerliTownsPausable.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsPausableUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsPausable.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsPausableUnpaused)
				if err := _BaseGoerliTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_BaseGoerliTownsPausable *BaseGoerliTownsPausableFilterer) ParseUnpaused(log types.Log) (*BaseGoerliTownsPausableUnpaused, error) {
	event := new(BaseGoerliTownsPausableUnpaused)
	if err := _BaseGoerliTownsPausable.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
