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

// IEntitlementGatedMetaData contains all meta data concerning the IEntitlementGated contract.
var IEntitlementGatedMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"getEntitlementOperations\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeTransaction\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheck\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]}]",
}

// IEntitlementGatedABI is the input ABI used to generate the binding from.
// Deprecated: Use IEntitlementGatedMetaData.ABI instead.
var IEntitlementGatedABI = IEntitlementGatedMetaData.ABI

// IEntitlementGated is an auto generated Go binding around an Ethereum contract.
type IEntitlementGated struct {
	IEntitlementGatedCaller     // Read-only binding to the contract
	IEntitlementGatedTransactor // Write-only binding to the contract
	IEntitlementGatedFilterer   // Log filterer for contract events
}

// IEntitlementGatedCaller is an auto generated read-only Go binding around an Ethereum contract.
type IEntitlementGatedCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlementGatedTransactor is an auto generated write-only Go binding around an Ethereum contract.
type IEntitlementGatedTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlementGatedFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type IEntitlementGatedFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IEntitlementGatedSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type IEntitlementGatedSession struct {
	Contract     *IEntitlementGated // Generic contract binding to set the session for
	CallOpts     bind.CallOpts      // Call options to use throughout this session
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// IEntitlementGatedCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type IEntitlementGatedCallerSession struct {
	Contract *IEntitlementGatedCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts            // Call options to use throughout this session
}

// IEntitlementGatedTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type IEntitlementGatedTransactorSession struct {
	Contract     *IEntitlementGatedTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// IEntitlementGatedRaw is an auto generated low-level Go binding around an Ethereum contract.
type IEntitlementGatedRaw struct {
	Contract *IEntitlementGated // Generic contract binding to access the raw methods on
}

// IEntitlementGatedCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type IEntitlementGatedCallerRaw struct {
	Contract *IEntitlementGatedCaller // Generic read-only contract binding to access the raw methods on
}

// IEntitlementGatedTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type IEntitlementGatedTransactorRaw struct {
	Contract *IEntitlementGatedTransactor // Generic write-only contract binding to access the raw methods on
}

// NewIEntitlementGated creates a new instance of IEntitlementGated, bound to a specific deployed contract.
func NewIEntitlementGated(address common.Address, backend bind.ContractBackend) (*IEntitlementGated, error) {
	contract, err := bindIEntitlementGated(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &IEntitlementGated{IEntitlementGatedCaller: IEntitlementGatedCaller{contract: contract}, IEntitlementGatedTransactor: IEntitlementGatedTransactor{contract: contract}, IEntitlementGatedFilterer: IEntitlementGatedFilterer{contract: contract}}, nil
}

// NewIEntitlementGatedCaller creates a new read-only instance of IEntitlementGated, bound to a specific deployed contract.
func NewIEntitlementGatedCaller(address common.Address, caller bind.ContractCaller) (*IEntitlementGatedCaller, error) {
	contract, err := bindIEntitlementGated(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &IEntitlementGatedCaller{contract: contract}, nil
}

// NewIEntitlementGatedTransactor creates a new write-only instance of IEntitlementGated, bound to a specific deployed contract.
func NewIEntitlementGatedTransactor(address common.Address, transactor bind.ContractTransactor) (*IEntitlementGatedTransactor, error) {
	contract, err := bindIEntitlementGated(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &IEntitlementGatedTransactor{contract: contract}, nil
}

// NewIEntitlementGatedFilterer creates a new log filterer instance of IEntitlementGated, bound to a specific deployed contract.
func NewIEntitlementGatedFilterer(address common.Address, filterer bind.ContractFilterer) (*IEntitlementGatedFilterer, error) {
	contract, err := bindIEntitlementGated(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &IEntitlementGatedFilterer{contract: contract}, nil
}

// bindIEntitlementGated binds a generic wrapper to an already deployed contract.
func bindIEntitlementGated(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := IEntitlementGatedMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IEntitlementGated *IEntitlementGatedRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IEntitlementGated.Contract.IEntitlementGatedCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IEntitlementGated *IEntitlementGatedRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.IEntitlementGatedTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IEntitlementGated *IEntitlementGatedRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.IEntitlementGatedTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IEntitlementGated *IEntitlementGatedCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IEntitlementGated.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IEntitlementGated *IEntitlementGatedTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IEntitlementGated *IEntitlementGatedTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlementOperations is a free data retrieval call binding the contract method 0x4cdf3ab8.
//
// Solidity: function getEntitlementOperations() view returns(bytes)
func (_IEntitlementGated *IEntitlementGatedCaller) GetEntitlementOperations(opts *bind.CallOpts) ([]byte, error) {
	var out []interface{}
	err := _IEntitlementGated.contract.Call(opts, &out, "getEntitlementOperations")

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// GetEntitlementOperations is a free data retrieval call binding the contract method 0x4cdf3ab8.
//
// Solidity: function getEntitlementOperations() view returns(bytes)
func (_IEntitlementGated *IEntitlementGatedSession) GetEntitlementOperations() ([]byte, error) {
	return _IEntitlementGated.Contract.GetEntitlementOperations(&_IEntitlementGated.CallOpts)
}

// GetEntitlementOperations is a free data retrieval call binding the contract method 0x4cdf3ab8.
//
// Solidity: function getEntitlementOperations() view returns(bytes)
func (_IEntitlementGated *IEntitlementGatedCallerSession) GetEntitlementOperations() ([]byte, error) {
	return _IEntitlementGated.Contract.GetEntitlementOperations(&_IEntitlementGated.CallOpts)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns()
func (_IEntitlementGated *IEntitlementGatedTransactor) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _IEntitlementGated.contract.Transact(opts, "postEntitlementCheckResult", transactionId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns()
func (_IEntitlementGated *IEntitlementGatedSession) PostEntitlementCheckResult(transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.PostEntitlementCheckResult(&_IEntitlementGated.TransactOpts, transactionId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns()
func (_IEntitlementGated *IEntitlementGatedTransactorSession) PostEntitlementCheckResult(transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.PostEntitlementCheckResult(&_IEntitlementGated.TransactOpts, transactionId, result)
}

// RemoveTransaction is a paid mutator transaction binding the contract method 0xf7332550.
//
// Solidity: function removeTransaction(bytes32 transactionId) returns()
func (_IEntitlementGated *IEntitlementGatedTransactor) RemoveTransaction(opts *bind.TransactOpts, transactionId [32]byte) (*types.Transaction, error) {
	return _IEntitlementGated.contract.Transact(opts, "removeTransaction", transactionId)
}

// RemoveTransaction is a paid mutator transaction binding the contract method 0xf7332550.
//
// Solidity: function removeTransaction(bytes32 transactionId) returns()
func (_IEntitlementGated *IEntitlementGatedSession) RemoveTransaction(transactionId [32]byte) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.RemoveTransaction(&_IEntitlementGated.TransactOpts, transactionId)
}

// RemoveTransaction is a paid mutator transaction binding the contract method 0xf7332550.
//
// Solidity: function removeTransaction(bytes32 transactionId) returns()
func (_IEntitlementGated *IEntitlementGatedTransactorSession) RemoveTransaction(transactionId [32]byte) (*types.Transaction, error) {
	return _IEntitlementGated.Contract.RemoveTransaction(&_IEntitlementGated.TransactOpts, transactionId)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xd7eca30a.
//
// Solidity: function requestEntitlementCheck() returns()
func (_IEntitlementGated *IEntitlementGatedTransactor) RequestEntitlementCheck(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IEntitlementGated.contract.Transact(opts, "requestEntitlementCheck")
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xd7eca30a.
//
// Solidity: function requestEntitlementCheck() returns()
func (_IEntitlementGated *IEntitlementGatedSession) RequestEntitlementCheck() (*types.Transaction, error) {
	return _IEntitlementGated.Contract.RequestEntitlementCheck(&_IEntitlementGated.TransactOpts)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xd7eca30a.
//
// Solidity: function requestEntitlementCheck() returns()
func (_IEntitlementGated *IEntitlementGatedTransactorSession) RequestEntitlementCheck() (*types.Transaction, error) {
	return _IEntitlementGated.Contract.RequestEntitlementCheck(&_IEntitlementGated.TransactOpts)
}

// IEntitlementGatedEntitlementCheckResultPostedIterator is returned from FilterEntitlementCheckResultPosted and is used to iterate over the raw logs and unpacked data for EntitlementCheckResultPosted events raised by the IEntitlementGated contract.
type IEntitlementGatedEntitlementCheckResultPostedIterator struct {
	Event *IEntitlementGatedEntitlementCheckResultPosted // Event containing the contract specifics and raw log

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
func (it *IEntitlementGatedEntitlementCheckResultPostedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(IEntitlementGatedEntitlementCheckResultPosted)
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
		it.Event = new(IEntitlementGatedEntitlementCheckResultPosted)
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
func (it *IEntitlementGatedEntitlementCheckResultPostedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *IEntitlementGatedEntitlementCheckResultPostedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// IEntitlementGatedEntitlementCheckResultPosted represents a EntitlementCheckResultPosted event raised by the IEntitlementGated contract.
type IEntitlementGatedEntitlementCheckResultPosted struct {
	TransactionId [32]byte
	Result        uint8
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckResultPosted is a free log retrieval operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_IEntitlementGated *IEntitlementGatedFilterer) FilterEntitlementCheckResultPosted(opts *bind.FilterOpts, transactionId [][32]byte) (*IEntitlementGatedEntitlementCheckResultPostedIterator, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _IEntitlementGated.contract.FilterLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return &IEntitlementGatedEntitlementCheckResultPostedIterator{contract: _IEntitlementGated.contract, event: "EntitlementCheckResultPosted", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckResultPosted is a free log subscription operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_IEntitlementGated *IEntitlementGatedFilterer) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *IEntitlementGatedEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _IEntitlementGated.contract.WatchLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(IEntitlementGatedEntitlementCheckResultPosted)
				if err := _IEntitlementGated.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
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
func (_IEntitlementGated *IEntitlementGatedFilterer) ParseEntitlementCheckResultPosted(log types.Log) (*IEntitlementGatedEntitlementCheckResultPosted, error) {
	event := new(IEntitlementGatedEntitlementCheckResultPosted)
	if err := _IEntitlementGated.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
