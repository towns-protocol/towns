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

// IRolesBaseCreateEntitlement is an auto generated low-level Go binding around an user-defined struct.
type IRolesBaseCreateEntitlement struct {
	Module common.Address
	Data   []byte
}

// IRolesBaseRole is an auto generated low-level Go binding around an user-defined struct.
type IRolesBaseRole struct {
	Id           *big.Int
	Name         string
	Disabled     bool
	Permissions  []string
	Entitlements []common.Address
}

// IRolesMetaData contains all meta data concerning the IRoles contract.
var IRolesMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"addPermissionsToRole\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"addRoleToEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"entitlement\",\"type\":\"tuple\",\"internalType\":\"structIRolesBase.CreateEntitlement\",\"components\":[{\"name\":\"module\",\"type\":\"address\",\"internalType\":\"contractIEntitlement\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"clearChannelPermissionOverrides\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createRole\",\"inputs\":[{\"name\":\"roleName\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"},{\"name\":\"entitlements\",\"type\":\"tuple[]\",\"internalType\":\"structIRolesBase.CreateEntitlement[]\",\"components\":[{\"name\":\"module\",\"type\":\"address\",\"internalType\":\"contractIEntitlement\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"outputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getChannelPermissionOverrides\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPermissionsByRoleId\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRoleById\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"role\",\"type\":\"tuple\",\"internalType\":\"structIRolesBase.Role\",\"components\":[{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"},{\"name\":\"entitlements\",\"type\":\"address[]\",\"internalType\":\"contractIEntitlement[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRoles\",\"inputs\":[],\"outputs\":[{\"name\":\"roles\",\"type\":\"tuple[]\",\"internalType\":\"structIRolesBase.Role[]\",\"components\":[{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"},{\"name\":\"entitlements\",\"type\":\"address[]\",\"internalType\":\"contractIEntitlement[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removePermissionsFromRole\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeRole\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeRoleFromEntitlement\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"entitlement\",\"type\":\"tuple\",\"internalType\":\"structIRolesBase.CreateEntitlement\",\"components\":[{\"name\":\"module\",\"type\":\"address\",\"internalType\":\"contractIEntitlement\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setChannelPermissionOverrides\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateRole\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"roleName\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"},{\"name\":\"entitlements\",\"type\":\"tuple[]\",\"internalType\":\"structIRolesBase.CreateEntitlement[]\",\"components\":[{\"name\":\"module\",\"type\":\"address\",\"internalType\":\"contractIEntitlement\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"PermissionsAddedToChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsRemovedFromChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsUpdatedForChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleCreated\",\"inputs\":[{\"name\":\"creator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleRemoved\",\"inputs\":[{\"name\":\"remover\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleUpdated\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Roles__EntitlementAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__EntitlementDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__InvalidEntitlementAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__InvalidPermission\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__PermissionAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__PermissionDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__RoleDoesNotExist\",\"inputs\":[]}]",
}

// IRolesABI is the input ABI used to generate the binding from.
// Deprecated: Use IRolesMetaData.ABI instead.
var IRolesABI = IRolesMetaData.ABI

// IRoles is an auto generated Go binding around an Ethereum contract.
type IRoles struct {
	IRolesCaller     // Read-only binding to the contract
	IRolesTransactor // Write-only binding to the contract
	IRolesFilterer   // Log filterer for contract events
}

// IRolesCaller is an auto generated read-only Go binding around an Ethereum contract.
type IRolesCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IRolesTransactor is an auto generated write-only Go binding around an Ethereum contract.
type IRolesTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IRolesFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type IRolesFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IRolesSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type IRolesSession struct {
	Contract     *IRoles           // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// IRolesCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type IRolesCallerSession struct {
	Contract *IRolesCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts // Call options to use throughout this session
}

// IRolesTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type IRolesTransactorSession struct {
	Contract     *IRolesTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// IRolesRaw is an auto generated low-level Go binding around an Ethereum contract.
type IRolesRaw struct {
	Contract *IRoles // Generic contract binding to access the raw methods on
}

// IRolesCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type IRolesCallerRaw struct {
	Contract *IRolesCaller // Generic read-only contract binding to access the raw methods on
}

// IRolesTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type IRolesTransactorRaw struct {
	Contract *IRolesTransactor // Generic write-only contract binding to access the raw methods on
}

// NewIRoles creates a new instance of IRoles, bound to a specific deployed contract.
func NewIRoles(address common.Address, backend bind.ContractBackend) (*IRoles, error) {
	contract, err := bindIRoles(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &IRoles{IRolesCaller: IRolesCaller{contract: contract}, IRolesTransactor: IRolesTransactor{contract: contract}, IRolesFilterer: IRolesFilterer{contract: contract}}, nil
}

// NewIRolesCaller creates a new read-only instance of IRoles, bound to a specific deployed contract.
func NewIRolesCaller(address common.Address, caller bind.ContractCaller) (*IRolesCaller, error) {
	contract, err := bindIRoles(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &IRolesCaller{contract: contract}, nil
}

// NewIRolesTransactor creates a new write-only instance of IRoles, bound to a specific deployed contract.
func NewIRolesTransactor(address common.Address, transactor bind.ContractTransactor) (*IRolesTransactor, error) {
	contract, err := bindIRoles(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &IRolesTransactor{contract: contract}, nil
}

// NewIRolesFilterer creates a new log filterer instance of IRoles, bound to a specific deployed contract.
func NewIRolesFilterer(address common.Address, filterer bind.ContractFilterer) (*IRolesFilterer, error) {
	contract, err := bindIRoles(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &IRolesFilterer{contract: contract}, nil
}

// bindIRoles binds a generic wrapper to an already deployed contract.
func bindIRoles(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := IRolesMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IRoles *IRolesRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IRoles.Contract.IRolesCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IRoles *IRolesRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IRoles.Contract.IRolesTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IRoles *IRolesRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IRoles.Contract.IRolesTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IRoles *IRolesCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IRoles.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IRoles *IRolesTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IRoles.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IRoles *IRolesTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IRoles.Contract.contract.Transact(opts, method, params...)
}

// GetChannelPermissionOverrides is a free data retrieval call binding the contract method 0x65634a48.
//
// Solidity: function getChannelPermissionOverrides(uint256 roleId, bytes32 channelId) view returns(string[] permissions)
func (_IRoles *IRolesCaller) GetChannelPermissionOverrides(opts *bind.CallOpts, roleId *big.Int, channelId [32]byte) ([]string, error) {
	var out []interface{}
	err := _IRoles.contract.Call(opts, &out, "getChannelPermissionOverrides", roleId, channelId)

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetChannelPermissionOverrides is a free data retrieval call binding the contract method 0x65634a48.
//
// Solidity: function getChannelPermissionOverrides(uint256 roleId, bytes32 channelId) view returns(string[] permissions)
func (_IRoles *IRolesSession) GetChannelPermissionOverrides(roleId *big.Int, channelId [32]byte) ([]string, error) {
	return _IRoles.Contract.GetChannelPermissionOverrides(&_IRoles.CallOpts, roleId, channelId)
}

// GetChannelPermissionOverrides is a free data retrieval call binding the contract method 0x65634a48.
//
// Solidity: function getChannelPermissionOverrides(uint256 roleId, bytes32 channelId) view returns(string[] permissions)
func (_IRoles *IRolesCallerSession) GetChannelPermissionOverrides(roleId *big.Int, channelId [32]byte) ([]string, error) {
	return _IRoles.Contract.GetChannelPermissionOverrides(&_IRoles.CallOpts, roleId, channelId)
}

// GetPermissionsByRoleId is a free data retrieval call binding the contract method 0xb4264233.
//
// Solidity: function getPermissionsByRoleId(uint256 roleId) view returns(string[] permissions)
func (_IRoles *IRolesCaller) GetPermissionsByRoleId(opts *bind.CallOpts, roleId *big.Int) ([]string, error) {
	var out []interface{}
	err := _IRoles.contract.Call(opts, &out, "getPermissionsByRoleId", roleId)

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetPermissionsByRoleId is a free data retrieval call binding the contract method 0xb4264233.
//
// Solidity: function getPermissionsByRoleId(uint256 roleId) view returns(string[] permissions)
func (_IRoles *IRolesSession) GetPermissionsByRoleId(roleId *big.Int) ([]string, error) {
	return _IRoles.Contract.GetPermissionsByRoleId(&_IRoles.CallOpts, roleId)
}

// GetPermissionsByRoleId is a free data retrieval call binding the contract method 0xb4264233.
//
// Solidity: function getPermissionsByRoleId(uint256 roleId) view returns(string[] permissions)
func (_IRoles *IRolesCallerSession) GetPermissionsByRoleId(roleId *big.Int) ([]string, error) {
	return _IRoles.Contract.GetPermissionsByRoleId(&_IRoles.CallOpts, roleId)
}

// GetRoleById is a free data retrieval call binding the contract method 0x784c872b.
//
// Solidity: function getRoleById(uint256 roleId) view returns((uint256,string,bool,string[],address[]) role)
func (_IRoles *IRolesCaller) GetRoleById(opts *bind.CallOpts, roleId *big.Int) (IRolesBaseRole, error) {
	var out []interface{}
	err := _IRoles.contract.Call(opts, &out, "getRoleById", roleId)

	if err != nil {
		return *new(IRolesBaseRole), err
	}

	out0 := *abi.ConvertType(out[0], new(IRolesBaseRole)).(*IRolesBaseRole)

	return out0, err

}

// GetRoleById is a free data retrieval call binding the contract method 0x784c872b.
//
// Solidity: function getRoleById(uint256 roleId) view returns((uint256,string,bool,string[],address[]) role)
func (_IRoles *IRolesSession) GetRoleById(roleId *big.Int) (IRolesBaseRole, error) {
	return _IRoles.Contract.GetRoleById(&_IRoles.CallOpts, roleId)
}

// GetRoleById is a free data retrieval call binding the contract method 0x784c872b.
//
// Solidity: function getRoleById(uint256 roleId) view returns((uint256,string,bool,string[],address[]) role)
func (_IRoles *IRolesCallerSession) GetRoleById(roleId *big.Int) (IRolesBaseRole, error) {
	return _IRoles.Contract.GetRoleById(&_IRoles.CallOpts, roleId)
}

// GetRoles is a free data retrieval call binding the contract method 0x71061398.
//
// Solidity: function getRoles() view returns((uint256,string,bool,string[],address[])[] roles)
func (_IRoles *IRolesCaller) GetRoles(opts *bind.CallOpts) ([]IRolesBaseRole, error) {
	var out []interface{}
	err := _IRoles.contract.Call(opts, &out, "getRoles")

	if err != nil {
		return *new([]IRolesBaseRole), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRolesBaseRole)).(*[]IRolesBaseRole)

	return out0, err

}

// GetRoles is a free data retrieval call binding the contract method 0x71061398.
//
// Solidity: function getRoles() view returns((uint256,string,bool,string[],address[])[] roles)
func (_IRoles *IRolesSession) GetRoles() ([]IRolesBaseRole, error) {
	return _IRoles.Contract.GetRoles(&_IRoles.CallOpts)
}

// GetRoles is a free data retrieval call binding the contract method 0x71061398.
//
// Solidity: function getRoles() view returns((uint256,string,bool,string[],address[])[] roles)
func (_IRoles *IRolesCallerSession) GetRoles() ([]IRolesBaseRole, error) {
	return _IRoles.Contract.GetRoles(&_IRoles.CallOpts)
}

// AddPermissionsToRole is a paid mutator transaction binding the contract method 0xb7515761.
//
// Solidity: function addPermissionsToRole(uint256 roleId, string[] permissions) returns()
func (_IRoles *IRolesTransactor) AddPermissionsToRole(opts *bind.TransactOpts, roleId *big.Int, permissions []string) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "addPermissionsToRole", roleId, permissions)
}

// AddPermissionsToRole is a paid mutator transaction binding the contract method 0xb7515761.
//
// Solidity: function addPermissionsToRole(uint256 roleId, string[] permissions) returns()
func (_IRoles *IRolesSession) AddPermissionsToRole(roleId *big.Int, permissions []string) (*types.Transaction, error) {
	return _IRoles.Contract.AddPermissionsToRole(&_IRoles.TransactOpts, roleId, permissions)
}

// AddPermissionsToRole is a paid mutator transaction binding the contract method 0xb7515761.
//
// Solidity: function addPermissionsToRole(uint256 roleId, string[] permissions) returns()
func (_IRoles *IRolesTransactorSession) AddPermissionsToRole(roleId *big.Int, permissions []string) (*types.Transaction, error) {
	return _IRoles.Contract.AddPermissionsToRole(&_IRoles.TransactOpts, roleId, permissions)
}

// AddRoleToEntitlement is a paid mutator transaction binding the contract method 0xba201ba8.
//
// Solidity: function addRoleToEntitlement(uint256 roleId, (address,bytes) entitlement) returns()
func (_IRoles *IRolesTransactor) AddRoleToEntitlement(opts *bind.TransactOpts, roleId *big.Int, entitlement IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "addRoleToEntitlement", roleId, entitlement)
}

// AddRoleToEntitlement is a paid mutator transaction binding the contract method 0xba201ba8.
//
// Solidity: function addRoleToEntitlement(uint256 roleId, (address,bytes) entitlement) returns()
func (_IRoles *IRolesSession) AddRoleToEntitlement(roleId *big.Int, entitlement IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.AddRoleToEntitlement(&_IRoles.TransactOpts, roleId, entitlement)
}

// AddRoleToEntitlement is a paid mutator transaction binding the contract method 0xba201ba8.
//
// Solidity: function addRoleToEntitlement(uint256 roleId, (address,bytes) entitlement) returns()
func (_IRoles *IRolesTransactorSession) AddRoleToEntitlement(roleId *big.Int, entitlement IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.AddRoleToEntitlement(&_IRoles.TransactOpts, roleId, entitlement)
}

// ClearChannelPermissionOverrides is a paid mutator transaction binding the contract method 0xd2dea2b9.
//
// Solidity: function clearChannelPermissionOverrides(uint256 roleId, bytes32 channelId) returns()
func (_IRoles *IRolesTransactor) ClearChannelPermissionOverrides(opts *bind.TransactOpts, roleId *big.Int, channelId [32]byte) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "clearChannelPermissionOverrides", roleId, channelId)
}

// ClearChannelPermissionOverrides is a paid mutator transaction binding the contract method 0xd2dea2b9.
//
// Solidity: function clearChannelPermissionOverrides(uint256 roleId, bytes32 channelId) returns()
func (_IRoles *IRolesSession) ClearChannelPermissionOverrides(roleId *big.Int, channelId [32]byte) (*types.Transaction, error) {
	return _IRoles.Contract.ClearChannelPermissionOverrides(&_IRoles.TransactOpts, roleId, channelId)
}

// ClearChannelPermissionOverrides is a paid mutator transaction binding the contract method 0xd2dea2b9.
//
// Solidity: function clearChannelPermissionOverrides(uint256 roleId, bytes32 channelId) returns()
func (_IRoles *IRolesTransactorSession) ClearChannelPermissionOverrides(roleId *big.Int, channelId [32]byte) (*types.Transaction, error) {
	return _IRoles.Contract.ClearChannelPermissionOverrides(&_IRoles.TransactOpts, roleId, channelId)
}

// CreateRole is a paid mutator transaction binding the contract method 0x8fcd793d.
//
// Solidity: function createRole(string roleName, string[] permissions, (address,bytes)[] entitlements) returns(uint256 roleId)
func (_IRoles *IRolesTransactor) CreateRole(opts *bind.TransactOpts, roleName string, permissions []string, entitlements []IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "createRole", roleName, permissions, entitlements)
}

// CreateRole is a paid mutator transaction binding the contract method 0x8fcd793d.
//
// Solidity: function createRole(string roleName, string[] permissions, (address,bytes)[] entitlements) returns(uint256 roleId)
func (_IRoles *IRolesSession) CreateRole(roleName string, permissions []string, entitlements []IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.CreateRole(&_IRoles.TransactOpts, roleName, permissions, entitlements)
}

// CreateRole is a paid mutator transaction binding the contract method 0x8fcd793d.
//
// Solidity: function createRole(string roleName, string[] permissions, (address,bytes)[] entitlements) returns(uint256 roleId)
func (_IRoles *IRolesTransactorSession) CreateRole(roleName string, permissions []string, entitlements []IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.CreateRole(&_IRoles.TransactOpts, roleName, permissions, entitlements)
}

// RemovePermissionsFromRole is a paid mutator transaction binding the contract method 0x9a8e4c3e.
//
// Solidity: function removePermissionsFromRole(uint256 roleId, string[] permissions) returns()
func (_IRoles *IRolesTransactor) RemovePermissionsFromRole(opts *bind.TransactOpts, roleId *big.Int, permissions []string) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "removePermissionsFromRole", roleId, permissions)
}

// RemovePermissionsFromRole is a paid mutator transaction binding the contract method 0x9a8e4c3e.
//
// Solidity: function removePermissionsFromRole(uint256 roleId, string[] permissions) returns()
func (_IRoles *IRolesSession) RemovePermissionsFromRole(roleId *big.Int, permissions []string) (*types.Transaction, error) {
	return _IRoles.Contract.RemovePermissionsFromRole(&_IRoles.TransactOpts, roleId, permissions)
}

// RemovePermissionsFromRole is a paid mutator transaction binding the contract method 0x9a8e4c3e.
//
// Solidity: function removePermissionsFromRole(uint256 roleId, string[] permissions) returns()
func (_IRoles *IRolesTransactorSession) RemovePermissionsFromRole(roleId *big.Int, permissions []string) (*types.Transaction, error) {
	return _IRoles.Contract.RemovePermissionsFromRole(&_IRoles.TransactOpts, roleId, permissions)
}

// RemoveRole is a paid mutator transaction binding the contract method 0x92691821.
//
// Solidity: function removeRole(uint256 roleId) returns()
func (_IRoles *IRolesTransactor) RemoveRole(opts *bind.TransactOpts, roleId *big.Int) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "removeRole", roleId)
}

// RemoveRole is a paid mutator transaction binding the contract method 0x92691821.
//
// Solidity: function removeRole(uint256 roleId) returns()
func (_IRoles *IRolesSession) RemoveRole(roleId *big.Int) (*types.Transaction, error) {
	return _IRoles.Contract.RemoveRole(&_IRoles.TransactOpts, roleId)
}

// RemoveRole is a paid mutator transaction binding the contract method 0x92691821.
//
// Solidity: function removeRole(uint256 roleId) returns()
func (_IRoles *IRolesTransactorSession) RemoveRole(roleId *big.Int) (*types.Transaction, error) {
	return _IRoles.Contract.RemoveRole(&_IRoles.TransactOpts, roleId)
}

// RemoveRoleFromEntitlement is a paid mutator transaction binding the contract method 0xdba81864.
//
// Solidity: function removeRoleFromEntitlement(uint256 roleId, (address,bytes) entitlement) returns()
func (_IRoles *IRolesTransactor) RemoveRoleFromEntitlement(opts *bind.TransactOpts, roleId *big.Int, entitlement IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "removeRoleFromEntitlement", roleId, entitlement)
}

// RemoveRoleFromEntitlement is a paid mutator transaction binding the contract method 0xdba81864.
//
// Solidity: function removeRoleFromEntitlement(uint256 roleId, (address,bytes) entitlement) returns()
func (_IRoles *IRolesSession) RemoveRoleFromEntitlement(roleId *big.Int, entitlement IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.RemoveRoleFromEntitlement(&_IRoles.TransactOpts, roleId, entitlement)
}

// RemoveRoleFromEntitlement is a paid mutator transaction binding the contract method 0xdba81864.
//
// Solidity: function removeRoleFromEntitlement(uint256 roleId, (address,bytes) entitlement) returns()
func (_IRoles *IRolesTransactorSession) RemoveRoleFromEntitlement(roleId *big.Int, entitlement IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.RemoveRoleFromEntitlement(&_IRoles.TransactOpts, roleId, entitlement)
}

// SetChannelPermissionOverrides is a paid mutator transaction binding the contract method 0xbd9af74a.
//
// Solidity: function setChannelPermissionOverrides(uint256 roleId, bytes32 channelId, string[] permissions) returns()
func (_IRoles *IRolesTransactor) SetChannelPermissionOverrides(opts *bind.TransactOpts, roleId *big.Int, channelId [32]byte, permissions []string) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "setChannelPermissionOverrides", roleId, channelId, permissions)
}

// SetChannelPermissionOverrides is a paid mutator transaction binding the contract method 0xbd9af74a.
//
// Solidity: function setChannelPermissionOverrides(uint256 roleId, bytes32 channelId, string[] permissions) returns()
func (_IRoles *IRolesSession) SetChannelPermissionOverrides(roleId *big.Int, channelId [32]byte, permissions []string) (*types.Transaction, error) {
	return _IRoles.Contract.SetChannelPermissionOverrides(&_IRoles.TransactOpts, roleId, channelId, permissions)
}

// SetChannelPermissionOverrides is a paid mutator transaction binding the contract method 0xbd9af74a.
//
// Solidity: function setChannelPermissionOverrides(uint256 roleId, bytes32 channelId, string[] permissions) returns()
func (_IRoles *IRolesTransactorSession) SetChannelPermissionOverrides(roleId *big.Int, channelId [32]byte, permissions []string) (*types.Transaction, error) {
	return _IRoles.Contract.SetChannelPermissionOverrides(&_IRoles.TransactOpts, roleId, channelId, permissions)
}

// UpdateRole is a paid mutator transaction binding the contract method 0x4d8b50a2.
//
// Solidity: function updateRole(uint256 roleId, string roleName, string[] permissions, (address,bytes)[] entitlements) returns()
func (_IRoles *IRolesTransactor) UpdateRole(opts *bind.TransactOpts, roleId *big.Int, roleName string, permissions []string, entitlements []IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.contract.Transact(opts, "updateRole", roleId, roleName, permissions, entitlements)
}

// UpdateRole is a paid mutator transaction binding the contract method 0x4d8b50a2.
//
// Solidity: function updateRole(uint256 roleId, string roleName, string[] permissions, (address,bytes)[] entitlements) returns()
func (_IRoles *IRolesSession) UpdateRole(roleId *big.Int, roleName string, permissions []string, entitlements []IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.UpdateRole(&_IRoles.TransactOpts, roleId, roleName, permissions, entitlements)
}

// UpdateRole is a paid mutator transaction binding the contract method 0x4d8b50a2.
//
// Solidity: function updateRole(uint256 roleId, string roleName, string[] permissions, (address,bytes)[] entitlements) returns()
func (_IRoles *IRolesTransactorSession) UpdateRole(roleId *big.Int, roleName string, permissions []string, entitlements []IRolesBaseCreateEntitlement) (*types.Transaction, error) {
	return _IRoles.Contract.UpdateRole(&_IRoles.TransactOpts, roleId, roleName, permissions, entitlements)
}

// IRolesPermissionsAddedToChannelRoleIterator is returned from FilterPermissionsAddedToChannelRole and is used to iterate over the raw logs and unpacked data for PermissionsAddedToChannelRole events raised by the IRoles contract.
type IRolesPermissionsAddedToChannelRoleIterator struct {
	Event *IRolesPermissionsAddedToChannelRole // Event containing the contract specifics and raw log

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
func (it *IRolesPermissionsAddedToChannelRoleIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(IRolesPermissionsAddedToChannelRole)
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
		it.Event = new(IRolesPermissionsAddedToChannelRole)
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
func (it *IRolesPermissionsAddedToChannelRoleIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *IRolesPermissionsAddedToChannelRoleIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// IRolesPermissionsAddedToChannelRole represents a PermissionsAddedToChannelRole event raised by the IRoles contract.
type IRolesPermissionsAddedToChannelRole struct {
	Updater   common.Address
	RoleId    *big.Int
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterPermissionsAddedToChannelRole is a free log retrieval operation binding the contract event 0x38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553.
//
// Solidity: event PermissionsAddedToChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) FilterPermissionsAddedToChannelRole(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (*IRolesPermissionsAddedToChannelRoleIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _IRoles.contract.FilterLogs(opts, "PermissionsAddedToChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return &IRolesPermissionsAddedToChannelRoleIterator{contract: _IRoles.contract, event: "PermissionsAddedToChannelRole", logs: logs, sub: sub}, nil
}

// WatchPermissionsAddedToChannelRole is a free log subscription operation binding the contract event 0x38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553.
//
// Solidity: event PermissionsAddedToChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) WatchPermissionsAddedToChannelRole(opts *bind.WatchOpts, sink chan<- *IRolesPermissionsAddedToChannelRole, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _IRoles.contract.WatchLogs(opts, "PermissionsAddedToChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(IRolesPermissionsAddedToChannelRole)
				if err := _IRoles.contract.UnpackLog(event, "PermissionsAddedToChannelRole", log); err != nil {
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

// ParsePermissionsAddedToChannelRole is a log parse operation binding the contract event 0x38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553.
//
// Solidity: event PermissionsAddedToChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) ParsePermissionsAddedToChannelRole(log types.Log) (*IRolesPermissionsAddedToChannelRole, error) {
	event := new(IRolesPermissionsAddedToChannelRole)
	if err := _IRoles.contract.UnpackLog(event, "PermissionsAddedToChannelRole", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// IRolesPermissionsRemovedFromChannelRoleIterator is returned from FilterPermissionsRemovedFromChannelRole and is used to iterate over the raw logs and unpacked data for PermissionsRemovedFromChannelRole events raised by the IRoles contract.
type IRolesPermissionsRemovedFromChannelRoleIterator struct {
	Event *IRolesPermissionsRemovedFromChannelRole // Event containing the contract specifics and raw log

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
func (it *IRolesPermissionsRemovedFromChannelRoleIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(IRolesPermissionsRemovedFromChannelRole)
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
		it.Event = new(IRolesPermissionsRemovedFromChannelRole)
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
func (it *IRolesPermissionsRemovedFromChannelRoleIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *IRolesPermissionsRemovedFromChannelRoleIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// IRolesPermissionsRemovedFromChannelRole represents a PermissionsRemovedFromChannelRole event raised by the IRoles contract.
type IRolesPermissionsRemovedFromChannelRole struct {
	Updater   common.Address
	RoleId    *big.Int
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterPermissionsRemovedFromChannelRole is a free log retrieval operation binding the contract event 0x07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c.
//
// Solidity: event PermissionsRemovedFromChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) FilterPermissionsRemovedFromChannelRole(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (*IRolesPermissionsRemovedFromChannelRoleIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _IRoles.contract.FilterLogs(opts, "PermissionsRemovedFromChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return &IRolesPermissionsRemovedFromChannelRoleIterator{contract: _IRoles.contract, event: "PermissionsRemovedFromChannelRole", logs: logs, sub: sub}, nil
}

// WatchPermissionsRemovedFromChannelRole is a free log subscription operation binding the contract event 0x07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c.
//
// Solidity: event PermissionsRemovedFromChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) WatchPermissionsRemovedFromChannelRole(opts *bind.WatchOpts, sink chan<- *IRolesPermissionsRemovedFromChannelRole, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _IRoles.contract.WatchLogs(opts, "PermissionsRemovedFromChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(IRolesPermissionsRemovedFromChannelRole)
				if err := _IRoles.contract.UnpackLog(event, "PermissionsRemovedFromChannelRole", log); err != nil {
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

// ParsePermissionsRemovedFromChannelRole is a log parse operation binding the contract event 0x07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c.
//
// Solidity: event PermissionsRemovedFromChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) ParsePermissionsRemovedFromChannelRole(log types.Log) (*IRolesPermissionsRemovedFromChannelRole, error) {
	event := new(IRolesPermissionsRemovedFromChannelRole)
	if err := _IRoles.contract.UnpackLog(event, "PermissionsRemovedFromChannelRole", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// IRolesPermissionsUpdatedForChannelRoleIterator is returned from FilterPermissionsUpdatedForChannelRole and is used to iterate over the raw logs and unpacked data for PermissionsUpdatedForChannelRole events raised by the IRoles contract.
type IRolesPermissionsUpdatedForChannelRoleIterator struct {
	Event *IRolesPermissionsUpdatedForChannelRole // Event containing the contract specifics and raw log

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
func (it *IRolesPermissionsUpdatedForChannelRoleIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(IRolesPermissionsUpdatedForChannelRole)
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
		it.Event = new(IRolesPermissionsUpdatedForChannelRole)
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
func (it *IRolesPermissionsUpdatedForChannelRoleIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *IRolesPermissionsUpdatedForChannelRoleIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// IRolesPermissionsUpdatedForChannelRole represents a PermissionsUpdatedForChannelRole event raised by the IRoles contract.
type IRolesPermissionsUpdatedForChannelRole struct {
	Updater   common.Address
	RoleId    *big.Int
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterPermissionsUpdatedForChannelRole is a free log retrieval operation binding the contract event 0x3af5ed504e4a660b9f6e42f60e665a22d0b50830f9c8f7d4344ab4313cc0ab4a.
//
// Solidity: event PermissionsUpdatedForChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) FilterPermissionsUpdatedForChannelRole(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (*IRolesPermissionsUpdatedForChannelRoleIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _IRoles.contract.FilterLogs(opts, "PermissionsUpdatedForChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return &IRolesPermissionsUpdatedForChannelRoleIterator{contract: _IRoles.contract, event: "PermissionsUpdatedForChannelRole", logs: logs, sub: sub}, nil
}

// WatchPermissionsUpdatedForChannelRole is a free log subscription operation binding the contract event 0x3af5ed504e4a660b9f6e42f60e665a22d0b50830f9c8f7d4344ab4313cc0ab4a.
//
// Solidity: event PermissionsUpdatedForChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) WatchPermissionsUpdatedForChannelRole(opts *bind.WatchOpts, sink chan<- *IRolesPermissionsUpdatedForChannelRole, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _IRoles.contract.WatchLogs(opts, "PermissionsUpdatedForChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(IRolesPermissionsUpdatedForChannelRole)
				if err := _IRoles.contract.UnpackLog(event, "PermissionsUpdatedForChannelRole", log); err != nil {
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

// ParsePermissionsUpdatedForChannelRole is a log parse operation binding the contract event 0x3af5ed504e4a660b9f6e42f60e665a22d0b50830f9c8f7d4344ab4313cc0ab4a.
//
// Solidity: event PermissionsUpdatedForChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_IRoles *IRolesFilterer) ParsePermissionsUpdatedForChannelRole(log types.Log) (*IRolesPermissionsUpdatedForChannelRole, error) {
	event := new(IRolesPermissionsUpdatedForChannelRole)
	if err := _IRoles.contract.UnpackLog(event, "PermissionsUpdatedForChannelRole", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// IRolesRoleCreatedIterator is returned from FilterRoleCreated and is used to iterate over the raw logs and unpacked data for RoleCreated events raised by the IRoles contract.
type IRolesRoleCreatedIterator struct {
	Event *IRolesRoleCreated // Event containing the contract specifics and raw log

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
func (it *IRolesRoleCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(IRolesRoleCreated)
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
		it.Event = new(IRolesRoleCreated)
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
func (it *IRolesRoleCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *IRolesRoleCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// IRolesRoleCreated represents a RoleCreated event raised by the IRoles contract.
type IRolesRoleCreated struct {
	Creator common.Address
	RoleId  *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRoleCreated is a free log retrieval operation binding the contract event 0x20a7a288530dd94b1eccaa691a582ecfd7550c9dfcee78ddf50a97f774a2b147.
//
// Solidity: event RoleCreated(address indexed creator, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) FilterRoleCreated(opts *bind.FilterOpts, creator []common.Address, roleId []*big.Int) (*IRolesRoleCreatedIterator, error) {

	var creatorRule []interface{}
	for _, creatorItem := range creator {
		creatorRule = append(creatorRule, creatorItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _IRoles.contract.FilterLogs(opts, "RoleCreated", creatorRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return &IRolesRoleCreatedIterator{contract: _IRoles.contract, event: "RoleCreated", logs: logs, sub: sub}, nil
}

// WatchRoleCreated is a free log subscription operation binding the contract event 0x20a7a288530dd94b1eccaa691a582ecfd7550c9dfcee78ddf50a97f774a2b147.
//
// Solidity: event RoleCreated(address indexed creator, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) WatchRoleCreated(opts *bind.WatchOpts, sink chan<- *IRolesRoleCreated, creator []common.Address, roleId []*big.Int) (event.Subscription, error) {

	var creatorRule []interface{}
	for _, creatorItem := range creator {
		creatorRule = append(creatorRule, creatorItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _IRoles.contract.WatchLogs(opts, "RoleCreated", creatorRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(IRolesRoleCreated)
				if err := _IRoles.contract.UnpackLog(event, "RoleCreated", log); err != nil {
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

// ParseRoleCreated is a log parse operation binding the contract event 0x20a7a288530dd94b1eccaa691a582ecfd7550c9dfcee78ddf50a97f774a2b147.
//
// Solidity: event RoleCreated(address indexed creator, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) ParseRoleCreated(log types.Log) (*IRolesRoleCreated, error) {
	event := new(IRolesRoleCreated)
	if err := _IRoles.contract.UnpackLog(event, "RoleCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// IRolesRoleRemovedIterator is returned from FilterRoleRemoved and is used to iterate over the raw logs and unpacked data for RoleRemoved events raised by the IRoles contract.
type IRolesRoleRemovedIterator struct {
	Event *IRolesRoleRemoved // Event containing the contract specifics and raw log

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
func (it *IRolesRoleRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(IRolesRoleRemoved)
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
		it.Event = new(IRolesRoleRemoved)
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
func (it *IRolesRoleRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *IRolesRoleRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// IRolesRoleRemoved represents a RoleRemoved event raised by the IRoles contract.
type IRolesRoleRemoved struct {
	Remover common.Address
	RoleId  *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRoleRemoved is a free log retrieval operation binding the contract event 0x268a6f1b90f6f5ddf50cc736d36513e80cdc5fd56326bff71f335e8b4b61d055.
//
// Solidity: event RoleRemoved(address indexed remover, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) FilterRoleRemoved(opts *bind.FilterOpts, remover []common.Address, roleId []*big.Int) (*IRolesRoleRemovedIterator, error) {

	var removerRule []interface{}
	for _, removerItem := range remover {
		removerRule = append(removerRule, removerItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _IRoles.contract.FilterLogs(opts, "RoleRemoved", removerRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return &IRolesRoleRemovedIterator{contract: _IRoles.contract, event: "RoleRemoved", logs: logs, sub: sub}, nil
}

// WatchRoleRemoved is a free log subscription operation binding the contract event 0x268a6f1b90f6f5ddf50cc736d36513e80cdc5fd56326bff71f335e8b4b61d055.
//
// Solidity: event RoleRemoved(address indexed remover, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) WatchRoleRemoved(opts *bind.WatchOpts, sink chan<- *IRolesRoleRemoved, remover []common.Address, roleId []*big.Int) (event.Subscription, error) {

	var removerRule []interface{}
	for _, removerItem := range remover {
		removerRule = append(removerRule, removerItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _IRoles.contract.WatchLogs(opts, "RoleRemoved", removerRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(IRolesRoleRemoved)
				if err := _IRoles.contract.UnpackLog(event, "RoleRemoved", log); err != nil {
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

// ParseRoleRemoved is a log parse operation binding the contract event 0x268a6f1b90f6f5ddf50cc736d36513e80cdc5fd56326bff71f335e8b4b61d055.
//
// Solidity: event RoleRemoved(address indexed remover, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) ParseRoleRemoved(log types.Log) (*IRolesRoleRemoved, error) {
	event := new(IRolesRoleRemoved)
	if err := _IRoles.contract.UnpackLog(event, "RoleRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// IRolesRoleUpdatedIterator is returned from FilterRoleUpdated and is used to iterate over the raw logs and unpacked data for RoleUpdated events raised by the IRoles contract.
type IRolesRoleUpdatedIterator struct {
	Event *IRolesRoleUpdated // Event containing the contract specifics and raw log

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
func (it *IRolesRoleUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(IRolesRoleUpdated)
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
		it.Event = new(IRolesRoleUpdated)
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
func (it *IRolesRoleUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *IRolesRoleUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// IRolesRoleUpdated represents a RoleUpdated event raised by the IRoles contract.
type IRolesRoleUpdated struct {
	Updater common.Address
	RoleId  *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRoleUpdated is a free log retrieval operation binding the contract event 0x1aff41ff8e9139aae6bb355cc69107cda7e1d1dcd25511da436f3171bdbf77e6.
//
// Solidity: event RoleUpdated(address indexed updater, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) FilterRoleUpdated(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int) (*IRolesRoleUpdatedIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _IRoles.contract.FilterLogs(opts, "RoleUpdated", updaterRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return &IRolesRoleUpdatedIterator{contract: _IRoles.contract, event: "RoleUpdated", logs: logs, sub: sub}, nil
}

// WatchRoleUpdated is a free log subscription operation binding the contract event 0x1aff41ff8e9139aae6bb355cc69107cda7e1d1dcd25511da436f3171bdbf77e6.
//
// Solidity: event RoleUpdated(address indexed updater, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) WatchRoleUpdated(opts *bind.WatchOpts, sink chan<- *IRolesRoleUpdated, updater []common.Address, roleId []*big.Int) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _IRoles.contract.WatchLogs(opts, "RoleUpdated", updaterRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(IRolesRoleUpdated)
				if err := _IRoles.contract.UnpackLog(event, "RoleUpdated", log); err != nil {
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

// ParseRoleUpdated is a log parse operation binding the contract event 0x1aff41ff8e9139aae6bb355cc69107cda7e1d1dcd25511da436f3171bdbf77e6.
//
// Solidity: event RoleUpdated(address indexed updater, uint256 indexed roleId)
func (_IRoles *IRolesFilterer) ParseRoleUpdated(log types.Log) (*IRolesRoleUpdated, error) {
	event := new(IRolesRoleUpdated)
	if err := _IRoles.contract.UnpackLog(event, "RoleUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
