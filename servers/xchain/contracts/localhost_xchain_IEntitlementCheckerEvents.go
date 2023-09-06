// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_xchain

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

// LocalhostIEntitlementCheckerEventsMetaData contains all meta data concerning the LocalhostIEntitlementCheckerEvents contract.
var LocalhostIEntitlementCheckerEventsMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"callerAddress\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"address[]\",\"name\":\"selectedNodes\",\"type\":\"address[]\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"}],\"name\":\"EntitlementCheckRequested\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"enumIEntitlementCheckerEvents.NodeVoteStatus\",\"name\":\"result\",\"type\":\"uint8\"}],\"name\":\"EntitlementCheckResultPosted\",\"type\":\"event\"}]",
}

// LocalhostIEntitlementCheckerEventsABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostIEntitlementCheckerEventsMetaData.ABI instead.
var LocalhostIEntitlementCheckerEventsABI = LocalhostIEntitlementCheckerEventsMetaData.ABI

// LocalhostIEntitlementCheckerEvents is an auto generated Go binding around an Ethereum contract.
type LocalhostIEntitlementCheckerEvents struct {
	LocalhostIEntitlementCheckerEventsCaller     // Read-only binding to the contract
	LocalhostIEntitlementCheckerEventsTransactor // Write-only binding to the contract
	LocalhostIEntitlementCheckerEventsFilterer   // Log filterer for contract events
}

// LocalhostIEntitlementCheckerEventsCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostIEntitlementCheckerEventsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostIEntitlementCheckerEventsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostIEntitlementCheckerEventsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostIEntitlementCheckerEventsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostIEntitlementCheckerEventsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostIEntitlementCheckerEventsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostIEntitlementCheckerEventsSession struct {
	Contract     *LocalhostIEntitlementCheckerEvents // Generic contract binding to set the session for
	CallOpts     bind.CallOpts                       // Call options to use throughout this session
	TransactOpts bind.TransactOpts                   // Transaction auth options to use throughout this session
}

// LocalhostIEntitlementCheckerEventsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostIEntitlementCheckerEventsCallerSession struct {
	Contract *LocalhostIEntitlementCheckerEventsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                             // Call options to use throughout this session
}

// LocalhostIEntitlementCheckerEventsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostIEntitlementCheckerEventsTransactorSession struct {
	Contract     *LocalhostIEntitlementCheckerEventsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                             // Transaction auth options to use throughout this session
}

// LocalhostIEntitlementCheckerEventsRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostIEntitlementCheckerEventsRaw struct {
	Contract *LocalhostIEntitlementCheckerEvents // Generic contract binding to access the raw methods on
}

// LocalhostIEntitlementCheckerEventsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostIEntitlementCheckerEventsCallerRaw struct {
	Contract *LocalhostIEntitlementCheckerEventsCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostIEntitlementCheckerEventsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostIEntitlementCheckerEventsTransactorRaw struct {
	Contract *LocalhostIEntitlementCheckerEventsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostIEntitlementCheckerEvents creates a new instance of LocalhostIEntitlementCheckerEvents, bound to a specific deployed contract.
func NewLocalhostIEntitlementCheckerEvents(address common.Address, backend bind.ContractBackend) (*LocalhostIEntitlementCheckerEvents, error) {
	contract, err := bindLocalhostIEntitlementCheckerEvents(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostIEntitlementCheckerEvents{LocalhostIEntitlementCheckerEventsCaller: LocalhostIEntitlementCheckerEventsCaller{contract: contract}, LocalhostIEntitlementCheckerEventsTransactor: LocalhostIEntitlementCheckerEventsTransactor{contract: contract}, LocalhostIEntitlementCheckerEventsFilterer: LocalhostIEntitlementCheckerEventsFilterer{contract: contract}}, nil
}

// NewLocalhostIEntitlementCheckerEventsCaller creates a new read-only instance of LocalhostIEntitlementCheckerEvents, bound to a specific deployed contract.
func NewLocalhostIEntitlementCheckerEventsCaller(address common.Address, caller bind.ContractCaller) (*LocalhostIEntitlementCheckerEventsCaller, error) {
	contract, err := bindLocalhostIEntitlementCheckerEvents(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostIEntitlementCheckerEventsCaller{contract: contract}, nil
}

// NewLocalhostIEntitlementCheckerEventsTransactor creates a new write-only instance of LocalhostIEntitlementCheckerEvents, bound to a specific deployed contract.
func NewLocalhostIEntitlementCheckerEventsTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostIEntitlementCheckerEventsTransactor, error) {
	contract, err := bindLocalhostIEntitlementCheckerEvents(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostIEntitlementCheckerEventsTransactor{contract: contract}, nil
}

// NewLocalhostIEntitlementCheckerEventsFilterer creates a new log filterer instance of LocalhostIEntitlementCheckerEvents, bound to a specific deployed contract.
func NewLocalhostIEntitlementCheckerEventsFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostIEntitlementCheckerEventsFilterer, error) {
	contract, err := bindLocalhostIEntitlementCheckerEvents(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostIEntitlementCheckerEventsFilterer{contract: contract}, nil
}

// bindLocalhostIEntitlementCheckerEvents binds a generic wrapper to an already deployed contract.
func bindLocalhostIEntitlementCheckerEvents(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LocalhostIEntitlementCheckerEventsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostIEntitlementCheckerEvents.Contract.LocalhostIEntitlementCheckerEventsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostIEntitlementCheckerEvents.Contract.LocalhostIEntitlementCheckerEventsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostIEntitlementCheckerEvents.Contract.LocalhostIEntitlementCheckerEventsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostIEntitlementCheckerEvents.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostIEntitlementCheckerEvents.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostIEntitlementCheckerEvents.Contract.contract.Transact(opts, method, params...)
}

// LocalhostIEntitlementCheckerEventsEntitlementCheckRequestedIterator is returned from FilterEntitlementCheckRequested and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequested events raised by the LocalhostIEntitlementCheckerEvents contract.
type LocalhostIEntitlementCheckerEventsEntitlementCheckRequestedIterator struct {
	Event *LocalhostIEntitlementCheckerEventsEntitlementCheckRequested // Event containing the contract specifics and raw log

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
func (it *LocalhostIEntitlementCheckerEventsEntitlementCheckRequestedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostIEntitlementCheckerEventsEntitlementCheckRequested)
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
		it.Event = new(LocalhostIEntitlementCheckerEventsEntitlementCheckRequested)
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
func (it *LocalhostIEntitlementCheckerEventsEntitlementCheckRequestedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostIEntitlementCheckerEventsEntitlementCheckRequestedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostIEntitlementCheckerEventsEntitlementCheckRequested represents a EntitlementCheckRequested event raised by the LocalhostIEntitlementCheckerEvents contract.
type LocalhostIEntitlementCheckerEventsEntitlementCheckRequested struct {
	CallerAddress   common.Address
	TransactionId   [32]byte
	SelectedNodes   []common.Address
	ContractAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckRequested is a free log retrieval operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsFilterer) FilterEntitlementCheckRequested(opts *bind.FilterOpts, callerAddress []common.Address) (*LocalhostIEntitlementCheckerEventsEntitlementCheckRequestedIterator, error) {

	var callerAddressRule []interface{}
	for _, callerAddressItem := range callerAddress {
		callerAddressRule = append(callerAddressRule, callerAddressItem)
	}

	logs, sub, err := _LocalhostIEntitlementCheckerEvents.contract.FilterLogs(opts, "EntitlementCheckRequested", callerAddressRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostIEntitlementCheckerEventsEntitlementCheckRequestedIterator{contract: _LocalhostIEntitlementCheckerEvents.contract, event: "EntitlementCheckRequested", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequested is a free log subscription operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsFilterer) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *LocalhostIEntitlementCheckerEventsEntitlementCheckRequested, callerAddress []common.Address) (event.Subscription, error) {

	var callerAddressRule []interface{}
	for _, callerAddressItem := range callerAddress {
		callerAddressRule = append(callerAddressRule, callerAddressItem)
	}

	logs, sub, err := _LocalhostIEntitlementCheckerEvents.contract.WatchLogs(opts, "EntitlementCheckRequested", callerAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostIEntitlementCheckerEventsEntitlementCheckRequested)
				if err := _LocalhostIEntitlementCheckerEvents.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
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

// ParseEntitlementCheckRequested is a log parse operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsFilterer) ParseEntitlementCheckRequested(log types.Log) (*LocalhostIEntitlementCheckerEventsEntitlementCheckRequested, error) {
	event := new(LocalhostIEntitlementCheckerEventsEntitlementCheckRequested)
	if err := _LocalhostIEntitlementCheckerEvents.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostIEntitlementCheckerEventsEntitlementCheckResultPostedIterator is returned from FilterEntitlementCheckResultPosted and is used to iterate over the raw logs and unpacked data for EntitlementCheckResultPosted events raised by the LocalhostIEntitlementCheckerEvents contract.
type LocalhostIEntitlementCheckerEventsEntitlementCheckResultPostedIterator struct {
	Event *LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted // Event containing the contract specifics and raw log

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
func (it *LocalhostIEntitlementCheckerEventsEntitlementCheckResultPostedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted)
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
		it.Event = new(LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted)
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
func (it *LocalhostIEntitlementCheckerEventsEntitlementCheckResultPostedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostIEntitlementCheckerEventsEntitlementCheckResultPostedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted represents a EntitlementCheckResultPosted event raised by the LocalhostIEntitlementCheckerEvents contract.
type LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted struct {
	TransactionId [32]byte
	Result        uint8
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckResultPosted is a free log retrieval operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsFilterer) FilterEntitlementCheckResultPosted(opts *bind.FilterOpts, transactionId [][32]byte) (*LocalhostIEntitlementCheckerEventsEntitlementCheckResultPostedIterator, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _LocalhostIEntitlementCheckerEvents.contract.FilterLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostIEntitlementCheckerEventsEntitlementCheckResultPostedIterator{contract: _LocalhostIEntitlementCheckerEvents.contract, event: "EntitlementCheckResultPosted", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckResultPosted is a free log subscription operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsFilterer) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _LocalhostIEntitlementCheckerEvents.contract.WatchLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted)
				if err := _LocalhostIEntitlementCheckerEvents.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
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

// ParseEntitlementCheckResultPosted is a log parse operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostIEntitlementCheckerEvents *LocalhostIEntitlementCheckerEventsFilterer) ParseEntitlementCheckResultPosted(log types.Log) (*LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted, error) {
	event := new(LocalhostIEntitlementCheckerEventsEntitlementCheckResultPosted)
	if err := _LocalhostIEntitlementCheckerEvents.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
