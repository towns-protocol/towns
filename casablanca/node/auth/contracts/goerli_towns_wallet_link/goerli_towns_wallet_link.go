// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package goerli_towns_wallet_link

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

// IWalletLinkBaseWalletLinkInfo is an auto generated low-level Go binding around an user-defined struct.
type IWalletLinkBaseWalletLinkInfo struct {
	Wallet  common.Address
	RootKey common.Address
}

// GoerliTownsWalletLinkMetaData contains all meta data concerning the GoerliTownsWalletLink contract.
var GoerliTownsWalletLinkMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"LinkAlreadyExists\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"LinkForAll\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"RevokeAllLinks\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"RevokeLink\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__WalletLink_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"checkLinkForAll\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"getLinksByRootKey\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"internalType\":\"structIWalletLinkBase.WalletLinkInfo[]\",\"name\":\"info\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"getLinksForAll\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"delegates\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"linkForAll\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"revokeAllLinks\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"revokeLink\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// GoerliTownsWalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use GoerliTownsWalletLinkMetaData.ABI instead.
var GoerliTownsWalletLinkABI = GoerliTownsWalletLinkMetaData.ABI

// GoerliTownsWalletLink is an auto generated Go binding around an Ethereum contract.
type GoerliTownsWalletLink struct {
	GoerliTownsWalletLinkCaller     // Read-only binding to the contract
	GoerliTownsWalletLinkTransactor // Write-only binding to the contract
	GoerliTownsWalletLinkFilterer   // Log filterer for contract events
}

// GoerliTownsWalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type GoerliTownsWalletLinkCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsWalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type GoerliTownsWalletLinkTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsWalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type GoerliTownsWalletLinkFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsWalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type GoerliTownsWalletLinkSession struct {
	Contract     *GoerliTownsWalletLink // Generic contract binding to set the session for
	CallOpts     bind.CallOpts          // Call options to use throughout this session
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// GoerliTownsWalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type GoerliTownsWalletLinkCallerSession struct {
	Contract *GoerliTownsWalletLinkCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                // Call options to use throughout this session
}

// GoerliTownsWalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type GoerliTownsWalletLinkTransactorSession struct {
	Contract     *GoerliTownsWalletLinkTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                // Transaction auth options to use throughout this session
}

// GoerliTownsWalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type GoerliTownsWalletLinkRaw struct {
	Contract *GoerliTownsWalletLink // Generic contract binding to access the raw methods on
}

// GoerliTownsWalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type GoerliTownsWalletLinkCallerRaw struct {
	Contract *GoerliTownsWalletLinkCaller // Generic read-only contract binding to access the raw methods on
}

// GoerliTownsWalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type GoerliTownsWalletLinkTransactorRaw struct {
	Contract *GoerliTownsWalletLinkTransactor // Generic write-only contract binding to access the raw methods on
}

// NewGoerliTownsWalletLink creates a new instance of GoerliTownsWalletLink, bound to a specific deployed contract.
func NewGoerliTownsWalletLink(address common.Address, backend bind.ContractBackend) (*GoerliTownsWalletLink, error) {
	contract, err := bindGoerliTownsWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLink{GoerliTownsWalletLinkCaller: GoerliTownsWalletLinkCaller{contract: contract}, GoerliTownsWalletLinkTransactor: GoerliTownsWalletLinkTransactor{contract: contract}, GoerliTownsWalletLinkFilterer: GoerliTownsWalletLinkFilterer{contract: contract}}, nil
}

// NewGoerliTownsWalletLinkCaller creates a new read-only instance of GoerliTownsWalletLink, bound to a specific deployed contract.
func NewGoerliTownsWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*GoerliTownsWalletLinkCaller, error) {
	contract, err := bindGoerliTownsWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkCaller{contract: contract}, nil
}

// NewGoerliTownsWalletLinkTransactor creates a new write-only instance of GoerliTownsWalletLink, bound to a specific deployed contract.
func NewGoerliTownsWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*GoerliTownsWalletLinkTransactor, error) {
	contract, err := bindGoerliTownsWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkTransactor{contract: contract}, nil
}

// NewGoerliTownsWalletLinkFilterer creates a new log filterer instance of GoerliTownsWalletLink, bound to a specific deployed contract.
func NewGoerliTownsWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*GoerliTownsWalletLinkFilterer, error) {
	contract, err := bindGoerliTownsWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkFilterer{contract: contract}, nil
}

// bindGoerliTownsWalletLink binds a generic wrapper to an already deployed contract.
func bindGoerliTownsWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := GoerliTownsWalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsWalletLink.Contract.GoerliTownsWalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.GoerliTownsWalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.GoerliTownsWalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsWalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkCaller) CheckLinkForAll(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _GoerliTownsWalletLink.contract.Call(opts, &out, "checkLinkForAll", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _GoerliTownsWalletLink.Contract.CheckLinkForAll(&_GoerliTownsWalletLink.CallOpts, rootKey, wallet)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkCallerSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _GoerliTownsWalletLink.Contract.CheckLinkForAll(&_GoerliTownsWalletLink.CallOpts, rootKey, wallet)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkCaller) GetLinksByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	var out []interface{}
	err := _GoerliTownsWalletLink.contract.Call(opts, &out, "getLinksByRootKey", rootKey)

	if err != nil {
		return *new([]IWalletLinkBaseWalletLinkInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IWalletLinkBaseWalletLinkInfo)).(*[]IWalletLinkBaseWalletLinkInfo)

	return out0, err

}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _GoerliTownsWalletLink.Contract.GetLinksByRootKey(&_GoerliTownsWalletLink.CallOpts, rootKey)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkCallerSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _GoerliTownsWalletLink.Contract.GetLinksByRootKey(&_GoerliTownsWalletLink.CallOpts, rootKey)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkCaller) GetLinksForAll(opts *bind.CallOpts, wallet common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _GoerliTownsWalletLink.contract.Call(opts, &out, "getLinksForAll", wallet)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _GoerliTownsWalletLink.Contract.GetLinksForAll(&_GoerliTownsWalletLink.CallOpts, wallet)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkCallerSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _GoerliTownsWalletLink.Contract.GetLinksForAll(&_GoerliTownsWalletLink.CallOpts, wallet)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactor) WalletLinkInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.contract.Transact(opts, "__WalletLink_init")
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkSession) WalletLinkInit() (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.WalletLinkInit(&_GoerliTownsWalletLink.TransactOpts)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactorSession) WalletLinkInit() (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.WalletLinkInit(&_GoerliTownsWalletLink.TransactOpts)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactor) LinkForAll(opts *bind.TransactOpts, rootKey common.Address, value bool) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.contract.Transact(opts, "linkForAll", rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.LinkForAll(&_GoerliTownsWalletLink.TransactOpts, rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactorSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.LinkForAll(&_GoerliTownsWalletLink.TransactOpts, rootKey, value)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactor) RevokeAllLinks(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.contract.Transact(opts, "revokeAllLinks")
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkSession) RevokeAllLinks() (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.RevokeAllLinks(&_GoerliTownsWalletLink.TransactOpts)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactorSession) RevokeAllLinks() (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.RevokeAllLinks(&_GoerliTownsWalletLink.TransactOpts)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactor) RevokeLink(opts *bind.TransactOpts, rootKey common.Address) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.contract.Transact(opts, "revokeLink", rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.RevokeLink(&_GoerliTownsWalletLink.TransactOpts, rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkTransactorSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _GoerliTownsWalletLink.Contract.RevokeLink(&_GoerliTownsWalletLink.TransactOpts, rootKey)
}

// GoerliTownsWalletLinkInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkInitializedIterator struct {
	Event *GoerliTownsWalletLinkInitialized // Event containing the contract specifics and raw log

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
func (it *GoerliTownsWalletLinkInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsWalletLinkInitialized)
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
		it.Event = new(GoerliTownsWalletLinkInitialized)
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
func (it *GoerliTownsWalletLinkInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsWalletLinkInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsWalletLinkInitialized represents a Initialized event raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) FilterInitialized(opts *bind.FilterOpts) (*GoerliTownsWalletLinkInitializedIterator, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkInitializedIterator{contract: _GoerliTownsWalletLink.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *GoerliTownsWalletLinkInitialized) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsWalletLinkInitialized)
				if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
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

// ParseInitialized is a log parse operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) ParseInitialized(log types.Log) (*GoerliTownsWalletLinkInitialized, error) {
	event := new(GoerliTownsWalletLinkInitialized)
	if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsWalletLinkInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkInterfaceAddedIterator struct {
	Event *GoerliTownsWalletLinkInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *GoerliTownsWalletLinkInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsWalletLinkInterfaceAdded)
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
		it.Event = new(GoerliTownsWalletLinkInterfaceAdded)
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
func (it *GoerliTownsWalletLinkInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsWalletLinkInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsWalletLinkInterfaceAdded represents a InterfaceAdded event raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsWalletLinkInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsWalletLink.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkInterfaceAddedIterator{contract: _GoerliTownsWalletLink.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *GoerliTownsWalletLinkInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsWalletLink.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsWalletLinkInterfaceAdded)
				if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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

// ParseInterfaceAdded is a log parse operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) ParseInterfaceAdded(log types.Log) (*GoerliTownsWalletLinkInterfaceAdded, error) {
	event := new(GoerliTownsWalletLinkInterfaceAdded)
	if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsWalletLinkInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkInterfaceRemovedIterator struct {
	Event *GoerliTownsWalletLinkInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *GoerliTownsWalletLinkInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsWalletLinkInterfaceRemoved)
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
		it.Event = new(GoerliTownsWalletLinkInterfaceRemoved)
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
func (it *GoerliTownsWalletLinkInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsWalletLinkInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsWalletLinkInterfaceRemoved represents a InterfaceRemoved event raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsWalletLinkInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsWalletLink.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkInterfaceRemovedIterator{contract: _GoerliTownsWalletLink.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *GoerliTownsWalletLinkInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsWalletLink.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsWalletLinkInterfaceRemoved)
				if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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

// ParseInterfaceRemoved is a log parse operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) ParseInterfaceRemoved(log types.Log) (*GoerliTownsWalletLinkInterfaceRemoved, error) {
	event := new(GoerliTownsWalletLinkInterfaceRemoved)
	if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsWalletLinkLinkForAllIterator is returned from FilterLinkForAll and is used to iterate over the raw logs and unpacked data for LinkForAll events raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkLinkForAllIterator struct {
	Event *GoerliTownsWalletLinkLinkForAll // Event containing the contract specifics and raw log

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
func (it *GoerliTownsWalletLinkLinkForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsWalletLinkLinkForAll)
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
		it.Event = new(GoerliTownsWalletLinkLinkForAll)
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
func (it *GoerliTownsWalletLinkLinkForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsWalletLinkLinkForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsWalletLinkLinkForAll represents a LinkForAll event raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkLinkForAll struct {
	Wallet  common.Address
	RootKey common.Address
	Value   bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterLinkForAll is a free log retrieval operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) FilterLinkForAll(opts *bind.FilterOpts) (*GoerliTownsWalletLinkLinkForAllIterator, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.FilterLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkLinkForAllIterator{contract: _GoerliTownsWalletLink.contract, event: "LinkForAll", logs: logs, sub: sub}, nil
}

// WatchLinkForAll is a free log subscription operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) WatchLinkForAll(opts *bind.WatchOpts, sink chan<- *GoerliTownsWalletLinkLinkForAll) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.WatchLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsWalletLinkLinkForAll)
				if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
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

// ParseLinkForAll is a log parse operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) ParseLinkForAll(log types.Log) (*GoerliTownsWalletLinkLinkForAll, error) {
	event := new(GoerliTownsWalletLinkLinkForAll)
	if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsWalletLinkRevokeAllLinksIterator is returned from FilterRevokeAllLinks and is used to iterate over the raw logs and unpacked data for RevokeAllLinks events raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkRevokeAllLinksIterator struct {
	Event *GoerliTownsWalletLinkRevokeAllLinks // Event containing the contract specifics and raw log

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
func (it *GoerliTownsWalletLinkRevokeAllLinksIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsWalletLinkRevokeAllLinks)
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
		it.Event = new(GoerliTownsWalletLinkRevokeAllLinks)
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
func (it *GoerliTownsWalletLinkRevokeAllLinksIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsWalletLinkRevokeAllLinksIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsWalletLinkRevokeAllLinks represents a RevokeAllLinks event raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkRevokeAllLinks struct {
	Wallet common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterRevokeAllLinks is a free log retrieval operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) FilterRevokeAllLinks(opts *bind.FilterOpts) (*GoerliTownsWalletLinkRevokeAllLinksIterator, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.FilterLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkRevokeAllLinksIterator{contract: _GoerliTownsWalletLink.contract, event: "RevokeAllLinks", logs: logs, sub: sub}, nil
}

// WatchRevokeAllLinks is a free log subscription operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) WatchRevokeAllLinks(opts *bind.WatchOpts, sink chan<- *GoerliTownsWalletLinkRevokeAllLinks) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.WatchLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsWalletLinkRevokeAllLinks)
				if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
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

// ParseRevokeAllLinks is a log parse operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) ParseRevokeAllLinks(log types.Log) (*GoerliTownsWalletLinkRevokeAllLinks, error) {
	event := new(GoerliTownsWalletLinkRevokeAllLinks)
	if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsWalletLinkRevokeLinkIterator is returned from FilterRevokeLink and is used to iterate over the raw logs and unpacked data for RevokeLink events raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkRevokeLinkIterator struct {
	Event *GoerliTownsWalletLinkRevokeLink // Event containing the contract specifics and raw log

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
func (it *GoerliTownsWalletLinkRevokeLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsWalletLinkRevokeLink)
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
		it.Event = new(GoerliTownsWalletLinkRevokeLink)
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
func (it *GoerliTownsWalletLinkRevokeLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsWalletLinkRevokeLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsWalletLinkRevokeLink represents a RevokeLink event raised by the GoerliTownsWalletLink contract.
type GoerliTownsWalletLinkRevokeLink struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRevokeLink is a free log retrieval operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) FilterRevokeLink(opts *bind.FilterOpts) (*GoerliTownsWalletLinkRevokeLinkIterator, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.FilterLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsWalletLinkRevokeLinkIterator{contract: _GoerliTownsWalletLink.contract, event: "RevokeLink", logs: logs, sub: sub}, nil
}

// WatchRevokeLink is a free log subscription operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) WatchRevokeLink(opts *bind.WatchOpts, sink chan<- *GoerliTownsWalletLinkRevokeLink) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsWalletLink.contract.WatchLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsWalletLinkRevokeLink)
				if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
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

// ParseRevokeLink is a log parse operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_GoerliTownsWalletLink *GoerliTownsWalletLinkFilterer) ParseRevokeLink(log types.Log) (*GoerliTownsWalletLinkRevokeLink, error) {
	event := new(GoerliTownsWalletLinkRevokeLink)
	if err := _GoerliTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
