// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package v3

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

// IEntitlementsManagerBaseEntitlement is an auto generated low-level Go binding around an user-defined struct.
type IEntitlementsManagerBaseEntitlement struct {
	Name          string
	ModuleAddress common.Address
	ModuleType    string
	IsImmutable   bool
}

// EntitlementsManagerMetaData contains all meta data concerning the EntitlementsManager contract.
var EntitlementsManagerMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"addEntitlementModule\",\"inputs\":[{\"name\":\"entitlement\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"addImmutableEntitlements\",\"inputs\":[{\"name\":\"entitlements\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getEntitlement\",\"inputs\":[{\"name\":\"entitlement\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIEntitlementsManagerBase.Entitlement\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"moduleAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"moduleType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"isImmutable\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getEntitlements\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIEntitlementsManagerBase.Entitlement[]\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"moduleAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"moduleType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"isImmutable\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitledToChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permission\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitledToSpace\",\"inputs\":[{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permission\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeEntitlementModule\",\"inputs\":[{\"name\":\"entitlement\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConsecutiveTransfer\",\"inputs\":[{\"name\":\"fromTokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"toTokenId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementModuleAdded\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"entitlement\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementModuleRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"entitlement\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Paused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unpaused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ApprovalCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ApprovalQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BalanceQueryForZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__InvalidTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementsService__EntitlementAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementsService__EntitlementDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementsService__ImmutableEntitlement\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementsService__InvalidEntitlementAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementsService__InvalidEntitlementInterface\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintERC2309QuantityExceedsLimit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintZeroQuantity\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnerQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnershipNotInitializedForExtraData\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__NotPaused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__Paused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferFromIncorrectOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToNonERC721ReceiverImplementer\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"URIQueryForNonexistentToken\",\"inputs\":[]}]",
}

// EntitlementsManagerABI is the input ABI used to generate the binding from.
// Deprecated: Use EntitlementsManagerMetaData.ABI instead.
var EntitlementsManagerABI = EntitlementsManagerMetaData.ABI

// EntitlementsManager is an auto generated Go binding around an Ethereum contract.
type EntitlementsManager struct {
	EntitlementsManagerCaller     // Read-only binding to the contract
	EntitlementsManagerTransactor // Write-only binding to the contract
	EntitlementsManagerFilterer   // Log filterer for contract events
}

// EntitlementsManagerCaller is an auto generated read-only Go binding around an Ethereum contract.
type EntitlementsManagerCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementsManagerTransactor is an auto generated write-only Go binding around an Ethereum contract.
type EntitlementsManagerTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementsManagerFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type EntitlementsManagerFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementsManagerSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type EntitlementsManagerSession struct {
	Contract     *EntitlementsManager // Generic contract binding to set the session for
	CallOpts     bind.CallOpts        // Call options to use throughout this session
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// EntitlementsManagerCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type EntitlementsManagerCallerSession struct {
	Contract *EntitlementsManagerCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts              // Call options to use throughout this session
}

// EntitlementsManagerTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type EntitlementsManagerTransactorSession struct {
	Contract     *EntitlementsManagerTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// EntitlementsManagerRaw is an auto generated low-level Go binding around an Ethereum contract.
type EntitlementsManagerRaw struct {
	Contract *EntitlementsManager // Generic contract binding to access the raw methods on
}

// EntitlementsManagerCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type EntitlementsManagerCallerRaw struct {
	Contract *EntitlementsManagerCaller // Generic read-only contract binding to access the raw methods on
}

// EntitlementsManagerTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type EntitlementsManagerTransactorRaw struct {
	Contract *EntitlementsManagerTransactor // Generic write-only contract binding to access the raw methods on
}

// NewEntitlementsManager creates a new instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManager(address common.Address, backend bind.ContractBackend) (*EntitlementsManager, error) {
	contract, err := bindEntitlementsManager(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManager{EntitlementsManagerCaller: EntitlementsManagerCaller{contract: contract}, EntitlementsManagerTransactor: EntitlementsManagerTransactor{contract: contract}, EntitlementsManagerFilterer: EntitlementsManagerFilterer{contract: contract}}, nil
}

// NewEntitlementsManagerCaller creates a new read-only instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManagerCaller(address common.Address, caller bind.ContractCaller) (*EntitlementsManagerCaller, error) {
	contract, err := bindEntitlementsManager(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerCaller{contract: contract}, nil
}

// NewEntitlementsManagerTransactor creates a new write-only instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManagerTransactor(address common.Address, transactor bind.ContractTransactor) (*EntitlementsManagerTransactor, error) {
	contract, err := bindEntitlementsManager(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerTransactor{contract: contract}, nil
}

// NewEntitlementsManagerFilterer creates a new log filterer instance of EntitlementsManager, bound to a specific deployed contract.
func NewEntitlementsManagerFilterer(address common.Address, filterer bind.ContractFilterer) (*EntitlementsManagerFilterer, error) {
	contract, err := bindEntitlementsManager(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerFilterer{contract: contract}, nil
}

// bindEntitlementsManager binds a generic wrapper to an already deployed contract.
func bindEntitlementsManager(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := EntitlementsManagerMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementsManager *EntitlementsManagerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementsManager.Contract.EntitlementsManagerCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementsManager *EntitlementsManagerRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.EntitlementsManagerTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementsManager *EntitlementsManagerRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.EntitlementsManagerTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementsManager *EntitlementsManagerCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementsManager.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementsManager *EntitlementsManagerTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementsManager *EntitlementsManagerTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.contract.Transact(opts, method, params...)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_EntitlementsManager *EntitlementsManagerCaller) GetEntitlement(opts *bind.CallOpts, entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "getEntitlement", entitlement)

	if err != nil {
		return *new(IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementsManagerBaseEntitlement)).(*IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_EntitlementsManager *EntitlementsManagerSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlement(&_EntitlementsManager.CallOpts, entitlement)
}

// GetEntitlement is a free data retrieval call binding the contract method 0xfba4ff9d.
//
// Solidity: function getEntitlement(address entitlement) view returns((string,address,string,bool))
func (_EntitlementsManager *EntitlementsManagerCallerSession) GetEntitlement(entitlement common.Address) (IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlement(&_EntitlementsManager.CallOpts, entitlement)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_EntitlementsManager *EntitlementsManagerCaller) GetEntitlements(opts *bind.CallOpts) ([]IEntitlementsManagerBaseEntitlement, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "getEntitlements")

	if err != nil {
		return *new([]IEntitlementsManagerBaseEntitlement), err
	}

	out0 := *abi.ConvertType(out[0], new([]IEntitlementsManagerBaseEntitlement)).(*[]IEntitlementsManagerBaseEntitlement)

	return out0, err

}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_EntitlementsManager *EntitlementsManagerSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlements(&_EntitlementsManager.CallOpts)
}

// GetEntitlements is a free data retrieval call binding the contract method 0x487dc38c.
//
// Solidity: function getEntitlements() view returns((string,address,string,bool)[])
func (_EntitlementsManager *EntitlementsManagerCallerSession) GetEntitlements() ([]IEntitlementsManagerBaseEntitlement, error) {
	return _EntitlementsManager.Contract.GetEntitlements(&_EntitlementsManager.CallOpts)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCaller) IsEntitledToChannel(opts *bind.CallOpts, channelId string, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "isEntitledToChannel", channelId, user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToChannel(&_EntitlementsManager.CallOpts, channelId, user, permission)
}

// IsEntitledToChannel is a free data retrieval call binding the contract method 0xcea632bc.
//
// Solidity: function isEntitledToChannel(string channelId, address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCallerSession) IsEntitledToChannel(channelId string, user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToChannel(&_EntitlementsManager.CallOpts, channelId, user, permission)
}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCaller) IsEntitledToSpace(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	var out []interface{}
	err := _EntitlementsManager.contract.Call(opts, &out, "isEntitledToSpace", user, permission)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerSession) IsEntitledToSpace(user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToSpace(&_EntitlementsManager.CallOpts, user, permission)
}

// IsEntitledToSpace is a free data retrieval call binding the contract method 0x20759f9e.
//
// Solidity: function isEntitledToSpace(address user, string permission) view returns(bool)
func (_EntitlementsManager *EntitlementsManagerCallerSession) IsEntitledToSpace(user common.Address, permission string) (bool, error) {
	return _EntitlementsManager.Contract.IsEntitledToSpace(&_EntitlementsManager.CallOpts, user, permission)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactor) AddEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.contract.Transact(opts, "addEntitlementModule", entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// AddEntitlementModule is a paid mutator transaction binding the contract method 0x070b9c3f.
//
// Solidity: function addEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactorSession) AddEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_EntitlementsManager *EntitlementsManagerTransactor) AddImmutableEntitlements(opts *bind.TransactOpts, entitlements []common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.contract.Transact(opts, "addImmutableEntitlements", entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_EntitlementsManager *EntitlementsManagerSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddImmutableEntitlements(&_EntitlementsManager.TransactOpts, entitlements)
}

// AddImmutableEntitlements is a paid mutator transaction binding the contract method 0x8bfc820f.
//
// Solidity: function addImmutableEntitlements(address[] entitlements) returns()
func (_EntitlementsManager *EntitlementsManagerTransactorSession) AddImmutableEntitlements(entitlements []common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.AddImmutableEntitlements(&_EntitlementsManager.TransactOpts, entitlements)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactor) RemoveEntitlementModule(opts *bind.TransactOpts, entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.contract.Transact(opts, "removeEntitlementModule", entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.RemoveEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// RemoveEntitlementModule is a paid mutator transaction binding the contract method 0xbe24138d.
//
// Solidity: function removeEntitlementModule(address entitlement) returns()
func (_EntitlementsManager *EntitlementsManagerTransactorSession) RemoveEntitlementModule(entitlement common.Address) (*types.Transaction, error) {
	return _EntitlementsManager.Contract.RemoveEntitlementModule(&_EntitlementsManager.TransactOpts, entitlement)
}

// EntitlementsManagerApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the EntitlementsManager contract.
type EntitlementsManagerApprovalIterator struct {
	Event *EntitlementsManagerApproval // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerApproval)
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
		it.Event = new(EntitlementsManagerApproval)
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
func (it *EntitlementsManagerApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerApproval represents a Approval event raised by the EntitlementsManager contract.
type EntitlementsManagerApproval struct {
	Owner    common.Address
	Approved common.Address
	TokenId  *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, approved []common.Address, tokenId []*big.Int) (*EntitlementsManagerApprovalIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var approvedRule []interface{}
	for _, approvedItem := range approved {
		approvedRule = append(approvedRule, approvedItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerApprovalIterator{contract: _EntitlementsManager.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerApproval, owner []common.Address, approved []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var approvedRule []interface{}
	for _, approvedItem := range approved {
		approvedRule = append(approvedRule, approvedItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerApproval)
				if err := _EntitlementsManager.contract.UnpackLog(event, "Approval", log); err != nil {
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

// ParseApproval is a log parse operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseApproval(log types.Log) (*EntitlementsManagerApproval, error) {
	event := new(EntitlementsManagerApproval)
	if err := _EntitlementsManager.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerApprovalForAllIterator is returned from FilterApprovalForAll and is used to iterate over the raw logs and unpacked data for ApprovalForAll events raised by the EntitlementsManager contract.
type EntitlementsManagerApprovalForAllIterator struct {
	Event *EntitlementsManagerApprovalForAll // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerApprovalForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerApprovalForAll)
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
		it.Event = new(EntitlementsManagerApprovalForAll)
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
func (it *EntitlementsManagerApprovalForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerApprovalForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerApprovalForAll represents a ApprovalForAll event raised by the EntitlementsManager contract.
type EntitlementsManagerApprovalForAll struct {
	Owner    common.Address
	Operator common.Address
	Approved bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApprovalForAll is a free log retrieval operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterApprovalForAll(opts *bind.FilterOpts, owner []common.Address, operator []common.Address) (*EntitlementsManagerApprovalForAllIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerApprovalForAllIterator{contract: _EntitlementsManager.contract, event: "ApprovalForAll", logs: logs, sub: sub}, nil
}

// WatchApprovalForAll is a free log subscription operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchApprovalForAll(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerApprovalForAll, owner []common.Address, operator []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerApprovalForAll)
				if err := _EntitlementsManager.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
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

// ParseApprovalForAll is a log parse operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseApprovalForAll(log types.Log) (*EntitlementsManagerApprovalForAll, error) {
	event := new(EntitlementsManagerApprovalForAll)
	if err := _EntitlementsManager.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerConsecutiveTransferIterator is returned from FilterConsecutiveTransfer and is used to iterate over the raw logs and unpacked data for ConsecutiveTransfer events raised by the EntitlementsManager contract.
type EntitlementsManagerConsecutiveTransferIterator struct {
	Event *EntitlementsManagerConsecutiveTransfer // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerConsecutiveTransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerConsecutiveTransfer)
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
		it.Event = new(EntitlementsManagerConsecutiveTransfer)
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
func (it *EntitlementsManagerConsecutiveTransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerConsecutiveTransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerConsecutiveTransfer represents a ConsecutiveTransfer event raised by the EntitlementsManager contract.
type EntitlementsManagerConsecutiveTransfer struct {
	FromTokenId *big.Int
	ToTokenId   *big.Int
	From        common.Address
	To          common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterConsecutiveTransfer is a free log retrieval operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterConsecutiveTransfer(opts *bind.FilterOpts, fromTokenId []*big.Int, from []common.Address, to []common.Address) (*EntitlementsManagerConsecutiveTransferIterator, error) {

	var fromTokenIdRule []interface{}
	for _, fromTokenIdItem := range fromTokenId {
		fromTokenIdRule = append(fromTokenIdRule, fromTokenIdItem)
	}

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "ConsecutiveTransfer", fromTokenIdRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerConsecutiveTransferIterator{contract: _EntitlementsManager.contract, event: "ConsecutiveTransfer", logs: logs, sub: sub}, nil
}

// WatchConsecutiveTransfer is a free log subscription operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchConsecutiveTransfer(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerConsecutiveTransfer, fromTokenId []*big.Int, from []common.Address, to []common.Address) (event.Subscription, error) {

	var fromTokenIdRule []interface{}
	for _, fromTokenIdItem := range fromTokenId {
		fromTokenIdRule = append(fromTokenIdRule, fromTokenIdItem)
	}

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "ConsecutiveTransfer", fromTokenIdRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerConsecutiveTransfer)
				if err := _EntitlementsManager.contract.UnpackLog(event, "ConsecutiveTransfer", log); err != nil {
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

// ParseConsecutiveTransfer is a log parse operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseConsecutiveTransfer(log types.Log) (*EntitlementsManagerConsecutiveTransfer, error) {
	event := new(EntitlementsManagerConsecutiveTransfer)
	if err := _EntitlementsManager.contract.UnpackLog(event, "ConsecutiveTransfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerEntitlementModuleAddedIterator is returned from FilterEntitlementModuleAdded and is used to iterate over the raw logs and unpacked data for EntitlementModuleAdded events raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleAddedIterator struct {
	Event *EntitlementsManagerEntitlementModuleAdded // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerEntitlementModuleAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerEntitlementModuleAdded)
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
		it.Event = new(EntitlementsManagerEntitlementModuleAdded)
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
func (it *EntitlementsManagerEntitlementModuleAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerEntitlementModuleAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerEntitlementModuleAdded represents a EntitlementModuleAdded event raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleAdded struct {
	Caller      common.Address
	Entitlement common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterEntitlementModuleAdded is a free log retrieval operation binding the contract event 0x055c4c0e6f85afe96beaac6c9d650859c001e6ef93103856624cce6ceba811b4.
//
// Solidity: event EntitlementModuleAdded(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterEntitlementModuleAdded(opts *bind.FilterOpts, caller []common.Address) (*EntitlementsManagerEntitlementModuleAddedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "EntitlementModuleAdded", callerRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerEntitlementModuleAddedIterator{contract: _EntitlementsManager.contract, event: "EntitlementModuleAdded", logs: logs, sub: sub}, nil
}

// WatchEntitlementModuleAdded is a free log subscription operation binding the contract event 0x055c4c0e6f85afe96beaac6c9d650859c001e6ef93103856624cce6ceba811b4.
//
// Solidity: event EntitlementModuleAdded(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchEntitlementModuleAdded(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerEntitlementModuleAdded, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "EntitlementModuleAdded", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerEntitlementModuleAdded)
				if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleAdded", log); err != nil {
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

// ParseEntitlementModuleAdded is a log parse operation binding the contract event 0x055c4c0e6f85afe96beaac6c9d650859c001e6ef93103856624cce6ceba811b4.
//
// Solidity: event EntitlementModuleAdded(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseEntitlementModuleAdded(log types.Log) (*EntitlementsManagerEntitlementModuleAdded, error) {
	event := new(EntitlementsManagerEntitlementModuleAdded)
	if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerEntitlementModuleRemovedIterator is returned from FilterEntitlementModuleRemoved and is used to iterate over the raw logs and unpacked data for EntitlementModuleRemoved events raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleRemovedIterator struct {
	Event *EntitlementsManagerEntitlementModuleRemoved // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerEntitlementModuleRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerEntitlementModuleRemoved)
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
		it.Event = new(EntitlementsManagerEntitlementModuleRemoved)
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
func (it *EntitlementsManagerEntitlementModuleRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerEntitlementModuleRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerEntitlementModuleRemoved represents a EntitlementModuleRemoved event raised by the EntitlementsManager contract.
type EntitlementsManagerEntitlementModuleRemoved struct {
	Caller      common.Address
	Entitlement common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterEntitlementModuleRemoved is a free log retrieval operation binding the contract event 0xa8e3e13a35b592afaa9d213d12c7ea06384518ada9733585d20883cfafcf249b.
//
// Solidity: event EntitlementModuleRemoved(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterEntitlementModuleRemoved(opts *bind.FilterOpts, caller []common.Address) (*EntitlementsManagerEntitlementModuleRemovedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "EntitlementModuleRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerEntitlementModuleRemovedIterator{contract: _EntitlementsManager.contract, event: "EntitlementModuleRemoved", logs: logs, sub: sub}, nil
}

// WatchEntitlementModuleRemoved is a free log subscription operation binding the contract event 0xa8e3e13a35b592afaa9d213d12c7ea06384518ada9733585d20883cfafcf249b.
//
// Solidity: event EntitlementModuleRemoved(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchEntitlementModuleRemoved(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerEntitlementModuleRemoved, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "EntitlementModuleRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerEntitlementModuleRemoved)
				if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleRemoved", log); err != nil {
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

// ParseEntitlementModuleRemoved is a log parse operation binding the contract event 0xa8e3e13a35b592afaa9d213d12c7ea06384518ada9733585d20883cfafcf249b.
//
// Solidity: event EntitlementModuleRemoved(address indexed caller, address entitlement)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseEntitlementModuleRemoved(log types.Log) (*EntitlementsManagerEntitlementModuleRemoved, error) {
	event := new(EntitlementsManagerEntitlementModuleRemoved)
	if err := _EntitlementsManager.contract.UnpackLog(event, "EntitlementModuleRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the EntitlementsManager contract.
type EntitlementsManagerOwnershipTransferredIterator struct {
	Event *EntitlementsManagerOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerOwnershipTransferred)
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
		it.Event = new(EntitlementsManagerOwnershipTransferred)
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
func (it *EntitlementsManagerOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerOwnershipTransferred represents a OwnershipTransferred event raised by the EntitlementsManager contract.
type EntitlementsManagerOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*EntitlementsManagerOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerOwnershipTransferredIterator{contract: _EntitlementsManager.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerOwnershipTransferred)
				if err := _EntitlementsManager.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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

// ParseOwnershipTransferred is a log parse operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseOwnershipTransferred(log types.Log) (*EntitlementsManagerOwnershipTransferred, error) {
	event := new(EntitlementsManagerOwnershipTransferred)
	if err := _EntitlementsManager.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the EntitlementsManager contract.
type EntitlementsManagerPausedIterator struct {
	Event *EntitlementsManagerPaused // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerPaused)
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
		it.Event = new(EntitlementsManagerPaused)
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
func (it *EntitlementsManagerPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerPaused represents a Paused event raised by the EntitlementsManager contract.
type EntitlementsManagerPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterPaused(opts *bind.FilterOpts) (*EntitlementsManagerPausedIterator, error) {

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerPausedIterator{contract: _EntitlementsManager.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerPaused) (event.Subscription, error) {

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerPaused)
				if err := _EntitlementsManager.contract.UnpackLog(event, "Paused", log); err != nil {
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

// ParsePaused is a log parse operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParsePaused(log types.Log) (*EntitlementsManagerPaused, error) {
	event := new(EntitlementsManagerPaused)
	if err := _EntitlementsManager.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerTransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the EntitlementsManager contract.
type EntitlementsManagerTransferIterator struct {
	Event *EntitlementsManagerTransfer // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerTransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerTransfer)
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
		it.Event = new(EntitlementsManagerTransfer)
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
func (it *EntitlementsManagerTransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerTransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerTransfer represents a Transfer event raised by the EntitlementsManager contract.
type EntitlementsManagerTransfer struct {
	From    common.Address
	To      common.Address
	TokenId *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address, tokenId []*big.Int) (*EntitlementsManagerTransferIterator, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerTransferIterator{contract: _EntitlementsManager.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerTransfer, from []common.Address, to []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerTransfer)
				if err := _EntitlementsManager.contract.UnpackLog(event, "Transfer", log); err != nil {
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

// ParseTransfer is a log parse operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseTransfer(log types.Log) (*EntitlementsManagerTransfer, error) {
	event := new(EntitlementsManagerTransfer)
	if err := _EntitlementsManager.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementsManagerUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the EntitlementsManager contract.
type EntitlementsManagerUnpausedIterator struct {
	Event *EntitlementsManagerUnpaused // Event containing the contract specifics and raw log

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
func (it *EntitlementsManagerUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementsManagerUnpaused)
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
		it.Event = new(EntitlementsManagerUnpaused)
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
func (it *EntitlementsManagerUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementsManagerUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementsManagerUnpaused represents a Unpaused event raised by the EntitlementsManager contract.
type EntitlementsManagerUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_EntitlementsManager *EntitlementsManagerFilterer) FilterUnpaused(opts *bind.FilterOpts) (*EntitlementsManagerUnpausedIterator, error) {

	logs, sub, err := _EntitlementsManager.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &EntitlementsManagerUnpausedIterator{contract: _EntitlementsManager.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_EntitlementsManager *EntitlementsManagerFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *EntitlementsManagerUnpaused) (event.Subscription, error) {

	logs, sub, err := _EntitlementsManager.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementsManagerUnpaused)
				if err := _EntitlementsManager.contract.UnpackLog(event, "Unpaused", log); err != nil {
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

// ParseUnpaused is a log parse operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_EntitlementsManager *EntitlementsManagerFilterer) ParseUnpaused(log types.Log) (*EntitlementsManagerUnpaused, error) {
	event := new(EntitlementsManagerUnpaused)
	if err := _EntitlementsManager.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
