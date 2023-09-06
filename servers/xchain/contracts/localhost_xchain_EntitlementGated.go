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

// LocalhostEntitlementGatedMetaData contains all meta data concerning the LocalhostEntitlementGated contract.
var LocalhostEntitlementGatedMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"callerAddress\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"address[]\",\"name\":\"selectedNodes\",\"type\":\"address[]\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"}],\"name\":\"EntitlementCheckRequested\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"enumIEntitlementCheckerEvents.NodeVoteStatus\",\"name\":\"result\",\"type\":\"uint8\"}],\"name\":\"EntitlementCheckResultPosted\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"}],\"name\":\"deleteTransaction\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getEntitlementOperations\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"internalType\":\"enumIEntitlementCheckerEvents.NodeVoteStatus\",\"name\":\"result\",\"type\":\"uint8\"}],\"name\":\"postEntitlementCheckResult\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"requestEntitlementCheck\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"name\":\"transactions\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"hasBenSet\",\"type\":\"bool\"},{\"internalType\":\"address\",\"name\":\"clientAddress\",\"type\":\"address\"},{\"internalType\":\"enumIEntitlementCheckerEvents.NodeVoteStatus\",\"name\":\"checkResult\",\"type\":\"uint8\"},{\"internalType\":\"bool\",\"name\":\"isCompleted\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// LocalhostEntitlementGatedABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostEntitlementGatedMetaData.ABI instead.
var LocalhostEntitlementGatedABI = LocalhostEntitlementGatedMetaData.ABI

// LocalhostEntitlementGated is an auto generated Go binding around an Ethereum contract.
type LocalhostEntitlementGated struct {
	LocalhostEntitlementGatedCaller     // Read-only binding to the contract
	LocalhostEntitlementGatedTransactor // Write-only binding to the contract
	LocalhostEntitlementGatedFilterer   // Log filterer for contract events
}

// LocalhostEntitlementGatedCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostEntitlementGatedCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostEntitlementGatedTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostEntitlementGatedTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostEntitlementGatedFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostEntitlementGatedFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostEntitlementGatedSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostEntitlementGatedSession struct {
	Contract     *LocalhostEntitlementGated // Generic contract binding to set the session for
	CallOpts     bind.CallOpts              // Call options to use throughout this session
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// LocalhostEntitlementGatedCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostEntitlementGatedCallerSession struct {
	Contract *LocalhostEntitlementGatedCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                    // Call options to use throughout this session
}

// LocalhostEntitlementGatedTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostEntitlementGatedTransactorSession struct {
	Contract     *LocalhostEntitlementGatedTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                    // Transaction auth options to use throughout this session
}

// LocalhostEntitlementGatedRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostEntitlementGatedRaw struct {
	Contract *LocalhostEntitlementGated // Generic contract binding to access the raw methods on
}

// LocalhostEntitlementGatedCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostEntitlementGatedCallerRaw struct {
	Contract *LocalhostEntitlementGatedCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostEntitlementGatedTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostEntitlementGatedTransactorRaw struct {
	Contract *LocalhostEntitlementGatedTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostEntitlementGated creates a new instance of LocalhostEntitlementGated, bound to a specific deployed contract.
func NewLocalhostEntitlementGated(address common.Address, backend bind.ContractBackend) (*LocalhostEntitlementGated, error) {
	contract, err := bindLocalhostEntitlementGated(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementGated{LocalhostEntitlementGatedCaller: LocalhostEntitlementGatedCaller{contract: contract}, LocalhostEntitlementGatedTransactor: LocalhostEntitlementGatedTransactor{contract: contract}, LocalhostEntitlementGatedFilterer: LocalhostEntitlementGatedFilterer{contract: contract}}, nil
}

// NewLocalhostEntitlementGatedCaller creates a new read-only instance of LocalhostEntitlementGated, bound to a specific deployed contract.
func NewLocalhostEntitlementGatedCaller(address common.Address, caller bind.ContractCaller) (*LocalhostEntitlementGatedCaller, error) {
	contract, err := bindLocalhostEntitlementGated(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementGatedCaller{contract: contract}, nil
}

// NewLocalhostEntitlementGatedTransactor creates a new write-only instance of LocalhostEntitlementGated, bound to a specific deployed contract.
func NewLocalhostEntitlementGatedTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostEntitlementGatedTransactor, error) {
	contract, err := bindLocalhostEntitlementGated(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementGatedTransactor{contract: contract}, nil
}

// NewLocalhostEntitlementGatedFilterer creates a new log filterer instance of LocalhostEntitlementGated, bound to a specific deployed contract.
func NewLocalhostEntitlementGatedFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostEntitlementGatedFilterer, error) {
	contract, err := bindLocalhostEntitlementGated(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementGatedFilterer{contract: contract}, nil
}

// bindLocalhostEntitlementGated binds a generic wrapper to an already deployed contract.
func bindLocalhostEntitlementGated(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LocalhostEntitlementGatedMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostEntitlementGated.Contract.LocalhostEntitlementGatedCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.LocalhostEntitlementGatedTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.LocalhostEntitlementGatedTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostEntitlementGated.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlementOperations is a free data retrieval call binding the contract method 0x4cdf3ab8.
//
// Solidity: function getEntitlementOperations() view returns(bytes)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedCaller) GetEntitlementOperations(opts *bind.CallOpts) ([]byte, error) {
	var out []interface{}
	err := _LocalhostEntitlementGated.contract.Call(opts, &out, "getEntitlementOperations")

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// GetEntitlementOperations is a free data retrieval call binding the contract method 0x4cdf3ab8.
//
// Solidity: function getEntitlementOperations() view returns(bytes)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedSession) GetEntitlementOperations() ([]byte, error) {
	return _LocalhostEntitlementGated.Contract.GetEntitlementOperations(&_LocalhostEntitlementGated.CallOpts)
}

// GetEntitlementOperations is a free data retrieval call binding the contract method 0x4cdf3ab8.
//
// Solidity: function getEntitlementOperations() view returns(bytes)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedCallerSession) GetEntitlementOperations() ([]byte, error) {
	return _LocalhostEntitlementGated.Contract.GetEntitlementOperations(&_LocalhostEntitlementGated.CallOpts)
}

// Transactions is a free data retrieval call binding the contract method 0x642f2eaf.
//
// Solidity: function transactions(bytes32 ) view returns(bool hasBenSet, address clientAddress, uint8 checkResult, bool isCompleted)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedCaller) Transactions(opts *bind.CallOpts, arg0 [32]byte) (struct {
	HasBenSet     bool
	ClientAddress common.Address
	CheckResult   uint8
	IsCompleted   bool
}, error) {
	var out []interface{}
	err := _LocalhostEntitlementGated.contract.Call(opts, &out, "transactions", arg0)

	outstruct := new(struct {
		HasBenSet     bool
		ClientAddress common.Address
		CheckResult   uint8
		IsCompleted   bool
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.HasBenSet = *abi.ConvertType(out[0], new(bool)).(*bool)
	outstruct.ClientAddress = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.CheckResult = *abi.ConvertType(out[2], new(uint8)).(*uint8)
	outstruct.IsCompleted = *abi.ConvertType(out[3], new(bool)).(*bool)

	return *outstruct, err

}

// Transactions is a free data retrieval call binding the contract method 0x642f2eaf.
//
// Solidity: function transactions(bytes32 ) view returns(bool hasBenSet, address clientAddress, uint8 checkResult, bool isCompleted)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedSession) Transactions(arg0 [32]byte) (struct {
	HasBenSet     bool
	ClientAddress common.Address
	CheckResult   uint8
	IsCompleted   bool
}, error) {
	return _LocalhostEntitlementGated.Contract.Transactions(&_LocalhostEntitlementGated.CallOpts, arg0)
}

// Transactions is a free data retrieval call binding the contract method 0x642f2eaf.
//
// Solidity: function transactions(bytes32 ) view returns(bool hasBenSet, address clientAddress, uint8 checkResult, bool isCompleted)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedCallerSession) Transactions(arg0 [32]byte) (struct {
	HasBenSet     bool
	ClientAddress common.Address
	CheckResult   uint8
	IsCompleted   bool
}, error) {
	return _LocalhostEntitlementGated.Contract.Transactions(&_LocalhostEntitlementGated.CallOpts, arg0)
}

// DeleteTransaction is a paid mutator transaction binding the contract method 0x4b5e97fe.
//
// Solidity: function deleteTransaction(bytes32 transactionId) returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactor) DeleteTransaction(opts *bind.TransactOpts, transactionId [32]byte) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.contract.Transact(opts, "deleteTransaction", transactionId)
}

// DeleteTransaction is a paid mutator transaction binding the contract method 0x4b5e97fe.
//
// Solidity: function deleteTransaction(bytes32 transactionId) returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedSession) DeleteTransaction(transactionId [32]byte) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.DeleteTransaction(&_LocalhostEntitlementGated.TransactOpts, transactionId)
}

// DeleteTransaction is a paid mutator transaction binding the contract method 0x4b5e97fe.
//
// Solidity: function deleteTransaction(bytes32 transactionId) returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactorSession) DeleteTransaction(transactionId [32]byte) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.DeleteTransaction(&_LocalhostEntitlementGated.TransactOpts, transactionId)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactor) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.contract.Transact(opts, "postEntitlementCheckResult", transactionId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedSession) PostEntitlementCheckResult(transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.PostEntitlementCheckResult(&_LocalhostEntitlementGated.TransactOpts, transactionId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactorSession) PostEntitlementCheckResult(transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.PostEntitlementCheckResult(&_LocalhostEntitlementGated.TransactOpts, transactionId, result)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xd7eca30a.
//
// Solidity: function requestEntitlementCheck() returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactor) RequestEntitlementCheck(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostEntitlementGated.contract.Transact(opts, "requestEntitlementCheck")
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xd7eca30a.
//
// Solidity: function requestEntitlementCheck() returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedSession) RequestEntitlementCheck() (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.RequestEntitlementCheck(&_LocalhostEntitlementGated.TransactOpts)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xd7eca30a.
//
// Solidity: function requestEntitlementCheck() returns(bool)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedTransactorSession) RequestEntitlementCheck() (*types.Transaction, error) {
	return _LocalhostEntitlementGated.Contract.RequestEntitlementCheck(&_LocalhostEntitlementGated.TransactOpts)
}

// LocalhostEntitlementGatedEntitlementCheckRequestedIterator is returned from FilterEntitlementCheckRequested and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequested events raised by the LocalhostEntitlementGated contract.
type LocalhostEntitlementGatedEntitlementCheckRequestedIterator struct {
	Event *LocalhostEntitlementGatedEntitlementCheckRequested // Event containing the contract specifics and raw log

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
func (it *LocalhostEntitlementGatedEntitlementCheckRequestedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostEntitlementGatedEntitlementCheckRequested)
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
		it.Event = new(LocalhostEntitlementGatedEntitlementCheckRequested)
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
func (it *LocalhostEntitlementGatedEntitlementCheckRequestedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostEntitlementGatedEntitlementCheckRequestedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostEntitlementGatedEntitlementCheckRequested represents a EntitlementCheckRequested event raised by the LocalhostEntitlementGated contract.
type LocalhostEntitlementGatedEntitlementCheckRequested struct {
	CallerAddress   common.Address
	TransactionId   [32]byte
	SelectedNodes   []common.Address
	ContractAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckRequested is a free log retrieval operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedFilterer) FilterEntitlementCheckRequested(opts *bind.FilterOpts, callerAddress []common.Address) (*LocalhostEntitlementGatedEntitlementCheckRequestedIterator, error) {

	var callerAddressRule []interface{}
	for _, callerAddressItem := range callerAddress {
		callerAddressRule = append(callerAddressRule, callerAddressItem)
	}

	logs, sub, err := _LocalhostEntitlementGated.contract.FilterLogs(opts, "EntitlementCheckRequested", callerAddressRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementGatedEntitlementCheckRequestedIterator{contract: _LocalhostEntitlementGated.contract, event: "EntitlementCheckRequested", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequested is a free log subscription operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedFilterer) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *LocalhostEntitlementGatedEntitlementCheckRequested, callerAddress []common.Address) (event.Subscription, error) {

	var callerAddressRule []interface{}
	for _, callerAddressItem := range callerAddress {
		callerAddressRule = append(callerAddressRule, callerAddressItem)
	}

	logs, sub, err := _LocalhostEntitlementGated.contract.WatchLogs(opts, "EntitlementCheckRequested", callerAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostEntitlementGatedEntitlementCheckRequested)
				if err := _LocalhostEntitlementGated.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
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
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedFilterer) ParseEntitlementCheckRequested(log types.Log) (*LocalhostEntitlementGatedEntitlementCheckRequested, error) {
	event := new(LocalhostEntitlementGatedEntitlementCheckRequested)
	if err := _LocalhostEntitlementGated.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostEntitlementGatedEntitlementCheckResultPostedIterator is returned from FilterEntitlementCheckResultPosted and is used to iterate over the raw logs and unpacked data for EntitlementCheckResultPosted events raised by the LocalhostEntitlementGated contract.
type LocalhostEntitlementGatedEntitlementCheckResultPostedIterator struct {
	Event *LocalhostEntitlementGatedEntitlementCheckResultPosted // Event containing the contract specifics and raw log

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
func (it *LocalhostEntitlementGatedEntitlementCheckResultPostedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostEntitlementGatedEntitlementCheckResultPosted)
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
		it.Event = new(LocalhostEntitlementGatedEntitlementCheckResultPosted)
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
func (it *LocalhostEntitlementGatedEntitlementCheckResultPostedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostEntitlementGatedEntitlementCheckResultPostedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostEntitlementGatedEntitlementCheckResultPosted represents a EntitlementCheckResultPosted event raised by the LocalhostEntitlementGated contract.
type LocalhostEntitlementGatedEntitlementCheckResultPosted struct {
	TransactionId [32]byte
	Result        uint8
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckResultPosted is a free log retrieval operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedFilterer) FilterEntitlementCheckResultPosted(opts *bind.FilterOpts, transactionId [][32]byte) (*LocalhostEntitlementGatedEntitlementCheckResultPostedIterator, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _LocalhostEntitlementGated.contract.FilterLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementGatedEntitlementCheckResultPostedIterator{contract: _LocalhostEntitlementGated.contract, event: "EntitlementCheckResultPosted", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckResultPosted is a free log subscription operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedFilterer) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *LocalhostEntitlementGatedEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _LocalhostEntitlementGated.contract.WatchLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostEntitlementGatedEntitlementCheckResultPosted)
				if err := _LocalhostEntitlementGated.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
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
func (_LocalhostEntitlementGated *LocalhostEntitlementGatedFilterer) ParseEntitlementCheckResultPosted(log types.Log) (*LocalhostEntitlementGatedEntitlementCheckResultPosted, error) {
	event := new(LocalhostEntitlementGatedEntitlementCheckResultPosted)
	if err := _LocalhostEntitlementGated.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
