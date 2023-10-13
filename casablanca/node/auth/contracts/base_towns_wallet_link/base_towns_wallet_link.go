// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_towns_wallet_link

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

// BaseTownsWalletLinkMetaData contains all meta data concerning the BaseTownsWalletLink contract.
var BaseTownsWalletLinkMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"LinkAlreadyExists\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"LinkWalletToRootKey\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"RemoveLinkViaRootKey\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"RemoveLinkViaWallet\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"__WalletLink_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"checkIfLinked\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"getLatestNonceForRootKey\",\"outputs\":[{\"internalType\":\"uint64\",\"name\":\"\",\"type\":\"uint64\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"getLatestRemoveNonceForRootKey\",\"outputs\":[{\"internalType\":\"uint64\",\"name\":\"\",\"type\":\"uint64\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"getLatestRemoveNonceForWallet\",\"outputs\":[{\"internalType\":\"uint64\",\"name\":\"\",\"type\":\"uint64\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"getRootKeyForWallet\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"}],\"name\":\"getWalletsByRootKey\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"wallets\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"walletSignature\",\"type\":\"bytes\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"rootKeySignature\",\"type\":\"bytes\"},{\"internalType\":\"uint64\",\"name\":\"nonce\",\"type\":\"uint64\"}],\"name\":\"linkWalletToRootKey\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"_ethSignedMessageHash\",\"type\":\"bytes32\"},{\"internalType\":\"bytes\",\"name\":\"_signature\",\"type\":\"bytes\"}],\"name\":\"recoverSigner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"pure\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"rootKeySignature\",\"type\":\"bytes\"},{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"uint64\",\"name\":\"removeNonce\",\"type\":\"uint64\"}],\"name\":\"removeLinkViaRootKey\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"walletSignature\",\"type\":\"bytes\"},{\"internalType\":\"address\",\"name\":\"rootKey\",\"type\":\"address\"},{\"internalType\":\"uint64\",\"name\":\"removeNonce\",\"type\":\"uint64\"}],\"name\":\"removeLinkViaWallet\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes\",\"name\":\"sig\",\"type\":\"bytes\"}],\"name\":\"splitSignature\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"}],\"stateMutability\":\"pure\",\"type\":\"function\"}]",
}

// BaseTownsWalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseTownsWalletLinkMetaData.ABI instead.
var BaseTownsWalletLinkABI = BaseTownsWalletLinkMetaData.ABI

// BaseTownsWalletLink is an auto generated Go binding around an Ethereum contract.
type BaseTownsWalletLink struct {
	BaseTownsWalletLinkCaller     // Read-only binding to the contract
	BaseTownsWalletLinkTransactor // Write-only binding to the contract
	BaseTownsWalletLinkFilterer   // Log filterer for contract events
}

// BaseTownsWalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseTownsWalletLinkCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsWalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseTownsWalletLinkTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsWalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseTownsWalletLinkFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsWalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseTownsWalletLinkSession struct {
	Contract     *BaseTownsWalletLink // Generic contract binding to set the session for
	CallOpts     bind.CallOpts        // Call options to use throughout this session
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// BaseTownsWalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseTownsWalletLinkCallerSession struct {
	Contract *BaseTownsWalletLinkCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts              // Call options to use throughout this session
}

// BaseTownsWalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseTownsWalletLinkTransactorSession struct {
	Contract     *BaseTownsWalletLinkTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// BaseTownsWalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseTownsWalletLinkRaw struct {
	Contract *BaseTownsWalletLink // Generic contract binding to access the raw methods on
}

// BaseTownsWalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseTownsWalletLinkCallerRaw struct {
	Contract *BaseTownsWalletLinkCaller // Generic read-only contract binding to access the raw methods on
}

// BaseTownsWalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseTownsWalletLinkTransactorRaw struct {
	Contract *BaseTownsWalletLinkTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseTownsWalletLink creates a new instance of BaseTownsWalletLink, bound to a specific deployed contract.
func NewBaseTownsWalletLink(address common.Address, backend bind.ContractBackend) (*BaseTownsWalletLink, error) {
	contract, err := bindBaseTownsWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLink{BaseTownsWalletLinkCaller: BaseTownsWalletLinkCaller{contract: contract}, BaseTownsWalletLinkTransactor: BaseTownsWalletLinkTransactor{contract: contract}, BaseTownsWalletLinkFilterer: BaseTownsWalletLinkFilterer{contract: contract}}, nil
}

// NewBaseTownsWalletLinkCaller creates a new read-only instance of BaseTownsWalletLink, bound to a specific deployed contract.
func NewBaseTownsWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*BaseTownsWalletLinkCaller, error) {
	contract, err := bindBaseTownsWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkCaller{contract: contract}, nil
}

// NewBaseTownsWalletLinkTransactor creates a new write-only instance of BaseTownsWalletLink, bound to a specific deployed contract.
func NewBaseTownsWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseTownsWalletLinkTransactor, error) {
	contract, err := bindBaseTownsWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkTransactor{contract: contract}, nil
}

// NewBaseTownsWalletLinkFilterer creates a new log filterer instance of BaseTownsWalletLink, bound to a specific deployed contract.
func NewBaseTownsWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseTownsWalletLinkFilterer, error) {
	contract, err := bindBaseTownsWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkFilterer{contract: contract}, nil
}

// bindBaseTownsWalletLink binds a generic wrapper to an already deployed contract.
func bindBaseTownsWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseTownsWalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsWalletLink *BaseTownsWalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsWalletLink.Contract.BaseTownsWalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsWalletLink *BaseTownsWalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.BaseTownsWalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsWalletLink *BaseTownsWalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.BaseTownsWalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsWalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "checkIfLinked", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _BaseTownsWalletLink.Contract.CheckIfLinked(&_BaseTownsWalletLink.CallOpts, rootKey, wallet)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _BaseTownsWalletLink.Contract.CheckIfLinked(&_BaseTownsWalletLink.CallOpts, rootKey, wallet)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) GetLatestNonceForRootKey(opts *bind.CallOpts, rootKey common.Address) (uint64, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "getLatestNonceForRootKey", rootKey)

	if err != nil {
		return *new(uint64), err
	}

	out0 := *abi.ConvertType(out[0], new(uint64)).(*uint64)

	return out0, err

}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) GetLatestNonceForRootKey(rootKey common.Address) (uint64, error) {
	return _BaseTownsWalletLink.Contract.GetLatestNonceForRootKey(&_BaseTownsWalletLink.CallOpts, rootKey)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) GetLatestNonceForRootKey(rootKey common.Address) (uint64, error) {
	return _BaseTownsWalletLink.Contract.GetLatestNonceForRootKey(&_BaseTownsWalletLink.CallOpts, rootKey)
}

// GetLatestRemoveNonceForRootKey is a free data retrieval call binding the contract method 0xd48458f8.
//
// Solidity: function getLatestRemoveNonceForRootKey(address rootKey) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) GetLatestRemoveNonceForRootKey(opts *bind.CallOpts, rootKey common.Address) (uint64, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "getLatestRemoveNonceForRootKey", rootKey)

	if err != nil {
		return *new(uint64), err
	}

	out0 := *abi.ConvertType(out[0], new(uint64)).(*uint64)

	return out0, err

}

// GetLatestRemoveNonceForRootKey is a free data retrieval call binding the contract method 0xd48458f8.
//
// Solidity: function getLatestRemoveNonceForRootKey(address rootKey) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) GetLatestRemoveNonceForRootKey(rootKey common.Address) (uint64, error) {
	return _BaseTownsWalletLink.Contract.GetLatestRemoveNonceForRootKey(&_BaseTownsWalletLink.CallOpts, rootKey)
}

// GetLatestRemoveNonceForRootKey is a free data retrieval call binding the contract method 0xd48458f8.
//
// Solidity: function getLatestRemoveNonceForRootKey(address rootKey) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) GetLatestRemoveNonceForRootKey(rootKey common.Address) (uint64, error) {
	return _BaseTownsWalletLink.Contract.GetLatestRemoveNonceForRootKey(&_BaseTownsWalletLink.CallOpts, rootKey)
}

// GetLatestRemoveNonceForWallet is a free data retrieval call binding the contract method 0xee5752bc.
//
// Solidity: function getLatestRemoveNonceForWallet(address wallet) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) GetLatestRemoveNonceForWallet(opts *bind.CallOpts, wallet common.Address) (uint64, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "getLatestRemoveNonceForWallet", wallet)

	if err != nil {
		return *new(uint64), err
	}

	out0 := *abi.ConvertType(out[0], new(uint64)).(*uint64)

	return out0, err

}

// GetLatestRemoveNonceForWallet is a free data retrieval call binding the contract method 0xee5752bc.
//
// Solidity: function getLatestRemoveNonceForWallet(address wallet) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) GetLatestRemoveNonceForWallet(wallet common.Address) (uint64, error) {
	return _BaseTownsWalletLink.Contract.GetLatestRemoveNonceForWallet(&_BaseTownsWalletLink.CallOpts, wallet)
}

// GetLatestRemoveNonceForWallet is a free data retrieval call binding the contract method 0xee5752bc.
//
// Solidity: function getLatestRemoveNonceForWallet(address wallet) view returns(uint64)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) GetLatestRemoveNonceForWallet(wallet common.Address) (uint64, error) {
	return _BaseTownsWalletLink.Contract.GetLatestRemoveNonceForWallet(&_BaseTownsWalletLink.CallOpts, wallet)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "getRootKeyForWallet", wallet)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _BaseTownsWalletLink.Contract.GetRootKeyForWallet(&_BaseTownsWalletLink.CallOpts, wallet)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _BaseTownsWalletLink.Contract.GetRootKeyForWallet(&_BaseTownsWalletLink.CallOpts, wallet)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "getWalletsByRootKey", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _BaseTownsWalletLink.Contract.GetWalletsByRootKey(&_BaseTownsWalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _BaseTownsWalletLink.Contract.GetWalletsByRootKey(&_BaseTownsWalletLink.CallOpts, rootKey)
}

// RecoverSigner is a free data retrieval call binding the contract method 0x97aba7f9.
//
// Solidity: function recoverSigner(bytes32 _ethSignedMessageHash, bytes _signature) pure returns(address)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) RecoverSigner(opts *bind.CallOpts, _ethSignedMessageHash [32]byte, _signature []byte) (common.Address, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "recoverSigner", _ethSignedMessageHash, _signature)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// RecoverSigner is a free data retrieval call binding the contract method 0x97aba7f9.
//
// Solidity: function recoverSigner(bytes32 _ethSignedMessageHash, bytes _signature) pure returns(address)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) RecoverSigner(_ethSignedMessageHash [32]byte, _signature []byte) (common.Address, error) {
	return _BaseTownsWalletLink.Contract.RecoverSigner(&_BaseTownsWalletLink.CallOpts, _ethSignedMessageHash, _signature)
}

// RecoverSigner is a free data retrieval call binding the contract method 0x97aba7f9.
//
// Solidity: function recoverSigner(bytes32 _ethSignedMessageHash, bytes _signature) pure returns(address)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) RecoverSigner(_ethSignedMessageHash [32]byte, _signature []byte) (common.Address, error) {
	return _BaseTownsWalletLink.Contract.RecoverSigner(&_BaseTownsWalletLink.CallOpts, _ethSignedMessageHash, _signature)
}

// SplitSignature is a free data retrieval call binding the contract method 0xa7bb5803.
//
// Solidity: function splitSignature(bytes sig) pure returns(bytes32 r, bytes32 s, uint8 v)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCaller) SplitSignature(opts *bind.CallOpts, sig []byte) (struct {
	R [32]byte
	S [32]byte
	V uint8
}, error) {
	var out []interface{}
	err := _BaseTownsWalletLink.contract.Call(opts, &out, "splitSignature", sig)

	outstruct := new(struct {
		R [32]byte
		S [32]byte
		V uint8
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.R = *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)
	outstruct.S = *abi.ConvertType(out[1], new([32]byte)).(*[32]byte)
	outstruct.V = *abi.ConvertType(out[2], new(uint8)).(*uint8)

	return *outstruct, err

}

// SplitSignature is a free data retrieval call binding the contract method 0xa7bb5803.
//
// Solidity: function splitSignature(bytes sig) pure returns(bytes32 r, bytes32 s, uint8 v)
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) SplitSignature(sig []byte) (struct {
	R [32]byte
	S [32]byte
	V uint8
}, error) {
	return _BaseTownsWalletLink.Contract.SplitSignature(&_BaseTownsWalletLink.CallOpts, sig)
}

// SplitSignature is a free data retrieval call binding the contract method 0xa7bb5803.
//
// Solidity: function splitSignature(bytes sig) pure returns(bytes32 r, bytes32 s, uint8 v)
func (_BaseTownsWalletLink *BaseTownsWalletLinkCallerSession) SplitSignature(sig []byte) (struct {
	R [32]byte
	S [32]byte
	V uint8
}, error) {
	return _BaseTownsWalletLink.Contract.SplitSignature(&_BaseTownsWalletLink.CallOpts, sig)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactor) WalletLinkInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsWalletLink.contract.Transact(opts, "__WalletLink_init")
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) WalletLinkInit() (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.WalletLinkInit(&_BaseTownsWalletLink.TransactOpts)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactorSession) WalletLinkInit() (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.WalletLinkInit(&_BaseTownsWalletLink.TransactOpts)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0xccf480f7.
//
// Solidity: function linkWalletToRootKey(address wallet, bytes walletSignature, address rootKey, bytes rootKeySignature, uint64 nonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactor) LinkWalletToRootKey(opts *bind.TransactOpts, wallet common.Address, walletSignature []byte, rootKey common.Address, rootKeySignature []byte, nonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.contract.Transact(opts, "linkWalletToRootKey", wallet, walletSignature, rootKey, rootKeySignature, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0xccf480f7.
//
// Solidity: function linkWalletToRootKey(address wallet, bytes walletSignature, address rootKey, bytes rootKeySignature, uint64 nonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) LinkWalletToRootKey(wallet common.Address, walletSignature []byte, rootKey common.Address, rootKeySignature []byte, nonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.LinkWalletToRootKey(&_BaseTownsWalletLink.TransactOpts, wallet, walletSignature, rootKey, rootKeySignature, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0xccf480f7.
//
// Solidity: function linkWalletToRootKey(address wallet, bytes walletSignature, address rootKey, bytes rootKeySignature, uint64 nonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactorSession) LinkWalletToRootKey(wallet common.Address, walletSignature []byte, rootKey common.Address, rootKeySignature []byte, nonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.LinkWalletToRootKey(&_BaseTownsWalletLink.TransactOpts, wallet, walletSignature, rootKey, rootKeySignature, nonce)
}

// RemoveLinkViaRootKey is a paid mutator transaction binding the contract method 0x5cdbbbef.
//
// Solidity: function removeLinkViaRootKey(address rootKey, bytes rootKeySignature, address wallet, uint64 removeNonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactor) RemoveLinkViaRootKey(opts *bind.TransactOpts, rootKey common.Address, rootKeySignature []byte, wallet common.Address, removeNonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.contract.Transact(opts, "removeLinkViaRootKey", rootKey, rootKeySignature, wallet, removeNonce)
}

// RemoveLinkViaRootKey is a paid mutator transaction binding the contract method 0x5cdbbbef.
//
// Solidity: function removeLinkViaRootKey(address rootKey, bytes rootKeySignature, address wallet, uint64 removeNonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) RemoveLinkViaRootKey(rootKey common.Address, rootKeySignature []byte, wallet common.Address, removeNonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.RemoveLinkViaRootKey(&_BaseTownsWalletLink.TransactOpts, rootKey, rootKeySignature, wallet, removeNonce)
}

// RemoveLinkViaRootKey is a paid mutator transaction binding the contract method 0x5cdbbbef.
//
// Solidity: function removeLinkViaRootKey(address rootKey, bytes rootKeySignature, address wallet, uint64 removeNonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactorSession) RemoveLinkViaRootKey(rootKey common.Address, rootKeySignature []byte, wallet common.Address, removeNonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.RemoveLinkViaRootKey(&_BaseTownsWalletLink.TransactOpts, rootKey, rootKeySignature, wallet, removeNonce)
}

// RemoveLinkViaWallet is a paid mutator transaction binding the contract method 0x6b8ca397.
//
// Solidity: function removeLinkViaWallet(address wallet, bytes walletSignature, address rootKey, uint64 removeNonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactor) RemoveLinkViaWallet(opts *bind.TransactOpts, wallet common.Address, walletSignature []byte, rootKey common.Address, removeNonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.contract.Transact(opts, "removeLinkViaWallet", wallet, walletSignature, rootKey, removeNonce)
}

// RemoveLinkViaWallet is a paid mutator transaction binding the contract method 0x6b8ca397.
//
// Solidity: function removeLinkViaWallet(address wallet, bytes walletSignature, address rootKey, uint64 removeNonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkSession) RemoveLinkViaWallet(wallet common.Address, walletSignature []byte, rootKey common.Address, removeNonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.RemoveLinkViaWallet(&_BaseTownsWalletLink.TransactOpts, wallet, walletSignature, rootKey, removeNonce)
}

// RemoveLinkViaWallet is a paid mutator transaction binding the contract method 0x6b8ca397.
//
// Solidity: function removeLinkViaWallet(address wallet, bytes walletSignature, address rootKey, uint64 removeNonce) returns()
func (_BaseTownsWalletLink *BaseTownsWalletLinkTransactorSession) RemoveLinkViaWallet(wallet common.Address, walletSignature []byte, rootKey common.Address, removeNonce uint64) (*types.Transaction, error) {
	return _BaseTownsWalletLink.Contract.RemoveLinkViaWallet(&_BaseTownsWalletLink.TransactOpts, wallet, walletSignature, rootKey, removeNonce)
}

// BaseTownsWalletLinkInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkInitializedIterator struct {
	Event *BaseTownsWalletLinkInitialized // Event containing the contract specifics and raw log

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
func (it *BaseTownsWalletLinkInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsWalletLinkInitialized)
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
		it.Event = new(BaseTownsWalletLinkInitialized)
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
func (it *BaseTownsWalletLinkInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsWalletLinkInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsWalletLinkInitialized represents a Initialized event raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) FilterInitialized(opts *bind.FilterOpts) (*BaseTownsWalletLinkInitializedIterator, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkInitializedIterator{contract: _BaseTownsWalletLink.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *BaseTownsWalletLinkInitialized) (event.Subscription, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsWalletLinkInitialized)
				if err := _BaseTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) ParseInitialized(log types.Log) (*BaseTownsWalletLinkInitialized, error) {
	event := new(BaseTownsWalletLinkInitialized)
	if err := _BaseTownsWalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsWalletLinkInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkInterfaceAddedIterator struct {
	Event *BaseTownsWalletLinkInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *BaseTownsWalletLinkInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsWalletLinkInterfaceAdded)
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
		it.Event = new(BaseTownsWalletLinkInterfaceAdded)
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
func (it *BaseTownsWalletLinkInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsWalletLinkInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsWalletLinkInterfaceAdded represents a InterfaceAdded event raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseTownsWalletLinkInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsWalletLink.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkInterfaceAddedIterator{contract: _BaseTownsWalletLink.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *BaseTownsWalletLinkInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsWalletLink.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsWalletLinkInterfaceAdded)
				if err := _BaseTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) ParseInterfaceAdded(log types.Log) (*BaseTownsWalletLinkInterfaceAdded, error) {
	event := new(BaseTownsWalletLinkInterfaceAdded)
	if err := _BaseTownsWalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsWalletLinkInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkInterfaceRemovedIterator struct {
	Event *BaseTownsWalletLinkInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *BaseTownsWalletLinkInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsWalletLinkInterfaceRemoved)
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
		it.Event = new(BaseTownsWalletLinkInterfaceRemoved)
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
func (it *BaseTownsWalletLinkInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsWalletLinkInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsWalletLinkInterfaceRemoved represents a InterfaceRemoved event raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseTownsWalletLinkInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsWalletLink.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkInterfaceRemovedIterator{contract: _BaseTownsWalletLink.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *BaseTownsWalletLinkInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsWalletLink.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsWalletLinkInterfaceRemoved)
				if err := _BaseTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) ParseInterfaceRemoved(log types.Log) (*BaseTownsWalletLinkInterfaceRemoved, error) {
	event := new(BaseTownsWalletLinkInterfaceRemoved)
	if err := _BaseTownsWalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsWalletLinkLinkWalletToRootKeyIterator is returned from FilterLinkWalletToRootKey and is used to iterate over the raw logs and unpacked data for LinkWalletToRootKey events raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkLinkWalletToRootKeyIterator struct {
	Event *BaseTownsWalletLinkLinkWalletToRootKey // Event containing the contract specifics and raw log

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
func (it *BaseTownsWalletLinkLinkWalletToRootKeyIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsWalletLinkLinkWalletToRootKey)
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
		it.Event = new(BaseTownsWalletLinkLinkWalletToRootKey)
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
func (it *BaseTownsWalletLinkLinkWalletToRootKeyIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsWalletLinkLinkWalletToRootKeyIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsWalletLinkLinkWalletToRootKey represents a LinkWalletToRootKey event raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkLinkWalletToRootKey struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterLinkWalletToRootKey is a free log retrieval operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) FilterLinkWalletToRootKey(opts *bind.FilterOpts) (*BaseTownsWalletLinkLinkWalletToRootKeyIterator, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.FilterLogs(opts, "LinkWalletToRootKey")
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkLinkWalletToRootKeyIterator{contract: _BaseTownsWalletLink.contract, event: "LinkWalletToRootKey", logs: logs, sub: sub}, nil
}

// WatchLinkWalletToRootKey is a free log subscription operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) WatchLinkWalletToRootKey(opts *bind.WatchOpts, sink chan<- *BaseTownsWalletLinkLinkWalletToRootKey) (event.Subscription, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.WatchLogs(opts, "LinkWalletToRootKey")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsWalletLinkLinkWalletToRootKey)
				if err := _BaseTownsWalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
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
// Solidity: event LinkWalletToRootKey(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) ParseLinkWalletToRootKey(log types.Log) (*BaseTownsWalletLinkLinkWalletToRootKey, error) {
	event := new(BaseTownsWalletLinkLinkWalletToRootKey)
	if err := _BaseTownsWalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsWalletLinkRemoveLinkViaRootKeyIterator is returned from FilterRemoveLinkViaRootKey and is used to iterate over the raw logs and unpacked data for RemoveLinkViaRootKey events raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkRemoveLinkViaRootKeyIterator struct {
	Event *BaseTownsWalletLinkRemoveLinkViaRootKey // Event containing the contract specifics and raw log

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
func (it *BaseTownsWalletLinkRemoveLinkViaRootKeyIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsWalletLinkRemoveLinkViaRootKey)
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
		it.Event = new(BaseTownsWalletLinkRemoveLinkViaRootKey)
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
func (it *BaseTownsWalletLinkRemoveLinkViaRootKeyIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsWalletLinkRemoveLinkViaRootKeyIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsWalletLinkRemoveLinkViaRootKey represents a RemoveLinkViaRootKey event raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkRemoveLinkViaRootKey struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRemoveLinkViaRootKey is a free log retrieval operation binding the contract event 0x65050554da593f4acb6a5d325b1eea7a353aaaf294fd92e4c464da529f339d1d.
//
// Solidity: event RemoveLinkViaRootKey(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) FilterRemoveLinkViaRootKey(opts *bind.FilterOpts) (*BaseTownsWalletLinkRemoveLinkViaRootKeyIterator, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.FilterLogs(opts, "RemoveLinkViaRootKey")
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkRemoveLinkViaRootKeyIterator{contract: _BaseTownsWalletLink.contract, event: "RemoveLinkViaRootKey", logs: logs, sub: sub}, nil
}

// WatchRemoveLinkViaRootKey is a free log subscription operation binding the contract event 0x65050554da593f4acb6a5d325b1eea7a353aaaf294fd92e4c464da529f339d1d.
//
// Solidity: event RemoveLinkViaRootKey(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) WatchRemoveLinkViaRootKey(opts *bind.WatchOpts, sink chan<- *BaseTownsWalletLinkRemoveLinkViaRootKey) (event.Subscription, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.WatchLogs(opts, "RemoveLinkViaRootKey")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsWalletLinkRemoveLinkViaRootKey)
				if err := _BaseTownsWalletLink.contract.UnpackLog(event, "RemoveLinkViaRootKey", log); err != nil {
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

// ParseRemoveLinkViaRootKey is a log parse operation binding the contract event 0x65050554da593f4acb6a5d325b1eea7a353aaaf294fd92e4c464da529f339d1d.
//
// Solidity: event RemoveLinkViaRootKey(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) ParseRemoveLinkViaRootKey(log types.Log) (*BaseTownsWalletLinkRemoveLinkViaRootKey, error) {
	event := new(BaseTownsWalletLinkRemoveLinkViaRootKey)
	if err := _BaseTownsWalletLink.contract.UnpackLog(event, "RemoveLinkViaRootKey", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsWalletLinkRemoveLinkViaWalletIterator is returned from FilterRemoveLinkViaWallet and is used to iterate over the raw logs and unpacked data for RemoveLinkViaWallet events raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkRemoveLinkViaWalletIterator struct {
	Event *BaseTownsWalletLinkRemoveLinkViaWallet // Event containing the contract specifics and raw log

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
func (it *BaseTownsWalletLinkRemoveLinkViaWalletIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsWalletLinkRemoveLinkViaWallet)
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
		it.Event = new(BaseTownsWalletLinkRemoveLinkViaWallet)
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
func (it *BaseTownsWalletLinkRemoveLinkViaWalletIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsWalletLinkRemoveLinkViaWalletIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsWalletLinkRemoveLinkViaWallet represents a RemoveLinkViaWallet event raised by the BaseTownsWalletLink contract.
type BaseTownsWalletLinkRemoveLinkViaWallet struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRemoveLinkViaWallet is a free log retrieval operation binding the contract event 0x97d1080066ca40b1c31422ce6cc29d77d1b2dba92eee009587fcf351b556ba25.
//
// Solidity: event RemoveLinkViaWallet(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) FilterRemoveLinkViaWallet(opts *bind.FilterOpts) (*BaseTownsWalletLinkRemoveLinkViaWalletIterator, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.FilterLogs(opts, "RemoveLinkViaWallet")
	if err != nil {
		return nil, err
	}
	return &BaseTownsWalletLinkRemoveLinkViaWalletIterator{contract: _BaseTownsWalletLink.contract, event: "RemoveLinkViaWallet", logs: logs, sub: sub}, nil
}

// WatchRemoveLinkViaWallet is a free log subscription operation binding the contract event 0x97d1080066ca40b1c31422ce6cc29d77d1b2dba92eee009587fcf351b556ba25.
//
// Solidity: event RemoveLinkViaWallet(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) WatchRemoveLinkViaWallet(opts *bind.WatchOpts, sink chan<- *BaseTownsWalletLinkRemoveLinkViaWallet) (event.Subscription, error) {

	logs, sub, err := _BaseTownsWalletLink.contract.WatchLogs(opts, "RemoveLinkViaWallet")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsWalletLinkRemoveLinkViaWallet)
				if err := _BaseTownsWalletLink.contract.UnpackLog(event, "RemoveLinkViaWallet", log); err != nil {
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

// ParseRemoveLinkViaWallet is a log parse operation binding the contract event 0x97d1080066ca40b1c31422ce6cc29d77d1b2dba92eee009587fcf351b556ba25.
//
// Solidity: event RemoveLinkViaWallet(address wallet, address rootKey)
func (_BaseTownsWalletLink *BaseTownsWalletLinkFilterer) ParseRemoveLinkViaWallet(log types.Log) (*BaseTownsWalletLinkRemoveLinkViaWallet, error) {
	event := new(BaseTownsWalletLinkRemoveLinkViaWallet)
	if err := _BaseTownsWalletLink.contract.UnpackLog(event, "RemoveLinkViaWallet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
