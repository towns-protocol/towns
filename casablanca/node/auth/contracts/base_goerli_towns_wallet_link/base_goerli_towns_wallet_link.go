// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_goerli_towns_wallet_link

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

// BaseGoerliTownsWalletLinkMetaData contains all meta data concerning the BaseGoerliTownsWalletLink contract.
var BaseGoerliTownsWalletLinkMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"LinkAlreadyExists\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"LinkForAll\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"RevokeAllLinks\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"RevokeLink\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__WalletLink_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"checkLinkForAll\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"getLinksByRootKey\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"internalType\":\"structIWalletLinkBase.WalletLinkInfo[]\",\"name\":\"info\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"getLinksForAll\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"delegates\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"value\",\"type\":\"bool\"}],\"name\":\"linkForAll\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"revokeAllLinks\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"revokeLink\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// BaseGoerliTownsWalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseGoerliTownsWalletLinkMetaData.ABI instead.
var BaseGoerliTownsWalletLinkABI = BaseGoerliTownsWalletLinkMetaData.ABI

// BaseGoerliTownsWalletLink is an auto generated Go binding around an Ethereum contract.
type BaseGoerliTownsWalletLink struct {
	BaseGoerliTownsWalletLinkCaller     // Read-only binding to the contract
	BaseGoerliTownsWalletLinkTransactor // Write-only binding to the contract
	BaseGoerliTownsWalletLinkFilterer   // Log filterer for contract events
}

// BaseGoerliTownsWalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseGoerliTownsWalletLinkCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsWalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseGoerliTownsWalletLinkTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsWalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseGoerliTownsWalletLinkFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsWalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseGoerliTownsWalletLinkSession struct {
	Contract     *BaseGoerliTownsWalletLink // Generic contract binding to set the session for
	CallOpts     bind.CallOpts              // Call options to use throughout this session
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// BaseGoerliTownsWalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseGoerliTownsWalletLinkCallerSession struct {
	Contract *BaseGoerliTownsWalletLinkCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                    // Call options to use throughout this session
}

// BaseGoerliTownsWalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseGoerliTownsWalletLinkTransactorSession struct {
	Contract     *BaseGoerliTownsWalletLinkTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                    // Transaction auth options to use throughout this session
}

// BaseGoerliTownsWalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseGoerliTownsWalletLinkRaw struct {
	Contract *BaseGoerliTownsWalletLink // Generic contract binding to access the raw methods on
}

// BaseGoerliTownsWalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseGoerliTownsWalletLinkCallerRaw struct {
	Contract *BaseGoerliTownsWalletLinkCaller // Generic read-only contract binding to access the raw methods on
}

// BaseGoerliTownsWalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseGoerliTownsWalletLinkTransactorRaw struct {
	Contract *BaseGoerliTownsWalletLinkTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseGoerliTownsWalletLink creates a new instance of BaseGoerliTownsWalletLink, bound to a specific deployed contract.
func NewBaseGoerliTownsWalletLink(address common.Address, backend bind.ContractBackend) (*BaseGoerliTownsWalletLink, error) {
	contract, err := bindBaseGoerliTownsWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLink{BaseGoerliTownsWalletLinkCaller: BaseGoerliTownsWalletLinkCaller{contract: contract}, BaseGoerliTownsWalletLinkTransactor: BaseGoerliTownsWalletLinkTransactor{contract: contract}, BaseGoerliTownsWalletLinkFilterer: BaseGoerliTownsWalletLinkFilterer{contract: contract}}, nil
}

// NewBaseGoerliTownsWalletLinkCaller creates a new read-only instance of BaseGoerliTownsWalletLink, bound to a specific deployed contract.
func NewBaseGoerliTownsWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*BaseGoerliTownsWalletLinkCaller, error) {
	contract, err := bindBaseGoerliTownsWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkCaller{contract: contract}, nil
}

// NewBaseGoerliTownsWalletLinkTransactor creates a new write-only instance of BaseGoerliTownsWalletLink, bound to a specific deployed contract.
func NewBaseGoerliTownsWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseGoerliTownsWalletLinkTransactor, error) {
	contract, err := bindBaseGoerliTownsWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkTransactor{contract: contract}, nil
}

// NewBaseGoerliTownsWalletLinkFilterer creates a new log filterer instance of BaseGoerliTownsWalletLink, bound to a specific deployed contract.
func NewBaseGoerliTownsWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseGoerliTownsWalletLinkFilterer, error) {
	contract, err := bindBaseGoerliTownsWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkFilterer{contract: contract}, nil
}

// bindBaseGoerliTownsWalletLink binds a generic wrapper to an already deployed contract.
func bindBaseGoerliTownsWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseGoerliTownsWalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsWalletLink.Contract.BaseGoerliTownsWalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.BaseGoerliTownsWalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.BaseGoerliTownsWalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsWalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkCaller) CheckLinkForAll(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _BaseGoerliTownsWalletLink.contract.Call(opts, &out, "checkLinkForAll", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _BaseGoerliTownsWalletLink.Contract.CheckLinkForAll(&_BaseGoerliTownsWalletLink.CallOpts, rootKey, wallet)
}

// CheckLinkForAll is a free data retrieval call binding the contract method 0x9c98ebaa.
//
// Solidity: function checkLinkForAll(address rootKey, address wallet) view returns(bool)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkCallerSession) CheckLinkForAll(rootKey common.Address, wallet common.Address) (bool, error) {
	return _BaseGoerliTownsWalletLink.Contract.CheckLinkForAll(&_BaseGoerliTownsWalletLink.CallOpts, rootKey, wallet)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkCaller) GetLinksByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	var out []interface{}
	err := _BaseGoerliTownsWalletLink.contract.Call(opts, &out, "getLinksByRootKey", rootKey)

	if err != nil {
		return *new([]IWalletLinkBaseWalletLinkInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IWalletLinkBaseWalletLinkInfo)).(*[]IWalletLinkBaseWalletLinkInfo)

	return out0, err

}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _BaseGoerliTownsWalletLink.Contract.GetLinksByRootKey(&_BaseGoerliTownsWalletLink.CallOpts, rootKey)
}

// GetLinksByRootKey is a free data retrieval call binding the contract method 0x9a655e36.
//
// Solidity: function getLinksByRootKey(address rootKey) view returns((address,address)[] info)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkCallerSession) GetLinksByRootKey(rootKey common.Address) ([]IWalletLinkBaseWalletLinkInfo, error) {
	return _BaseGoerliTownsWalletLink.Contract.GetLinksByRootKey(&_BaseGoerliTownsWalletLink.CallOpts, rootKey)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkCaller) GetLinksForAll(opts *bind.CallOpts, wallet common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _BaseGoerliTownsWalletLink.contract.Call(opts, &out, "getLinksForAll", wallet)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _BaseGoerliTownsWalletLink.Contract.GetLinksForAll(&_BaseGoerliTownsWalletLink.CallOpts, wallet)
}

// GetLinksForAll is a free data retrieval call binding the contract method 0x7d356ebe.
//
// Solidity: function getLinksForAll(address wallet) view returns(address[] delegates)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkCallerSession) GetLinksForAll(wallet common.Address) ([]common.Address, error) {
	return _BaseGoerliTownsWalletLink.Contract.GetLinksForAll(&_BaseGoerliTownsWalletLink.CallOpts, wallet)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactor) WalletLinkInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.contract.Transact(opts, "__WalletLink_init")
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkSession) WalletLinkInit() (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.WalletLinkInit(&_BaseGoerliTownsWalletLink.TransactOpts)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactorSession) WalletLinkInit() (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.WalletLinkInit(&_BaseGoerliTownsWalletLink.TransactOpts)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactor) LinkForAll(opts *bind.TransactOpts, rootKey common.Address, value bool) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.contract.Transact(opts, "linkForAll", rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.LinkForAll(&_BaseGoerliTownsWalletLink.TransactOpts, rootKey, value)
}

// LinkForAll is a paid mutator transaction binding the contract method 0x5ecfe20a.
//
// Solidity: function linkForAll(address rootKey, bool value) returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactorSession) LinkForAll(rootKey common.Address, value bool) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.LinkForAll(&_BaseGoerliTownsWalletLink.TransactOpts, rootKey, value)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactor) RevokeAllLinks(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.contract.Transact(opts, "revokeAllLinks")
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkSession) RevokeAllLinks() (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.RevokeAllLinks(&_BaseGoerliTownsWalletLink.TransactOpts)
}

// RevokeAllLinks is a paid mutator transaction binding the contract method 0xb413b6c2.
//
// Solidity: function revokeAllLinks() returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactorSession) RevokeAllLinks() (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.RevokeAllLinks(&_BaseGoerliTownsWalletLink.TransactOpts)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactor) RevokeLink(opts *bind.TransactOpts, rootKey common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.contract.Transact(opts, "revokeLink", rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.RevokeLink(&_BaseGoerliTownsWalletLink.TransactOpts, rootKey)
}

// RevokeLink is a paid mutator transaction binding the contract method 0x9142db42.
//
// Solidity: function revokeLink(address rootKey) returns()
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkTransactorSession) RevokeLink(rootKey common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsWalletLink.Contract.RevokeLink(&_BaseGoerliTownsWalletLink.TransactOpts, rootKey)
}

// BaseGoerliTownsWalletLinkInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkInitializedIterator struct {
	Event *BaseGoerliTownsWalletLinkInitialized // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsWalletLinkInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsWalletLinkInitialized)
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
		it.Event = new(BaseGoerliTownsWalletLinkInitialized)
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
func (it *BaseGoerliTownsWalletLinkInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsWalletLinkInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsWalletLinkInitialized represents a Initialized event raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) FilterInitialized(opts *bind.FilterOpts) (*BaseGoerliTownsWalletLinkInitializedIterator, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkInitializedIterator{contract: _BaseGoerliTownsWalletLink.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsWalletLinkInitialized) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsWalletLinkInitialized)
				if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) ParseInitialized(log types.Log) (*BaseGoerliTownsWalletLinkInitialized, error) {
	event := new(BaseGoerliTownsWalletLinkInitialized)
	if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsWalletLinkInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkInterfaceAddedIterator struct {
	Event *BaseGoerliTownsWalletLinkInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsWalletLinkInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsWalletLinkInterfaceAdded)
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
		it.Event = new(BaseGoerliTownsWalletLinkInterfaceAdded)
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
func (it *BaseGoerliTownsWalletLinkInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsWalletLinkInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsWalletLinkInterfaceAdded represents a InterfaceAdded event raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseGoerliTownsWalletLinkInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkInterfaceAddedIterator{contract: _BaseGoerliTownsWalletLink.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsWalletLinkInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsWalletLinkInterfaceAdded)
				if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) ParseInterfaceAdded(log types.Log) (*BaseGoerliTownsWalletLinkInterfaceAdded, error) {
	event := new(BaseGoerliTownsWalletLinkInterfaceAdded)
	if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsWalletLinkInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkInterfaceRemovedIterator struct {
	Event *BaseGoerliTownsWalletLinkInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsWalletLinkInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsWalletLinkInterfaceRemoved)
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
		it.Event = new(BaseGoerliTownsWalletLinkInterfaceRemoved)
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
func (it *BaseGoerliTownsWalletLinkInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsWalletLinkInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsWalletLinkInterfaceRemoved represents a InterfaceRemoved event raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseGoerliTownsWalletLinkInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkInterfaceRemovedIterator{contract: _BaseGoerliTownsWalletLink.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsWalletLinkInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsWalletLinkInterfaceRemoved)
				if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) ParseInterfaceRemoved(log types.Log) (*BaseGoerliTownsWalletLinkInterfaceRemoved, error) {
	event := new(BaseGoerliTownsWalletLinkInterfaceRemoved)
	if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsWalletLinkLinkForAllIterator is returned from FilterLinkForAll and is used to iterate over the raw logs and unpacked data for LinkForAll events raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkLinkForAllIterator struct {
	Event *BaseGoerliTownsWalletLinkLinkForAll // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsWalletLinkLinkForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsWalletLinkLinkForAll)
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
		it.Event = new(BaseGoerliTownsWalletLinkLinkForAll)
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
func (it *BaseGoerliTownsWalletLinkLinkForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsWalletLinkLinkForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsWalletLinkLinkForAll represents a LinkForAll event raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkLinkForAll struct {
	Wallet  common.Address
	RootKey common.Address
	Value   bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterLinkForAll is a free log retrieval operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) FilterLinkForAll(opts *bind.FilterOpts) (*BaseGoerliTownsWalletLinkLinkForAllIterator, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.FilterLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkLinkForAllIterator{contract: _BaseGoerliTownsWalletLink.contract, event: "LinkForAll", logs: logs, sub: sub}, nil
}

// WatchLinkForAll is a free log subscription operation binding the contract event 0x19338ec7833bee94071505c42f7e149ab49101f6823f3d61edebe6f0475f3f3a.
//
// Solidity: event LinkForAll(address wallet, address rootKey, bool value)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) WatchLinkForAll(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsWalletLinkLinkForAll) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.WatchLogs(opts, "LinkForAll")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsWalletLinkLinkForAll)
				if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
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
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) ParseLinkForAll(log types.Log) (*BaseGoerliTownsWalletLinkLinkForAll, error) {
	event := new(BaseGoerliTownsWalletLinkLinkForAll)
	if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "LinkForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsWalletLinkRevokeAllLinksIterator is returned from FilterRevokeAllLinks and is used to iterate over the raw logs and unpacked data for RevokeAllLinks events raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkRevokeAllLinksIterator struct {
	Event *BaseGoerliTownsWalletLinkRevokeAllLinks // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsWalletLinkRevokeAllLinksIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsWalletLinkRevokeAllLinks)
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
		it.Event = new(BaseGoerliTownsWalletLinkRevokeAllLinks)
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
func (it *BaseGoerliTownsWalletLinkRevokeAllLinksIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsWalletLinkRevokeAllLinksIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsWalletLinkRevokeAllLinks represents a RevokeAllLinks event raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkRevokeAllLinks struct {
	Wallet common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterRevokeAllLinks is a free log retrieval operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) FilterRevokeAllLinks(opts *bind.FilterOpts) (*BaseGoerliTownsWalletLinkRevokeAllLinksIterator, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.FilterLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkRevokeAllLinksIterator{contract: _BaseGoerliTownsWalletLink.contract, event: "RevokeAllLinks", logs: logs, sub: sub}, nil
}

// WatchRevokeAllLinks is a free log subscription operation binding the contract event 0x98b27b66d66b2663d79295f5a0c1a115f50a8037c7b82724ca4f9820191ad1ad.
//
// Solidity: event RevokeAllLinks(address wallet)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) WatchRevokeAllLinks(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsWalletLinkRevokeAllLinks) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.WatchLogs(opts, "RevokeAllLinks")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsWalletLinkRevokeAllLinks)
				if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
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
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) ParseRevokeAllLinks(log types.Log) (*BaseGoerliTownsWalletLinkRevokeAllLinks, error) {
	event := new(BaseGoerliTownsWalletLinkRevokeAllLinks)
	if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "RevokeAllLinks", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsWalletLinkRevokeLinkIterator is returned from FilterRevokeLink and is used to iterate over the raw logs and unpacked data for RevokeLink events raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkRevokeLinkIterator struct {
	Event *BaseGoerliTownsWalletLinkRevokeLink // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsWalletLinkRevokeLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsWalletLinkRevokeLink)
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
		it.Event = new(BaseGoerliTownsWalletLinkRevokeLink)
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
func (it *BaseGoerliTownsWalletLinkRevokeLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsWalletLinkRevokeLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsWalletLinkRevokeLink represents a RevokeLink event raised by the BaseGoerliTownsWalletLink contract.
type BaseGoerliTownsWalletLinkRevokeLink struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRevokeLink is a free log retrieval operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) FilterRevokeLink(opts *bind.FilterOpts) (*BaseGoerliTownsWalletLinkRevokeLinkIterator, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.FilterLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsWalletLinkRevokeLinkIterator{contract: _BaseGoerliTownsWalletLink.contract, event: "RevokeLink", logs: logs, sub: sub}, nil
}

// WatchRevokeLink is a free log subscription operation binding the contract event 0x5668f3a068799c9d2d1e077d9a3977df97342be1ed4a9e7df820cc6735282848.
//
// Solidity: event RevokeLink(address wallet, address rootKey)
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) WatchRevokeLink(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsWalletLinkRevokeLink) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsWalletLink.contract.WatchLogs(opts, "RevokeLink")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsWalletLinkRevokeLink)
				if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
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
func (_BaseGoerliTownsWalletLink *BaseGoerliTownsWalletLinkFilterer) ParseRevokeLink(log types.Log) (*BaseGoerliTownsWalletLinkRevokeLink, error) {
	event := new(BaseGoerliTownsWalletLinkRevokeLink)
	if err := _BaseGoerliTownsWalletLink.contract.UnpackLog(event, "RevokeLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
