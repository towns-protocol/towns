// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_goerli_towns_channels

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

// IChannelBaseChannel is an auto generated low-level Go binding around an user-defined struct.
type IChannelBaseChannel struct {
	Id       string
	Disabled bool
	Metadata string
	RoleIds  []*big.Int
}

// BaseGoerliTownsChannelsMetaData contains all meta data concerning the BaseGoerliTownsChannels contract.
var BaseGoerliTownsChannelsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"ChannelService__ChannelAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDisabled\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"addRoleToChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"name\":\"createChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"getChannel\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel\",\"name\":\"channel\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getChannels\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel[]\",\"name\":\"channels\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"removeChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"removeRoleFromChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"}],\"name\":\"updateChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// BaseGoerliTownsChannelsABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseGoerliTownsChannelsMetaData.ABI instead.
var BaseGoerliTownsChannelsABI = BaseGoerliTownsChannelsMetaData.ABI

// BaseGoerliTownsChannels is an auto generated Go binding around an Ethereum contract.
type BaseGoerliTownsChannels struct {
	BaseGoerliTownsChannelsCaller     // Read-only binding to the contract
	BaseGoerliTownsChannelsTransactor // Write-only binding to the contract
	BaseGoerliTownsChannelsFilterer   // Log filterer for contract events
}

// BaseGoerliTownsChannelsCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseGoerliTownsChannelsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsChannelsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseGoerliTownsChannelsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsChannelsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseGoerliTownsChannelsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsChannelsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseGoerliTownsChannelsSession struct {
	Contract     *BaseGoerliTownsChannels // Generic contract binding to set the session for
	CallOpts     bind.CallOpts            // Call options to use throughout this session
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// BaseGoerliTownsChannelsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseGoerliTownsChannelsCallerSession struct {
	Contract *BaseGoerliTownsChannelsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                  // Call options to use throughout this session
}

// BaseGoerliTownsChannelsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseGoerliTownsChannelsTransactorSession struct {
	Contract     *BaseGoerliTownsChannelsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                  // Transaction auth options to use throughout this session
}

// BaseGoerliTownsChannelsRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseGoerliTownsChannelsRaw struct {
	Contract *BaseGoerliTownsChannels // Generic contract binding to access the raw methods on
}

// BaseGoerliTownsChannelsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseGoerliTownsChannelsCallerRaw struct {
	Contract *BaseGoerliTownsChannelsCaller // Generic read-only contract binding to access the raw methods on
}

// BaseGoerliTownsChannelsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseGoerliTownsChannelsTransactorRaw struct {
	Contract *BaseGoerliTownsChannelsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseGoerliTownsChannels creates a new instance of BaseGoerliTownsChannels, bound to a specific deployed contract.
func NewBaseGoerliTownsChannels(address common.Address, backend bind.ContractBackend) (*BaseGoerliTownsChannels, error) {
	contract, err := bindBaseGoerliTownsChannels(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannels{BaseGoerliTownsChannelsCaller: BaseGoerliTownsChannelsCaller{contract: contract}, BaseGoerliTownsChannelsTransactor: BaseGoerliTownsChannelsTransactor{contract: contract}, BaseGoerliTownsChannelsFilterer: BaseGoerliTownsChannelsFilterer{contract: contract}}, nil
}

// NewBaseGoerliTownsChannelsCaller creates a new read-only instance of BaseGoerliTownsChannels, bound to a specific deployed contract.
func NewBaseGoerliTownsChannelsCaller(address common.Address, caller bind.ContractCaller) (*BaseGoerliTownsChannelsCaller, error) {
	contract, err := bindBaseGoerliTownsChannels(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsCaller{contract: contract}, nil
}

// NewBaseGoerliTownsChannelsTransactor creates a new write-only instance of BaseGoerliTownsChannels, bound to a specific deployed contract.
func NewBaseGoerliTownsChannelsTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseGoerliTownsChannelsTransactor, error) {
	contract, err := bindBaseGoerliTownsChannels(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsTransactor{contract: contract}, nil
}

// NewBaseGoerliTownsChannelsFilterer creates a new log filterer instance of BaseGoerliTownsChannels, bound to a specific deployed contract.
func NewBaseGoerliTownsChannelsFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseGoerliTownsChannelsFilterer, error) {
	contract, err := bindBaseGoerliTownsChannels(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsFilterer{contract: contract}, nil
}

// bindBaseGoerliTownsChannels binds a generic wrapper to an already deployed contract.
func bindBaseGoerliTownsChannels(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseGoerliTownsChannelsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsChannels.Contract.BaseGoerliTownsChannelsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.BaseGoerliTownsChannelsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.BaseGoerliTownsChannelsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsChannels.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.contract.Transact(opts, method, params...)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsCaller) GetChannel(opts *bind.CallOpts, channelId string) (IChannelBaseChannel, error) {
	var out []interface{}
	err := _BaseGoerliTownsChannels.contract.Call(opts, &out, "getChannel", channelId)

	if err != nil {
		return *new(IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new(IChannelBaseChannel)).(*IChannelBaseChannel)

	return out0, err

}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _BaseGoerliTownsChannels.Contract.GetChannel(&_BaseGoerliTownsChannels.CallOpts, channelId)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsCallerSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _BaseGoerliTownsChannels.Contract.GetChannel(&_BaseGoerliTownsChannels.CallOpts, channelId)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsCaller) GetChannels(opts *bind.CallOpts) ([]IChannelBaseChannel, error) {
	var out []interface{}
	err := _BaseGoerliTownsChannels.contract.Call(opts, &out, "getChannels")

	if err != nil {
		return *new([]IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new([]IChannelBaseChannel)).(*[]IChannelBaseChannel)

	return out0, err

}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _BaseGoerliTownsChannels.Contract.GetChannels(&_BaseGoerliTownsChannels.CallOpts)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsCallerSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _BaseGoerliTownsChannels.Contract.GetChannels(&_BaseGoerliTownsChannels.CallOpts)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactor) AddRoleToChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.contract.Transact(opts, "addRoleToChannel", channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.AddRoleToChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactorSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.AddRoleToChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, roleId)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactor) CreateChannel(opts *bind.TransactOpts, channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.contract.Transact(opts, "createChannel", channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.CreateChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactorSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.CreateChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactor) RemoveChannel(opts *bind.TransactOpts, channelId string) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.contract.Transact(opts, "removeChannel", channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.RemoveChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactorSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.RemoveChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactor) RemoveRoleFromChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.contract.Transact(opts, "removeRoleFromChannel", channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.RemoveRoleFromChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactorSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.RemoveRoleFromChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, roleId)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactor) UpdateChannel(opts *bind.TransactOpts, channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.contract.Transact(opts, "updateChannel", channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.UpdateChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsTransactorSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _BaseGoerliTownsChannels.Contract.UpdateChannel(&_BaseGoerliTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// BaseGoerliTownsChannelsInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsInitializedIterator struct {
	Event *BaseGoerliTownsChannelsInitialized // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsChannelsInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsChannelsInitialized)
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
		it.Event = new(BaseGoerliTownsChannelsInitialized)
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
func (it *BaseGoerliTownsChannelsInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsChannelsInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsChannelsInitialized represents a Initialized event raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) FilterInitialized(opts *bind.FilterOpts) (*BaseGoerliTownsChannelsInitializedIterator, error) {

	logs, sub, err := _BaseGoerliTownsChannels.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsInitializedIterator{contract: _BaseGoerliTownsChannels.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsChannelsInitialized) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsChannels.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsChannelsInitialized)
				if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) ParseInitialized(log types.Log) (*BaseGoerliTownsChannelsInitialized, error) {
	event := new(BaseGoerliTownsChannelsInitialized)
	if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsChannelsInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsInterfaceAddedIterator struct {
	Event *BaseGoerliTownsChannelsInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsChannelsInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsChannelsInterfaceAdded)
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
		it.Event = new(BaseGoerliTownsChannelsInterfaceAdded)
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
func (it *BaseGoerliTownsChannelsInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsChannelsInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsChannelsInterfaceAdded represents a InterfaceAdded event raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseGoerliTownsChannelsInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsChannels.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsInterfaceAddedIterator{contract: _BaseGoerliTownsChannels.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsChannelsInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsChannels.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsChannelsInterfaceAdded)
				if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) ParseInterfaceAdded(log types.Log) (*BaseGoerliTownsChannelsInterfaceAdded, error) {
	event := new(BaseGoerliTownsChannelsInterfaceAdded)
	if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsChannelsInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsInterfaceRemovedIterator struct {
	Event *BaseGoerliTownsChannelsInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsChannelsInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsChannelsInterfaceRemoved)
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
		it.Event = new(BaseGoerliTownsChannelsInterfaceRemoved)
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
func (it *BaseGoerliTownsChannelsInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsChannelsInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsChannelsInterfaceRemoved represents a InterfaceRemoved event raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseGoerliTownsChannelsInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsChannels.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsInterfaceRemovedIterator{contract: _BaseGoerliTownsChannels.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsChannelsInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsChannels.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsChannelsInterfaceRemoved)
				if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) ParseInterfaceRemoved(log types.Log) (*BaseGoerliTownsChannelsInterfaceRemoved, error) {
	event := new(BaseGoerliTownsChannelsInterfaceRemoved)
	if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsChannelsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsOwnershipTransferredIterator struct {
	Event *BaseGoerliTownsChannelsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsChannelsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsChannelsOwnershipTransferred)
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
		it.Event = new(BaseGoerliTownsChannelsOwnershipTransferred)
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
func (it *BaseGoerliTownsChannelsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsChannelsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsChannelsOwnershipTransferred represents a OwnershipTransferred event raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*BaseGoerliTownsChannelsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseGoerliTownsChannels.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsOwnershipTransferredIterator{contract: _BaseGoerliTownsChannels.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsChannelsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseGoerliTownsChannels.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsChannelsOwnershipTransferred)
				if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) ParseOwnershipTransferred(log types.Log) (*BaseGoerliTownsChannelsOwnershipTransferred, error) {
	event := new(BaseGoerliTownsChannelsOwnershipTransferred)
	if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsChannelsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsPausedIterator struct {
	Event *BaseGoerliTownsChannelsPaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsChannelsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsChannelsPaused)
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
		it.Event = new(BaseGoerliTownsChannelsPaused)
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
func (it *BaseGoerliTownsChannelsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsChannelsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsChannelsPaused represents a Paused event raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseGoerliTownsChannelsPausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsChannels.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsPausedIterator{contract: _BaseGoerliTownsChannels.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsChannelsPaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsChannels.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsChannelsPaused)
				if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) ParsePaused(log types.Log) (*BaseGoerliTownsChannelsPaused, error) {
	event := new(BaseGoerliTownsChannelsPaused)
	if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsChannelsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsUnpausedIterator struct {
	Event *BaseGoerliTownsChannelsUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsChannelsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsChannelsUnpaused)
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
		it.Event = new(BaseGoerliTownsChannelsUnpaused)
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
func (it *BaseGoerliTownsChannelsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsChannelsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsChannelsUnpaused represents a Unpaused event raised by the BaseGoerliTownsChannels contract.
type BaseGoerliTownsChannelsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseGoerliTownsChannelsUnpausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsChannels.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsChannelsUnpausedIterator{contract: _BaseGoerliTownsChannels.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsChannelsUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsChannels.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsChannelsUnpaused)
				if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_BaseGoerliTownsChannels *BaseGoerliTownsChannelsFilterer) ParseUnpaused(log types.Log) (*BaseGoerliTownsChannelsUnpaused, error) {
	event := new(BaseGoerliTownsChannelsUnpaused)
	if err := _BaseGoerliTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
