// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package goerli_space

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
)

// DataTypesChannel is an auto generated low-level Go binding around an user-defined struct.
type DataTypesChannel struct {
	Name             string
	ChannelNetworkId string
	ChannelHash      [32]byte
	CreatedAt        *big.Int
	Disabled         bool
}

// DataTypesEntitlement is an auto generated low-level Go binding around an user-defined struct.
type DataTypesEntitlement struct {
	Module common.Address
	Data   []byte
}

// DataTypesEntitlementModule is an auto generated low-level Go binding around an user-defined struct.
type DataTypesEntitlementModule struct {
	Name          string
	ModuleAddress common.Address
	ModuleType    string
	Enabled       bool
}

// DataTypesRole is an auto generated low-level Go binding around an user-defined struct.
type DataTypesRole struct {
	RoleId *big.Int
	Name   string
}

// GoerliSpaceMetaData contains all meta data concerning the GoerliSpace contract.
var GoerliSpaceMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"inputs\":[],\"name\":\"AddRoleFailed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelAlreadyRegistered\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementAlreadyWhitelisted\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementModuleNotSupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EntitlementNotWhitelisted\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"InvalidParameters\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"MissingOwnerPermission\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NameContainsInvalidCharacters\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NameLengthInvalid\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"PermissionAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"RoleDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"RoleIsAssignedToEntitlement\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"previousAdmin\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"newAdmin\",\"type\":\"address\"}],\"name\":\"AdminChanged\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"beacon\",\"type\":\"address\"}],\"name\":\"BeaconUpgraded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint8\",\"name\":\"version\",\"type\":\"uint8\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"implementation\",\"type\":\"address\"}],\"name\":\"Upgraded\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"},{\"internalType\":\"string[]\",\"name\":\"_permissions\",\"type\":\"string[]\"}],\"name\":\"addPermissionsToRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"_entitlement\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"}],\"name\":\"addRoleToChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"module\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"data\",\"type\":\"bytes\"}],\"internalType\":\"structDataTypes.Entitlement\",\"name\":\"_entitlement\",\"type\":\"tuple\"}],\"name\":\"addRoleToEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"channels\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"name\":\"channelsByHash\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"bytes32\",\"name\":\"channelHash\",\"type\":\"bytes32\"},{\"internalType\":\"uint256\",\"name\":\"createdAt\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelName\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"name\":\"createChannel\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_roleName\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"_permissions\",\"type\":\"string[]\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"module\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"data\",\"type\":\"bytes\"}],\"internalType\":\"structDataTypes.Entitlement[]\",\"name\":\"_entitlements\",\"type\":\"tuple[]\"}],\"name\":\"createRole\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"defaultEntitlements\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"disabled\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"entitlements\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"_channelHash\",\"type\":\"bytes32\"}],\"name\":\"getChannelByHash\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"bytes32\",\"name\":\"channelHash\",\"type\":\"bytes32\"},{\"internalType\":\"uint256\",\"name\":\"createdAt\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"}],\"internalType\":\"structDataTypes.Channel\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getChannels\",\"outputs\":[{\"internalType\":\"bytes32[]\",\"name\":\"\",\"type\":\"bytes32[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_moduleType\",\"type\":\"string\"}],\"name\":\"getEntitlementByModuleType\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"}],\"name\":\"getEntitlementIdsByRoleId\",\"outputs\":[{\"internalType\":\"bytes32[]\",\"name\":\"\",\"type\":\"bytes32[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getEntitlementModules\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"moduleAddress\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"moduleType\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"enabled\",\"type\":\"bool\"}],\"internalType\":\"structDataTypes.EntitlementModule[]\",\"name\":\"_entitlementModules\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"}],\"name\":\"getPermissionsByRoleId\",\"outputs\":[{\"internalType\":\"string[]\",\"name\":\"\",\"type\":\"string[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"}],\"name\":\"getRoleById\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"}],\"internalType\":\"structDataTypes.Role\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getRoles\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"}],\"internalType\":\"structDataTypes.Role[]\",\"name\":\"\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"hasEntitlement\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_networkId\",\"type\":\"string\"},{\"internalType\":\"address[]\",\"name\":\"_entitlements\",\"type\":\"address[]\"},{\"internalType\":\"address\",\"name\":\"_token\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"initialize\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"_user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"_permission\",\"type\":\"string\"}],\"name\":\"isEntitledToChannel\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"_entitled\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_user\",\"type\":\"address\"},{\"internalType\":\"string\",\"name\":\"_permission\",\"type\":\"string\"}],\"name\":\"isEntitledToSpace\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"_entitled\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes[]\",\"name\":\"data\",\"type\":\"bytes[]\"}],\"name\":\"multicall\",\"outputs\":[{\"internalType\":\"bytes[]\",\"name\":\"results\",\"type\":\"bytes[]\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"networkId\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"ownerRoleId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"proxiableUUID\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"},{\"internalType\":\"string[]\",\"name\":\"_permissions\",\"type\":\"string[]\"}],\"name\":\"removePermissionsFromRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"}],\"name\":\"removeRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"_entitlement\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"}],\"name\":\"removeRoleFromChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"module\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"data\",\"type\":\"bytes\"}],\"internalType\":\"structDataTypes.Entitlement\",\"name\":\"_entitlement\",\"type\":\"tuple\"}],\"name\":\"removeRoleFromEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"roleCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"rolesById\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disableChannel\",\"type\":\"bool\"}],\"name\":\"setChannelAccess\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_entitlementModule\",\"type\":\"address\"},{\"internalType\":\"bool\",\"name\":\"_whitelist\",\"type\":\"bool\"}],\"name\":\"setEntitlementModule\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"}],\"name\":\"setOwnerRoleId\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bool\",\"name\":\"_disabled\",\"type\":\"bool\"}],\"name\":\"setSpaceAccess\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"token\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"tokenId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelNetworkId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"channelName\",\"type\":\"string\"}],\"name\":\"updateChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_roleId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"_roleName\",\"type\":\"string\"}],\"name\":\"updateRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_entitlement\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_newEntitlement\",\"type\":\"address\"}],\"name\":\"upgradeEntitlement\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newImplementation\",\"type\":\"address\"}],\"name\":\"upgradeTo\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newImplementation\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"data\",\"type\":\"bytes\"}],\"name\":\"upgradeToAndCall\",\"outputs\":[],\"stateMutability\":\"payable\",\"type\":\"function\"}]",
}

// GoerliSpaceABI is the input ABI used to generate the binding from.
// Deprecated: Use GoerliSpaceMetaData.ABI instead.
var GoerliSpaceABI = GoerliSpaceMetaData.ABI

// GoerliSpace is an auto generated Go binding around an Ethereum contract.
type GoerliSpace struct {
	GoerliSpaceCaller     // Read-only binding to the contract
	GoerliSpaceTransactor // Write-only binding to the contract
	GoerliSpaceFilterer   // Log filterer for contract events
}

// GoerliSpaceCaller is an auto generated read-only Go binding around an Ethereum contract.
type GoerliSpaceCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliSpaceTransactor is an auto generated write-only Go binding around an Ethereum contract.
type GoerliSpaceTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliSpaceFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type GoerliSpaceFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliSpaceSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type GoerliSpaceSession struct {
	Contract     *GoerliSpace      // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// GoerliSpaceCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type GoerliSpaceCallerSession struct {
	Contract *GoerliSpaceCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts      // Call options to use throughout this session
}

// GoerliSpaceTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type GoerliSpaceTransactorSession struct {
	Contract     *GoerliSpaceTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// GoerliSpaceRaw is an auto generated low-level Go binding around an Ethereum contract.
type GoerliSpaceRaw struct {
	Contract *GoerliSpace // Generic contract binding to access the raw methods on
}

// GoerliSpaceCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type GoerliSpaceCallerRaw struct {
	Contract *GoerliSpaceCaller // Generic read-only contract binding to access the raw methods on
}

// GoerliSpaceTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type GoerliSpaceTransactorRaw struct {
	Contract *GoerliSpaceTransactor // Generic write-only contract binding to access the raw methods on
}

// NewGoerliSpace creates a new instance of GoerliSpace, bound to a specific deployed contract.
func NewGoerliSpace(address common.Address, backend bind.ContractBackend) (*GoerliSpace, error) {
	contract, err := bindGoerliSpace(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &GoerliSpace{GoerliSpaceCaller: GoerliSpaceCaller{contract: contract}, GoerliSpaceTransactor: GoerliSpaceTransactor{contract: contract}, GoerliSpaceFilterer: GoerliSpaceFilterer{contract: contract}}, nil
}

// NewGoerliSpaceCaller creates a new read-only instance of GoerliSpace, bound to a specific deployed contract.
func NewGoerliSpaceCaller(address common.Address, caller bind.ContractCaller) (*GoerliSpaceCaller, error) {
	contract, err := bindGoerliSpace(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliSpaceCaller{contract: contract}, nil
}

// NewGoerliSpaceTransactor creates a new write-only instance of GoerliSpace, bound to a specific deployed contract.
func NewGoerliSpaceTransactor(address common.Address, transactor bind.ContractTransactor) (*GoerliSpaceTransactor, error) {
	contract, err := bindGoerliSpace(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliSpaceTransactor{contract: contract}, nil
}

// NewGoerliSpaceFilterer creates a new log filterer instance of GoerliSpace, bound to a specific deployed contract.
func NewGoerliSpaceFilterer(address common.Address, filterer bind.ContractFilterer) (*GoerliSpaceFilterer, error) {
	contract, err := bindGoerliSpace(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &GoerliSpaceFilterer{contract: contract}, nil
}

// bindGoerliSpace binds a generic wrapper to an already deployed contract.
func bindGoerliSpace(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(GoerliSpaceABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliSpace *GoerliSpaceRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliSpace.Contract.GoerliSpaceCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliSpace *GoerliSpaceRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliSpace.Contract.GoerliSpaceTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliSpace *GoerliSpaceRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliSpace.Contract.GoerliSpaceTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliSpace *GoerliSpaceCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliSpace.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliSpace *GoerliSpaceTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliSpace.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliSpace *GoerliSpaceTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliSpace.Contract.contract.Transact(opts, method, params...)
}

// Channels is a free data retrieval call binding the contract method 0xe5949b5d.
//
// Solidity: function channels(uint256 ) view returns(bytes32)
func (_GoerliSpace *GoerliSpaceCaller) Channels(opts *bind.CallOpts, arg0 *big.Int) ([32]byte, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "channels", arg0)

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// Channels is a free data retrieval call binding the contract method 0xe5949b5d.
//
// Solidity: function channels(uint256 ) view returns(bytes32)
func (_GoerliSpace *GoerliSpaceSession) Channels(arg0 *big.Int) ([32]byte, error) {
	return _GoerliSpace.Contract.Channels(&_GoerliSpace.CallOpts, arg0)
}

// Channels is a free data retrieval call binding the contract method 0xe5949b5d.
//
// Solidity: function channels(uint256 ) view returns(bytes32)
func (_GoerliSpace *GoerliSpaceCallerSession) Channels(arg0 *big.Int) ([32]byte, error) {
	return _GoerliSpace.Contract.Channels(&_GoerliSpace.CallOpts, arg0)
}

// ChannelsByHash is a free data retrieval call binding the contract method 0x129ab3c8.
//
// Solidity: function channelsByHash(bytes32 ) view returns(string name, string channelNetworkId, bytes32 channelHash, uint256 createdAt, bool disabled)
func (_GoerliSpace *GoerliSpaceCaller) ChannelsByHash(opts *bind.CallOpts, arg0 [32]byte) (struct {
	Name             string
	ChannelNetworkId string
	ChannelHash      [32]byte
	CreatedAt        *big.Int
	Disabled         bool
}, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "channelsByHash", arg0)

	outstruct := new(struct {
		Name             string
		ChannelNetworkId string
		ChannelHash      [32]byte
		CreatedAt        *big.Int
		Disabled         bool
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Name = *abi.ConvertType(out[0], new(string)).(*string)
	outstruct.ChannelNetworkId = *abi.ConvertType(out[1], new(string)).(*string)
	outstruct.ChannelHash = *abi.ConvertType(out[2], new([32]byte)).(*[32]byte)
	outstruct.CreatedAt = *abi.ConvertType(out[3], new(*big.Int)).(**big.Int)
	outstruct.Disabled = *abi.ConvertType(out[4], new(bool)).(*bool)

	return *outstruct, err

}

// ChannelsByHash is a free data retrieval call binding the contract method 0x129ab3c8.
//
// Solidity: function channelsByHash(bytes32 ) view returns(string name, string channelNetworkId, bytes32 channelHash, uint256 createdAt, bool disabled)
func (_GoerliSpace *GoerliSpaceSession) ChannelsByHash(arg0 [32]byte) (struct {
	Name             string
	ChannelNetworkId string
	ChannelHash      [32]byte
	CreatedAt        *big.Int
	Disabled         bool
}, error) {
	return _GoerliSpace.Contract.ChannelsByHash(&_GoerliSpace.CallOpts, arg0)
}

// ChannelsByHash is a free data retrieval call binding the contract method 0x129ab3c8.
//
// Solidity: function channelsByHash(bytes32 ) view returns(string name, string channelNetworkId, bytes32 channelHash, uint256 createdAt, bool disabled)
func (_GoerliSpace *GoerliSpaceCallerSession) ChannelsByHash(arg0 [32]byte) (struct {
	Name             string
	ChannelNetworkId string
	ChannelHash      [32]byte
	CreatedAt        *big.Int
	Disabled         bool
}, error) {
	return _GoerliSpace.Contract.ChannelsByHash(&_GoerliSpace.CallOpts, arg0)
}

// DefaultEntitlements is a free data retrieval call binding the contract method 0xfa6433c5.
//
// Solidity: function defaultEntitlements(address ) view returns(bool)
func (_GoerliSpace *GoerliSpaceCaller) DefaultEntitlements(opts *bind.CallOpts, arg0 common.Address) (bool, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "defaultEntitlements", arg0)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// DefaultEntitlements is a free data retrieval call binding the contract method 0xfa6433c5.
//
// Solidity: function defaultEntitlements(address ) view returns(bool)
func (_GoerliSpace *GoerliSpaceSession) DefaultEntitlements(arg0 common.Address) (bool, error) {
	return _GoerliSpace.Contract.DefaultEntitlements(&_GoerliSpace.CallOpts, arg0)
}

// DefaultEntitlements is a free data retrieval call binding the contract method 0xfa6433c5.
//
// Solidity: function defaultEntitlements(address ) view returns(bool)
func (_GoerliSpace *GoerliSpaceCallerSession) DefaultEntitlements(arg0 common.Address) (bool, error) {
	return _GoerliSpace.Contract.DefaultEntitlements(&_GoerliSpace.CallOpts, arg0)
}

// Disabled is a free data retrieval call binding the contract method 0xee070805.
//
// Solidity: function disabled() view returns(bool)
func (_GoerliSpace *GoerliSpaceCaller) Disabled(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "disabled")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Disabled is a free data retrieval call binding the contract method 0xee070805.
//
// Solidity: function disabled() view returns(bool)
func (_GoerliSpace *GoerliSpaceSession) Disabled() (bool, error) {
	return _GoerliSpace.Contract.Disabled(&_GoerliSpace.CallOpts)
}

// Disabled is a free data retrieval call binding the contract method 0xee070805.
//
// Solidity: function disabled() view returns(bool)
func (_GoerliSpace *GoerliSpaceCallerSession) Disabled() (bool, error) {
	return _GoerliSpace.Contract.Disabled(&_GoerliSpace.CallOpts)
}

// Entitlements is a free data retrieval call binding the contract method 0xf28f9b56.
//
// Solidity: function entitlements(uint256 ) view returns(address)
func (_GoerliSpace *GoerliSpaceCaller) Entitlements(opts *bind.CallOpts, arg0 *big.Int) (common.Address, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "entitlements", arg0)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Entitlements is a free data retrieval call binding the contract method 0xf28f9b56.
//
// Solidity: function entitlements(uint256 ) view returns(address)
func (_GoerliSpace *GoerliSpaceSession) Entitlements(arg0 *big.Int) (common.Address, error) {
	return _GoerliSpace.Contract.Entitlements(&_GoerliSpace.CallOpts, arg0)
}

// Entitlements is a free data retrieval call binding the contract method 0xf28f9b56.
//
// Solidity: function entitlements(uint256 ) view returns(address)
func (_GoerliSpace *GoerliSpaceCallerSession) Entitlements(arg0 *big.Int) (common.Address, error) {
	return _GoerliSpace.Contract.Entitlements(&_GoerliSpace.CallOpts, arg0)
}

// GetChannelByHash is a free data retrieval call binding the contract method 0x703511f8.
//
// Solidity: function getChannelByHash(bytes32 _channelHash) view returns((string,string,bytes32,uint256,bool))
func (_GoerliSpace *GoerliSpaceCaller) GetChannelByHash(opts *bind.CallOpts, _channelHash [32]byte) (DataTypesChannel, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getChannelByHash", _channelHash)

	if err != nil {
		return *new(DataTypesChannel), err
	}

	out0 := *abi.ConvertType(out[0], new(DataTypesChannel)).(*DataTypesChannel)

	return out0, err

}

// GetChannelByHash is a free data retrieval call binding the contract method 0x703511f8.
//
// Solidity: function getChannelByHash(bytes32 _channelHash) view returns((string,string,bytes32,uint256,bool))
func (_GoerliSpace *GoerliSpaceSession) GetChannelByHash(_channelHash [32]byte) (DataTypesChannel, error) {
	return _GoerliSpace.Contract.GetChannelByHash(&_GoerliSpace.CallOpts, _channelHash)
}

// GetChannelByHash is a free data retrieval call binding the contract method 0x703511f8.
//
// Solidity: function getChannelByHash(bytes32 _channelHash) view returns((string,string,bytes32,uint256,bool))
func (_GoerliSpace *GoerliSpaceCallerSession) GetChannelByHash(_channelHash [32]byte) (DataTypesChannel, error) {
	return _GoerliSpace.Contract.GetChannelByHash(&_GoerliSpace.CallOpts, _channelHash)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns(bytes32[])
func (_GoerliSpace *GoerliSpaceCaller) GetChannels(opts *bind.CallOpts) ([][32]byte, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getChannels")

	if err != nil {
		return *new([][32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([][32]byte)).(*[][32]byte)

	return out0, err

}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns(bytes32[])
func (_GoerliSpace *GoerliSpaceSession) GetChannels() ([][32]byte, error) {
	return _GoerliSpace.Contract.GetChannels(&_GoerliSpace.CallOpts)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns(bytes32[])
func (_GoerliSpace *GoerliSpaceCallerSession) GetChannels() ([][32]byte, error) {
	return _GoerliSpace.Contract.GetChannels(&_GoerliSpace.CallOpts)
}

// GetEntitlementByModuleType is a free data retrieval call binding the contract method 0x870b9464.
//
// Solidity: function getEntitlementByModuleType(string _moduleType) view returns(address)
func (_GoerliSpace *GoerliSpaceCaller) GetEntitlementByModuleType(opts *bind.CallOpts, _moduleType string) (common.Address, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getEntitlementByModuleType", _moduleType)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetEntitlementByModuleType is a free data retrieval call binding the contract method 0x870b9464.
//
// Solidity: function getEntitlementByModuleType(string _moduleType) view returns(address)
func (_GoerliSpace *GoerliSpaceSession) GetEntitlementByModuleType(_moduleType string) (common.Address, error) {
	return _GoerliSpace.Contract.GetEntitlementByModuleType(&_GoerliSpace.CallOpts, _moduleType)
}

// GetEntitlementByModuleType is a free data retrieval call binding the contract method 0x870b9464.
//
// Solidity: function getEntitlementByModuleType(string _moduleType) view returns(address)
func (_GoerliSpace *GoerliSpaceCallerSession) GetEntitlementByModuleType(_moduleType string) (common.Address, error) {
	return _GoerliSpace.Contract.GetEntitlementByModuleType(&_GoerliSpace.CallOpts, _moduleType)
}

// GetEntitlementIdsByRoleId is a free data retrieval call binding the contract method 0x42486e49.
//
// Solidity: function getEntitlementIdsByRoleId(uint256 _roleId) view returns(bytes32[])
func (_GoerliSpace *GoerliSpaceCaller) GetEntitlementIdsByRoleId(opts *bind.CallOpts, _roleId *big.Int) ([][32]byte, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getEntitlementIdsByRoleId", _roleId)

	if err != nil {
		return *new([][32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([][32]byte)).(*[][32]byte)

	return out0, err

}

// GetEntitlementIdsByRoleId is a free data retrieval call binding the contract method 0x42486e49.
//
// Solidity: function getEntitlementIdsByRoleId(uint256 _roleId) view returns(bytes32[])
func (_GoerliSpace *GoerliSpaceSession) GetEntitlementIdsByRoleId(_roleId *big.Int) ([][32]byte, error) {
	return _GoerliSpace.Contract.GetEntitlementIdsByRoleId(&_GoerliSpace.CallOpts, _roleId)
}

// GetEntitlementIdsByRoleId is a free data retrieval call binding the contract method 0x42486e49.
//
// Solidity: function getEntitlementIdsByRoleId(uint256 _roleId) view returns(bytes32[])
func (_GoerliSpace *GoerliSpaceCallerSession) GetEntitlementIdsByRoleId(_roleId *big.Int) ([][32]byte, error) {
	return _GoerliSpace.Contract.GetEntitlementIdsByRoleId(&_GoerliSpace.CallOpts, _roleId)
}

// GetEntitlementModules is a free data retrieval call binding the contract method 0x0d029f75.
//
// Solidity: function getEntitlementModules() view returns((string,address,string,bool)[] _entitlementModules)
func (_GoerliSpace *GoerliSpaceCaller) GetEntitlementModules(opts *bind.CallOpts) ([]DataTypesEntitlementModule, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getEntitlementModules")

	if err != nil {
		return *new([]DataTypesEntitlementModule), err
	}

	out0 := *abi.ConvertType(out[0], new([]DataTypesEntitlementModule)).(*[]DataTypesEntitlementModule)

	return out0, err

}

// GetEntitlementModules is a free data retrieval call binding the contract method 0x0d029f75.
//
// Solidity: function getEntitlementModules() view returns((string,address,string,bool)[] _entitlementModules)
func (_GoerliSpace *GoerliSpaceSession) GetEntitlementModules() ([]DataTypesEntitlementModule, error) {
	return _GoerliSpace.Contract.GetEntitlementModules(&_GoerliSpace.CallOpts)
}

// GetEntitlementModules is a free data retrieval call binding the contract method 0x0d029f75.
//
// Solidity: function getEntitlementModules() view returns((string,address,string,bool)[] _entitlementModules)
func (_GoerliSpace *GoerliSpaceCallerSession) GetEntitlementModules() ([]DataTypesEntitlementModule, error) {
	return _GoerliSpace.Contract.GetEntitlementModules(&_GoerliSpace.CallOpts)
}

// GetPermissionsByRoleId is a free data retrieval call binding the contract method 0xb4264233.
//
// Solidity: function getPermissionsByRoleId(uint256 _roleId) view returns(string[])
func (_GoerliSpace *GoerliSpaceCaller) GetPermissionsByRoleId(opts *bind.CallOpts, _roleId *big.Int) ([]string, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getPermissionsByRoleId", _roleId)

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetPermissionsByRoleId is a free data retrieval call binding the contract method 0xb4264233.
//
// Solidity: function getPermissionsByRoleId(uint256 _roleId) view returns(string[])
func (_GoerliSpace *GoerliSpaceSession) GetPermissionsByRoleId(_roleId *big.Int) ([]string, error) {
	return _GoerliSpace.Contract.GetPermissionsByRoleId(&_GoerliSpace.CallOpts, _roleId)
}

// GetPermissionsByRoleId is a free data retrieval call binding the contract method 0xb4264233.
//
// Solidity: function getPermissionsByRoleId(uint256 _roleId) view returns(string[])
func (_GoerliSpace *GoerliSpaceCallerSession) GetPermissionsByRoleId(_roleId *big.Int) ([]string, error) {
	return _GoerliSpace.Contract.GetPermissionsByRoleId(&_GoerliSpace.CallOpts, _roleId)
}

// GetRoleById is a free data retrieval call binding the contract method 0x784c872b.
//
// Solidity: function getRoleById(uint256 _roleId) view returns((uint256,string))
func (_GoerliSpace *GoerliSpaceCaller) GetRoleById(opts *bind.CallOpts, _roleId *big.Int) (DataTypesRole, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getRoleById", _roleId)

	if err != nil {
		return *new(DataTypesRole), err
	}

	out0 := *abi.ConvertType(out[0], new(DataTypesRole)).(*DataTypesRole)

	return out0, err

}

// GetRoleById is a free data retrieval call binding the contract method 0x784c872b.
//
// Solidity: function getRoleById(uint256 _roleId) view returns((uint256,string))
func (_GoerliSpace *GoerliSpaceSession) GetRoleById(_roleId *big.Int) (DataTypesRole, error) {
	return _GoerliSpace.Contract.GetRoleById(&_GoerliSpace.CallOpts, _roleId)
}

// GetRoleById is a free data retrieval call binding the contract method 0x784c872b.
//
// Solidity: function getRoleById(uint256 _roleId) view returns((uint256,string))
func (_GoerliSpace *GoerliSpaceCallerSession) GetRoleById(_roleId *big.Int) (DataTypesRole, error) {
	return _GoerliSpace.Contract.GetRoleById(&_GoerliSpace.CallOpts, _roleId)
}

// GetRoles is a free data retrieval call binding the contract method 0x71061398.
//
// Solidity: function getRoles() view returns((uint256,string)[])
func (_GoerliSpace *GoerliSpaceCaller) GetRoles(opts *bind.CallOpts) ([]DataTypesRole, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "getRoles")

	if err != nil {
		return *new([]DataTypesRole), err
	}

	out0 := *abi.ConvertType(out[0], new([]DataTypesRole)).(*[]DataTypesRole)

	return out0, err

}

// GetRoles is a free data retrieval call binding the contract method 0x71061398.
//
// Solidity: function getRoles() view returns((uint256,string)[])
func (_GoerliSpace *GoerliSpaceSession) GetRoles() ([]DataTypesRole, error) {
	return _GoerliSpace.Contract.GetRoles(&_GoerliSpace.CallOpts)
}

// GetRoles is a free data retrieval call binding the contract method 0x71061398.
//
// Solidity: function getRoles() view returns((uint256,string)[])
func (_GoerliSpace *GoerliSpaceCallerSession) GetRoles() ([]DataTypesRole, error) {
	return _GoerliSpace.Contract.GetRoles(&_GoerliSpace.CallOpts)
}

// HasEntitlement is a free data retrieval call binding the contract method 0x7f8d06d0.
//
// Solidity: function hasEntitlement(address ) view returns(bool)
func (_GoerliSpace *GoerliSpaceCaller) HasEntitlement(opts *bind.CallOpts, arg0 common.Address) (bool, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "hasEntitlement", arg0)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// HasEntitlement is a free data retrieval call binding the contract method 0x7f8d06d0.
//
// Solidity: function hasEntitlement(address ) view returns(bool)
func (_GoerliSpace *GoerliSpaceSession) HasEntitlement(arg0 common.Address) (bool, error) {
	return _GoerliSpace.Contract.HasEntitlement(&_GoerliSpace.CallOpts, arg0)
}

// HasEntitlement is a free data retrieval call binding the contract method 0x7f8d06d0.
//
// Solidity: function hasEntitlement(address ) view returns(bool)
func (_GoerliSpace *GoerliSpaceCallerSession) HasEntitlement(arg0 common.Address) (bool, error) {
	return _GoerliSpace.Contract.HasEntitlement(&_GoerliSpace.CallOpts, arg0)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string _channelNetworkId, address _user, string _permission) view returns(bool _entitled)
func (_GoerliSpace *GoerliSpaceCaller) IsEntitledToChannel(opts *bind.CallOpts, _channelNetworkId string, _user common.Address, _permission string) (bool, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "isEntitledToChannel", _channelNetworkId, _user, _permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string _channelNetworkId, address _user, string _permission) view returns(bool _entitled)
func (_GoerliSpace *GoerliSpaceSession) IsEntitledToChannel(_channelNetworkId string, _user common.Address, _permission string) (bool, error) {
	return _GoerliSpace.Contract.IsEntitledToChannel(&_GoerliSpace.CallOpts, _channelNetworkId, _user, _permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string _channelNetworkId, address _user, string _permission) view returns(bool _entitled)
func (_GoerliSpace *GoerliSpaceCallerSession) IsEntitledToChannel(_channelNetworkId string, _user common.Address, _permission string) (bool, error) {
	return _GoerliSpace.Contract.IsEntitledToChannel(&_GoerliSpace.CallOpts, _channelNetworkId, _user, _permission)
}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address _user, string _permission) view returns(bool _entitled)
func (_GoerliSpace *GoerliSpaceCaller) IsEntitledToSpace(opts *bind.CallOpts, _user common.Address, _permission string) (bool, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "isEntitledToSpace", _user, _permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address _user, string _permission) view returns(bool _entitled)
func (_GoerliSpace *GoerliSpaceSession) IsEntitledToSpace(_user common.Address, _permission string) (bool, error) {
	return _GoerliSpace.Contract.IsEntitledToSpace(&_GoerliSpace.CallOpts, _user, _permission)
}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address _user, string _permission) view returns(bool _entitled)
func (_GoerliSpace *GoerliSpaceCallerSession) IsEntitledToSpace(_user common.Address, _permission string) (bool, error) {
	return _GoerliSpace.Contract.IsEntitledToSpace(&_GoerliSpace.CallOpts, _user, _permission)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_GoerliSpace *GoerliSpaceCaller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_GoerliSpace *GoerliSpaceSession) Name() (string, error) {
	return _GoerliSpace.Contract.Name(&_GoerliSpace.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_GoerliSpace *GoerliSpaceCallerSession) Name() (string, error) {
	return _GoerliSpace.Contract.Name(&_GoerliSpace.CallOpts)
}

// NetworkId is a free data retrieval call binding the contract method 0x9025e64c.
//
// Solidity: function networkId() view returns(string)
func (_GoerliSpace *GoerliSpaceCaller) NetworkId(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "networkId")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// NetworkId is a free data retrieval call binding the contract method 0x9025e64c.
//
// Solidity: function networkId() view returns(string)
func (_GoerliSpace *GoerliSpaceSession) NetworkId() (string, error) {
	return _GoerliSpace.Contract.NetworkId(&_GoerliSpace.CallOpts)
}

// NetworkId is a free data retrieval call binding the contract method 0x9025e64c.
//
// Solidity: function networkId() view returns(string)
func (_GoerliSpace *GoerliSpaceCallerSession) NetworkId() (string, error) {
	return _GoerliSpace.Contract.NetworkId(&_GoerliSpace.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_GoerliSpace *GoerliSpaceCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_GoerliSpace *GoerliSpaceSession) Owner() (common.Address, error) {
	return _GoerliSpace.Contract.Owner(&_GoerliSpace.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_GoerliSpace *GoerliSpaceCallerSession) Owner() (common.Address, error) {
	return _GoerliSpace.Contract.Owner(&_GoerliSpace.CallOpts)
}

// OwnerRoleId is a free data retrieval call binding the contract method 0xd1a6a961.
//
// Solidity: function ownerRoleId() view returns(uint256)
func (_GoerliSpace *GoerliSpaceCaller) OwnerRoleId(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "ownerRoleId")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// OwnerRoleId is a free data retrieval call binding the contract method 0xd1a6a961.
//
// Solidity: function ownerRoleId() view returns(uint256)
func (_GoerliSpace *GoerliSpaceSession) OwnerRoleId() (*big.Int, error) {
	return _GoerliSpace.Contract.OwnerRoleId(&_GoerliSpace.CallOpts)
}

// OwnerRoleId is a free data retrieval call binding the contract method 0xd1a6a961.
//
// Solidity: function ownerRoleId() view returns(uint256)
func (_GoerliSpace *GoerliSpaceCallerSession) OwnerRoleId() (*big.Int, error) {
	return _GoerliSpace.Contract.OwnerRoleId(&_GoerliSpace.CallOpts)
}

// ProxiableUUID is a free data retrieval call binding the contract method 0x52d1902d.
//
// Solidity: function proxiableUUID() view returns(bytes32)
func (_GoerliSpace *GoerliSpaceCaller) ProxiableUUID(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "proxiableUUID")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// ProxiableUUID is a free data retrieval call binding the contract method 0x52d1902d.
//
// Solidity: function proxiableUUID() view returns(bytes32)
func (_GoerliSpace *GoerliSpaceSession) ProxiableUUID() ([32]byte, error) {
	return _GoerliSpace.Contract.ProxiableUUID(&_GoerliSpace.CallOpts)
}

// ProxiableUUID is a free data retrieval call binding the contract method 0x52d1902d.
//
// Solidity: function proxiableUUID() view returns(bytes32)
func (_GoerliSpace *GoerliSpaceCallerSession) ProxiableUUID() ([32]byte, error) {
	return _GoerliSpace.Contract.ProxiableUUID(&_GoerliSpace.CallOpts)
}

// RoleCount is a free data retrieval call binding the contract method 0xddf96358.
//
// Solidity: function roleCount() view returns(uint256)
func (_GoerliSpace *GoerliSpaceCaller) RoleCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "roleCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// RoleCount is a free data retrieval call binding the contract method 0xddf96358.
//
// Solidity: function roleCount() view returns(uint256)
func (_GoerliSpace *GoerliSpaceSession) RoleCount() (*big.Int, error) {
	return _GoerliSpace.Contract.RoleCount(&_GoerliSpace.CallOpts)
}

// RoleCount is a free data retrieval call binding the contract method 0xddf96358.
//
// Solidity: function roleCount() view returns(uint256)
func (_GoerliSpace *GoerliSpaceCallerSession) RoleCount() (*big.Int, error) {
	return _GoerliSpace.Contract.RoleCount(&_GoerliSpace.CallOpts)
}

// RolesById is a free data retrieval call binding the contract method 0xe5894ef4.
//
// Solidity: function rolesById(uint256 ) view returns(uint256 roleId, string name)
func (_GoerliSpace *GoerliSpaceCaller) RolesById(opts *bind.CallOpts, arg0 *big.Int) (struct {
	RoleId *big.Int
	Name   string
}, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "rolesById", arg0)

	outstruct := new(struct {
		RoleId *big.Int
		Name   string
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.RoleId = *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	outstruct.Name = *abi.ConvertType(out[1], new(string)).(*string)

	return *outstruct, err

}

// RolesById is a free data retrieval call binding the contract method 0xe5894ef4.
//
// Solidity: function rolesById(uint256 ) view returns(uint256 roleId, string name)
func (_GoerliSpace *GoerliSpaceSession) RolesById(arg0 *big.Int) (struct {
	RoleId *big.Int
	Name   string
}, error) {
	return _GoerliSpace.Contract.RolesById(&_GoerliSpace.CallOpts, arg0)
}

// RolesById is a free data retrieval call binding the contract method 0xe5894ef4.
//
// Solidity: function rolesById(uint256 ) view returns(uint256 roleId, string name)
func (_GoerliSpace *GoerliSpaceCallerSession) RolesById(arg0 *big.Int) (struct {
	RoleId *big.Int
	Name   string
}, error) {
	return _GoerliSpace.Contract.RolesById(&_GoerliSpace.CallOpts, arg0)
}

// Token is a free data retrieval call binding the contract method 0xfc0c546a.
//
// Solidity: function token() view returns(address)
func (_GoerliSpace *GoerliSpaceCaller) Token(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "token")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Token is a free data retrieval call binding the contract method 0xfc0c546a.
//
// Solidity: function token() view returns(address)
func (_GoerliSpace *GoerliSpaceSession) Token() (common.Address, error) {
	return _GoerliSpace.Contract.Token(&_GoerliSpace.CallOpts)
}

// Token is a free data retrieval call binding the contract method 0xfc0c546a.
//
// Solidity: function token() view returns(address)
func (_GoerliSpace *GoerliSpaceCallerSession) Token() (common.Address, error) {
	return _GoerliSpace.Contract.Token(&_GoerliSpace.CallOpts)
}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_GoerliSpace *GoerliSpaceCaller) TokenId(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _GoerliSpace.contract.Call(opts, &out, "tokenId")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_GoerliSpace *GoerliSpaceSession) TokenId() (*big.Int, error) {
	return _GoerliSpace.Contract.TokenId(&_GoerliSpace.CallOpts)
}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_GoerliSpace *GoerliSpaceCallerSession) TokenId() (*big.Int, error) {
	return _GoerliSpace.Contract.TokenId(&_GoerliSpace.CallOpts)
}

// AddPermissionsToRole is a paid mutator transaction binding the contract method 0xb7515761.
//
// Solidity: function addPermissionsToRole(uint256 _roleId, string[] _permissions) returns()
func (_GoerliSpace *GoerliSpaceTransactor) AddPermissionsToRole(opts *bind.TransactOpts, _roleId *big.Int, _permissions []string) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "addPermissionsToRole", _roleId, _permissions)
}

// AddPermissionsToRole is a paid mutator transaction binding the contract method 0xb7515761.
//
// Solidity: function addPermissionsToRole(uint256 _roleId, string[] _permissions) returns()
func (_GoerliSpace *GoerliSpaceSession) AddPermissionsToRole(_roleId *big.Int, _permissions []string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.AddPermissionsToRole(&_GoerliSpace.TransactOpts, _roleId, _permissions)
}

// AddPermissionsToRole is a paid mutator transaction binding the contract method 0xb7515761.
//
// Solidity: function addPermissionsToRole(uint256 _roleId, string[] _permissions) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) AddPermissionsToRole(_roleId *big.Int, _permissions []string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.AddPermissionsToRole(&_GoerliSpace.TransactOpts, _roleId, _permissions)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x1dea616a.
//
// Solidity: function addRoleToChannel(string _channelNetworkId, address _entitlement, uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactor) AddRoleToChannel(opts *bind.TransactOpts, _channelNetworkId string, _entitlement common.Address, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "addRoleToChannel", _channelNetworkId, _entitlement, _roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x1dea616a.
//
// Solidity: function addRoleToChannel(string _channelNetworkId, address _entitlement, uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceSession) AddRoleToChannel(_channelNetworkId string, _entitlement common.Address, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.AddRoleToChannel(&_GoerliSpace.TransactOpts, _channelNetworkId, _entitlement, _roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x1dea616a.
//
// Solidity: function addRoleToChannel(string _channelNetworkId, address _entitlement, uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) AddRoleToChannel(_channelNetworkId string, _entitlement common.Address, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.AddRoleToChannel(&_GoerliSpace.TransactOpts, _channelNetworkId, _entitlement, _roleId)
}

// AddRoleToEntitlement is a paid mutator transaction binding the contract method 0xba201ba8.
//
// Solidity: function addRoleToEntitlement(uint256 _roleId, (address,bytes) _entitlement) returns()
func (_GoerliSpace *GoerliSpaceTransactor) AddRoleToEntitlement(opts *bind.TransactOpts, _roleId *big.Int, _entitlement DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "addRoleToEntitlement", _roleId, _entitlement)
}

// AddRoleToEntitlement is a paid mutator transaction binding the contract method 0xba201ba8.
//
// Solidity: function addRoleToEntitlement(uint256 _roleId, (address,bytes) _entitlement) returns()
func (_GoerliSpace *GoerliSpaceSession) AddRoleToEntitlement(_roleId *big.Int, _entitlement DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.Contract.AddRoleToEntitlement(&_GoerliSpace.TransactOpts, _roleId, _entitlement)
}

// AddRoleToEntitlement is a paid mutator transaction binding the contract method 0xba201ba8.
//
// Solidity: function addRoleToEntitlement(uint256 _roleId, (address,bytes) _entitlement) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) AddRoleToEntitlement(_roleId *big.Int, _entitlement DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.Contract.AddRoleToEntitlement(&_GoerliSpace.TransactOpts, _roleId, _entitlement)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelName, string channelNetworkId, uint256[] roleIds) returns(bytes32)
func (_GoerliSpace *GoerliSpaceTransactor) CreateChannel(opts *bind.TransactOpts, channelName string, channelNetworkId string, roleIds []*big.Int) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "createChannel", channelName, channelNetworkId, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelName, string channelNetworkId, uint256[] roleIds) returns(bytes32)
func (_GoerliSpace *GoerliSpaceSession) CreateChannel(channelName string, channelNetworkId string, roleIds []*big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.CreateChannel(&_GoerliSpace.TransactOpts, channelName, channelNetworkId, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelName, string channelNetworkId, uint256[] roleIds) returns(bytes32)
func (_GoerliSpace *GoerliSpaceTransactorSession) CreateChannel(channelName string, channelNetworkId string, roleIds []*big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.CreateChannel(&_GoerliSpace.TransactOpts, channelName, channelNetworkId, roleIds)
}

// CreateRole is a paid mutator transaction binding the contract method 0x8fcd793d.
//
// Solidity: function createRole(string _roleName, string[] _permissions, (address,bytes)[] _entitlements) returns(uint256)
func (_GoerliSpace *GoerliSpaceTransactor) CreateRole(opts *bind.TransactOpts, _roleName string, _permissions []string, _entitlements []DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "createRole", _roleName, _permissions, _entitlements)
}

// CreateRole is a paid mutator transaction binding the contract method 0x8fcd793d.
//
// Solidity: function createRole(string _roleName, string[] _permissions, (address,bytes)[] _entitlements) returns(uint256)
func (_GoerliSpace *GoerliSpaceSession) CreateRole(_roleName string, _permissions []string, _entitlements []DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.Contract.CreateRole(&_GoerliSpace.TransactOpts, _roleName, _permissions, _entitlements)
}

// CreateRole is a paid mutator transaction binding the contract method 0x8fcd793d.
//
// Solidity: function createRole(string _roleName, string[] _permissions, (address,bytes)[] _entitlements) returns(uint256)
func (_GoerliSpace *GoerliSpaceTransactorSession) CreateRole(_roleName string, _permissions []string, _entitlements []DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.Contract.CreateRole(&_GoerliSpace.TransactOpts, _roleName, _permissions, _entitlements)
}

// Initialize is a paid mutator transaction binding the contract method 0xf3ce6a5b.
//
// Solidity: function initialize(string _name, string _networkId, address[] _entitlements, address _token, uint256 _tokenId) returns()
func (_GoerliSpace *GoerliSpaceTransactor) Initialize(opts *bind.TransactOpts, _name string, _networkId string, _entitlements []common.Address, _token common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "initialize", _name, _networkId, _entitlements, _token, _tokenId)
}

// Initialize is a paid mutator transaction binding the contract method 0xf3ce6a5b.
//
// Solidity: function initialize(string _name, string _networkId, address[] _entitlements, address _token, uint256 _tokenId) returns()
func (_GoerliSpace *GoerliSpaceSession) Initialize(_name string, _networkId string, _entitlements []common.Address, _token common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.Initialize(&_GoerliSpace.TransactOpts, _name, _networkId, _entitlements, _token, _tokenId)
}

// Initialize is a paid mutator transaction binding the contract method 0xf3ce6a5b.
//
// Solidity: function initialize(string _name, string _networkId, address[] _entitlements, address _token, uint256 _tokenId) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) Initialize(_name string, _networkId string, _entitlements []common.Address, _token common.Address, _tokenId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.Initialize(&_GoerliSpace.TransactOpts, _name, _networkId, _entitlements, _token, _tokenId)
}

// Multicall is a paid mutator transaction binding the contract method 0xac9650d8.
//
// Solidity: function multicall(bytes[] data) returns(bytes[] results)
func (_GoerliSpace *GoerliSpaceTransactor) Multicall(opts *bind.TransactOpts, data [][]byte) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "multicall", data)
}

// Multicall is a paid mutator transaction binding the contract method 0xac9650d8.
//
// Solidity: function multicall(bytes[] data) returns(bytes[] results)
func (_GoerliSpace *GoerliSpaceSession) Multicall(data [][]byte) (*types.Transaction, error) {
	return _GoerliSpace.Contract.Multicall(&_GoerliSpace.TransactOpts, data)
}

// Multicall is a paid mutator transaction binding the contract method 0xac9650d8.
//
// Solidity: function multicall(bytes[] data) returns(bytes[] results)
func (_GoerliSpace *GoerliSpaceTransactorSession) Multicall(data [][]byte) (*types.Transaction, error) {
	return _GoerliSpace.Contract.Multicall(&_GoerliSpace.TransactOpts, data)
}

// RemovePermissionsFromRole is a paid mutator transaction binding the contract method 0x9a8e4c3e.
//
// Solidity: function removePermissionsFromRole(uint256 _roleId, string[] _permissions) returns()
func (_GoerliSpace *GoerliSpaceTransactor) RemovePermissionsFromRole(opts *bind.TransactOpts, _roleId *big.Int, _permissions []string) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "removePermissionsFromRole", _roleId, _permissions)
}

// RemovePermissionsFromRole is a paid mutator transaction binding the contract method 0x9a8e4c3e.
//
// Solidity: function removePermissionsFromRole(uint256 _roleId, string[] _permissions) returns()
func (_GoerliSpace *GoerliSpaceSession) RemovePermissionsFromRole(_roleId *big.Int, _permissions []string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemovePermissionsFromRole(&_GoerliSpace.TransactOpts, _roleId, _permissions)
}

// RemovePermissionsFromRole is a paid mutator transaction binding the contract method 0x9a8e4c3e.
//
// Solidity: function removePermissionsFromRole(uint256 _roleId, string[] _permissions) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) RemovePermissionsFromRole(_roleId *big.Int, _permissions []string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemovePermissionsFromRole(&_GoerliSpace.TransactOpts, _roleId, _permissions)
}

// RemoveRole is a paid mutator transaction binding the contract method 0x92691821.
//
// Solidity: function removeRole(uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactor) RemoveRole(opts *bind.TransactOpts, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "removeRole", _roleId)
}

// RemoveRole is a paid mutator transaction binding the contract method 0x92691821.
//
// Solidity: function removeRole(uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceSession) RemoveRole(_roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemoveRole(&_GoerliSpace.TransactOpts, _roleId)
}

// RemoveRole is a paid mutator transaction binding the contract method 0x92691821.
//
// Solidity: function removeRole(uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) RemoveRole(_roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemoveRole(&_GoerliSpace.TransactOpts, _roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0xbaaf3d57.
//
// Solidity: function removeRoleFromChannel(string _channelNetworkId, address _entitlement, uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactor) RemoveRoleFromChannel(opts *bind.TransactOpts, _channelNetworkId string, _entitlement common.Address, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "removeRoleFromChannel", _channelNetworkId, _entitlement, _roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0xbaaf3d57.
//
// Solidity: function removeRoleFromChannel(string _channelNetworkId, address _entitlement, uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceSession) RemoveRoleFromChannel(_channelNetworkId string, _entitlement common.Address, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemoveRoleFromChannel(&_GoerliSpace.TransactOpts, _channelNetworkId, _entitlement, _roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0xbaaf3d57.
//
// Solidity: function removeRoleFromChannel(string _channelNetworkId, address _entitlement, uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) RemoveRoleFromChannel(_channelNetworkId string, _entitlement common.Address, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemoveRoleFromChannel(&_GoerliSpace.TransactOpts, _channelNetworkId, _entitlement, _roleId)
}

// RemoveRoleFromEntitlement is a paid mutator transaction binding the contract method 0xdba81864.
//
// Solidity: function removeRoleFromEntitlement(uint256 _roleId, (address,bytes) _entitlement) returns()
func (_GoerliSpace *GoerliSpaceTransactor) RemoveRoleFromEntitlement(opts *bind.TransactOpts, _roleId *big.Int, _entitlement DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "removeRoleFromEntitlement", _roleId, _entitlement)
}

// RemoveRoleFromEntitlement is a paid mutator transaction binding the contract method 0xdba81864.
//
// Solidity: function removeRoleFromEntitlement(uint256 _roleId, (address,bytes) _entitlement) returns()
func (_GoerliSpace *GoerliSpaceSession) RemoveRoleFromEntitlement(_roleId *big.Int, _entitlement DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemoveRoleFromEntitlement(&_GoerliSpace.TransactOpts, _roleId, _entitlement)
}

// RemoveRoleFromEntitlement is a paid mutator transaction binding the contract method 0xdba81864.
//
// Solidity: function removeRoleFromEntitlement(uint256 _roleId, (address,bytes) _entitlement) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) RemoveRoleFromEntitlement(_roleId *big.Int, _entitlement DataTypesEntitlement) (*types.Transaction, error) {
	return _GoerliSpace.Contract.RemoveRoleFromEntitlement(&_GoerliSpace.TransactOpts, _roleId, _entitlement)
}

// SetChannelAccess is a paid mutator transaction binding the contract method 0x5de151b8.
//
// Solidity: function setChannelAccess(string channelNetworkId, bool disableChannel) returns()
func (_GoerliSpace *GoerliSpaceTransactor) SetChannelAccess(opts *bind.TransactOpts, channelNetworkId string, disableChannel bool) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "setChannelAccess", channelNetworkId, disableChannel)
}

// SetChannelAccess is a paid mutator transaction binding the contract method 0x5de151b8.
//
// Solidity: function setChannelAccess(string channelNetworkId, bool disableChannel) returns()
func (_GoerliSpace *GoerliSpaceSession) SetChannelAccess(channelNetworkId string, disableChannel bool) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetChannelAccess(&_GoerliSpace.TransactOpts, channelNetworkId, disableChannel)
}

// SetChannelAccess is a paid mutator transaction binding the contract method 0x5de151b8.
//
// Solidity: function setChannelAccess(string channelNetworkId, bool disableChannel) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) SetChannelAccess(channelNetworkId string, disableChannel bool) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetChannelAccess(&_GoerliSpace.TransactOpts, channelNetworkId, disableChannel)
}

// SetEntitlementModule is a paid mutator transaction binding the contract method 0x441555e5.
//
// Solidity: function setEntitlementModule(address _entitlementModule, bool _whitelist) returns()
func (_GoerliSpace *GoerliSpaceTransactor) SetEntitlementModule(opts *bind.TransactOpts, _entitlementModule common.Address, _whitelist bool) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "setEntitlementModule", _entitlementModule, _whitelist)
}

// SetEntitlementModule is a paid mutator transaction binding the contract method 0x441555e5.
//
// Solidity: function setEntitlementModule(address _entitlementModule, bool _whitelist) returns()
func (_GoerliSpace *GoerliSpaceSession) SetEntitlementModule(_entitlementModule common.Address, _whitelist bool) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetEntitlementModule(&_GoerliSpace.TransactOpts, _entitlementModule, _whitelist)
}

// SetEntitlementModule is a paid mutator transaction binding the contract method 0x441555e5.
//
// Solidity: function setEntitlementModule(address _entitlementModule, bool _whitelist) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) SetEntitlementModule(_entitlementModule common.Address, _whitelist bool) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetEntitlementModule(&_GoerliSpace.TransactOpts, _entitlementModule, _whitelist)
}

// SetOwnerRoleId is a paid mutator transaction binding the contract method 0x4999ab16.
//
// Solidity: function setOwnerRoleId(uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactor) SetOwnerRoleId(opts *bind.TransactOpts, _roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "setOwnerRoleId", _roleId)
}

// SetOwnerRoleId is a paid mutator transaction binding the contract method 0x4999ab16.
//
// Solidity: function setOwnerRoleId(uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceSession) SetOwnerRoleId(_roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetOwnerRoleId(&_GoerliSpace.TransactOpts, _roleId)
}

// SetOwnerRoleId is a paid mutator transaction binding the contract method 0x4999ab16.
//
// Solidity: function setOwnerRoleId(uint256 _roleId) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) SetOwnerRoleId(_roleId *big.Int) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetOwnerRoleId(&_GoerliSpace.TransactOpts, _roleId)
}

// SetSpaceAccess is a paid mutator transaction binding the contract method 0x446dc22e.
//
// Solidity: function setSpaceAccess(bool _disabled) returns()
func (_GoerliSpace *GoerliSpaceTransactor) SetSpaceAccess(opts *bind.TransactOpts, _disabled bool) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "setSpaceAccess", _disabled)
}

// SetSpaceAccess is a paid mutator transaction binding the contract method 0x446dc22e.
//
// Solidity: function setSpaceAccess(bool _disabled) returns()
func (_GoerliSpace *GoerliSpaceSession) SetSpaceAccess(_disabled bool) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetSpaceAccess(&_GoerliSpace.TransactOpts, _disabled)
}

// SetSpaceAccess is a paid mutator transaction binding the contract method 0x446dc22e.
//
// Solidity: function setSpaceAccess(bool _disabled) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) SetSpaceAccess(_disabled bool) (*types.Transaction, error) {
	return _GoerliSpace.Contract.SetSpaceAccess(&_GoerliSpace.TransactOpts, _disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x34a1dd26.
//
// Solidity: function updateChannel(string channelNetworkId, string channelName) returns()
func (_GoerliSpace *GoerliSpaceTransactor) UpdateChannel(opts *bind.TransactOpts, channelNetworkId string, channelName string) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "updateChannel", channelNetworkId, channelName)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x34a1dd26.
//
// Solidity: function updateChannel(string channelNetworkId, string channelName) returns()
func (_GoerliSpace *GoerliSpaceSession) UpdateChannel(channelNetworkId string, channelName string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpdateChannel(&_GoerliSpace.TransactOpts, channelNetworkId, channelName)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x34a1dd26.
//
// Solidity: function updateChannel(string channelNetworkId, string channelName) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) UpdateChannel(channelNetworkId string, channelName string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpdateChannel(&_GoerliSpace.TransactOpts, channelNetworkId, channelName)
}

// UpdateRole is a paid mutator transaction binding the contract method 0x32e704cc.
//
// Solidity: function updateRole(uint256 _roleId, string _roleName) returns()
func (_GoerliSpace *GoerliSpaceTransactor) UpdateRole(opts *bind.TransactOpts, _roleId *big.Int, _roleName string) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "updateRole", _roleId, _roleName)
}

// UpdateRole is a paid mutator transaction binding the contract method 0x32e704cc.
//
// Solidity: function updateRole(uint256 _roleId, string _roleName) returns()
func (_GoerliSpace *GoerliSpaceSession) UpdateRole(_roleId *big.Int, _roleName string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpdateRole(&_GoerliSpace.TransactOpts, _roleId, _roleName)
}

// UpdateRole is a paid mutator transaction binding the contract method 0x32e704cc.
//
// Solidity: function updateRole(uint256 _roleId, string _roleName) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) UpdateRole(_roleId *big.Int, _roleName string) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpdateRole(&_GoerliSpace.TransactOpts, _roleId, _roleName)
}

// UpgradeEntitlement is a paid mutator transaction binding the contract method 0x519607f2.
//
// Solidity: function upgradeEntitlement(address _entitlement, address _newEntitlement) returns()
func (_GoerliSpace *GoerliSpaceTransactor) UpgradeEntitlement(opts *bind.TransactOpts, _entitlement common.Address, _newEntitlement common.Address) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "upgradeEntitlement", _entitlement, _newEntitlement)
}

// UpgradeEntitlement is a paid mutator transaction binding the contract method 0x519607f2.
//
// Solidity: function upgradeEntitlement(address _entitlement, address _newEntitlement) returns()
func (_GoerliSpace *GoerliSpaceSession) UpgradeEntitlement(_entitlement common.Address, _newEntitlement common.Address) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpgradeEntitlement(&_GoerliSpace.TransactOpts, _entitlement, _newEntitlement)
}

// UpgradeEntitlement is a paid mutator transaction binding the contract method 0x519607f2.
//
// Solidity: function upgradeEntitlement(address _entitlement, address _newEntitlement) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) UpgradeEntitlement(_entitlement common.Address, _newEntitlement common.Address) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpgradeEntitlement(&_GoerliSpace.TransactOpts, _entitlement, _newEntitlement)
}

// UpgradeTo is a paid mutator transaction binding the contract method 0x3659cfe6.
//
// Solidity: function upgradeTo(address newImplementation) returns()
func (_GoerliSpace *GoerliSpaceTransactor) UpgradeTo(opts *bind.TransactOpts, newImplementation common.Address) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "upgradeTo", newImplementation)
}

// UpgradeTo is a paid mutator transaction binding the contract method 0x3659cfe6.
//
// Solidity: function upgradeTo(address newImplementation) returns()
func (_GoerliSpace *GoerliSpaceSession) UpgradeTo(newImplementation common.Address) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpgradeTo(&_GoerliSpace.TransactOpts, newImplementation)
}

// UpgradeTo is a paid mutator transaction binding the contract method 0x3659cfe6.
//
// Solidity: function upgradeTo(address newImplementation) returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) UpgradeTo(newImplementation common.Address) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpgradeTo(&_GoerliSpace.TransactOpts, newImplementation)
}

// UpgradeToAndCall is a paid mutator transaction binding the contract method 0x4f1ef286.
//
// Solidity: function upgradeToAndCall(address newImplementation, bytes data) payable returns()
func (_GoerliSpace *GoerliSpaceTransactor) UpgradeToAndCall(opts *bind.TransactOpts, newImplementation common.Address, data []byte) (*types.Transaction, error) {
	return _GoerliSpace.contract.Transact(opts, "upgradeToAndCall", newImplementation, data)
}

// UpgradeToAndCall is a paid mutator transaction binding the contract method 0x4f1ef286.
//
// Solidity: function upgradeToAndCall(address newImplementation, bytes data) payable returns()
func (_GoerliSpace *GoerliSpaceSession) UpgradeToAndCall(newImplementation common.Address, data []byte) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpgradeToAndCall(&_GoerliSpace.TransactOpts, newImplementation, data)
}

// UpgradeToAndCall is a paid mutator transaction binding the contract method 0x4f1ef286.
//
// Solidity: function upgradeToAndCall(address newImplementation, bytes data) payable returns()
func (_GoerliSpace *GoerliSpaceTransactorSession) UpgradeToAndCall(newImplementation common.Address, data []byte) (*types.Transaction, error) {
	return _GoerliSpace.Contract.UpgradeToAndCall(&_GoerliSpace.TransactOpts, newImplementation, data)
}

// GoerliSpaceAdminChangedIterator is returned from FilterAdminChanged and is used to iterate over the raw logs and unpacked data for AdminChanged events raised by the GoerliSpace contract.
type GoerliSpaceAdminChangedIterator struct {
	Event *GoerliSpaceAdminChanged // Event containing the contract specifics and raw log

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
func (it *GoerliSpaceAdminChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliSpaceAdminChanged)
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
		it.Event = new(GoerliSpaceAdminChanged)
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
func (it *GoerliSpaceAdminChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliSpaceAdminChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliSpaceAdminChanged represents a AdminChanged event raised by the GoerliSpace contract.
type GoerliSpaceAdminChanged struct {
	PreviousAdmin common.Address
	NewAdmin      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterAdminChanged is a free log retrieval operation binding the contract event 0x7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f.
//
// Solidity: event AdminChanged(address previousAdmin, address newAdmin)
func (_GoerliSpace *GoerliSpaceFilterer) FilterAdminChanged(opts *bind.FilterOpts) (*GoerliSpaceAdminChangedIterator, error) {

	logs, sub, err := _GoerliSpace.contract.FilterLogs(opts, "AdminChanged")
	if err != nil {
		return nil, err
	}
	return &GoerliSpaceAdminChangedIterator{contract: _GoerliSpace.contract, event: "AdminChanged", logs: logs, sub: sub}, nil
}

// WatchAdminChanged is a free log subscription operation binding the contract event 0x7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f.
//
// Solidity: event AdminChanged(address previousAdmin, address newAdmin)
func (_GoerliSpace *GoerliSpaceFilterer) WatchAdminChanged(opts *bind.WatchOpts, sink chan<- *GoerliSpaceAdminChanged) (event.Subscription, error) {

	logs, sub, err := _GoerliSpace.contract.WatchLogs(opts, "AdminChanged")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliSpaceAdminChanged)
				if err := _GoerliSpace.contract.UnpackLog(event, "AdminChanged", log); err != nil {
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

// ParseAdminChanged is a log parse operation binding the contract event 0x7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f.
//
// Solidity: event AdminChanged(address previousAdmin, address newAdmin)
func (_GoerliSpace *GoerliSpaceFilterer) ParseAdminChanged(log types.Log) (*GoerliSpaceAdminChanged, error) {
	event := new(GoerliSpaceAdminChanged)
	if err := _GoerliSpace.contract.UnpackLog(event, "AdminChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliSpaceBeaconUpgradedIterator is returned from FilterBeaconUpgraded and is used to iterate over the raw logs and unpacked data for BeaconUpgraded events raised by the GoerliSpace contract.
type GoerliSpaceBeaconUpgradedIterator struct {
	Event *GoerliSpaceBeaconUpgraded // Event containing the contract specifics and raw log

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
func (it *GoerliSpaceBeaconUpgradedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliSpaceBeaconUpgraded)
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
		it.Event = new(GoerliSpaceBeaconUpgraded)
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
func (it *GoerliSpaceBeaconUpgradedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliSpaceBeaconUpgradedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliSpaceBeaconUpgraded represents a BeaconUpgraded event raised by the GoerliSpace contract.
type GoerliSpaceBeaconUpgraded struct {
	Beacon common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterBeaconUpgraded is a free log retrieval operation binding the contract event 0x1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e.
//
// Solidity: event BeaconUpgraded(address indexed beacon)
func (_GoerliSpace *GoerliSpaceFilterer) FilterBeaconUpgraded(opts *bind.FilterOpts, beacon []common.Address) (*GoerliSpaceBeaconUpgradedIterator, error) {

	var beaconRule []interface{}
	for _, beaconItem := range beacon {
		beaconRule = append(beaconRule, beaconItem)
	}

	logs, sub, err := _GoerliSpace.contract.FilterLogs(opts, "BeaconUpgraded", beaconRule)
	if err != nil {
		return nil, err
	}
	return &GoerliSpaceBeaconUpgradedIterator{contract: _GoerliSpace.contract, event: "BeaconUpgraded", logs: logs, sub: sub}, nil
}

// WatchBeaconUpgraded is a free log subscription operation binding the contract event 0x1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e.
//
// Solidity: event BeaconUpgraded(address indexed beacon)
func (_GoerliSpace *GoerliSpaceFilterer) WatchBeaconUpgraded(opts *bind.WatchOpts, sink chan<- *GoerliSpaceBeaconUpgraded, beacon []common.Address) (event.Subscription, error) {

	var beaconRule []interface{}
	for _, beaconItem := range beacon {
		beaconRule = append(beaconRule, beaconItem)
	}

	logs, sub, err := _GoerliSpace.contract.WatchLogs(opts, "BeaconUpgraded", beaconRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliSpaceBeaconUpgraded)
				if err := _GoerliSpace.contract.UnpackLog(event, "BeaconUpgraded", log); err != nil {
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

// ParseBeaconUpgraded is a log parse operation binding the contract event 0x1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e.
//
// Solidity: event BeaconUpgraded(address indexed beacon)
func (_GoerliSpace *GoerliSpaceFilterer) ParseBeaconUpgraded(log types.Log) (*GoerliSpaceBeaconUpgraded, error) {
	event := new(GoerliSpaceBeaconUpgraded)
	if err := _GoerliSpace.contract.UnpackLog(event, "BeaconUpgraded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliSpaceInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the GoerliSpace contract.
type GoerliSpaceInitializedIterator struct {
	Event *GoerliSpaceInitialized // Event containing the contract specifics and raw log

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
func (it *GoerliSpaceInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliSpaceInitialized)
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
		it.Event = new(GoerliSpaceInitialized)
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
func (it *GoerliSpaceInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliSpaceInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliSpaceInitialized represents a Initialized event raised by the GoerliSpace contract.
type GoerliSpaceInitialized struct {
	Version uint8
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498.
//
// Solidity: event Initialized(uint8 version)
func (_GoerliSpace *GoerliSpaceFilterer) FilterInitialized(opts *bind.FilterOpts) (*GoerliSpaceInitializedIterator, error) {

	logs, sub, err := _GoerliSpace.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &GoerliSpaceInitializedIterator{contract: _GoerliSpace.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498.
//
// Solidity: event Initialized(uint8 version)
func (_GoerliSpace *GoerliSpaceFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *GoerliSpaceInitialized) (event.Subscription, error) {

	logs, sub, err := _GoerliSpace.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliSpaceInitialized)
				if err := _GoerliSpace.contract.UnpackLog(event, "Initialized", log); err != nil {
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

// ParseInitialized is a log parse operation binding the contract event 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498.
//
// Solidity: event Initialized(uint8 version)
func (_GoerliSpace *GoerliSpaceFilterer) ParseInitialized(log types.Log) (*GoerliSpaceInitialized, error) {
	event := new(GoerliSpaceInitialized)
	if err := _GoerliSpace.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliSpaceUpgradedIterator is returned from FilterUpgraded and is used to iterate over the raw logs and unpacked data for Upgraded events raised by the GoerliSpace contract.
type GoerliSpaceUpgradedIterator struct {
	Event *GoerliSpaceUpgraded // Event containing the contract specifics and raw log

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
func (it *GoerliSpaceUpgradedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliSpaceUpgraded)
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
		it.Event = new(GoerliSpaceUpgraded)
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
func (it *GoerliSpaceUpgradedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliSpaceUpgradedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliSpaceUpgraded represents a Upgraded event raised by the GoerliSpace contract.
type GoerliSpaceUpgraded struct {
	Implementation common.Address
	Raw            types.Log // Blockchain specific contextual infos
}

// FilterUpgraded is a free log retrieval operation binding the contract event 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b.
//
// Solidity: event Upgraded(address indexed implementation)
func (_GoerliSpace *GoerliSpaceFilterer) FilterUpgraded(opts *bind.FilterOpts, implementation []common.Address) (*GoerliSpaceUpgradedIterator, error) {

	var implementationRule []interface{}
	for _, implementationItem := range implementation {
		implementationRule = append(implementationRule, implementationItem)
	}

	logs, sub, err := _GoerliSpace.contract.FilterLogs(opts, "Upgraded", implementationRule)
	if err != nil {
		return nil, err
	}
	return &GoerliSpaceUpgradedIterator{contract: _GoerliSpace.contract, event: "Upgraded", logs: logs, sub: sub}, nil
}

// WatchUpgraded is a free log subscription operation binding the contract event 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b.
//
// Solidity: event Upgraded(address indexed implementation)
func (_GoerliSpace *GoerliSpaceFilterer) WatchUpgraded(opts *bind.WatchOpts, sink chan<- *GoerliSpaceUpgraded, implementation []common.Address) (event.Subscription, error) {

	var implementationRule []interface{}
	for _, implementationItem := range implementation {
		implementationRule = append(implementationRule, implementationItem)
	}

	logs, sub, err := _GoerliSpace.contract.WatchLogs(opts, "Upgraded", implementationRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliSpaceUpgraded)
				if err := _GoerliSpace.contract.UnpackLog(event, "Upgraded", log); err != nil {
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

// ParseUpgraded is a log parse operation binding the contract event 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b.
//
// Solidity: event Upgraded(address indexed implementation)
func (_GoerliSpace *GoerliSpaceFilterer) ParseUpgraded(log types.Log) (*GoerliSpaceUpgraded, error) {
	event := new(GoerliSpaceUpgraded)
	if err := _GoerliSpace.contract.UnpackLog(event, "Upgraded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
