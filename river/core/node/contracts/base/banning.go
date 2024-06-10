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

// BanningMetaData contains all meta data concerning the Banning contract.
var BanningMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"ban\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"banned\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"unban\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Banned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unbanned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Banning__AlreadyBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__CannotBanOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__CannotBanSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__InvalidTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__NotBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
}

// BanningABI is the input ABI used to generate the binding from.
// Deprecated: Use BanningMetaData.ABI instead.
var BanningABI = BanningMetaData.ABI

// Banning is an auto generated Go binding around an Ethereum contract.
type Banning struct {
	BanningCaller     // Read-only binding to the contract
	BanningTransactor // Write-only binding to the contract
	BanningFilterer   // Log filterer for contract events
}

// BanningCaller is an auto generated read-only Go binding around an Ethereum contract.
type BanningCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BanningTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BanningTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BanningFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BanningFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BanningSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BanningSession struct {
	Contract     *Banning          // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// BanningCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BanningCallerSession struct {
	Contract *BanningCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts  // Call options to use throughout this session
}

// BanningTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BanningTransactorSession struct {
	Contract     *BanningTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// BanningRaw is an auto generated low-level Go binding around an Ethereum contract.
type BanningRaw struct {
	Contract *Banning // Generic contract binding to access the raw methods on
}

// BanningCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BanningCallerRaw struct {
	Contract *BanningCaller // Generic read-only contract binding to access the raw methods on
}

// BanningTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BanningTransactorRaw struct {
	Contract *BanningTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBanning creates a new instance of Banning, bound to a specific deployed contract.
func NewBanning(address common.Address, backend bind.ContractBackend) (*Banning, error) {
	contract, err := bindBanning(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Banning{BanningCaller: BanningCaller{contract: contract}, BanningTransactor: BanningTransactor{contract: contract}, BanningFilterer: BanningFilterer{contract: contract}}, nil
}

// NewBanningCaller creates a new read-only instance of Banning, bound to a specific deployed contract.
func NewBanningCaller(address common.Address, caller bind.ContractCaller) (*BanningCaller, error) {
	contract, err := bindBanning(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BanningCaller{contract: contract}, nil
}

// NewBanningTransactor creates a new write-only instance of Banning, bound to a specific deployed contract.
func NewBanningTransactor(address common.Address, transactor bind.ContractTransactor) (*BanningTransactor, error) {
	contract, err := bindBanning(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BanningTransactor{contract: contract}, nil
}

// NewBanningFilterer creates a new log filterer instance of Banning, bound to a specific deployed contract.
func NewBanningFilterer(address common.Address, filterer bind.ContractFilterer) (*BanningFilterer, error) {
	contract, err := bindBanning(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BanningFilterer{contract: contract}, nil
}

// bindBanning binds a generic wrapper to an already deployed contract.
func bindBanning(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BanningMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Banning *BanningRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Banning.Contract.BanningCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Banning *BanningRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Banning.Contract.BanningTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Banning *BanningRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Banning.Contract.BanningTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Banning *BanningCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Banning.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Banning *BanningTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Banning.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Banning *BanningTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Banning.Contract.contract.Transact(opts, method, params...)
}

// Banned is a free data retrieval call binding the contract method 0x158fba8f.
//
// Solidity: function banned() view returns(uint256[])
func (_Banning *BanningCaller) Banned(opts *bind.CallOpts) ([]*big.Int, error) {
	var out []interface{}
	err := _Banning.contract.Call(opts, &out, "banned")

	if err != nil {
		return *new([]*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new([]*big.Int)).(*[]*big.Int)

	return out0, err

}

// Banned is a free data retrieval call binding the contract method 0x158fba8f.
//
// Solidity: function banned() view returns(uint256[])
func (_Banning *BanningSession) Banned() ([]*big.Int, error) {
	return _Banning.Contract.Banned(&_Banning.CallOpts)
}

// Banned is a free data retrieval call binding the contract method 0x158fba8f.
//
// Solidity: function banned() view returns(uint256[])
func (_Banning *BanningCallerSession) Banned() ([]*big.Int, error) {
	return _Banning.Contract.Banned(&_Banning.CallOpts)
}

// IsBanned is a free data retrieval call binding the contract method 0xc57a9c56.
//
// Solidity: function isBanned(uint256 tokenId) view returns(bool)
func (_Banning *BanningCaller) IsBanned(opts *bind.CallOpts, tokenId *big.Int) (bool, error) {
	var out []interface{}
	err := _Banning.contract.Call(opts, &out, "isBanned", tokenId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsBanned is a free data retrieval call binding the contract method 0xc57a9c56.
//
// Solidity: function isBanned(uint256 tokenId) view returns(bool)
func (_Banning *BanningSession) IsBanned(tokenId *big.Int) (bool, error) {
	return _Banning.Contract.IsBanned(&_Banning.CallOpts, tokenId)
}

// IsBanned is a free data retrieval call binding the contract method 0xc57a9c56.
//
// Solidity: function isBanned(uint256 tokenId) view returns(bool)
func (_Banning *BanningCallerSession) IsBanned(tokenId *big.Int) (bool, error) {
	return _Banning.Contract.IsBanned(&_Banning.CallOpts, tokenId)
}

// Ban is a paid mutator transaction binding the contract method 0x6b6ece26.
//
// Solidity: function ban(uint256 tokenId) returns()
func (_Banning *BanningTransactor) Ban(opts *bind.TransactOpts, tokenId *big.Int) (*types.Transaction, error) {
	return _Banning.contract.Transact(opts, "ban", tokenId)
}

// Ban is a paid mutator transaction binding the contract method 0x6b6ece26.
//
// Solidity: function ban(uint256 tokenId) returns()
func (_Banning *BanningSession) Ban(tokenId *big.Int) (*types.Transaction, error) {
	return _Banning.Contract.Ban(&_Banning.TransactOpts, tokenId)
}

// Ban is a paid mutator transaction binding the contract method 0x6b6ece26.
//
// Solidity: function ban(uint256 tokenId) returns()
func (_Banning *BanningTransactorSession) Ban(tokenId *big.Int) (*types.Transaction, error) {
	return _Banning.Contract.Ban(&_Banning.TransactOpts, tokenId)
}

// Unban is a paid mutator transaction binding the contract method 0x1519ff4c.
//
// Solidity: function unban(uint256 tokenId) returns()
func (_Banning *BanningTransactor) Unban(opts *bind.TransactOpts, tokenId *big.Int) (*types.Transaction, error) {
	return _Banning.contract.Transact(opts, "unban", tokenId)
}

// Unban is a paid mutator transaction binding the contract method 0x1519ff4c.
//
// Solidity: function unban(uint256 tokenId) returns()
func (_Banning *BanningSession) Unban(tokenId *big.Int) (*types.Transaction, error) {
	return _Banning.Contract.Unban(&_Banning.TransactOpts, tokenId)
}

// Unban is a paid mutator transaction binding the contract method 0x1519ff4c.
//
// Solidity: function unban(uint256 tokenId) returns()
func (_Banning *BanningTransactorSession) Unban(tokenId *big.Int) (*types.Transaction, error) {
	return _Banning.Contract.Unban(&_Banning.TransactOpts, tokenId)
}

// BanningBannedIterator is returned from FilterBanned and is used to iterate over the raw logs and unpacked data for Banned events raised by the Banning contract.
type BanningBannedIterator struct {
	Event *BanningBanned // Event containing the contract specifics and raw log

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
func (it *BanningBannedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BanningBanned)
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
		it.Event = new(BanningBanned)
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
func (it *BanningBannedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BanningBannedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BanningBanned represents a Banned event raised by the Banning contract.
type BanningBanned struct {
	Moderator common.Address
	TokenId   *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterBanned is a free log retrieval operation binding the contract event 0x8f9d2f181f599e221d5959b9acbebb1f42c8146251755fd61fc0de85f5d97162.
//
// Solidity: event Banned(address indexed moderator, uint256 indexed tokenId)
func (_Banning *BanningFilterer) FilterBanned(opts *bind.FilterOpts, moderator []common.Address, tokenId []*big.Int) (*BanningBannedIterator, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Banning.contract.FilterLogs(opts, "Banned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &BanningBannedIterator{contract: _Banning.contract, event: "Banned", logs: logs, sub: sub}, nil
}

// WatchBanned is a free log subscription operation binding the contract event 0x8f9d2f181f599e221d5959b9acbebb1f42c8146251755fd61fc0de85f5d97162.
//
// Solidity: event Banned(address indexed moderator, uint256 indexed tokenId)
func (_Banning *BanningFilterer) WatchBanned(opts *bind.WatchOpts, sink chan<- *BanningBanned, moderator []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Banning.contract.WatchLogs(opts, "Banned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BanningBanned)
				if err := _Banning.contract.UnpackLog(event, "Banned", log); err != nil {
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

// ParseBanned is a log parse operation binding the contract event 0x8f9d2f181f599e221d5959b9acbebb1f42c8146251755fd61fc0de85f5d97162.
//
// Solidity: event Banned(address indexed moderator, uint256 indexed tokenId)
func (_Banning *BanningFilterer) ParseBanned(log types.Log) (*BanningBanned, error) {
	event := new(BanningBanned)
	if err := _Banning.contract.UnpackLog(event, "Banned", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BanningUnbannedIterator is returned from FilterUnbanned and is used to iterate over the raw logs and unpacked data for Unbanned events raised by the Banning contract.
type BanningUnbannedIterator struct {
	Event *BanningUnbanned // Event containing the contract specifics and raw log

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
func (it *BanningUnbannedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BanningUnbanned)
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
		it.Event = new(BanningUnbanned)
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
func (it *BanningUnbannedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BanningUnbannedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BanningUnbanned represents a Unbanned event raised by the Banning contract.
type BanningUnbanned struct {
	Moderator common.Address
	TokenId   *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterUnbanned is a free log retrieval operation binding the contract event 0xf46dc693169fba0f08556bb54c8abc995b37535f1c2322598f0e671982d8ff86.
//
// Solidity: event Unbanned(address indexed moderator, uint256 indexed tokenId)
func (_Banning *BanningFilterer) FilterUnbanned(opts *bind.FilterOpts, moderator []common.Address, tokenId []*big.Int) (*BanningUnbannedIterator, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Banning.contract.FilterLogs(opts, "Unbanned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &BanningUnbannedIterator{contract: _Banning.contract, event: "Unbanned", logs: logs, sub: sub}, nil
}

// WatchUnbanned is a free log subscription operation binding the contract event 0xf46dc693169fba0f08556bb54c8abc995b37535f1c2322598f0e671982d8ff86.
//
// Solidity: event Unbanned(address indexed moderator, uint256 indexed tokenId)
func (_Banning *BanningFilterer) WatchUnbanned(opts *bind.WatchOpts, sink chan<- *BanningUnbanned, moderator []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Banning.contract.WatchLogs(opts, "Unbanned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BanningUnbanned)
				if err := _Banning.contract.UnpackLog(event, "Unbanned", log); err != nil {
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

// ParseUnbanned is a log parse operation binding the contract event 0xf46dc693169fba0f08556bb54c8abc995b37535f1c2322598f0e671982d8ff86.
//
// Solidity: event Unbanned(address indexed moderator, uint256 indexed tokenId)
func (_Banning *BanningFilterer) ParseUnbanned(log types.Log) (*BanningUnbanned, error) {
	event := new(BanningUnbanned)
	if err := _Banning.contract.UnpackLog(event, "Unbanned", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
