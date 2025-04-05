// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base

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

// ReviewStorageContent is an auto generated low-level Go binding around an user-defined struct.
type ReviewStorageContent struct {
	Comment   string
	Rating    uint8
	CreatedAt *big.Int
	UpdatedAt *big.Int
}

// SpaceReviewMetaData contains all meta data concerning the SpaceReview contract.
var SpaceReviewMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"getAllReviews\",\"inputs\":[],\"outputs\":[{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"reviews\",\"type\":\"tuple[]\",\"internalType\":\"structReviewStorage.Content[]\",\"components\":[{\"name\":\"comment\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rating\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"createdAt\",\"type\":\"uint40\",\"internalType\":\"uint40\"},{\"name\":\"updatedAt\",\"type\":\"uint40\",\"internalType\":\"uint40\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getReview\",\"inputs\":[{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structReviewStorage.Content\",\"components\":[{\"name\":\"comment\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rating\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"createdAt\",\"type\":\"uint40\",\"internalType\":\"uint40\"},{\"name\":\"updatedAt\",\"type\":\"uint40\",\"internalType\":\"uint40\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setReview\",\"inputs\":[{\"name\":\"action\",\"type\":\"uint8\",\"internalType\":\"enumIReviewBase.Action\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"ReviewAdded\",\"inputs\":[{\"name\":\"user\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"comment\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"rating\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"uint8\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ReviewDeleted\",\"inputs\":[{\"name\":\"user\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ReviewUpdated\",\"inputs\":[{\"name\":\"user\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"comment\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"rating\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"uint8\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ReviewFacet__InvalidCommentLength\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ReviewFacet__InvalidRating\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ReviewFacet__ReviewAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ReviewFacet__ReviewDoesNotExist\",\"inputs\":[]}]",
}

// SpaceReviewABI is the input ABI used to generate the binding from.
// Deprecated: Use SpaceReviewMetaData.ABI instead.
var SpaceReviewABI = SpaceReviewMetaData.ABI

// SpaceReview is an auto generated Go binding around an Ethereum contract.
type SpaceReview struct {
	SpaceReviewCaller     // Read-only binding to the contract
	SpaceReviewTransactor // Write-only binding to the contract
	SpaceReviewFilterer   // Log filterer for contract events
}

// SpaceReviewCaller is an auto generated read-only Go binding around an Ethereum contract.
type SpaceReviewCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SpaceReviewTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SpaceReviewTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SpaceReviewFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SpaceReviewFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SpaceReviewSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SpaceReviewSession struct {
	Contract     *SpaceReview      // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// SpaceReviewCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SpaceReviewCallerSession struct {
	Contract *SpaceReviewCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts      // Call options to use throughout this session
}

// SpaceReviewTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SpaceReviewTransactorSession struct {
	Contract     *SpaceReviewTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// SpaceReviewRaw is an auto generated low-level Go binding around an Ethereum contract.
type SpaceReviewRaw struct {
	Contract *SpaceReview // Generic contract binding to access the raw methods on
}

// SpaceReviewCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SpaceReviewCallerRaw struct {
	Contract *SpaceReviewCaller // Generic read-only contract binding to access the raw methods on
}

// SpaceReviewTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SpaceReviewTransactorRaw struct {
	Contract *SpaceReviewTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSpaceReview creates a new instance of SpaceReview, bound to a specific deployed contract.
func NewSpaceReview(address common.Address, backend bind.ContractBackend) (*SpaceReview, error) {
	contract, err := bindSpaceReview(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SpaceReview{SpaceReviewCaller: SpaceReviewCaller{contract: contract}, SpaceReviewTransactor: SpaceReviewTransactor{contract: contract}, SpaceReviewFilterer: SpaceReviewFilterer{contract: contract}}, nil
}

// NewSpaceReviewCaller creates a new read-only instance of SpaceReview, bound to a specific deployed contract.
func NewSpaceReviewCaller(address common.Address, caller bind.ContractCaller) (*SpaceReviewCaller, error) {
	contract, err := bindSpaceReview(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SpaceReviewCaller{contract: contract}, nil
}

// NewSpaceReviewTransactor creates a new write-only instance of SpaceReview, bound to a specific deployed contract.
func NewSpaceReviewTransactor(address common.Address, transactor bind.ContractTransactor) (*SpaceReviewTransactor, error) {
	contract, err := bindSpaceReview(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SpaceReviewTransactor{contract: contract}, nil
}

// NewSpaceReviewFilterer creates a new log filterer instance of SpaceReview, bound to a specific deployed contract.
func NewSpaceReviewFilterer(address common.Address, filterer bind.ContractFilterer) (*SpaceReviewFilterer, error) {
	contract, err := bindSpaceReview(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SpaceReviewFilterer{contract: contract}, nil
}

// bindSpaceReview binds a generic wrapper to an already deployed contract.
func bindSpaceReview(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := SpaceReviewMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SpaceReview *SpaceReviewRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SpaceReview.Contract.SpaceReviewCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SpaceReview *SpaceReviewRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SpaceReview.Contract.SpaceReviewTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SpaceReview *SpaceReviewRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SpaceReview.Contract.SpaceReviewTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SpaceReview *SpaceReviewCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SpaceReview.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SpaceReview *SpaceReviewTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SpaceReview.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SpaceReview *SpaceReviewTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SpaceReview.Contract.contract.Transact(opts, method, params...)
}

// GetAllReviews is a free data retrieval call binding the contract method 0x45a7b01c.
//
// Solidity: function getAllReviews() view returns(address[] users, (string,uint8,uint40,uint40)[] reviews)
func (_SpaceReview *SpaceReviewCaller) GetAllReviews(opts *bind.CallOpts) (struct {
	Users   []common.Address
	Reviews []ReviewStorageContent
}, error) {
	var out []interface{}
	err := _SpaceReview.contract.Call(opts, &out, "getAllReviews")

	outstruct := new(struct {
		Users   []common.Address
		Reviews []ReviewStorageContent
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Users = *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)
	outstruct.Reviews = *abi.ConvertType(out[1], new([]ReviewStorageContent)).(*[]ReviewStorageContent)

	return *outstruct, err

}

// GetAllReviews is a free data retrieval call binding the contract method 0x45a7b01c.
//
// Solidity: function getAllReviews() view returns(address[] users, (string,uint8,uint40,uint40)[] reviews)
func (_SpaceReview *SpaceReviewSession) GetAllReviews() (struct {
	Users   []common.Address
	Reviews []ReviewStorageContent
}, error) {
	return _SpaceReview.Contract.GetAllReviews(&_SpaceReview.CallOpts)
}

// GetAllReviews is a free data retrieval call binding the contract method 0x45a7b01c.
//
// Solidity: function getAllReviews() view returns(address[] users, (string,uint8,uint40,uint40)[] reviews)
func (_SpaceReview *SpaceReviewCallerSession) GetAllReviews() (struct {
	Users   []common.Address
	Reviews []ReviewStorageContent
}, error) {
	return _SpaceReview.Contract.GetAllReviews(&_SpaceReview.CallOpts)
}

// GetReview is a free data retrieval call binding the contract method 0x694a34bb.
//
// Solidity: function getReview(address user) view returns((string,uint8,uint40,uint40))
func (_SpaceReview *SpaceReviewCaller) GetReview(opts *bind.CallOpts, user common.Address) (ReviewStorageContent, error) {
	var out []interface{}
	err := _SpaceReview.contract.Call(opts, &out, "getReview", user)

	if err != nil {
		return *new(ReviewStorageContent), err
	}

	out0 := *abi.ConvertType(out[0], new(ReviewStorageContent)).(*ReviewStorageContent)

	return out0, err

}

// GetReview is a free data retrieval call binding the contract method 0x694a34bb.
//
// Solidity: function getReview(address user) view returns((string,uint8,uint40,uint40))
func (_SpaceReview *SpaceReviewSession) GetReview(user common.Address) (ReviewStorageContent, error) {
	return _SpaceReview.Contract.GetReview(&_SpaceReview.CallOpts, user)
}

// GetReview is a free data retrieval call binding the contract method 0x694a34bb.
//
// Solidity: function getReview(address user) view returns((string,uint8,uint40,uint40))
func (_SpaceReview *SpaceReviewCallerSession) GetReview(user common.Address) (ReviewStorageContent, error) {
	return _SpaceReview.Contract.GetReview(&_SpaceReview.CallOpts, user)
}

// SetReview is a paid mutator transaction binding the contract method 0x7fc11c71.
//
// Solidity: function setReview(uint8 action, bytes data) returns()
func (_SpaceReview *SpaceReviewTransactor) SetReview(opts *bind.TransactOpts, action uint8, data []byte) (*types.Transaction, error) {
	return _SpaceReview.contract.Transact(opts, "setReview", action, data)
}

// SetReview is a paid mutator transaction binding the contract method 0x7fc11c71.
//
// Solidity: function setReview(uint8 action, bytes data) returns()
func (_SpaceReview *SpaceReviewSession) SetReview(action uint8, data []byte) (*types.Transaction, error) {
	return _SpaceReview.Contract.SetReview(&_SpaceReview.TransactOpts, action, data)
}

// SetReview is a paid mutator transaction binding the contract method 0x7fc11c71.
//
// Solidity: function setReview(uint8 action, bytes data) returns()
func (_SpaceReview *SpaceReviewTransactorSession) SetReview(action uint8, data []byte) (*types.Transaction, error) {
	return _SpaceReview.Contract.SetReview(&_SpaceReview.TransactOpts, action, data)
}

// SpaceReviewReviewAddedIterator is returned from FilterReviewAdded and is used to iterate over the raw logs and unpacked data for ReviewAdded events raised by the SpaceReview contract.
type SpaceReviewReviewAddedIterator struct {
	Event *SpaceReviewReviewAdded // Event containing the contract specifics and raw log

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
func (it *SpaceReviewReviewAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SpaceReviewReviewAdded)
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
		it.Event = new(SpaceReviewReviewAdded)
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
func (it *SpaceReviewReviewAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SpaceReviewReviewAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SpaceReviewReviewAdded represents a ReviewAdded event raised by the SpaceReview contract.
type SpaceReviewReviewAdded struct {
	User    common.Address
	Comment string
	Rating  uint8
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterReviewAdded is a free log retrieval operation binding the contract event 0x327bf0d86574aefd94222d9175868a81de3e65af4338f4649a8cf37baaef0c8d.
//
// Solidity: event ReviewAdded(address indexed user, string comment, uint8 rating)
func (_SpaceReview *SpaceReviewFilterer) FilterReviewAdded(opts *bind.FilterOpts, user []common.Address) (*SpaceReviewReviewAddedIterator, error) {

	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _SpaceReview.contract.FilterLogs(opts, "ReviewAdded", userRule)
	if err != nil {
		return nil, err
	}
	return &SpaceReviewReviewAddedIterator{contract: _SpaceReview.contract, event: "ReviewAdded", logs: logs, sub: sub}, nil
}

// WatchReviewAdded is a free log subscription operation binding the contract event 0x327bf0d86574aefd94222d9175868a81de3e65af4338f4649a8cf37baaef0c8d.
//
// Solidity: event ReviewAdded(address indexed user, string comment, uint8 rating)
func (_SpaceReview *SpaceReviewFilterer) WatchReviewAdded(opts *bind.WatchOpts, sink chan<- *SpaceReviewReviewAdded, user []common.Address) (event.Subscription, error) {

	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _SpaceReview.contract.WatchLogs(opts, "ReviewAdded", userRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SpaceReviewReviewAdded)
				if err := _SpaceReview.contract.UnpackLog(event, "ReviewAdded", log); err != nil {
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

// ParseReviewAdded is a log parse operation binding the contract event 0x327bf0d86574aefd94222d9175868a81de3e65af4338f4649a8cf37baaef0c8d.
//
// Solidity: event ReviewAdded(address indexed user, string comment, uint8 rating)
func (_SpaceReview *SpaceReviewFilterer) ParseReviewAdded(log types.Log) (*SpaceReviewReviewAdded, error) {
	event := new(SpaceReviewReviewAdded)
	if err := _SpaceReview.contract.UnpackLog(event, "ReviewAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SpaceReviewReviewDeletedIterator is returned from FilterReviewDeleted and is used to iterate over the raw logs and unpacked data for ReviewDeleted events raised by the SpaceReview contract.
type SpaceReviewReviewDeletedIterator struct {
	Event *SpaceReviewReviewDeleted // Event containing the contract specifics and raw log

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
func (it *SpaceReviewReviewDeletedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SpaceReviewReviewDeleted)
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
		it.Event = new(SpaceReviewReviewDeleted)
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
func (it *SpaceReviewReviewDeletedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SpaceReviewReviewDeletedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SpaceReviewReviewDeleted represents a ReviewDeleted event raised by the SpaceReview contract.
type SpaceReviewReviewDeleted struct {
	User common.Address
	Raw  types.Log // Blockchain specific contextual infos
}

// FilterReviewDeleted is a free log retrieval operation binding the contract event 0xbee898ba1f9d8d4c85b8ee7383999357c80289af5a5128f9880ef609b885f867.
//
// Solidity: event ReviewDeleted(address indexed user)
func (_SpaceReview *SpaceReviewFilterer) FilterReviewDeleted(opts *bind.FilterOpts, user []common.Address) (*SpaceReviewReviewDeletedIterator, error) {

	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _SpaceReview.contract.FilterLogs(opts, "ReviewDeleted", userRule)
	if err != nil {
		return nil, err
	}
	return &SpaceReviewReviewDeletedIterator{contract: _SpaceReview.contract, event: "ReviewDeleted", logs: logs, sub: sub}, nil
}

// WatchReviewDeleted is a free log subscription operation binding the contract event 0xbee898ba1f9d8d4c85b8ee7383999357c80289af5a5128f9880ef609b885f867.
//
// Solidity: event ReviewDeleted(address indexed user)
func (_SpaceReview *SpaceReviewFilterer) WatchReviewDeleted(opts *bind.WatchOpts, sink chan<- *SpaceReviewReviewDeleted, user []common.Address) (event.Subscription, error) {

	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _SpaceReview.contract.WatchLogs(opts, "ReviewDeleted", userRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SpaceReviewReviewDeleted)
				if err := _SpaceReview.contract.UnpackLog(event, "ReviewDeleted", log); err != nil {
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

// ParseReviewDeleted is a log parse operation binding the contract event 0xbee898ba1f9d8d4c85b8ee7383999357c80289af5a5128f9880ef609b885f867.
//
// Solidity: event ReviewDeleted(address indexed user)
func (_SpaceReview *SpaceReviewFilterer) ParseReviewDeleted(log types.Log) (*SpaceReviewReviewDeleted, error) {
	event := new(SpaceReviewReviewDeleted)
	if err := _SpaceReview.contract.UnpackLog(event, "ReviewDeleted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SpaceReviewReviewUpdatedIterator is returned from FilterReviewUpdated and is used to iterate over the raw logs and unpacked data for ReviewUpdated events raised by the SpaceReview contract.
type SpaceReviewReviewUpdatedIterator struct {
	Event *SpaceReviewReviewUpdated // Event containing the contract specifics and raw log

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
func (it *SpaceReviewReviewUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SpaceReviewReviewUpdated)
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
		it.Event = new(SpaceReviewReviewUpdated)
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
func (it *SpaceReviewReviewUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SpaceReviewReviewUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SpaceReviewReviewUpdated represents a ReviewUpdated event raised by the SpaceReview contract.
type SpaceReviewReviewUpdated struct {
	User    common.Address
	Comment string
	Rating  uint8
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterReviewUpdated is a free log retrieval operation binding the contract event 0x6535cc20a53fe6f0b4482780339f3fcbb54f634a86f288e551a651bc9facc55d.
//
// Solidity: event ReviewUpdated(address indexed user, string comment, uint8 rating)
func (_SpaceReview *SpaceReviewFilterer) FilterReviewUpdated(opts *bind.FilterOpts, user []common.Address) (*SpaceReviewReviewUpdatedIterator, error) {

	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _SpaceReview.contract.FilterLogs(opts, "ReviewUpdated", userRule)
	if err != nil {
		return nil, err
	}
	return &SpaceReviewReviewUpdatedIterator{contract: _SpaceReview.contract, event: "ReviewUpdated", logs: logs, sub: sub}, nil
}

// WatchReviewUpdated is a free log subscription operation binding the contract event 0x6535cc20a53fe6f0b4482780339f3fcbb54f634a86f288e551a651bc9facc55d.
//
// Solidity: event ReviewUpdated(address indexed user, string comment, uint8 rating)
func (_SpaceReview *SpaceReviewFilterer) WatchReviewUpdated(opts *bind.WatchOpts, sink chan<- *SpaceReviewReviewUpdated, user []common.Address) (event.Subscription, error) {

	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _SpaceReview.contract.WatchLogs(opts, "ReviewUpdated", userRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SpaceReviewReviewUpdated)
				if err := _SpaceReview.contract.UnpackLog(event, "ReviewUpdated", log); err != nil {
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

// ParseReviewUpdated is a log parse operation binding the contract event 0x6535cc20a53fe6f0b4482780339f3fcbb54f634a86f288e551a651bc9facc55d.
//
// Solidity: event ReviewUpdated(address indexed user, string comment, uint8 rating)
func (_SpaceReview *SpaceReviewFilterer) ParseReviewUpdated(log types.Log) (*SpaceReviewReviewUpdated, error) {
	event := new(SpaceReviewReviewUpdated)
	if err := _SpaceReview.contract.UnpackLog(event, "ReviewUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
