// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_towns_wallet_link

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

// LocalhostTownsWalletLinkMetaData contains all meta data concerning the LocalhostTownsWalletLink contract.
var LocalhostTownsWalletLinkMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"LinkAlreadyExists\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"LinkForAll\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"RevokeAllLinks\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"RevokeLink\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__WalletLink_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"checkLinkForAll\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"getLinksByRootKey\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"internalType\":\"structIWalletLinkBase.WalletLinkInfo[]\",\"name\":\"info\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"getLinksForAll\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"delegates\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"linkForAll\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"revokeAllLinks\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"revokeLink\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// LocalhostTownsWalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostTownsWalletLinkMetaData.ABI instead.
var LocalhostTownsWalletLinkABI = LocalhostTownsWalletLinkMetaData.ABI

// LocalhostTownsWalletLink is an auto generated Go binding around an Ethereum contract.
type LocalhostTownsWalletLink struct {
	LocalhostTownsWalletLinkCaller     // Read-only binding to the contract
	LocalhostTownsWalletLinkTransactor // Write-only binding to the contract
	LocalhostTownsWalletLinkFilterer   // Log filterer for contract events
}

// LocalhostTownsWalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostTownsWalletLinkCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsWalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostTownsWalletLinkTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsWalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostTownsWalletLinkFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsWalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostTownsWalletLinkSession struct {
	Contract     *LocalhostTownsWalletLink // Generic contract binding to set the session for
	CallOpts     bind.CallOpts             // Call options to use throughout this session
	TransactOpts bind.TransactOpts         // Transaction auth options to use throughout this session
}

// LocalhostTownsWalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostTownsWalletLinkCallerSession struct {
	Contract *LocalhostTownsWalletLinkCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                   // Call options to use throughout this session
}

// LocalhostTownsWalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostTownsWalletLinkTransactorSession struct {
	Contract     *LocalhostTownsWalletLinkTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                   // Transaction auth options to use throughout this session
}

// LocalhostTownsWalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostTownsWalletLinkRaw struct {
	Contract *LocalhostTownsWalletLink // Generic contract binding to access the raw methods on
}

// LocalhostTownsWalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostTownsWalletLinkCallerRaw struct {
	Contract *LocalhostTownsWalletLinkCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostTownsWalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostTownsWalletLinkTransactorRaw struct {
	Contract *LocalhostTownsWalletLinkTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostTownsWalletLink creates a new instance of LocalhostTownsWalletLink, bound to a specific deployed contract.
func NewLocalhostTownsWalletLink(address common.Address, backend bind.ContractBackend) (*LocalhostTownsWalletLink, error) {
	contract, err := bindLocalhostTownsWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLink{LocalhostTownsWalletLinkCaller: LocalhostTownsWalletLinkCaller{contract: contract}, LocalhostTownsWalletLinkTransactor: LocalhostTownsWalletLinkTransactor{contract: contract}, LocalhostTownsWalletLinkFilterer: LocalhostTownsWalletLinkFilterer{contract: contract}}, nil
}

// NewLocalhostTownsWalletLinkCaller creates a new read-only instance of LocalhostTownsWalletLink, bound to a specific deployed contract.
func NewLocalhostTownsWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*LocalhostTownsWalletLinkCaller, error) {
	contract, err := bindLocalhostTownsWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkCaller{contract: contract}, nil
}

// NewLocalhostTownsWalletLinkTransactor creates a new write-only instance of LocalhostTownsWalletLink, bound to a specific deployed contract.
func NewLocalhostTownsWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostTownsWalletLinkTransactor, error) {
	contract, err := bindLocalhostTownsWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkTransactor{contract: contract}, nil
}

// NewLocalhostTownsWalletLinkFilterer creates a new log filterer instance of LocalhostTownsWalletLink, bound to a specific deployed contract.
func NewLocalhostTownsWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostTownsWalletLinkFilterer, error) {
	contract, err := bindLocalhostTownsWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkFilterer{contract: contract}, nil
}

// bindLocalhostTownsWalletLink binds a generic wrapper to an already deployed contract.
func bindLocalhostTownsWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LocalhostTownsWalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsWalletLink.Contract.LocalhostTownsWalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.LocalhostTownsWalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.LocalhostTownsWalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsWalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkCaller) CheckLinkForAll(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _LocalhostTownsWalletLink.contract.Call(opts, &out, "checkLinkForAll", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _LocalhostTownsWalletLink.Contract.CheckLinkForAll(&_LocalhostTownsWalletLink.CallOpts, rootKey, wallet)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkCallerSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _LocalhostTownsWalletLink.Contract.CheckLinkForAll(&_LocalhostTownsWalletLink.CallOpts, rootKey, wallet)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkCaller) GetLinksByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	var out []interface{}
	err := _LocalhostTownsWalletLink.contract.Call(opts, &out, "getLinksByRootKey", rootKey)

	if err != nil {
		return *new([]IWalletLinkBaseWalletLinkInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IWalletLinkBaseWalletLinkInfo)).(*[]IWalletLinkBaseWalletLinkInfo)

	return out0, err

}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _LocalhostTownsWalletLink.Contract.GetLinksByRootKey(&_LocalhostTownsWalletLink.CallOpts, rootKey)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkCallerSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _LocalhostTownsWalletLink.Contract.GetLinksByRootKey(&_LocalhostTownsWalletLink.CallOpts, rootKey)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkCaller) GetLinksForAll(opts *bind.CallOpts, wallet common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _LocalhostTownsWalletLink.contract.Call(opts, &out, "getLinksForAll", wallet)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _LocalhostTownsWalletLink.Contract.GetLinksForAll(&_LocalhostTownsWalletLink.CallOpts, wallet)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkCallerSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _LocalhostTownsWalletLink.Contract.GetLinksForAll(&_LocalhostTownsWalletLink.CallOpts, wallet)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactor) WalletLinkInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.contract.Transact(opts, "__WalletLink_init")
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkSession) WalletLinkInit() (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.WalletLinkInit(&_LocalhostTownsWalletLink.TransactOpts)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactorSession) WalletLinkInit() (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.WalletLinkInit(&_LocalhostTownsWalletLink.TransactOpts)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactor) LinkForAll(opts *bind.TransactOpts, rootKey common.Address, value bool) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.contract.Transact(opts, "linkForAll", rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.LinkForAll(&_LocalhostTownsWalletLink.TransactOpts, rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactorSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.LinkForAll(&_LocalhostTownsWalletLink.TransactOpts, rootKey, value)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactor) RevokeAllLinks(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.contract.Transact(opts, "revokeAllLinks")
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkSession) RevokeAllLinks() (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.RevokeAllLinks(&_LocalhostTownsWalletLink.TransactOpts)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactorSession) RevokeAllLinks() (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.RevokeAllLinks(&_LocalhostTownsWalletLink.TransactOpts)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactor) RevokeLink(opts *bind.TransactOpts, rootKey common.Address) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.contract.Transact(opts, "revokeLink", rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.RevokeLink(&_LocalhostTownsWalletLink.TransactOpts, rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkTransactorSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _LocalhostTownsWalletLink.Contract.RevokeLink(&_LocalhostTownsWalletLink.TransactOpts, rootKey)
}

// LocalhostTownsWalletLinkInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkInitializedIterator struct {
	Event *LocalhostTownsWalletLinkInitialized // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsWalletLinkInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsWalletLinkInitialized)
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
		it.Event = new(LocalhostTownsWalletLinkInitialized)
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
func (it *LocalhostTownsWalletLinkInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsWalletLinkInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsWalletLinkInitialized represents a Initialized event raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) FilterInitialized(opts *bind.FilterOpts) (*LocalhostTownsWalletLinkInitializedIterator, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkInitializedIterator{contract: _LocalhostTownsWalletLink.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *LocalhostTownsWalletLinkInitialized) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsWalletLinkInitialized)
				if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) ParseInitialized(log types.Log) (*LocalhostTownsWalletLinkInitialized, error) {
	event := new(LocalhostTownsWalletLinkInitialized)
	if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsWalletLinkInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkInterfaceAddedIterator struct {
	Event *LocalhostTownsWalletLinkInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsWalletLinkInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsWalletLinkInterfaceAdded)
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
		it.Event = new(LocalhostTownsWalletLinkInterfaceAdded)
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
func (it *LocalhostTownsWalletLinkInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsWalletLinkInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsWalletLinkInterfaceAdded represents a InterfaceAdded event raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*LocalhostTownsWalletLinkInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsWalletLink.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkInterfaceAddedIterator{contract: _LocalhostTownsWalletLink.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *LocalhostTownsWalletLinkInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsWalletLink.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsWalletLinkInterfaceAdded)
				if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) ParseInterfaceAdded(log types.Log) (*LocalhostTownsWalletLinkInterfaceAdded, error) {
	event := new(LocalhostTownsWalletLinkInterfaceAdded)
	if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsWalletLinkInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkInterfaceRemovedIterator struct {
	Event *LocalhostTownsWalletLinkInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsWalletLinkInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsWalletLinkInterfaceRemoved)
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
		it.Event = new(LocalhostTownsWalletLinkInterfaceRemoved)
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
func (it *LocalhostTownsWalletLinkInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsWalletLinkInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsWalletLinkInterfaceRemoved represents a InterfaceRemoved event raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*LocalhostTownsWalletLinkInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsWalletLink.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkInterfaceRemovedIterator{contract: _LocalhostTownsWalletLink.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *LocalhostTownsWalletLinkInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsWalletLink.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsWalletLinkInterfaceRemoved)
				if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) ParseInterfaceRemoved(log types.Log) (*LocalhostTownsWalletLinkInterfaceRemoved, error) {
	event := new(LocalhostTownsWalletLinkInterfaceRemoved)
	if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsWalletLinkLinkForAllIterator is returned from FilterLinkForAll and is used to iterate over the raw logs and unpacked data for LinkForAll events raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkLinkForAllIterator struct {
	Event *LocalhostTownsWalletLinkLinkForAll // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsWalletLinkLinkForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsWalletLinkLinkForAll)
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
		it.Event = new(LocalhostTownsWalletLinkLinkForAll)
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
func (it *LocalhostTownsWalletLinkLinkForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsWalletLinkLinkForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsWalletLinkLinkForAll represents a LinkForAll event raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkLinkForAll struct {
	Wallet  common.Address
	RootKey common.Address
	Value   bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterLinkForAll is a free log retrieval operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) FilterLinkForAll(opts *bind.FilterOpts) (*LocalhostTownsWalletLinkLinkForAllIterator, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.FilterLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkLinkForAllIterator{contract: _LocalhostTownsWalletLink.contract, event: "LinkForAll", logs: logs, sub: sub}, nil
}

// WatchLinkForAll is a free log subscription operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) WatchLinkForAll(opts *bind.WatchOpts, sink chan<- *LocalhostTownsWalletLinkLinkForAll) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.WatchLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsWalletLinkLinkForAll)
				if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
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
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) ParseLinkForAll(log types.Log) (*LocalhostTownsWalletLinkLinkForAll, error) {
	event := new(LocalhostTownsWalletLinkLinkForAll)
	if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsWalletLinkRevokeAllLinksIterator is returned from FilterRevokeAllLinks and is used to iterate over the raw logs and unpacked data for RevokeAllLinks events raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkRevokeAllLinksIterator struct {
	Event *LocalhostTownsWalletLinkRevokeAllLinks // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsWalletLinkRevokeAllLinksIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsWalletLinkRevokeAllLinks)
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
		it.Event = new(LocalhostTownsWalletLinkRevokeAllLinks)
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
func (it *LocalhostTownsWalletLinkRevokeAllLinksIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsWalletLinkRevokeAllLinksIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsWalletLinkRevokeAllLinks represents a RevokeAllLinks event raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkRevokeAllLinks struct {
	Wallet common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterRevokeAllLinks is a free log retrieval operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) FilterRevokeAllLinks(opts *bind.FilterOpts) (*LocalhostTownsWalletLinkRevokeAllLinksIterator, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.FilterLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkRevokeAllLinksIterator{contract: _LocalhostTownsWalletLink.contract, event: "RevokeAllLinks", logs: logs, sub: sub}, nil
}

// WatchRevokeAllLinks is a free log subscription operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) WatchRevokeAllLinks(opts *bind.WatchOpts, sink chan<- *LocalhostTownsWalletLinkRevokeAllLinks) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.WatchLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsWalletLinkRevokeAllLinks)
				if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
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
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) ParseRevokeAllLinks(log types.Log) (*LocalhostTownsWalletLinkRevokeAllLinks, error) {
	event := new(LocalhostTownsWalletLinkRevokeAllLinks)
	if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsWalletLinkRevokeLinkIterator is returned from FilterRevokeLink and is used to iterate over the raw logs and unpacked data for RevokeLink events raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkRevokeLinkIterator struct {
	Event *LocalhostTownsWalletLinkRevokeLink // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsWalletLinkRevokeLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsWalletLinkRevokeLink)
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
		it.Event = new(LocalhostTownsWalletLinkRevokeLink)
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
func (it *LocalhostTownsWalletLinkRevokeLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsWalletLinkRevokeLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsWalletLinkRevokeLink represents a RevokeLink event raised by the LocalhostTownsWalletLink contract.
type LocalhostTownsWalletLinkRevokeLink struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRevokeLink is a free log retrieval operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) FilterRevokeLink(opts *bind.FilterOpts) (*LocalhostTownsWalletLinkRevokeLinkIterator, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.FilterLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsWalletLinkRevokeLinkIterator{contract: _LocalhostTownsWalletLink.contract, event: "RevokeLink", logs: logs, sub: sub}, nil
}

// WatchRevokeLink is a free log subscription operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) WatchRevokeLink(opts *bind.WatchOpts, sink chan<- *LocalhostTownsWalletLinkRevokeLink) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsWalletLink.contract.WatchLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsWalletLinkRevokeLink)
				if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
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
func (_LocalhostTownsWalletLink *LocalhostTownsWalletLinkFilterer) ParseRevokeLink(log types.Log) (*LocalhostTownsWalletLinkRevokeLink, error) {
	event := new(LocalhostTownsWalletLinkRevokeLink)
	if err := _LocalhostTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
