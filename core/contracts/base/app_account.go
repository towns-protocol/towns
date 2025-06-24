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

// AppAccountMetaData contains all meta data concerning the AppAccount contract.
var AppAccountMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"disableApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"enableApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAppExpiration\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint48\",\"internalType\":\"uint48\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAppId\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getInstalledApps\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isAppEntitled\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"publicKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permission\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isAppInstalled\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"onInstallApp\",\"inputs\":[{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"onRenewApp\",\"inputs\":[{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"onUninstallApp\",\"inputs\":[{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"error\",\"name\":\"AppAlreadyInstalled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAppAddress\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"InvalidCaller\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidManifest\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotEnoughEth\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"UnauthorizedApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"UnauthorizedSelector\",\"inputs\":[]}]",
}

// AppAccountABI is the input ABI used to generate the binding from.
// Deprecated: Use AppAccountMetaData.ABI instead.
var AppAccountABI = AppAccountMetaData.ABI

// AppAccount is an auto generated Go binding around an Ethereum contract.
type AppAccount struct {
	AppAccountCaller     // Read-only binding to the contract
	AppAccountTransactor // Write-only binding to the contract
	AppAccountFilterer   // Log filterer for contract events
}

// AppAccountCaller is an auto generated read-only Go binding around an Ethereum contract.
type AppAccountCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AppAccountTransactor is an auto generated write-only Go binding around an Ethereum contract.
type AppAccountTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AppAccountFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type AppAccountFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AppAccountSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type AppAccountSession struct {
	Contract     *AppAccount       // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// AppAccountCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type AppAccountCallerSession struct {
	Contract *AppAccountCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts     // Call options to use throughout this session
}

// AppAccountTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type AppAccountTransactorSession struct {
	Contract     *AppAccountTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// AppAccountRaw is an auto generated low-level Go binding around an Ethereum contract.
type AppAccountRaw struct {
	Contract *AppAccount // Generic contract binding to access the raw methods on
}

// AppAccountCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type AppAccountCallerRaw struct {
	Contract *AppAccountCaller // Generic read-only contract binding to access the raw methods on
}

// AppAccountTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type AppAccountTransactorRaw struct {
	Contract *AppAccountTransactor // Generic write-only contract binding to access the raw methods on
}

// NewAppAccount creates a new instance of AppAccount, bound to a specific deployed contract.
func NewAppAccount(address common.Address, backend bind.ContractBackend) (*AppAccount, error) {
	contract, err := bindAppAccount(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &AppAccount{AppAccountCaller: AppAccountCaller{contract: contract}, AppAccountTransactor: AppAccountTransactor{contract: contract}, AppAccountFilterer: AppAccountFilterer{contract: contract}}, nil
}

// NewAppAccountCaller creates a new read-only instance of AppAccount, bound to a specific deployed contract.
func NewAppAccountCaller(address common.Address, caller bind.ContractCaller) (*AppAccountCaller, error) {
	contract, err := bindAppAccount(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &AppAccountCaller{contract: contract}, nil
}

// NewAppAccountTransactor creates a new write-only instance of AppAccount, bound to a specific deployed contract.
func NewAppAccountTransactor(address common.Address, transactor bind.ContractTransactor) (*AppAccountTransactor, error) {
	contract, err := bindAppAccount(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &AppAccountTransactor{contract: contract}, nil
}

// NewAppAccountFilterer creates a new log filterer instance of AppAccount, bound to a specific deployed contract.
func NewAppAccountFilterer(address common.Address, filterer bind.ContractFilterer) (*AppAccountFilterer, error) {
	contract, err := bindAppAccount(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &AppAccountFilterer{contract: contract}, nil
}

// bindAppAccount binds a generic wrapper to an already deployed contract.
func bindAppAccount(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := AppAccountMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_AppAccount *AppAccountRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _AppAccount.Contract.AppAccountCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_AppAccount *AppAccountRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _AppAccount.Contract.AppAccountTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_AppAccount *AppAccountRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _AppAccount.Contract.AppAccountTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_AppAccount *AppAccountCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _AppAccount.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_AppAccount *AppAccountTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _AppAccount.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_AppAccount *AppAccountTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _AppAccount.Contract.contract.Transact(opts, method, params...)
}

// GetAppExpiration is a free data retrieval call binding the contract method 0xd122c25c.
//
// Solidity: function getAppExpiration(address app) view returns(uint48)
func (_AppAccount *AppAccountCaller) GetAppExpiration(opts *bind.CallOpts, app common.Address) (*big.Int, error) {
	var out []interface{}
	err := _AppAccount.contract.Call(opts, &out, "getAppExpiration", app)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetAppExpiration is a free data retrieval call binding the contract method 0xd122c25c.
//
// Solidity: function getAppExpiration(address app) view returns(uint48)
func (_AppAccount *AppAccountSession) GetAppExpiration(app common.Address) (*big.Int, error) {
	return _AppAccount.Contract.GetAppExpiration(&_AppAccount.CallOpts, app)
}

// GetAppExpiration is a free data retrieval call binding the contract method 0xd122c25c.
//
// Solidity: function getAppExpiration(address app) view returns(uint48)
func (_AppAccount *AppAccountCallerSession) GetAppExpiration(app common.Address) (*big.Int, error) {
	return _AppAccount.Contract.GetAppExpiration(&_AppAccount.CallOpts, app)
}

// GetAppId is a free data retrieval call binding the contract method 0x2ba9b839.
//
// Solidity: function getAppId(address app) view returns(bytes32)
func (_AppAccount *AppAccountCaller) GetAppId(opts *bind.CallOpts, app common.Address) ([32]byte, error) {
	var out []interface{}
	err := _AppAccount.contract.Call(opts, &out, "getAppId", app)

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// GetAppId is a free data retrieval call binding the contract method 0x2ba9b839.
//
// Solidity: function getAppId(address app) view returns(bytes32)
func (_AppAccount *AppAccountSession) GetAppId(app common.Address) ([32]byte, error) {
	return _AppAccount.Contract.GetAppId(&_AppAccount.CallOpts, app)
}

// GetAppId is a free data retrieval call binding the contract method 0x2ba9b839.
//
// Solidity: function getAppId(address app) view returns(bytes32)
func (_AppAccount *AppAccountCallerSession) GetAppId(app common.Address) ([32]byte, error) {
	return _AppAccount.Contract.GetAppId(&_AppAccount.CallOpts, app)
}

// GetInstalledApps is a free data retrieval call binding the contract method 0xdf16e879.
//
// Solidity: function getInstalledApps() view returns(address[])
func (_AppAccount *AppAccountCaller) GetInstalledApps(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _AppAccount.contract.Call(opts, &out, "getInstalledApps")

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetInstalledApps is a free data retrieval call binding the contract method 0xdf16e879.
//
// Solidity: function getInstalledApps() view returns(address[])
func (_AppAccount *AppAccountSession) GetInstalledApps() ([]common.Address, error) {
	return _AppAccount.Contract.GetInstalledApps(&_AppAccount.CallOpts)
}

// GetInstalledApps is a free data retrieval call binding the contract method 0xdf16e879.
//
// Solidity: function getInstalledApps() view returns(address[])
func (_AppAccount *AppAccountCallerSession) GetInstalledApps() ([]common.Address, error) {
	return _AppAccount.Contract.GetInstalledApps(&_AppAccount.CallOpts)
}

// IsAppEntitled is a free data retrieval call binding the contract method 0x631e7da5.
//
// Solidity: function isAppEntitled(address app, address publicKey, bytes32 permission) view returns(bool)
func (_AppAccount *AppAccountCaller) IsAppEntitled(opts *bind.CallOpts, app common.Address, publicKey common.Address, permission [32]byte) (bool, error) {
	var out []interface{}
	err := _AppAccount.contract.Call(opts, &out, "isAppEntitled", app, publicKey, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsAppEntitled is a free data retrieval call binding the contract method 0x631e7da5.
//
// Solidity: function isAppEntitled(address app, address publicKey, bytes32 permission) view returns(bool)
func (_AppAccount *AppAccountSession) IsAppEntitled(app common.Address, publicKey common.Address, permission [32]byte) (bool, error) {
	return _AppAccount.Contract.IsAppEntitled(&_AppAccount.CallOpts, app, publicKey, permission)
}

// IsAppEntitled is a free data retrieval call binding the contract method 0x631e7da5.
//
// Solidity: function isAppEntitled(address app, address publicKey, bytes32 permission) view returns(bool)
func (_AppAccount *AppAccountCallerSession) IsAppEntitled(app common.Address, publicKey common.Address, permission [32]byte) (bool, error) {
	return _AppAccount.Contract.IsAppEntitled(&_AppAccount.CallOpts, app, publicKey, permission)
}

// IsAppInstalled is a free data retrieval call binding the contract method 0xe92df000.
//
// Solidity: function isAppInstalled(address app) view returns(bool)
func (_AppAccount *AppAccountCaller) IsAppInstalled(opts *bind.CallOpts, app common.Address) (bool, error) {
	var out []interface{}
	err := _AppAccount.contract.Call(opts, &out, "isAppInstalled", app)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsAppInstalled is a free data retrieval call binding the contract method 0xe92df000.
//
// Solidity: function isAppInstalled(address app) view returns(bool)
func (_AppAccount *AppAccountSession) IsAppInstalled(app common.Address) (bool, error) {
	return _AppAccount.Contract.IsAppInstalled(&_AppAccount.CallOpts, app)
}

// IsAppInstalled is a free data retrieval call binding the contract method 0xe92df000.
//
// Solidity: function isAppInstalled(address app) view returns(bool)
func (_AppAccount *AppAccountCallerSession) IsAppInstalled(app common.Address) (bool, error) {
	return _AppAccount.Contract.IsAppInstalled(&_AppAccount.CallOpts, app)
}

// DisableApp is a paid mutator transaction binding the contract method 0xdb0fd53b.
//
// Solidity: function disableApp(address app) returns()
func (_AppAccount *AppAccountTransactor) DisableApp(opts *bind.TransactOpts, app common.Address) (*types.Transaction, error) {
	return _AppAccount.contract.Transact(opts, "disableApp", app)
}

// DisableApp is a paid mutator transaction binding the contract method 0xdb0fd53b.
//
// Solidity: function disableApp(address app) returns()
func (_AppAccount *AppAccountSession) DisableApp(app common.Address) (*types.Transaction, error) {
	return _AppAccount.Contract.DisableApp(&_AppAccount.TransactOpts, app)
}

// DisableApp is a paid mutator transaction binding the contract method 0xdb0fd53b.
//
// Solidity: function disableApp(address app) returns()
func (_AppAccount *AppAccountTransactorSession) DisableApp(app common.Address) (*types.Transaction, error) {
	return _AppAccount.Contract.DisableApp(&_AppAccount.TransactOpts, app)
}

// EnableApp is a paid mutator transaction binding the contract method 0x787f863d.
//
// Solidity: function enableApp(address app) returns()
func (_AppAccount *AppAccountTransactor) EnableApp(opts *bind.TransactOpts, app common.Address) (*types.Transaction, error) {
	return _AppAccount.contract.Transact(opts, "enableApp", app)
}

// EnableApp is a paid mutator transaction binding the contract method 0x787f863d.
//
// Solidity: function enableApp(address app) returns()
func (_AppAccount *AppAccountSession) EnableApp(app common.Address) (*types.Transaction, error) {
	return _AppAccount.Contract.EnableApp(&_AppAccount.TransactOpts, app)
}

// EnableApp is a paid mutator transaction binding the contract method 0x787f863d.
//
// Solidity: function enableApp(address app) returns()
func (_AppAccount *AppAccountTransactorSession) EnableApp(app common.Address) (*types.Transaction, error) {
	return _AppAccount.Contract.EnableApp(&_AppAccount.TransactOpts, app)
}

// OnInstallApp is a paid mutator transaction binding the contract method 0x3406a093.
//
// Solidity: function onInstallApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountTransactor) OnInstallApp(opts *bind.TransactOpts, appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.contract.Transact(opts, "onInstallApp", appId, data)
}

// OnInstallApp is a paid mutator transaction binding the contract method 0x3406a093.
//
// Solidity: function onInstallApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountSession) OnInstallApp(appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.Contract.OnInstallApp(&_AppAccount.TransactOpts, appId, data)
}

// OnInstallApp is a paid mutator transaction binding the contract method 0x3406a093.
//
// Solidity: function onInstallApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountTransactorSession) OnInstallApp(appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.Contract.OnInstallApp(&_AppAccount.TransactOpts, appId, data)
}

// OnRenewApp is a paid mutator transaction binding the contract method 0x04fe5cdc.
//
// Solidity: function onRenewApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountTransactor) OnRenewApp(opts *bind.TransactOpts, appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.contract.Transact(opts, "onRenewApp", appId, data)
}

// OnRenewApp is a paid mutator transaction binding the contract method 0x04fe5cdc.
//
// Solidity: function onRenewApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountSession) OnRenewApp(appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.Contract.OnRenewApp(&_AppAccount.TransactOpts, appId, data)
}

// OnRenewApp is a paid mutator transaction binding the contract method 0x04fe5cdc.
//
// Solidity: function onRenewApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountTransactorSession) OnRenewApp(appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.Contract.OnRenewApp(&_AppAccount.TransactOpts, appId, data)
}

// OnUninstallApp is a paid mutator transaction binding the contract method 0xa023fcbb.
//
// Solidity: function onUninstallApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountTransactor) OnUninstallApp(opts *bind.TransactOpts, appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.contract.Transact(opts, "onUninstallApp", appId, data)
}

// OnUninstallApp is a paid mutator transaction binding the contract method 0xa023fcbb.
//
// Solidity: function onUninstallApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountSession) OnUninstallApp(appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.Contract.OnUninstallApp(&_AppAccount.TransactOpts, appId, data)
}

// OnUninstallApp is a paid mutator transaction binding the contract method 0xa023fcbb.
//
// Solidity: function onUninstallApp(bytes32 appId, bytes data) returns()
func (_AppAccount *AppAccountTransactorSession) OnUninstallApp(appId [32]byte, data []byte) (*types.Transaction, error) {
	return _AppAccount.Contract.OnUninstallApp(&_AppAccount.TransactOpts, appId, data)
}
