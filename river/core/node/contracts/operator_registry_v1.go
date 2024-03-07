// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contracts

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

// OperatorRegistryV1MetaData contains all meta data concerning the OperatorRegistryV1 contract.
var OperatorRegistryV1MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false}]",
}

// OperatorRegistryV1ABI is the input ABI used to generate the binding from.
// Deprecated: Use OperatorRegistryV1MetaData.ABI instead.
var OperatorRegistryV1ABI = OperatorRegistryV1MetaData.ABI

// OperatorRegistryV1 is an auto generated Go binding around an Ethereum contract.
type OperatorRegistryV1 struct {
	OperatorRegistryV1Caller     // Read-only binding to the contract
	OperatorRegistryV1Transactor // Write-only binding to the contract
	OperatorRegistryV1Filterer   // Log filterer for contract events
}

// OperatorRegistryV1Caller is an auto generated read-only Go binding around an Ethereum contract.
type OperatorRegistryV1Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// OperatorRegistryV1Transactor is an auto generated write-only Go binding around an Ethereum contract.
type OperatorRegistryV1Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// OperatorRegistryV1Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type OperatorRegistryV1Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// OperatorRegistryV1Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type OperatorRegistryV1Session struct {
	Contract     *OperatorRegistryV1 // Generic contract binding to set the session for
	CallOpts     bind.CallOpts       // Call options to use throughout this session
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// OperatorRegistryV1CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type OperatorRegistryV1CallerSession struct {
	Contract *OperatorRegistryV1Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts             // Call options to use throughout this session
}

// OperatorRegistryV1TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type OperatorRegistryV1TransactorSession struct {
	Contract     *OperatorRegistryV1Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts             // Transaction auth options to use throughout this session
}

// OperatorRegistryV1Raw is an auto generated low-level Go binding around an Ethereum contract.
type OperatorRegistryV1Raw struct {
	Contract *OperatorRegistryV1 // Generic contract binding to access the raw methods on
}

// OperatorRegistryV1CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type OperatorRegistryV1CallerRaw struct {
	Contract *OperatorRegistryV1Caller // Generic read-only contract binding to access the raw methods on
}

// OperatorRegistryV1TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type OperatorRegistryV1TransactorRaw struct {
	Contract *OperatorRegistryV1Transactor // Generic write-only contract binding to access the raw methods on
}

// NewOperatorRegistryV1 creates a new instance of OperatorRegistryV1, bound to a specific deployed contract.
func NewOperatorRegistryV1(address common.Address, backend bind.ContractBackend) (*OperatorRegistryV1, error) {
	contract, err := bindOperatorRegistryV1(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &OperatorRegistryV1{OperatorRegistryV1Caller: OperatorRegistryV1Caller{contract: contract}, OperatorRegistryV1Transactor: OperatorRegistryV1Transactor{contract: contract}, OperatorRegistryV1Filterer: OperatorRegistryV1Filterer{contract: contract}}, nil
}

// NewOperatorRegistryV1Caller creates a new read-only instance of OperatorRegistryV1, bound to a specific deployed contract.
func NewOperatorRegistryV1Caller(address common.Address, caller bind.ContractCaller) (*OperatorRegistryV1Caller, error) {
	contract, err := bindOperatorRegistryV1(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &OperatorRegistryV1Caller{contract: contract}, nil
}

// NewOperatorRegistryV1Transactor creates a new write-only instance of OperatorRegistryV1, bound to a specific deployed contract.
func NewOperatorRegistryV1Transactor(address common.Address, transactor bind.ContractTransactor) (*OperatorRegistryV1Transactor, error) {
	contract, err := bindOperatorRegistryV1(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &OperatorRegistryV1Transactor{contract: contract}, nil
}

// NewOperatorRegistryV1Filterer creates a new log filterer instance of OperatorRegistryV1, bound to a specific deployed contract.
func NewOperatorRegistryV1Filterer(address common.Address, filterer bind.ContractFilterer) (*OperatorRegistryV1Filterer, error) {
	contract, err := bindOperatorRegistryV1(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &OperatorRegistryV1Filterer{contract: contract}, nil
}

// bindOperatorRegistryV1 binds a generic wrapper to an already deployed contract.
func bindOperatorRegistryV1(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := OperatorRegistryV1MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_OperatorRegistryV1 *OperatorRegistryV1Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _OperatorRegistryV1.Contract.OperatorRegistryV1Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_OperatorRegistryV1 *OperatorRegistryV1Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.OperatorRegistryV1Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_OperatorRegistryV1 *OperatorRegistryV1Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.OperatorRegistryV1Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_OperatorRegistryV1 *OperatorRegistryV1CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _OperatorRegistryV1.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_OperatorRegistryV1 *OperatorRegistryV1TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_OperatorRegistryV1 *OperatorRegistryV1TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.contract.Transact(opts, method, params...)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_OperatorRegistryV1 *OperatorRegistryV1Caller) IsOperator(opts *bind.CallOpts, operator common.Address) (bool, error) {
	var out []interface{}
	err := _OperatorRegistryV1.contract.Call(opts, &out, "isOperator", operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_OperatorRegistryV1 *OperatorRegistryV1Session) IsOperator(operator common.Address) (bool, error) {
	return _OperatorRegistryV1.Contract.IsOperator(&_OperatorRegistryV1.CallOpts, operator)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_OperatorRegistryV1 *OperatorRegistryV1CallerSession) IsOperator(operator common.Address) (bool, error) {
	return _OperatorRegistryV1.Contract.IsOperator(&_OperatorRegistryV1.CallOpts, operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_OperatorRegistryV1 *OperatorRegistryV1Transactor) ApproveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _OperatorRegistryV1.contract.Transact(opts, "approveOperator", operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_OperatorRegistryV1 *OperatorRegistryV1Session) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.ApproveOperator(&_OperatorRegistryV1.TransactOpts, operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_OperatorRegistryV1 *OperatorRegistryV1TransactorSession) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.ApproveOperator(&_OperatorRegistryV1.TransactOpts, operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_OperatorRegistryV1 *OperatorRegistryV1Transactor) RemoveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _OperatorRegistryV1.contract.Transact(opts, "removeOperator", operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_OperatorRegistryV1 *OperatorRegistryV1Session) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.RemoveOperator(&_OperatorRegistryV1.TransactOpts, operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_OperatorRegistryV1 *OperatorRegistryV1TransactorSession) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _OperatorRegistryV1.Contract.RemoveOperator(&_OperatorRegistryV1.TransactOpts, operator)
}

// OperatorRegistryV1OperatorAddedIterator is returned from FilterOperatorAdded and is used to iterate over the raw logs and unpacked data for OperatorAdded events raised by the OperatorRegistryV1 contract.
type OperatorRegistryV1OperatorAddedIterator struct {
	Event *OperatorRegistryV1OperatorAdded // Event containing the contract specifics and raw log

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
func (it *OperatorRegistryV1OperatorAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OperatorRegistryV1OperatorAdded)
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
		it.Event = new(OperatorRegistryV1OperatorAdded)
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
func (it *OperatorRegistryV1OperatorAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OperatorRegistryV1OperatorAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OperatorRegistryV1OperatorAdded represents a OperatorAdded event raised by the OperatorRegistryV1 contract.
type OperatorRegistryV1OperatorAdded struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorAdded is a free log retrieval operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_OperatorRegistryV1 *OperatorRegistryV1Filterer) FilterOperatorAdded(opts *bind.FilterOpts, operatorAddress []common.Address) (*OperatorRegistryV1OperatorAddedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _OperatorRegistryV1.contract.FilterLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &OperatorRegistryV1OperatorAddedIterator{contract: _OperatorRegistryV1.contract, event: "OperatorAdded", logs: logs, sub: sub}, nil
}

// WatchOperatorAdded is a free log subscription operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_OperatorRegistryV1 *OperatorRegistryV1Filterer) WatchOperatorAdded(opts *bind.WatchOpts, sink chan<- *OperatorRegistryV1OperatorAdded, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _OperatorRegistryV1.contract.WatchLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OperatorRegistryV1OperatorAdded)
				if err := _OperatorRegistryV1.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
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

// ParseOperatorAdded is a log parse operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_OperatorRegistryV1 *OperatorRegistryV1Filterer) ParseOperatorAdded(log types.Log) (*OperatorRegistryV1OperatorAdded, error) {
	event := new(OperatorRegistryV1OperatorAdded)
	if err := _OperatorRegistryV1.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// OperatorRegistryV1OperatorRemovedIterator is returned from FilterOperatorRemoved and is used to iterate over the raw logs and unpacked data for OperatorRemoved events raised by the OperatorRegistryV1 contract.
type OperatorRegistryV1OperatorRemovedIterator struct {
	Event *OperatorRegistryV1OperatorRemoved // Event containing the contract specifics and raw log

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
func (it *OperatorRegistryV1OperatorRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OperatorRegistryV1OperatorRemoved)
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
		it.Event = new(OperatorRegistryV1OperatorRemoved)
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
func (it *OperatorRegistryV1OperatorRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OperatorRegistryV1OperatorRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OperatorRegistryV1OperatorRemoved represents a OperatorRemoved event raised by the OperatorRegistryV1 contract.
type OperatorRegistryV1OperatorRemoved struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorRemoved is a free log retrieval operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_OperatorRegistryV1 *OperatorRegistryV1Filterer) FilterOperatorRemoved(opts *bind.FilterOpts, operatorAddress []common.Address) (*OperatorRegistryV1OperatorRemovedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _OperatorRegistryV1.contract.FilterLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &OperatorRegistryV1OperatorRemovedIterator{contract: _OperatorRegistryV1.contract, event: "OperatorRemoved", logs: logs, sub: sub}, nil
}

// WatchOperatorRemoved is a free log subscription operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_OperatorRegistryV1 *OperatorRegistryV1Filterer) WatchOperatorRemoved(opts *bind.WatchOpts, sink chan<- *OperatorRegistryV1OperatorRemoved, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _OperatorRegistryV1.contract.WatchLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OperatorRegistryV1OperatorRemoved)
				if err := _OperatorRegistryV1.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
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

// ParseOperatorRemoved is a log parse operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_OperatorRegistryV1 *OperatorRegistryV1Filterer) ParseOperatorRemoved(log types.Log) (*OperatorRegistryV1OperatorRemoved, error) {
	event := new(OperatorRegistryV1OperatorRemoved)
	if err := _OperatorRegistryV1.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
