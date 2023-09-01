// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sepolia_towns_wallet_link

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

// SepoliaTownsWalletLinkMetaData contains all meta data concerning the SepoliaTownsWalletLink contract.
var SepoliaTownsWalletLinkMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"LinkAlreadyExists\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"LinkForAll\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"RevokeAllLinks\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"RevokeLink\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__WalletLink_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"checkLinkForAll\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"getLinksByRootKey\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"internalType\":\"structIWalletLinkBase.WalletLinkInfo[]\",\"name\":\"info\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"getLinksForAll\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"delegates\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"linkForAll\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"revokeAllLinks\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"revokeLink\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// SepoliaTownsWalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use SepoliaTownsWalletLinkMetaData.ABI instead.
var SepoliaTownsWalletLinkABI = SepoliaTownsWalletLinkMetaData.ABI

// SepoliaTownsWalletLink is an auto generated Go binding around an Ethereum contract.
type SepoliaTownsWalletLink struct {
	SepoliaTownsWalletLinkCaller     // Read-only binding to the contract
	SepoliaTownsWalletLinkTransactor // Write-only binding to the contract
	SepoliaTownsWalletLinkFilterer   // Log filterer for contract events
}

// SepoliaTownsWalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type SepoliaTownsWalletLinkCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsWalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SepoliaTownsWalletLinkTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsWalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SepoliaTownsWalletLinkFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsWalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SepoliaTownsWalletLinkSession struct {
	Contract     *SepoliaTownsWalletLink // Generic contract binding to set the session for
	CallOpts     bind.CallOpts           // Call options to use throughout this session
	TransactOpts bind.TransactOpts       // Transaction auth options to use throughout this session
}

// SepoliaTownsWalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SepoliaTownsWalletLinkCallerSession struct {
	Contract *SepoliaTownsWalletLinkCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                 // Call options to use throughout this session
}

// SepoliaTownsWalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SepoliaTownsWalletLinkTransactorSession struct {
	Contract     *SepoliaTownsWalletLinkTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                 // Transaction auth options to use throughout this session
}

// SepoliaTownsWalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type SepoliaTownsWalletLinkRaw struct {
	Contract *SepoliaTownsWalletLink // Generic contract binding to access the raw methods on
}

// SepoliaTownsWalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SepoliaTownsWalletLinkCallerRaw struct {
	Contract *SepoliaTownsWalletLinkCaller // Generic read-only contract binding to access the raw methods on
}

// SepoliaTownsWalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SepoliaTownsWalletLinkTransactorRaw struct {
	Contract *SepoliaTownsWalletLinkTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSepoliaTownsWalletLink creates a new instance of SepoliaTownsWalletLink, bound to a specific deployed contract.
func NewSepoliaTownsWalletLink(address common.Address, backend bind.ContractBackend) (*SepoliaTownsWalletLink, error) {
	contract, err := bindSepoliaTownsWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLink{SepoliaTownsWalletLinkCaller: SepoliaTownsWalletLinkCaller{contract: contract}, SepoliaTownsWalletLinkTransactor: SepoliaTownsWalletLinkTransactor{contract: contract}, SepoliaTownsWalletLinkFilterer: SepoliaTownsWalletLinkFilterer{contract: contract}}, nil
}

// NewSepoliaTownsWalletLinkCaller creates a new read-only instance of SepoliaTownsWalletLink, bound to a specific deployed contract.
func NewSepoliaTownsWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*SepoliaTownsWalletLinkCaller, error) {
	contract, err := bindSepoliaTownsWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkCaller{contract: contract}, nil
}

// NewSepoliaTownsWalletLinkTransactor creates a new write-only instance of SepoliaTownsWalletLink, bound to a specific deployed contract.
func NewSepoliaTownsWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*SepoliaTownsWalletLinkTransactor, error) {
	contract, err := bindSepoliaTownsWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkTransactor{contract: contract}, nil
}

// NewSepoliaTownsWalletLinkFilterer creates a new log filterer instance of SepoliaTownsWalletLink, bound to a specific deployed contract.
func NewSepoliaTownsWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*SepoliaTownsWalletLinkFilterer, error) {
	contract, err := bindSepoliaTownsWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkFilterer{contract: contract}, nil
}

// bindSepoliaTownsWalletLink binds a generic wrapper to an already deployed contract.
func bindSepoliaTownsWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := SepoliaTownsWalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsWalletLink.Contract.SepoliaTownsWalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.SepoliaTownsWalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.SepoliaTownsWalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsWalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkCaller) CheckLinkForAll(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _SepoliaTownsWalletLink.contract.Call(opts, &out, "checkLinkForAll", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _SepoliaTownsWalletLink.Contract.CheckLinkForAll(&_SepoliaTownsWalletLink.CallOpts, rootKey, wallet)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkCallerSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _SepoliaTownsWalletLink.Contract.CheckLinkForAll(&_SepoliaTownsWalletLink.CallOpts, rootKey, wallet)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkCaller) GetLinksByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	var out []interface{}
	err := _SepoliaTownsWalletLink.contract.Call(opts, &out, "getLinksByRootKey", rootKey)

	if err != nil {
		return *new([]IWalletLinkBaseWalletLinkInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IWalletLinkBaseWalletLinkInfo)).(*[]IWalletLinkBaseWalletLinkInfo)

	return out0, err

}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _SepoliaTownsWalletLink.Contract.GetLinksByRootKey(&_SepoliaTownsWalletLink.CallOpts, rootKey)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkCallerSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _SepoliaTownsWalletLink.Contract.GetLinksByRootKey(&_SepoliaTownsWalletLink.CallOpts, rootKey)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkCaller) GetLinksForAll(opts *bind.CallOpts, wallet common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _SepoliaTownsWalletLink.contract.Call(opts, &out, "getLinksForAll", wallet)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _SepoliaTownsWalletLink.Contract.GetLinksForAll(&_SepoliaTownsWalletLink.CallOpts, wallet)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkCallerSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _SepoliaTownsWalletLink.Contract.GetLinksForAll(&_SepoliaTownsWalletLink.CallOpts, wallet)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactor) WalletLinkInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.contract.Transact(opts, "__WalletLink_init")
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkSession) WalletLinkInit() (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.WalletLinkInit(&_SepoliaTownsWalletLink.TransactOpts)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactorSession) WalletLinkInit() (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.WalletLinkInit(&_SepoliaTownsWalletLink.TransactOpts)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactor) LinkForAll(opts *bind.TransactOpts, rootKey common.Address, value bool) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.contract.Transact(opts, "linkForAll", rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.LinkForAll(&_SepoliaTownsWalletLink.TransactOpts, rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactorSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.LinkForAll(&_SepoliaTownsWalletLink.TransactOpts, rootKey, value)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactor) RevokeAllLinks(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.contract.Transact(opts, "revokeAllLinks")
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkSession) RevokeAllLinks() (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.RevokeAllLinks(&_SepoliaTownsWalletLink.TransactOpts)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactorSession) RevokeAllLinks() (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.RevokeAllLinks(&_SepoliaTownsWalletLink.TransactOpts)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactor) RevokeLink(opts *bind.TransactOpts, rootKey common.Address) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.contract.Transact(opts, "revokeLink", rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.RevokeLink(&_SepoliaTownsWalletLink.TransactOpts, rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkTransactorSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _SepoliaTownsWalletLink.Contract.RevokeLink(&_SepoliaTownsWalletLink.TransactOpts, rootKey)
}

// SepoliaTownsWalletLinkInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkInitializedIterator struct {
	Event *SepoliaTownsWalletLinkInitialized // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsWalletLinkInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsWalletLinkInitialized)
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
		it.Event = new(SepoliaTownsWalletLinkInitialized)
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
func (it *SepoliaTownsWalletLinkInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsWalletLinkInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsWalletLinkInitialized represents a Initialized event raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) FilterInitialized(opts *bind.FilterOpts) (*SepoliaTownsWalletLinkInitializedIterator, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkInitializedIterator{contract: _SepoliaTownsWalletLink.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *SepoliaTownsWalletLinkInitialized) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsWalletLinkInitialized)
				if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) ParseInitialized(log types.Log) (*SepoliaTownsWalletLinkInitialized, error) {
	event := new(SepoliaTownsWalletLinkInitialized)
	if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsWalletLinkInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkInterfaceAddedIterator struct {
	Event *SepoliaTownsWalletLinkInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsWalletLinkInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsWalletLinkInterfaceAdded)
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
		it.Event = new(SepoliaTownsWalletLinkInterfaceAdded)
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
func (it *SepoliaTownsWalletLinkInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsWalletLinkInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsWalletLinkInterfaceAdded represents a InterfaceAdded event raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*SepoliaTownsWalletLinkInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsWalletLink.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkInterfaceAddedIterator{contract: _SepoliaTownsWalletLink.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *SepoliaTownsWalletLinkInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsWalletLink.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsWalletLinkInterfaceAdded)
				if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) ParseInterfaceAdded(log types.Log) (*SepoliaTownsWalletLinkInterfaceAdded, error) {
	event := new(SepoliaTownsWalletLinkInterfaceAdded)
	if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsWalletLinkInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkInterfaceRemovedIterator struct {
	Event *SepoliaTownsWalletLinkInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsWalletLinkInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsWalletLinkInterfaceRemoved)
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
		it.Event = new(SepoliaTownsWalletLinkInterfaceRemoved)
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
func (it *SepoliaTownsWalletLinkInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsWalletLinkInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsWalletLinkInterfaceRemoved represents a InterfaceRemoved event raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*SepoliaTownsWalletLinkInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsWalletLink.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkInterfaceRemovedIterator{contract: _SepoliaTownsWalletLink.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *SepoliaTownsWalletLinkInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsWalletLink.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsWalletLinkInterfaceRemoved)
				if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) ParseInterfaceRemoved(log types.Log) (*SepoliaTownsWalletLinkInterfaceRemoved, error) {
	event := new(SepoliaTownsWalletLinkInterfaceRemoved)
	if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsWalletLinkLinkForAllIterator is returned from FilterLinkForAll and is used to iterate over the raw logs and unpacked data for LinkForAll events raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkLinkForAllIterator struct {
	Event *SepoliaTownsWalletLinkLinkForAll // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsWalletLinkLinkForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsWalletLinkLinkForAll)
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
		it.Event = new(SepoliaTownsWalletLinkLinkForAll)
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
func (it *SepoliaTownsWalletLinkLinkForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsWalletLinkLinkForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsWalletLinkLinkForAll represents a LinkForAll event raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkLinkForAll struct {
	Wallet  common.Address
	RootKey common.Address
	Value   bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterLinkForAll is a free log retrieval operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) FilterLinkForAll(opts *bind.FilterOpts) (*SepoliaTownsWalletLinkLinkForAllIterator, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.FilterLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkLinkForAllIterator{contract: _SepoliaTownsWalletLink.contract, event: "LinkForAll", logs: logs, sub: sub}, nil
}

// WatchLinkForAll is a free log subscription operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) WatchLinkForAll(opts *bind.WatchOpts, sink chan<- *SepoliaTownsWalletLinkLinkForAll) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.WatchLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsWalletLinkLinkForAll)
				if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
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
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) ParseLinkForAll(log types.Log) (*SepoliaTownsWalletLinkLinkForAll, error) {
	event := new(SepoliaTownsWalletLinkLinkForAll)
	if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsWalletLinkRevokeAllLinksIterator is returned from FilterRevokeAllLinks and is used to iterate over the raw logs and unpacked data for RevokeAllLinks events raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkRevokeAllLinksIterator struct {
	Event *SepoliaTownsWalletLinkRevokeAllLinks // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsWalletLinkRevokeAllLinksIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsWalletLinkRevokeAllLinks)
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
		it.Event = new(SepoliaTownsWalletLinkRevokeAllLinks)
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
func (it *SepoliaTownsWalletLinkRevokeAllLinksIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsWalletLinkRevokeAllLinksIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsWalletLinkRevokeAllLinks represents a RevokeAllLinks event raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkRevokeAllLinks struct {
	Wallet common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterRevokeAllLinks is a free log retrieval operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) FilterRevokeAllLinks(opts *bind.FilterOpts) (*SepoliaTownsWalletLinkRevokeAllLinksIterator, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.FilterLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkRevokeAllLinksIterator{contract: _SepoliaTownsWalletLink.contract, event: "RevokeAllLinks", logs: logs, sub: sub}, nil
}

// WatchRevokeAllLinks is a free log subscription operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) WatchRevokeAllLinks(opts *bind.WatchOpts, sink chan<- *SepoliaTownsWalletLinkRevokeAllLinks) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.WatchLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsWalletLinkRevokeAllLinks)
				if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
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
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) ParseRevokeAllLinks(log types.Log) (*SepoliaTownsWalletLinkRevokeAllLinks, error) {
	event := new(SepoliaTownsWalletLinkRevokeAllLinks)
	if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsWalletLinkRevokeLinkIterator is returned from FilterRevokeLink and is used to iterate over the raw logs and unpacked data for RevokeLink events raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkRevokeLinkIterator struct {
	Event *SepoliaTownsWalletLinkRevokeLink // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsWalletLinkRevokeLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsWalletLinkRevokeLink)
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
		it.Event = new(SepoliaTownsWalletLinkRevokeLink)
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
func (it *SepoliaTownsWalletLinkRevokeLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsWalletLinkRevokeLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsWalletLinkRevokeLink represents a RevokeLink event raised by the SepoliaTownsWalletLink contract.
type SepoliaTownsWalletLinkRevokeLink struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRevokeLink is a free log retrieval operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) FilterRevokeLink(opts *bind.FilterOpts) (*SepoliaTownsWalletLinkRevokeLinkIterator, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.FilterLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsWalletLinkRevokeLinkIterator{contract: _SepoliaTownsWalletLink.contract, event: "RevokeLink", logs: logs, sub: sub}, nil
}

// WatchRevokeLink is a free log subscription operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) WatchRevokeLink(opts *bind.WatchOpts, sink chan<- *SepoliaTownsWalletLinkRevokeLink) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsWalletLink.contract.WatchLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsWalletLinkRevokeLink)
				if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
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
func (_SepoliaTownsWalletLink *SepoliaTownsWalletLinkFilterer) ParseRevokeLink(log types.Log) (*SepoliaTownsWalletLinkRevokeLink, error) {
	event := new(SepoliaTownsWalletLinkRevokeLink)
	if err := _SepoliaTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
