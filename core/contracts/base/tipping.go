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

// ITippingBaseTipRequest is an auto generated low-level Go binding around an user-defined struct.
type ITippingBaseTipRequest struct {
	Receiver  common.Address
	TokenId   *big.Int
	Currency  common.Address
	Amount    *big.Int
	MessageId [32]byte
	ChannelId [32]byte
}

// TippingMetaData contains all meta data concerning the Tipping contract.
var TippingMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"tip\",\"inputs\":[{\"name\":\"tipRequest\",\"type\":\"tuple\",\"internalType\":\"structITippingBase.TipRequest\",\"components\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"currency\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"messageId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"tipAmountByCurrency\",\"inputs\":[{\"name\":\"currency\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tippingCurrencies\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tipsByCurrencyAndTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"currency\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"totalTipsByCurrency\",\"inputs\":[{\"name\":\"currency\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"event\",\"name\":\"Tip\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"currency\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"sender\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"receiver\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"messageId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"AmountIsZero\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"CannotTipSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"CurrencyIsZero\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ReceiverIsNotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TokenDoesNotExist\",\"inputs\":[]}]",
}

// TippingABI is the input ABI used to generate the binding from.
// Deprecated: Use TippingMetaData.ABI instead.
var TippingABI = TippingMetaData.ABI

// Tipping is an auto generated Go binding around an Ethereum contract.
type Tipping struct {
	TippingCaller     // Read-only binding to the contract
	TippingTransactor // Write-only binding to the contract
	TippingFilterer   // Log filterer for contract events
}

// TippingCaller is an auto generated read-only Go binding around an Ethereum contract.
type TippingCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TippingTransactor is an auto generated write-only Go binding around an Ethereum contract.
type TippingTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TippingFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type TippingFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TippingSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type TippingSession struct {
	Contract     *Tipping          // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// TippingCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type TippingCallerSession struct {
	Contract *TippingCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts  // Call options to use throughout this session
}

// TippingTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type TippingTransactorSession struct {
	Contract     *TippingTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// TippingRaw is an auto generated low-level Go binding around an Ethereum contract.
type TippingRaw struct {
	Contract *Tipping // Generic contract binding to access the raw methods on
}

// TippingCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type TippingCallerRaw struct {
	Contract *TippingCaller // Generic read-only contract binding to access the raw methods on
}

// TippingTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type TippingTransactorRaw struct {
	Contract *TippingTransactor // Generic write-only contract binding to access the raw methods on
}

// NewTipping creates a new instance of Tipping, bound to a specific deployed contract.
func NewTipping(address common.Address, backend bind.ContractBackend) (*Tipping, error) {
	contract, err := bindTipping(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Tipping{TippingCaller: TippingCaller{contract: contract}, TippingTransactor: TippingTransactor{contract: contract}, TippingFilterer: TippingFilterer{contract: contract}}, nil
}

// NewTippingCaller creates a new read-only instance of Tipping, bound to a specific deployed contract.
func NewTippingCaller(address common.Address, caller bind.ContractCaller) (*TippingCaller, error) {
	contract, err := bindTipping(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &TippingCaller{contract: contract}, nil
}

// NewTippingTransactor creates a new write-only instance of Tipping, bound to a specific deployed contract.
func NewTippingTransactor(address common.Address, transactor bind.ContractTransactor) (*TippingTransactor, error) {
	contract, err := bindTipping(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &TippingTransactor{contract: contract}, nil
}

// NewTippingFilterer creates a new log filterer instance of Tipping, bound to a specific deployed contract.
func NewTippingFilterer(address common.Address, filterer bind.ContractFilterer) (*TippingFilterer, error) {
	contract, err := bindTipping(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &TippingFilterer{contract: contract}, nil
}

// bindTipping binds a generic wrapper to an already deployed contract.
func bindTipping(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := TippingMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Tipping *TippingRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Tipping.Contract.TippingCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Tipping *TippingRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Tipping.Contract.TippingTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Tipping *TippingRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Tipping.Contract.TippingTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Tipping *TippingCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Tipping.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Tipping *TippingTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Tipping.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Tipping *TippingTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Tipping.Contract.contract.Transact(opts, method, params...)
}

// TipAmountByCurrency is a free data retrieval call binding the contract method 0x0a7bb41b.
//
// Solidity: function tipAmountByCurrency(address currency) view returns(uint256)
func (_Tipping *TippingCaller) TipAmountByCurrency(opts *bind.CallOpts, currency common.Address) (*big.Int, error) {
	var out []interface{}
	err := _Tipping.contract.Call(opts, &out, "tipAmountByCurrency", currency)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TipAmountByCurrency is a free data retrieval call binding the contract method 0x0a7bb41b.
//
// Solidity: function tipAmountByCurrency(address currency) view returns(uint256)
func (_Tipping *TippingSession) TipAmountByCurrency(currency common.Address) (*big.Int, error) {
	return _Tipping.Contract.TipAmountByCurrency(&_Tipping.CallOpts, currency)
}

// TipAmountByCurrency is a free data retrieval call binding the contract method 0x0a7bb41b.
//
// Solidity: function tipAmountByCurrency(address currency) view returns(uint256)
func (_Tipping *TippingCallerSession) TipAmountByCurrency(currency common.Address) (*big.Int, error) {
	return _Tipping.Contract.TipAmountByCurrency(&_Tipping.CallOpts, currency)
}

// TippingCurrencies is a free data retrieval call binding the contract method 0x6e7ef3fa.
//
// Solidity: function tippingCurrencies() view returns(address[])
func (_Tipping *TippingCaller) TippingCurrencies(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _Tipping.contract.Call(opts, &out, "tippingCurrencies")

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// TippingCurrencies is a free data retrieval call binding the contract method 0x6e7ef3fa.
//
// Solidity: function tippingCurrencies() view returns(address[])
func (_Tipping *TippingSession) TippingCurrencies() ([]common.Address, error) {
	return _Tipping.Contract.TippingCurrencies(&_Tipping.CallOpts)
}

// TippingCurrencies is a free data retrieval call binding the contract method 0x6e7ef3fa.
//
// Solidity: function tippingCurrencies() view returns(address[])
func (_Tipping *TippingCallerSession) TippingCurrencies() ([]common.Address, error) {
	return _Tipping.Contract.TippingCurrencies(&_Tipping.CallOpts)
}

// TipsByCurrencyAndTokenId is a free data retrieval call binding the contract method 0x568922a6.
//
// Solidity: function tipsByCurrencyAndTokenId(uint256 tokenId, address currency) view returns(uint256)
func (_Tipping *TippingCaller) TipsByCurrencyAndTokenId(opts *bind.CallOpts, tokenId *big.Int, currency common.Address) (*big.Int, error) {
	var out []interface{}
	err := _Tipping.contract.Call(opts, &out, "tipsByCurrencyAndTokenId", tokenId, currency)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TipsByCurrencyAndTokenId is a free data retrieval call binding the contract method 0x568922a6.
//
// Solidity: function tipsByCurrencyAndTokenId(uint256 tokenId, address currency) view returns(uint256)
func (_Tipping *TippingSession) TipsByCurrencyAndTokenId(tokenId *big.Int, currency common.Address) (*big.Int, error) {
	return _Tipping.Contract.TipsByCurrencyAndTokenId(&_Tipping.CallOpts, tokenId, currency)
}

// TipsByCurrencyAndTokenId is a free data retrieval call binding the contract method 0x568922a6.
//
// Solidity: function tipsByCurrencyAndTokenId(uint256 tokenId, address currency) view returns(uint256)
func (_Tipping *TippingCallerSession) TipsByCurrencyAndTokenId(tokenId *big.Int, currency common.Address) (*big.Int, error) {
	return _Tipping.Contract.TipsByCurrencyAndTokenId(&_Tipping.CallOpts, tokenId, currency)
}

// TotalTipsByCurrency is a free data retrieval call binding the contract method 0xe4177d0b.
//
// Solidity: function totalTipsByCurrency(address currency) view returns(uint256)
func (_Tipping *TippingCaller) TotalTipsByCurrency(opts *bind.CallOpts, currency common.Address) (*big.Int, error) {
	var out []interface{}
	err := _Tipping.contract.Call(opts, &out, "totalTipsByCurrency", currency)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TotalTipsByCurrency is a free data retrieval call binding the contract method 0xe4177d0b.
//
// Solidity: function totalTipsByCurrency(address currency) view returns(uint256)
func (_Tipping *TippingSession) TotalTipsByCurrency(currency common.Address) (*big.Int, error) {
	return _Tipping.Contract.TotalTipsByCurrency(&_Tipping.CallOpts, currency)
}

// TotalTipsByCurrency is a free data retrieval call binding the contract method 0xe4177d0b.
//
// Solidity: function totalTipsByCurrency(address currency) view returns(uint256)
func (_Tipping *TippingCallerSession) TotalTipsByCurrency(currency common.Address) (*big.Int, error) {
	return _Tipping.Contract.TotalTipsByCurrency(&_Tipping.CallOpts, currency)
}

// Tip is a paid mutator transaction binding the contract method 0xc46be00e.
//
// Solidity: function tip((address,uint256,address,uint256,bytes32,bytes32) tipRequest) payable returns()
func (_Tipping *TippingTransactor) Tip(opts *bind.TransactOpts, tipRequest ITippingBaseTipRequest) (*types.Transaction, error) {
	return _Tipping.contract.Transact(opts, "tip", tipRequest)
}

// Tip is a paid mutator transaction binding the contract method 0xc46be00e.
//
// Solidity: function tip((address,uint256,address,uint256,bytes32,bytes32) tipRequest) payable returns()
func (_Tipping *TippingSession) Tip(tipRequest ITippingBaseTipRequest) (*types.Transaction, error) {
	return _Tipping.Contract.Tip(&_Tipping.TransactOpts, tipRequest)
}

// Tip is a paid mutator transaction binding the contract method 0xc46be00e.
//
// Solidity: function tip((address,uint256,address,uint256,bytes32,bytes32) tipRequest) payable returns()
func (_Tipping *TippingTransactorSession) Tip(tipRequest ITippingBaseTipRequest) (*types.Transaction, error) {
	return _Tipping.Contract.Tip(&_Tipping.TransactOpts, tipRequest)
}

// TippingTipIterator is returned from FilterTip and is used to iterate over the raw logs and unpacked data for Tip events raised by the Tipping contract.
type TippingTipIterator struct {
	Event *TippingTip // Event containing the contract specifics and raw log

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
func (it *TippingTipIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TippingTip)
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
		it.Event = new(TippingTip)
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
func (it *TippingTipIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TippingTipIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TippingTip represents a Tip event raised by the Tipping contract.
type TippingTip struct {
	TokenId   *big.Int
	Currency  common.Address
	Sender    common.Address
	Receiver  common.Address
	Amount    *big.Int
	MessageId [32]byte
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterTip is a free log retrieval operation binding the contract event 0x854db29cbd1986b670c0d596bf56847152a0d66e5ddef710408c1fa4ada78f2b.
//
// Solidity: event Tip(uint256 indexed tokenId, address indexed currency, address sender, address receiver, uint256 amount, bytes32 messageId, bytes32 channelId)
func (_Tipping *TippingFilterer) FilterTip(opts *bind.FilterOpts, tokenId []*big.Int, currency []common.Address) (*TippingTipIterator, error) {

	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}
	var currencyRule []interface{}
	for _, currencyItem := range currency {
		currencyRule = append(currencyRule, currencyItem)
	}

	logs, sub, err := _Tipping.contract.FilterLogs(opts, "Tip", tokenIdRule, currencyRule)
	if err != nil {
		return nil, err
	}
	return &TippingTipIterator{contract: _Tipping.contract, event: "Tip", logs: logs, sub: sub}, nil
}

// WatchTip is a free log subscription operation binding the contract event 0x854db29cbd1986b670c0d596bf56847152a0d66e5ddef710408c1fa4ada78f2b.
//
// Solidity: event Tip(uint256 indexed tokenId, address indexed currency, address sender, address receiver, uint256 amount, bytes32 messageId, bytes32 channelId)
func (_Tipping *TippingFilterer) WatchTip(opts *bind.WatchOpts, sink chan<- *TippingTip, tokenId []*big.Int, currency []common.Address) (event.Subscription, error) {

	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}
	var currencyRule []interface{}
	for _, currencyItem := range currency {
		currencyRule = append(currencyRule, currencyItem)
	}

	logs, sub, err := _Tipping.contract.WatchLogs(opts, "Tip", tokenIdRule, currencyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TippingTip)
				if err := _Tipping.contract.UnpackLog(event, "Tip", log); err != nil {
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

// ParseTip is a log parse operation binding the contract event 0x854db29cbd1986b670c0d596bf56847152a0d66e5ddef710408c1fa4ada78f2b.
//
// Solidity: event Tip(uint256 indexed tokenId, address indexed currency, address sender, address receiver, uint256 amount, bytes32 messageId, bytes32 channelId)
func (_Tipping *TippingFilterer) ParseTip(log types.Log) (*TippingTip, error) {
	event := new(TippingTip)
	if err := _Tipping.contract.UnpackLog(event, "Tip", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
