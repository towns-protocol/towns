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

// ExecutionManifest is an auto generated low-level Go binding around an user-defined struct.
type ExecutionManifest struct {
	ExecutionFunctions []ManifestExecutionFunction
	ExecutionHooks     []ManifestExecutionHook
	InterfaceIds       [][4]byte
}

// IAppRegistryBaseApp is an auto generated low-level Go binding around an user-defined struct.
type IAppRegistryBaseApp struct {
	AppId       [32]byte
	Module      common.Address
	Owner       common.Address
	Client      common.Address
	Permissions [][32]byte
	Manifest    ExecutionManifest
	Duration    *big.Int
}

// IAppRegistryBaseAppParams is an auto generated low-level Go binding around an user-defined struct.
type IAppRegistryBaseAppParams struct {
	Name           string
	Permissions    [][32]byte
	Client         common.Address
	InstallPrice   *big.Int
	AccessDuration *big.Int
}

// ManifestExecutionFunction is an auto generated low-level Go binding around an user-defined struct.
type ManifestExecutionFunction struct {
	ExecutionSelector     [4]byte
	SkipRuntimeValidation bool
	AllowGlobalValidation bool
}

// ManifestExecutionHook is an auto generated low-level Go binding around an user-defined struct.
type ManifestExecutionHook struct {
	ExecutionSelector [4]byte
	EntityId          uint32
	IsPreHook         bool
	IsPostHook        bool
}

// AppRegistryMetaData contains all meta data concerning the AppRegistry contract.
var AppRegistryMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"adminBanApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"adminRegisterAppSchema\",\"inputs\":[{\"name\":\"schema\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"resolver\",\"type\":\"address\",\"internalType\":\"contractISchemaResolver\"},{\"name\":\"revocable\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createApp\",\"inputs\":[{\"name\":\"params\",\"type\":\"tuple\",\"internalType\":\"structIAppRegistryBase.AppParams\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"permissions\",\"type\":\"bytes32[]\",\"internalType\":\"bytes32[]\"},{\"name\":\"client\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"installPrice\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"accessDuration\",\"type\":\"uint48\",\"internalType\":\"uint48\"}]}],\"outputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"getAppByClient\",\"inputs\":[{\"name\":\"client\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAppById\",\"inputs\":[{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIAppRegistryBase.App\",\"components\":[{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"module\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"client\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permissions\",\"type\":\"bytes32[]\",\"internalType\":\"bytes32[]\"},{\"name\":\"manifest\",\"type\":\"tuple\",\"internalType\":\"structExecutionManifest\",\"components\":[{\"name\":\"executionFunctions\",\"type\":\"tuple[]\",\"internalType\":\"structManifestExecutionFunction[]\",\"components\":[{\"name\":\"executionSelector\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"},{\"name\":\"skipRuntimeValidation\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"allowGlobalValidation\",\"type\":\"bool\",\"internalType\":\"bool\"}]},{\"name\":\"executionHooks\",\"type\":\"tuple[]\",\"internalType\":\"structManifestExecutionHook[]\",\"components\":[{\"name\":\"executionSelector\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"},{\"name\":\"entityId\",\"type\":\"uint32\",\"internalType\":\"uint32\"},{\"name\":\"isPreHook\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"isPostHook\",\"type\":\"bool\",\"internalType\":\"bool\"}]},{\"name\":\"interfaceIds\",\"type\":\"bytes4[]\",\"internalType\":\"bytes4[]\"}]},{\"name\":\"duration\",\"type\":\"uint48\",\"internalType\":\"uint48\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAppDuration\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint48\",\"internalType\":\"uint48\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAppPrice\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAppSchema\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAppSchemaId\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestAppId\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"installApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"contractITownsApp\"},{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"contractIAppAccount\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"isAppBanned\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registerApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"contractITownsApp\"},{\"name\":\"client\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"removeApp\",\"inputs\":[{\"name\":\"appId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"renewApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"contractITownsApp\"},{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"contractIAppAccount\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"uninstallApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"contractITownsApp\"},{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"contractIAppAccount\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"AppBanned\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppCreated\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppInstalled\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"appId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppRegistered\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppRenewed\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"appId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppSchemaSet\",\"inputs\":[{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppUninstalled\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"appId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppUnregistered\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppUpdated\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"AppAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppDoesNotImplementInterface\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppNotInstalled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppRevoked\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BannedApp\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ClientAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InsufficientPayment\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAddressInput\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAppId\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAppName\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidArrayInput\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidDuration\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidPrice\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotAppOwner\",\"inputs\":[]}]",
}

// AppRegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use AppRegistryMetaData.ABI instead.
var AppRegistryABI = AppRegistryMetaData.ABI

// AppRegistry is an auto generated Go binding around an Ethereum contract.
type AppRegistry struct {
	AppRegistryCaller     // Read-only binding to the contract
	AppRegistryTransactor // Write-only binding to the contract
	AppRegistryFilterer   // Log filterer for contract events
}

// AppRegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type AppRegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AppRegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type AppRegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AppRegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type AppRegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AppRegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type AppRegistrySession struct {
	Contract     *AppRegistry      // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// AppRegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type AppRegistryCallerSession struct {
	Contract *AppRegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts      // Call options to use throughout this session
}

// AppRegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type AppRegistryTransactorSession struct {
	Contract     *AppRegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// AppRegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type AppRegistryRaw struct {
	Contract *AppRegistry // Generic contract binding to access the raw methods on
}

// AppRegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type AppRegistryCallerRaw struct {
	Contract *AppRegistryCaller // Generic read-only contract binding to access the raw methods on
}

// AppRegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type AppRegistryTransactorRaw struct {
	Contract *AppRegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewAppRegistry creates a new instance of AppRegistry, bound to a specific deployed contract.
func NewAppRegistry(address common.Address, backend bind.ContractBackend) (*AppRegistry, error) {
	contract, err := bindAppRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &AppRegistry{AppRegistryCaller: AppRegistryCaller{contract: contract}, AppRegistryTransactor: AppRegistryTransactor{contract: contract}, AppRegistryFilterer: AppRegistryFilterer{contract: contract}}, nil
}

// NewAppRegistryCaller creates a new read-only instance of AppRegistry, bound to a specific deployed contract.
func NewAppRegistryCaller(address common.Address, caller bind.ContractCaller) (*AppRegistryCaller, error) {
	contract, err := bindAppRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &AppRegistryCaller{contract: contract}, nil
}

// NewAppRegistryTransactor creates a new write-only instance of AppRegistry, bound to a specific deployed contract.
func NewAppRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*AppRegistryTransactor, error) {
	contract, err := bindAppRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &AppRegistryTransactor{contract: contract}, nil
}

// NewAppRegistryFilterer creates a new log filterer instance of AppRegistry, bound to a specific deployed contract.
func NewAppRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*AppRegistryFilterer, error) {
	contract, err := bindAppRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &AppRegistryFilterer{contract: contract}, nil
}

// bindAppRegistry binds a generic wrapper to an already deployed contract.
func bindAppRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := AppRegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_AppRegistry *AppRegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _AppRegistry.Contract.AppRegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_AppRegistry *AppRegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _AppRegistry.Contract.AppRegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_AppRegistry *AppRegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _AppRegistry.Contract.AppRegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_AppRegistry *AppRegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _AppRegistry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_AppRegistry *AppRegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _AppRegistry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_AppRegistry *AppRegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _AppRegistry.Contract.contract.Transact(opts, method, params...)
}

// GetAppByClient is a free data retrieval call binding the contract method 0x75dfa342.
//
// Solidity: function getAppByClient(address client) view returns(address)
func (_AppRegistry *AppRegistryCaller) GetAppByClient(opts *bind.CallOpts, client common.Address) (common.Address, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "getAppByClient", client)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetAppByClient is a free data retrieval call binding the contract method 0x75dfa342.
//
// Solidity: function getAppByClient(address client) view returns(address)
func (_AppRegistry *AppRegistrySession) GetAppByClient(client common.Address) (common.Address, error) {
	return _AppRegistry.Contract.GetAppByClient(&_AppRegistry.CallOpts, client)
}

// GetAppByClient is a free data retrieval call binding the contract method 0x75dfa342.
//
// Solidity: function getAppByClient(address client) view returns(address)
func (_AppRegistry *AppRegistryCallerSession) GetAppByClient(client common.Address) (common.Address, error) {
	return _AppRegistry.Contract.GetAppByClient(&_AppRegistry.CallOpts, client)
}

// GetAppById is a free data retrieval call binding the contract method 0xfb609045.
//
// Solidity: function getAppById(bytes32 appId) view returns((bytes32,address,address,address,bytes32[],((bytes4,bool,bool)[],(bytes4,uint32,bool,bool)[],bytes4[]),uint48))
func (_AppRegistry *AppRegistryCaller) GetAppById(opts *bind.CallOpts, appId [32]byte) (IAppRegistryBaseApp, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "getAppById", appId)

	if err != nil {
		return *new(IAppRegistryBaseApp), err
	}

	out0 := *abi.ConvertType(out[0], new(IAppRegistryBaseApp)).(*IAppRegistryBaseApp)

	return out0, err

}

// GetAppById is a free data retrieval call binding the contract method 0xfb609045.
//
// Solidity: function getAppById(bytes32 appId) view returns((bytes32,address,address,address,bytes32[],((bytes4,bool,bool)[],(bytes4,uint32,bool,bool)[],bytes4[]),uint48))
func (_AppRegistry *AppRegistrySession) GetAppById(appId [32]byte) (IAppRegistryBaseApp, error) {
	return _AppRegistry.Contract.GetAppById(&_AppRegistry.CallOpts, appId)
}

// GetAppById is a free data retrieval call binding the contract method 0xfb609045.
//
// Solidity: function getAppById(bytes32 appId) view returns((bytes32,address,address,address,bytes32[],((bytes4,bool,bool)[],(bytes4,uint32,bool,bool)[],bytes4[]),uint48))
func (_AppRegistry *AppRegistryCallerSession) GetAppById(appId [32]byte) (IAppRegistryBaseApp, error) {
	return _AppRegistry.Contract.GetAppById(&_AppRegistry.CallOpts, appId)
}

// GetAppDuration is a free data retrieval call binding the contract method 0xf78b12cb.
//
// Solidity: function getAppDuration(address app) view returns(uint48)
func (_AppRegistry *AppRegistryCaller) GetAppDuration(opts *bind.CallOpts, app common.Address) (*big.Int, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "getAppDuration", app)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetAppDuration is a free data retrieval call binding the contract method 0xf78b12cb.
//
// Solidity: function getAppDuration(address app) view returns(uint48)
func (_AppRegistry *AppRegistrySession) GetAppDuration(app common.Address) (*big.Int, error) {
	return _AppRegistry.Contract.GetAppDuration(&_AppRegistry.CallOpts, app)
}

// GetAppDuration is a free data retrieval call binding the contract method 0xf78b12cb.
//
// Solidity: function getAppDuration(address app) view returns(uint48)
func (_AppRegistry *AppRegistryCallerSession) GetAppDuration(app common.Address) (*big.Int, error) {
	return _AppRegistry.Contract.GetAppDuration(&_AppRegistry.CallOpts, app)
}

// GetAppPrice is a free data retrieval call binding the contract method 0xb35bbe8d.
//
// Solidity: function getAppPrice(address app) view returns(uint256)
func (_AppRegistry *AppRegistryCaller) GetAppPrice(opts *bind.CallOpts, app common.Address) (*big.Int, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "getAppPrice", app)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetAppPrice is a free data retrieval call binding the contract method 0xb35bbe8d.
//
// Solidity: function getAppPrice(address app) view returns(uint256)
func (_AppRegistry *AppRegistrySession) GetAppPrice(app common.Address) (*big.Int, error) {
	return _AppRegistry.Contract.GetAppPrice(&_AppRegistry.CallOpts, app)
}

// GetAppPrice is a free data retrieval call binding the contract method 0xb35bbe8d.
//
// Solidity: function getAppPrice(address app) view returns(uint256)
func (_AppRegistry *AppRegistryCallerSession) GetAppPrice(app common.Address) (*big.Int, error) {
	return _AppRegistry.Contract.GetAppPrice(&_AppRegistry.CallOpts, app)
}

// GetAppSchema is a free data retrieval call binding the contract method 0x5db78f1f.
//
// Solidity: function getAppSchema() view returns(string)
func (_AppRegistry *AppRegistryCaller) GetAppSchema(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "getAppSchema")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// GetAppSchema is a free data retrieval call binding the contract method 0x5db78f1f.
//
// Solidity: function getAppSchema() view returns(string)
func (_AppRegistry *AppRegistrySession) GetAppSchema() (string, error) {
	return _AppRegistry.Contract.GetAppSchema(&_AppRegistry.CallOpts)
}

// GetAppSchema is a free data retrieval call binding the contract method 0x5db78f1f.
//
// Solidity: function getAppSchema() view returns(string)
func (_AppRegistry *AppRegistryCallerSession) GetAppSchema() (string, error) {
	return _AppRegistry.Contract.GetAppSchema(&_AppRegistry.CallOpts)
}

// GetAppSchemaId is a free data retrieval call binding the contract method 0xdf872abf.
//
// Solidity: function getAppSchemaId() view returns(bytes32)
func (_AppRegistry *AppRegistryCaller) GetAppSchemaId(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "getAppSchemaId")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// GetAppSchemaId is a free data retrieval call binding the contract method 0xdf872abf.
//
// Solidity: function getAppSchemaId() view returns(bytes32)
func (_AppRegistry *AppRegistrySession) GetAppSchemaId() ([32]byte, error) {
	return _AppRegistry.Contract.GetAppSchemaId(&_AppRegistry.CallOpts)
}

// GetAppSchemaId is a free data retrieval call binding the contract method 0xdf872abf.
//
// Solidity: function getAppSchemaId() view returns(bytes32)
func (_AppRegistry *AppRegistryCallerSession) GetAppSchemaId() ([32]byte, error) {
	return _AppRegistry.Contract.GetAppSchemaId(&_AppRegistry.CallOpts)
}

// GetLatestAppId is a free data retrieval call binding the contract method 0x712e46df.
//
// Solidity: function getLatestAppId(address app) view returns(bytes32)
func (_AppRegistry *AppRegistryCaller) GetLatestAppId(opts *bind.CallOpts, app common.Address) ([32]byte, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "getLatestAppId", app)

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// GetLatestAppId is a free data retrieval call binding the contract method 0x712e46df.
//
// Solidity: function getLatestAppId(address app) view returns(bytes32)
func (_AppRegistry *AppRegistrySession) GetLatestAppId(app common.Address) ([32]byte, error) {
	return _AppRegistry.Contract.GetLatestAppId(&_AppRegistry.CallOpts, app)
}

// GetLatestAppId is a free data retrieval call binding the contract method 0x712e46df.
//
// Solidity: function getLatestAppId(address app) view returns(bytes32)
func (_AppRegistry *AppRegistryCallerSession) GetLatestAppId(app common.Address) ([32]byte, error) {
	return _AppRegistry.Contract.GetLatestAppId(&_AppRegistry.CallOpts, app)
}

// IsAppBanned is a free data retrieval call binding the contract method 0x8c2a729a.
//
// Solidity: function isAppBanned(address app) view returns(bool)
func (_AppRegistry *AppRegistryCaller) IsAppBanned(opts *bind.CallOpts, app common.Address) (bool, error) {
	var out []interface{}
	err := _AppRegistry.contract.Call(opts, &out, "isAppBanned", app)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsAppBanned is a free data retrieval call binding the contract method 0x8c2a729a.
//
// Solidity: function isAppBanned(address app) view returns(bool)
func (_AppRegistry *AppRegistrySession) IsAppBanned(app common.Address) (bool, error) {
	return _AppRegistry.Contract.IsAppBanned(&_AppRegistry.CallOpts, app)
}

// IsAppBanned is a free data retrieval call binding the contract method 0x8c2a729a.
//
// Solidity: function isAppBanned(address app) view returns(bool)
func (_AppRegistry *AppRegistryCallerSession) IsAppBanned(app common.Address) (bool, error) {
	return _AppRegistry.Contract.IsAppBanned(&_AppRegistry.CallOpts, app)
}

// AdminBanApp is a paid mutator transaction binding the contract method 0x5c0aa7da.
//
// Solidity: function adminBanApp(address app) returns(bytes32)
func (_AppRegistry *AppRegistryTransactor) AdminBanApp(opts *bind.TransactOpts, app common.Address) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "adminBanApp", app)
}

// AdminBanApp is a paid mutator transaction binding the contract method 0x5c0aa7da.
//
// Solidity: function adminBanApp(address app) returns(bytes32)
func (_AppRegistry *AppRegistrySession) AdminBanApp(app common.Address) (*types.Transaction, error) {
	return _AppRegistry.Contract.AdminBanApp(&_AppRegistry.TransactOpts, app)
}

// AdminBanApp is a paid mutator transaction binding the contract method 0x5c0aa7da.
//
// Solidity: function adminBanApp(address app) returns(bytes32)
func (_AppRegistry *AppRegistryTransactorSession) AdminBanApp(app common.Address) (*types.Transaction, error) {
	return _AppRegistry.Contract.AdminBanApp(&_AppRegistry.TransactOpts, app)
}

// AdminRegisterAppSchema is a paid mutator transaction binding the contract method 0x701dc910.
//
// Solidity: function adminRegisterAppSchema(string schema, address resolver, bool revocable) returns(bytes32)
func (_AppRegistry *AppRegistryTransactor) AdminRegisterAppSchema(opts *bind.TransactOpts, schema string, resolver common.Address, revocable bool) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "adminRegisterAppSchema", schema, resolver, revocable)
}

// AdminRegisterAppSchema is a paid mutator transaction binding the contract method 0x701dc910.
//
// Solidity: function adminRegisterAppSchema(string schema, address resolver, bool revocable) returns(bytes32)
func (_AppRegistry *AppRegistrySession) AdminRegisterAppSchema(schema string, resolver common.Address, revocable bool) (*types.Transaction, error) {
	return _AppRegistry.Contract.AdminRegisterAppSchema(&_AppRegistry.TransactOpts, schema, resolver, revocable)
}

// AdminRegisterAppSchema is a paid mutator transaction binding the contract method 0x701dc910.
//
// Solidity: function adminRegisterAppSchema(string schema, address resolver, bool revocable) returns(bytes32)
func (_AppRegistry *AppRegistryTransactorSession) AdminRegisterAppSchema(schema string, resolver common.Address, revocable bool) (*types.Transaction, error) {
	return _AppRegistry.Contract.AdminRegisterAppSchema(&_AppRegistry.TransactOpts, schema, resolver, revocable)
}

// CreateApp is a paid mutator transaction binding the contract method 0x035e0499.
//
// Solidity: function createApp((string,bytes32[],address,uint256,uint48) params) payable returns(address app, bytes32 appId)
func (_AppRegistry *AppRegistryTransactor) CreateApp(opts *bind.TransactOpts, params IAppRegistryBaseAppParams) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "createApp", params)
}

// CreateApp is a paid mutator transaction binding the contract method 0x035e0499.
//
// Solidity: function createApp((string,bytes32[],address,uint256,uint48) params) payable returns(address app, bytes32 appId)
func (_AppRegistry *AppRegistrySession) CreateApp(params IAppRegistryBaseAppParams) (*types.Transaction, error) {
	return _AppRegistry.Contract.CreateApp(&_AppRegistry.TransactOpts, params)
}

// CreateApp is a paid mutator transaction binding the contract method 0x035e0499.
//
// Solidity: function createApp((string,bytes32[],address,uint256,uint48) params) payable returns(address app, bytes32 appId)
func (_AppRegistry *AppRegistryTransactorSession) CreateApp(params IAppRegistryBaseAppParams) (*types.Transaction, error) {
	return _AppRegistry.Contract.CreateApp(&_AppRegistry.TransactOpts, params)
}

// InstallApp is a paid mutator transaction binding the contract method 0x66f4bd18.
//
// Solidity: function installApp(address app, address account, bytes data) payable returns()
func (_AppRegistry *AppRegistryTransactor) InstallApp(opts *bind.TransactOpts, app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "installApp", app, account, data)
}

// InstallApp is a paid mutator transaction binding the contract method 0x66f4bd18.
//
// Solidity: function installApp(address app, address account, bytes data) payable returns()
func (_AppRegistry *AppRegistrySession) InstallApp(app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.InstallApp(&_AppRegistry.TransactOpts, app, account, data)
}

// InstallApp is a paid mutator transaction binding the contract method 0x66f4bd18.
//
// Solidity: function installApp(address app, address account, bytes data) payable returns()
func (_AppRegistry *AppRegistryTransactorSession) InstallApp(app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.InstallApp(&_AppRegistry.TransactOpts, app, account, data)
}

// RegisterApp is a paid mutator transaction binding the contract method 0x357b8c27.
//
// Solidity: function registerApp(address app, address client) payable returns(bytes32 appId)
func (_AppRegistry *AppRegistryTransactor) RegisterApp(opts *bind.TransactOpts, app common.Address, client common.Address) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "registerApp", app, client)
}

// RegisterApp is a paid mutator transaction binding the contract method 0x357b8c27.
//
// Solidity: function registerApp(address app, address client) payable returns(bytes32 appId)
func (_AppRegistry *AppRegistrySession) RegisterApp(app common.Address, client common.Address) (*types.Transaction, error) {
	return _AppRegistry.Contract.RegisterApp(&_AppRegistry.TransactOpts, app, client)
}

// RegisterApp is a paid mutator transaction binding the contract method 0x357b8c27.
//
// Solidity: function registerApp(address app, address client) payable returns(bytes32 appId)
func (_AppRegistry *AppRegistryTransactorSession) RegisterApp(app common.Address, client common.Address) (*types.Transaction, error) {
	return _AppRegistry.Contract.RegisterApp(&_AppRegistry.TransactOpts, app, client)
}

// RemoveApp is a paid mutator transaction binding the contract method 0x1f1bf78b.
//
// Solidity: function removeApp(bytes32 appId) returns()
func (_AppRegistry *AppRegistryTransactor) RemoveApp(opts *bind.TransactOpts, appId [32]byte) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "removeApp", appId)
}

// RemoveApp is a paid mutator transaction binding the contract method 0x1f1bf78b.
//
// Solidity: function removeApp(bytes32 appId) returns()
func (_AppRegistry *AppRegistrySession) RemoveApp(appId [32]byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.RemoveApp(&_AppRegistry.TransactOpts, appId)
}

// RemoveApp is a paid mutator transaction binding the contract method 0x1f1bf78b.
//
// Solidity: function removeApp(bytes32 appId) returns()
func (_AppRegistry *AppRegistryTransactorSession) RemoveApp(appId [32]byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.RemoveApp(&_AppRegistry.TransactOpts, appId)
}

// RenewApp is a paid mutator transaction binding the contract method 0x50bf9d01.
//
// Solidity: function renewApp(address app, address account, bytes data) payable returns()
func (_AppRegistry *AppRegistryTransactor) RenewApp(opts *bind.TransactOpts, app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "renewApp", app, account, data)
}

// RenewApp is a paid mutator transaction binding the contract method 0x50bf9d01.
//
// Solidity: function renewApp(address app, address account, bytes data) payable returns()
func (_AppRegistry *AppRegistrySession) RenewApp(app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.RenewApp(&_AppRegistry.TransactOpts, app, account, data)
}

// RenewApp is a paid mutator transaction binding the contract method 0x50bf9d01.
//
// Solidity: function renewApp(address app, address account, bytes data) payable returns()
func (_AppRegistry *AppRegistryTransactorSession) RenewApp(app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.RenewApp(&_AppRegistry.TransactOpts, app, account, data)
}

// UninstallApp is a paid mutator transaction binding the contract method 0xac24cd4f.
//
// Solidity: function uninstallApp(address app, address account, bytes data) returns()
func (_AppRegistry *AppRegistryTransactor) UninstallApp(opts *bind.TransactOpts, app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.contract.Transact(opts, "uninstallApp", app, account, data)
}

// UninstallApp is a paid mutator transaction binding the contract method 0xac24cd4f.
//
// Solidity: function uninstallApp(address app, address account, bytes data) returns()
func (_AppRegistry *AppRegistrySession) UninstallApp(app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.UninstallApp(&_AppRegistry.TransactOpts, app, account, data)
}

// UninstallApp is a paid mutator transaction binding the contract method 0xac24cd4f.
//
// Solidity: function uninstallApp(address app, address account, bytes data) returns()
func (_AppRegistry *AppRegistryTransactorSession) UninstallApp(app common.Address, account common.Address, data []byte) (*types.Transaction, error) {
	return _AppRegistry.Contract.UninstallApp(&_AppRegistry.TransactOpts, app, account, data)
}

// AppRegistryAppBannedIterator is returned from FilterAppBanned and is used to iterate over the raw logs and unpacked data for AppBanned events raised by the AppRegistry contract.
type AppRegistryAppBannedIterator struct {
	Event *AppRegistryAppBanned // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppBannedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppBanned)
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
		it.Event = new(AppRegistryAppBanned)
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
func (it *AppRegistryAppBannedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppBannedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppBanned represents a AppBanned event raised by the AppRegistry contract.
type AppRegistryAppBanned struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppBanned is a free log retrieval operation binding the contract event 0xdd3476c5c02a5b7abb7375531dc9b1bf8dcdf5ab9ee67b1baa2c0964183a9426.
//
// Solidity: event AppBanned(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) FilterAppBanned(opts *bind.FilterOpts, app []common.Address) (*AppRegistryAppBannedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppBanned", appRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppBannedIterator{contract: _AppRegistry.contract, event: "AppBanned", logs: logs, sub: sub}, nil
}

// WatchAppBanned is a free log subscription operation binding the contract event 0xdd3476c5c02a5b7abb7375531dc9b1bf8dcdf5ab9ee67b1baa2c0964183a9426.
//
// Solidity: event AppBanned(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) WatchAppBanned(opts *bind.WatchOpts, sink chan<- *AppRegistryAppBanned, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppBanned", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppBanned)
				if err := _AppRegistry.contract.UnpackLog(event, "AppBanned", log); err != nil {
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

// ParseAppBanned is a log parse operation binding the contract event 0xdd3476c5c02a5b7abb7375531dc9b1bf8dcdf5ab9ee67b1baa2c0964183a9426.
//
// Solidity: event AppBanned(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) ParseAppBanned(log types.Log) (*AppRegistryAppBanned, error) {
	event := new(AppRegistryAppBanned)
	if err := _AppRegistry.contract.UnpackLog(event, "AppBanned", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppCreatedIterator is returned from FilterAppCreated and is used to iterate over the raw logs and unpacked data for AppCreated events raised by the AppRegistry contract.
type AppRegistryAppCreatedIterator struct {
	Event *AppRegistryAppCreated // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppCreated)
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
		it.Event = new(AppRegistryAppCreated)
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
func (it *AppRegistryAppCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppCreated represents a AppCreated event raised by the AppRegistry contract.
type AppRegistryAppCreated struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppCreated is a free log retrieval operation binding the contract event 0x4ef1c746ec01bf724b6101c8e9a6852a9e175232ed3b66e06c221514213661dc.
//
// Solidity: event AppCreated(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) FilterAppCreated(opts *bind.FilterOpts, app []common.Address) (*AppRegistryAppCreatedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppCreated", appRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppCreatedIterator{contract: _AppRegistry.contract, event: "AppCreated", logs: logs, sub: sub}, nil
}

// WatchAppCreated is a free log subscription operation binding the contract event 0x4ef1c746ec01bf724b6101c8e9a6852a9e175232ed3b66e06c221514213661dc.
//
// Solidity: event AppCreated(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) WatchAppCreated(opts *bind.WatchOpts, sink chan<- *AppRegistryAppCreated, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppCreated", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppCreated)
				if err := _AppRegistry.contract.UnpackLog(event, "AppCreated", log); err != nil {
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

// ParseAppCreated is a log parse operation binding the contract event 0x4ef1c746ec01bf724b6101c8e9a6852a9e175232ed3b66e06c221514213661dc.
//
// Solidity: event AppCreated(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) ParseAppCreated(log types.Log) (*AppRegistryAppCreated, error) {
	event := new(AppRegistryAppCreated)
	if err := _AppRegistry.contract.UnpackLog(event, "AppCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppInstalledIterator is returned from FilterAppInstalled and is used to iterate over the raw logs and unpacked data for AppInstalled events raised by the AppRegistry contract.
type AppRegistryAppInstalledIterator struct {
	Event *AppRegistryAppInstalled // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppInstalledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppInstalled)
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
		it.Event = new(AppRegistryAppInstalled)
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
func (it *AppRegistryAppInstalledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppInstalledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppInstalled represents a AppInstalled event raised by the AppRegistry contract.
type AppRegistryAppInstalled struct {
	App     common.Address
	Account common.Address
	AppId   [32]byte
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterAppInstalled is a free log retrieval operation binding the contract event 0x964f2b980b9892debcc394f32662d711d5b6417bf23117f145240a8a0ba4b8c3.
//
// Solidity: event AppInstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) FilterAppInstalled(opts *bind.FilterOpts, app []common.Address, account []common.Address, appId [][32]byte) (*AppRegistryAppInstalledIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppInstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppInstalledIterator{contract: _AppRegistry.contract, event: "AppInstalled", logs: logs, sub: sub}, nil
}

// WatchAppInstalled is a free log subscription operation binding the contract event 0x964f2b980b9892debcc394f32662d711d5b6417bf23117f145240a8a0ba4b8c3.
//
// Solidity: event AppInstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) WatchAppInstalled(opts *bind.WatchOpts, sink chan<- *AppRegistryAppInstalled, app []common.Address, account []common.Address, appId [][32]byte) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppInstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppInstalled)
				if err := _AppRegistry.contract.UnpackLog(event, "AppInstalled", log); err != nil {
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

// ParseAppInstalled is a log parse operation binding the contract event 0x964f2b980b9892debcc394f32662d711d5b6417bf23117f145240a8a0ba4b8c3.
//
// Solidity: event AppInstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) ParseAppInstalled(log types.Log) (*AppRegistryAppInstalled, error) {
	event := new(AppRegistryAppInstalled)
	if err := _AppRegistry.contract.UnpackLog(event, "AppInstalled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppRegisteredIterator is returned from FilterAppRegistered and is used to iterate over the raw logs and unpacked data for AppRegistered events raised by the AppRegistry contract.
type AppRegistryAppRegisteredIterator struct {
	Event *AppRegistryAppRegistered // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppRegistered)
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
		it.Event = new(AppRegistryAppRegistered)
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
func (it *AppRegistryAppRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppRegistered represents a AppRegistered event raised by the AppRegistry contract.
type AppRegistryAppRegistered struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppRegistered is a free log retrieval operation binding the contract event 0xb29dff3e705ef0b6c125758b5859218021c5b462839d71e83b0b6be86ed0802a.
//
// Solidity: event AppRegistered(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) FilterAppRegistered(opts *bind.FilterOpts, app []common.Address) (*AppRegistryAppRegisteredIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppRegistered", appRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppRegisteredIterator{contract: _AppRegistry.contract, event: "AppRegistered", logs: logs, sub: sub}, nil
}

// WatchAppRegistered is a free log subscription operation binding the contract event 0xb29dff3e705ef0b6c125758b5859218021c5b462839d71e83b0b6be86ed0802a.
//
// Solidity: event AppRegistered(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) WatchAppRegistered(opts *bind.WatchOpts, sink chan<- *AppRegistryAppRegistered, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppRegistered", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppRegistered)
				if err := _AppRegistry.contract.UnpackLog(event, "AppRegistered", log); err != nil {
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

// ParseAppRegistered is a log parse operation binding the contract event 0xb29dff3e705ef0b6c125758b5859218021c5b462839d71e83b0b6be86ed0802a.
//
// Solidity: event AppRegistered(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) ParseAppRegistered(log types.Log) (*AppRegistryAppRegistered, error) {
	event := new(AppRegistryAppRegistered)
	if err := _AppRegistry.contract.UnpackLog(event, "AppRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppRenewedIterator is returned from FilterAppRenewed and is used to iterate over the raw logs and unpacked data for AppRenewed events raised by the AppRegistry contract.
type AppRegistryAppRenewedIterator struct {
	Event *AppRegistryAppRenewed // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppRenewedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppRenewed)
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
		it.Event = new(AppRegistryAppRenewed)
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
func (it *AppRegistryAppRenewedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppRenewedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppRenewed represents a AppRenewed event raised by the AppRegistry contract.
type AppRegistryAppRenewed struct {
	App     common.Address
	Account common.Address
	AppId   [32]byte
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterAppRenewed is a free log retrieval operation binding the contract event 0xcd92821b6ef75242495e80ef40036955c209df02d7319bff0345ad60a5855a28.
//
// Solidity: event AppRenewed(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) FilterAppRenewed(opts *bind.FilterOpts, app []common.Address, account []common.Address, appId [][32]byte) (*AppRegistryAppRenewedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppRenewed", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppRenewedIterator{contract: _AppRegistry.contract, event: "AppRenewed", logs: logs, sub: sub}, nil
}

// WatchAppRenewed is a free log subscription operation binding the contract event 0xcd92821b6ef75242495e80ef40036955c209df02d7319bff0345ad60a5855a28.
//
// Solidity: event AppRenewed(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) WatchAppRenewed(opts *bind.WatchOpts, sink chan<- *AppRegistryAppRenewed, app []common.Address, account []common.Address, appId [][32]byte) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppRenewed", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppRenewed)
				if err := _AppRegistry.contract.UnpackLog(event, "AppRenewed", log); err != nil {
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

// ParseAppRenewed is a log parse operation binding the contract event 0xcd92821b6ef75242495e80ef40036955c209df02d7319bff0345ad60a5855a28.
//
// Solidity: event AppRenewed(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) ParseAppRenewed(log types.Log) (*AppRegistryAppRenewed, error) {
	event := new(AppRegistryAppRenewed)
	if err := _AppRegistry.contract.UnpackLog(event, "AppRenewed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppSchemaSetIterator is returned from FilterAppSchemaSet and is used to iterate over the raw logs and unpacked data for AppSchemaSet events raised by the AppRegistry contract.
type AppRegistryAppSchemaSetIterator struct {
	Event *AppRegistryAppSchemaSet // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppSchemaSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppSchemaSet)
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
		it.Event = new(AppRegistryAppSchemaSet)
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
func (it *AppRegistryAppSchemaSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppSchemaSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppSchemaSet represents a AppSchemaSet event raised by the AppRegistry contract.
type AppRegistryAppSchemaSet struct {
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppSchemaSet is a free log retrieval operation binding the contract event 0x723aec47bbea8010c7ccf9c1bc9b775634332ea88ed1fc27b93f3469b24264ec.
//
// Solidity: event AppSchemaSet(bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) FilterAppSchemaSet(opts *bind.FilterOpts) (*AppRegistryAppSchemaSetIterator, error) {

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppSchemaSet")
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppSchemaSetIterator{contract: _AppRegistry.contract, event: "AppSchemaSet", logs: logs, sub: sub}, nil
}

// WatchAppSchemaSet is a free log subscription operation binding the contract event 0x723aec47bbea8010c7ccf9c1bc9b775634332ea88ed1fc27b93f3469b24264ec.
//
// Solidity: event AppSchemaSet(bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) WatchAppSchemaSet(opts *bind.WatchOpts, sink chan<- *AppRegistryAppSchemaSet) (event.Subscription, error) {

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppSchemaSet")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppSchemaSet)
				if err := _AppRegistry.contract.UnpackLog(event, "AppSchemaSet", log); err != nil {
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

// ParseAppSchemaSet is a log parse operation binding the contract event 0x723aec47bbea8010c7ccf9c1bc9b775634332ea88ed1fc27b93f3469b24264ec.
//
// Solidity: event AppSchemaSet(bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) ParseAppSchemaSet(log types.Log) (*AppRegistryAppSchemaSet, error) {
	event := new(AppRegistryAppSchemaSet)
	if err := _AppRegistry.contract.UnpackLog(event, "AppSchemaSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppUninstalledIterator is returned from FilterAppUninstalled and is used to iterate over the raw logs and unpacked data for AppUninstalled events raised by the AppRegistry contract.
type AppRegistryAppUninstalledIterator struct {
	Event *AppRegistryAppUninstalled // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppUninstalledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppUninstalled)
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
		it.Event = new(AppRegistryAppUninstalled)
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
func (it *AppRegistryAppUninstalledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppUninstalledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppUninstalled represents a AppUninstalled event raised by the AppRegistry contract.
type AppRegistryAppUninstalled struct {
	App     common.Address
	Account common.Address
	AppId   [32]byte
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterAppUninstalled is a free log retrieval operation binding the contract event 0xe0b9e78734e068100cc19d3fdf3d1cb8adbe68b9321eb3e1490a6e5a1ab628f4.
//
// Solidity: event AppUninstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) FilterAppUninstalled(opts *bind.FilterOpts, app []common.Address, account []common.Address, appId [][32]byte) (*AppRegistryAppUninstalledIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppUninstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppUninstalledIterator{contract: _AppRegistry.contract, event: "AppUninstalled", logs: logs, sub: sub}, nil
}

// WatchAppUninstalled is a free log subscription operation binding the contract event 0xe0b9e78734e068100cc19d3fdf3d1cb8adbe68b9321eb3e1490a6e5a1ab628f4.
//
// Solidity: event AppUninstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) WatchAppUninstalled(opts *bind.WatchOpts, sink chan<- *AppRegistryAppUninstalled, app []common.Address, account []common.Address, appId [][32]byte) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppUninstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppUninstalled)
				if err := _AppRegistry.contract.UnpackLog(event, "AppUninstalled", log); err != nil {
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

// ParseAppUninstalled is a log parse operation binding the contract event 0xe0b9e78734e068100cc19d3fdf3d1cb8adbe68b9321eb3e1490a6e5a1ab628f4.
//
// Solidity: event AppUninstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_AppRegistry *AppRegistryFilterer) ParseAppUninstalled(log types.Log) (*AppRegistryAppUninstalled, error) {
	event := new(AppRegistryAppUninstalled)
	if err := _AppRegistry.contract.UnpackLog(event, "AppUninstalled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppUnregisteredIterator is returned from FilterAppUnregistered and is used to iterate over the raw logs and unpacked data for AppUnregistered events raised by the AppRegistry contract.
type AppRegistryAppUnregisteredIterator struct {
	Event *AppRegistryAppUnregistered // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppUnregisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppUnregistered)
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
		it.Event = new(AppRegistryAppUnregistered)
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
func (it *AppRegistryAppUnregisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppUnregisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppUnregistered represents a AppUnregistered event raised by the AppRegistry contract.
type AppRegistryAppUnregistered struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppUnregistered is a free log retrieval operation binding the contract event 0x185eab63c3a863ff7848fe5c971d33894bc08bdc9982e6daac76a80298854a2e.
//
// Solidity: event AppUnregistered(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) FilterAppUnregistered(opts *bind.FilterOpts, app []common.Address) (*AppRegistryAppUnregisteredIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppUnregistered", appRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppUnregisteredIterator{contract: _AppRegistry.contract, event: "AppUnregistered", logs: logs, sub: sub}, nil
}

// WatchAppUnregistered is a free log subscription operation binding the contract event 0x185eab63c3a863ff7848fe5c971d33894bc08bdc9982e6daac76a80298854a2e.
//
// Solidity: event AppUnregistered(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) WatchAppUnregistered(opts *bind.WatchOpts, sink chan<- *AppRegistryAppUnregistered, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppUnregistered", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppUnregistered)
				if err := _AppRegistry.contract.UnpackLog(event, "AppUnregistered", log); err != nil {
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

// ParseAppUnregistered is a log parse operation binding the contract event 0x185eab63c3a863ff7848fe5c971d33894bc08bdc9982e6daac76a80298854a2e.
//
// Solidity: event AppUnregistered(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) ParseAppUnregistered(log types.Log) (*AppRegistryAppUnregistered, error) {
	event := new(AppRegistryAppUnregistered)
	if err := _AppRegistry.contract.UnpackLog(event, "AppUnregistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// AppRegistryAppUpdatedIterator is returned from FilterAppUpdated and is used to iterate over the raw logs and unpacked data for AppUpdated events raised by the AppRegistry contract.
type AppRegistryAppUpdatedIterator struct {
	Event *AppRegistryAppUpdated // Event containing the contract specifics and raw log

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
func (it *AppRegistryAppUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(AppRegistryAppUpdated)
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
		it.Event = new(AppRegistryAppUpdated)
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
func (it *AppRegistryAppUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *AppRegistryAppUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// AppRegistryAppUpdated represents a AppUpdated event raised by the AppRegistry contract.
type AppRegistryAppUpdated struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppUpdated is a free log retrieval operation binding the contract event 0x8e71058c6e054309a6daad6ddd1268b7eb2fb947aa5160443a5056837a0ba6cc.
//
// Solidity: event AppUpdated(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) FilterAppUpdated(opts *bind.FilterOpts, app []common.Address) (*AppRegistryAppUpdatedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.FilterLogs(opts, "AppUpdated", appRule)
	if err != nil {
		return nil, err
	}
	return &AppRegistryAppUpdatedIterator{contract: _AppRegistry.contract, event: "AppUpdated", logs: logs, sub: sub}, nil
}

// WatchAppUpdated is a free log subscription operation binding the contract event 0x8e71058c6e054309a6daad6ddd1268b7eb2fb947aa5160443a5056837a0ba6cc.
//
// Solidity: event AppUpdated(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) WatchAppUpdated(opts *bind.WatchOpts, sink chan<- *AppRegistryAppUpdated, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _AppRegistry.contract.WatchLogs(opts, "AppUpdated", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(AppRegistryAppUpdated)
				if err := _AppRegistry.contract.UnpackLog(event, "AppUpdated", log); err != nil {
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

// ParseAppUpdated is a log parse operation binding the contract event 0x8e71058c6e054309a6daad6ddd1268b7eb2fb947aa5160443a5056837a0ba6cc.
//
// Solidity: event AppUpdated(address indexed app, bytes32 uid)
func (_AppRegistry *AppRegistryFilterer) ParseAppUpdated(log types.Log) (*AppRegistryAppUpdated, error) {
	event := new(AppRegistryAppUpdated)
	if err := _AppRegistry.contract.UnpackLog(event, "AppUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
