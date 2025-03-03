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

// IWalletLinkBaseLinkedWallet is an auto generated low-level Go binding around an user-defined struct.
type IWalletLinkBaseLinkedWallet struct {
	Addr      common.Address
	Signature []byte
	Message   string
}

// WalletLinkMetaData contains all meta data concerning the WalletLink contract.
var WalletLinkMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"checkIfLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getDefaultWallet\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getDelegateByVersion\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestNonceForRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRootKeyForWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKeyWithDelegations\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"linkCallerToRootKey\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeCallerLink\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setDefaultWallet\",\"inputs\":[{\"name\":\"defaultWallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setDelegateByVersion\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"delegate\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"LinkThirdPartyDelegation\",\"inputs\":[{\"name\":\"delegator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"delegatedWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"LinkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"secondWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SetDefaultWallet\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"defaultWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToRootWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveDefaultWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveRootWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__DefaultWalletAlreadySet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__LinkAlreadyExists\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkedToAnotherRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__MaxLinkedWalletsReached\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__NotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]}]",
}

// WalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use WalletLinkMetaData.ABI instead.
var WalletLinkABI = WalletLinkMetaData.ABI

// WalletLink is an auto generated Go binding around an Ethereum contract.
type WalletLink struct {
	WalletLinkCaller     // Read-only binding to the contract
	WalletLinkTransactor // Write-only binding to the contract
	WalletLinkFilterer   // Log filterer for contract events
}

// WalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type WalletLinkCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type WalletLinkTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type WalletLinkFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type WalletLinkSession struct {
	Contract     *WalletLink       // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// WalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type WalletLinkCallerSession struct {
	Contract *WalletLinkCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts     // Call options to use throughout this session
}

// WalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type WalletLinkTransactorSession struct {
	Contract     *WalletLinkTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// WalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type WalletLinkRaw struct {
	Contract *WalletLink // Generic contract binding to access the raw methods on
}

// WalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type WalletLinkCallerRaw struct {
	Contract *WalletLinkCaller // Generic read-only contract binding to access the raw methods on
}

// WalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type WalletLinkTransactorRaw struct {
	Contract *WalletLinkTransactor // Generic write-only contract binding to access the raw methods on
}

// NewWalletLink creates a new instance of WalletLink, bound to a specific deployed contract.
func NewWalletLink(address common.Address, backend bind.ContractBackend) (*WalletLink, error) {
	contract, err := bindWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &WalletLink{WalletLinkCaller: WalletLinkCaller{contract: contract}, WalletLinkTransactor: WalletLinkTransactor{contract: contract}, WalletLinkFilterer: WalletLinkFilterer{contract: contract}}, nil
}

// NewWalletLinkCaller creates a new read-only instance of WalletLink, bound to a specific deployed contract.
func NewWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*WalletLinkCaller, error) {
	contract, err := bindWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &WalletLinkCaller{contract: contract}, nil
}

// NewWalletLinkTransactor creates a new write-only instance of WalletLink, bound to a specific deployed contract.
func NewWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*WalletLinkTransactor, error) {
	contract, err := bindWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &WalletLinkTransactor{contract: contract}, nil
}

// NewWalletLinkFilterer creates a new log filterer instance of WalletLink, bound to a specific deployed contract.
func NewWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*WalletLinkFilterer, error) {
	contract, err := bindWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &WalletLinkFilterer{contract: contract}, nil
}

// bindWalletLink binds a generic wrapper to an already deployed contract.
func bindWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := WalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WalletLink *WalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WalletLink.Contract.WalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WalletLink *WalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WalletLink *WalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WalletLink *WalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WalletLink *WalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WalletLink *WalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_WalletLink *WalletLinkCaller) CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "checkIfLinked", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_WalletLink *WalletLinkSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _WalletLink.Contract.CheckIfLinked(&_WalletLink.CallOpts, rootKey, wallet)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_WalletLink *WalletLinkCallerSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _WalletLink.Contract.CheckIfLinked(&_WalletLink.CallOpts, rootKey, wallet)
}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootKey) view returns(address)
func (_WalletLink *WalletLinkCaller) GetDefaultWallet(opts *bind.CallOpts, rootKey common.Address) (common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getDefaultWallet", rootKey)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootKey) view returns(address)
func (_WalletLink *WalletLinkSession) GetDefaultWallet(rootKey common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetDefaultWallet(&_WalletLink.CallOpts, rootKey)
}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootKey) view returns(address)
func (_WalletLink *WalletLinkCallerSession) GetDefaultWallet(rootKey common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetDefaultWallet(&_WalletLink.CallOpts, rootKey)
}

// GetDelegateByVersion is a free data retrieval call binding the contract method 0xd1093a3e.
//
// Solidity: function getDelegateByVersion(uint256 version) view returns(address)
func (_WalletLink *WalletLinkCaller) GetDelegateByVersion(opts *bind.CallOpts, version *big.Int) (common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getDelegateByVersion", version)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDelegateByVersion is a free data retrieval call binding the contract method 0xd1093a3e.
//
// Solidity: function getDelegateByVersion(uint256 version) view returns(address)
func (_WalletLink *WalletLinkSession) GetDelegateByVersion(version *big.Int) (common.Address, error) {
	return _WalletLink.Contract.GetDelegateByVersion(&_WalletLink.CallOpts, version)
}

// GetDelegateByVersion is a free data retrieval call binding the contract method 0xd1093a3e.
//
// Solidity: function getDelegateByVersion(uint256 version) view returns(address)
func (_WalletLink *WalletLinkCallerSession) GetDelegateByVersion(version *big.Int) (common.Address, error) {
	return _WalletLink.Contract.GetDelegateByVersion(&_WalletLink.CallOpts, version)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint256)
func (_WalletLink *WalletLinkCaller) GetLatestNonceForRootKey(opts *bind.CallOpts, rootKey common.Address) (*big.Int, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getLatestNonceForRootKey", rootKey)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint256)
func (_WalletLink *WalletLinkSession) GetLatestNonceForRootKey(rootKey common.Address) (*big.Int, error) {
	return _WalletLink.Contract.GetLatestNonceForRootKey(&_WalletLink.CallOpts, rootKey)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint256)
func (_WalletLink *WalletLinkCallerSession) GetLatestNonceForRootKey(rootKey common.Address) (*big.Int, error) {
	return _WalletLink.Contract.GetLatestNonceForRootKey(&_WalletLink.CallOpts, rootKey)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_WalletLink *WalletLinkCaller) GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getRootKeyForWallet", wallet)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_WalletLink *WalletLinkSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetRootKeyForWallet(&_WalletLink.CallOpts, wallet)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_WalletLink *WalletLinkCallerSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetRootKeyForWallet(&_WalletLink.CallOpts, wallet)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCaller) GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getWalletsByRootKey", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKey(&_WalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCallerSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKey(&_WalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCaller) GetWalletsByRootKeyWithDelegations(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getWalletsByRootKeyWithDelegations", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_WalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCallerSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_WalletLink.CallOpts, rootKey)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactor) LinkCallerToRootKey(opts *bind.TransactOpts, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "linkCallerToRootKey", rootWallet, nonce)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkCallerToRootKey(&_WalletLink.TransactOpts, rootWallet, nonce)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactorSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkCallerToRootKey(&_WalletLink.TransactOpts, rootWallet, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactor) LinkWalletToRootKey(opts *bind.TransactOpts, wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "linkWalletToRootKey", wallet, rootWallet, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkWalletToRootKey(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactorSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkWalletToRootKey(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_WalletLink *WalletLinkTransactor) RemoveCallerLink(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "removeCallerLink")
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_WalletLink *WalletLinkSession) RemoveCallerLink() (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveCallerLink(&_WalletLink.TransactOpts)
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_WalletLink *WalletLinkTransactorSession) RemoveCallerLink() (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveCallerLink(&_WalletLink.TransactOpts)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactor) RemoveLink(opts *bind.TransactOpts, wallet common.Address, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "removeLink", wallet, rootWallet, nonce)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkSession) RemoveLink(wallet common.Address, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveLink(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactorSession) RemoveLink(wallet common.Address, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveLink(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_WalletLink *WalletLinkTransactor) SetDefaultWallet(opts *bind.TransactOpts, defaultWallet common.Address) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "setDefaultWallet", defaultWallet)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_WalletLink *WalletLinkSession) SetDefaultWallet(defaultWallet common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDefaultWallet(&_WalletLink.TransactOpts, defaultWallet)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_WalletLink *WalletLinkTransactorSession) SetDefaultWallet(defaultWallet common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDefaultWallet(&_WalletLink.TransactOpts, defaultWallet)
}

// SetDelegateByVersion is a paid mutator transaction binding the contract method 0x8a56a2c5.
//
// Solidity: function setDelegateByVersion(uint256 version, address delegate) returns()
func (_WalletLink *WalletLinkTransactor) SetDelegateByVersion(opts *bind.TransactOpts, version *big.Int, delegate common.Address) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "setDelegateByVersion", version, delegate)
}

// SetDelegateByVersion is a paid mutator transaction binding the contract method 0x8a56a2c5.
//
// Solidity: function setDelegateByVersion(uint256 version, address delegate) returns()
func (_WalletLink *WalletLinkSession) SetDelegateByVersion(version *big.Int, delegate common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDelegateByVersion(&_WalletLink.TransactOpts, version, delegate)
}

// SetDelegateByVersion is a paid mutator transaction binding the contract method 0x8a56a2c5.
//
// Solidity: function setDelegateByVersion(uint256 version, address delegate) returns()
func (_WalletLink *WalletLinkTransactorSession) SetDelegateByVersion(version *big.Int, delegate common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDelegateByVersion(&_WalletLink.TransactOpts, version, delegate)
}

// WalletLinkLinkThirdPartyDelegationIterator is returned from FilterLinkThirdPartyDelegation and is used to iterate over the raw logs and unpacked data for LinkThirdPartyDelegation events raised by the WalletLink contract.
type WalletLinkLinkThirdPartyDelegationIterator struct {
	Event *WalletLinkLinkThirdPartyDelegation // Event containing the contract specifics and raw log

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
func (it *WalletLinkLinkThirdPartyDelegationIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkLinkThirdPartyDelegation)
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
		it.Event = new(WalletLinkLinkThirdPartyDelegation)
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
func (it *WalletLinkLinkThirdPartyDelegationIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkLinkThirdPartyDelegationIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkLinkThirdPartyDelegation represents a LinkThirdPartyDelegation event raised by the WalletLink contract.
type WalletLinkLinkThirdPartyDelegation struct {
	Delegator       common.Address
	DelegatedWallet common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterLinkThirdPartyDelegation is a free log retrieval operation binding the contract event 0x940bab3abd8e37cf3cb3ed9f3dd4b7d6f8a22ec30d8f6e9d05f753e8d7879fba.
//
// Solidity: event LinkThirdPartyDelegation(address indexed delegator, address indexed delegatedWallet)
func (_WalletLink *WalletLinkFilterer) FilterLinkThirdPartyDelegation(opts *bind.FilterOpts, delegator []common.Address, delegatedWallet []common.Address) (*WalletLinkLinkThirdPartyDelegationIterator, error) {

	var delegatorRule []interface{}
	for _, delegatorItem := range delegator {
		delegatorRule = append(delegatorRule, delegatorItem)
	}
	var delegatedWalletRule []interface{}
	for _, delegatedWalletItem := range delegatedWallet {
		delegatedWalletRule = append(delegatedWalletRule, delegatedWalletItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "LinkThirdPartyDelegation", delegatorRule, delegatedWalletRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkLinkThirdPartyDelegationIterator{contract: _WalletLink.contract, event: "LinkThirdPartyDelegation", logs: logs, sub: sub}, nil
}

// WatchLinkThirdPartyDelegation is a free log subscription operation binding the contract event 0x940bab3abd8e37cf3cb3ed9f3dd4b7d6f8a22ec30d8f6e9d05f753e8d7879fba.
//
// Solidity: event LinkThirdPartyDelegation(address indexed delegator, address indexed delegatedWallet)
func (_WalletLink *WalletLinkFilterer) WatchLinkThirdPartyDelegation(opts *bind.WatchOpts, sink chan<- *WalletLinkLinkThirdPartyDelegation, delegator []common.Address, delegatedWallet []common.Address) (event.Subscription, error) {

	var delegatorRule []interface{}
	for _, delegatorItem := range delegator {
		delegatorRule = append(delegatorRule, delegatorItem)
	}
	var delegatedWalletRule []interface{}
	for _, delegatedWalletItem := range delegatedWallet {
		delegatedWalletRule = append(delegatedWalletRule, delegatedWalletItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "LinkThirdPartyDelegation", delegatorRule, delegatedWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkLinkThirdPartyDelegation)
				if err := _WalletLink.contract.UnpackLog(event, "LinkThirdPartyDelegation", log); err != nil {
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

// ParseLinkThirdPartyDelegation is a log parse operation binding the contract event 0x940bab3abd8e37cf3cb3ed9f3dd4b7d6f8a22ec30d8f6e9d05f753e8d7879fba.
//
// Solidity: event LinkThirdPartyDelegation(address indexed delegator, address indexed delegatedWallet)
func (_WalletLink *WalletLinkFilterer) ParseLinkThirdPartyDelegation(log types.Log) (*WalletLinkLinkThirdPartyDelegation, error) {
	event := new(WalletLinkLinkThirdPartyDelegation)
	if err := _WalletLink.contract.UnpackLog(event, "LinkThirdPartyDelegation", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WalletLinkLinkWalletToRootKeyIterator is returned from FilterLinkWalletToRootKey and is used to iterate over the raw logs and unpacked data for LinkWalletToRootKey events raised by the WalletLink contract.
type WalletLinkLinkWalletToRootKeyIterator struct {
	Event *WalletLinkLinkWalletToRootKey // Event containing the contract specifics and raw log

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
func (it *WalletLinkLinkWalletToRootKeyIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkLinkWalletToRootKey)
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
		it.Event = new(WalletLinkLinkWalletToRootKey)
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
func (it *WalletLinkLinkWalletToRootKeyIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkLinkWalletToRootKeyIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkLinkWalletToRootKey represents a LinkWalletToRootKey event raised by the WalletLink contract.
type WalletLinkLinkWalletToRootKey struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterLinkWalletToRootKey is a free log retrieval operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_WalletLink *WalletLinkFilterer) FilterLinkWalletToRootKey(opts *bind.FilterOpts, wallet []common.Address, rootKey []common.Address) (*WalletLinkLinkWalletToRootKeyIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkLinkWalletToRootKeyIterator{contract: _WalletLink.contract, event: "LinkWalletToRootKey", logs: logs, sub: sub}, nil
}

// WatchLinkWalletToRootKey is a free log subscription operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_WalletLink *WalletLinkFilterer) WatchLinkWalletToRootKey(opts *bind.WatchOpts, sink chan<- *WalletLinkLinkWalletToRootKey, wallet []common.Address, rootKey []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkLinkWalletToRootKey)
				if err := _WalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
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

// ParseLinkWalletToRootKey is a log parse operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_WalletLink *WalletLinkFilterer) ParseLinkWalletToRootKey(log types.Log) (*WalletLinkLinkWalletToRootKey, error) {
	event := new(WalletLinkLinkWalletToRootKey)
	if err := _WalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WalletLinkRemoveLinkIterator is returned from FilterRemoveLink and is used to iterate over the raw logs and unpacked data for RemoveLink events raised by the WalletLink contract.
type WalletLinkRemoveLinkIterator struct {
	Event *WalletLinkRemoveLink // Event containing the contract specifics and raw log

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
func (it *WalletLinkRemoveLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkRemoveLink)
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
		it.Event = new(WalletLinkRemoveLink)
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
func (it *WalletLinkRemoveLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkRemoveLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkRemoveLink represents a RemoveLink event raised by the WalletLink contract.
type WalletLinkRemoveLink struct {
	Wallet       common.Address
	SecondWallet common.Address
	Raw          types.Log // Blockchain specific contextual infos
}

// FilterRemoveLink is a free log retrieval operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_WalletLink *WalletLinkFilterer) FilterRemoveLink(opts *bind.FilterOpts, wallet []common.Address, secondWallet []common.Address) (*WalletLinkRemoveLinkIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkRemoveLinkIterator{contract: _WalletLink.contract, event: "RemoveLink", logs: logs, sub: sub}, nil
}

// WatchRemoveLink is a free log subscription operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_WalletLink *WalletLinkFilterer) WatchRemoveLink(opts *bind.WatchOpts, sink chan<- *WalletLinkRemoveLink, wallet []common.Address, secondWallet []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkRemoveLink)
				if err := _WalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
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

// ParseRemoveLink is a log parse operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_WalletLink *WalletLinkFilterer) ParseRemoveLink(log types.Log) (*WalletLinkRemoveLink, error) {
	event := new(WalletLinkRemoveLink)
	if err := _WalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WalletLinkSetDefaultWalletIterator is returned from FilterSetDefaultWallet and is used to iterate over the raw logs and unpacked data for SetDefaultWallet events raised by the WalletLink contract.
type WalletLinkSetDefaultWalletIterator struct {
	Event *WalletLinkSetDefaultWallet // Event containing the contract specifics and raw log

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
func (it *WalletLinkSetDefaultWalletIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkSetDefaultWallet)
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
		it.Event = new(WalletLinkSetDefaultWallet)
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
func (it *WalletLinkSetDefaultWalletIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkSetDefaultWalletIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkSetDefaultWallet represents a SetDefaultWallet event raised by the WalletLink contract.
type WalletLinkSetDefaultWallet struct {
	RootKey       common.Address
	DefaultWallet common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterSetDefaultWallet is a free log retrieval operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_WalletLink *WalletLinkFilterer) FilterSetDefaultWallet(opts *bind.FilterOpts, rootKey []common.Address, defaultWallet []common.Address) (*WalletLinkSetDefaultWalletIterator, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkSetDefaultWalletIterator{contract: _WalletLink.contract, event: "SetDefaultWallet", logs: logs, sub: sub}, nil
}

// WatchSetDefaultWallet is a free log subscription operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_WalletLink *WalletLinkFilterer) WatchSetDefaultWallet(opts *bind.WatchOpts, sink chan<- *WalletLinkSetDefaultWallet, rootKey []common.Address, defaultWallet []common.Address) (event.Subscription, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkSetDefaultWallet)
				if err := _WalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
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

// ParseSetDefaultWallet is a log parse operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_WalletLink *WalletLinkFilterer) ParseSetDefaultWallet(log types.Log) (*WalletLinkSetDefaultWallet, error) {
	event := new(WalletLinkSetDefaultWallet)
	if err := _WalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
