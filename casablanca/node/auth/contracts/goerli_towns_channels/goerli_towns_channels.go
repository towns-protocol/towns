// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package goerli_towns_channels

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

// IChannelBaseChannel is an auto generated low-level Go binding around an user-defined struct.
type IChannelBaseChannel struct {
	Id       string
	Disabled bool
	Metadata string
	RoleIds  []*big.Int
}

// GoerliTownsChannelsMetaData contains all meta data concerning the GoerliTownsChannels contract.
var GoerliTownsChannelsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"ChannelService__ChannelAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDisabled\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"addRoleToChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"name\":\"createChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"getChannel\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel\",\"name\":\"channel\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getChannels\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel[]\",\"name\":\"channels\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"removeChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"removeRoleFromChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"}],\"name\":\"updateChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// GoerliTownsChannelsABI is the input ABI used to generate the binding from.
// Deprecated: Use GoerliTownsChannelsMetaData.ABI instead.
var GoerliTownsChannelsABI = GoerliTownsChannelsMetaData.ABI

// GoerliTownsChannels is an auto generated Go binding around an Ethereum contract.
type GoerliTownsChannels struct {
	GoerliTownsChannelsCaller     // Read-only binding to the contract
	GoerliTownsChannelsTransactor // Write-only binding to the contract
	GoerliTownsChannelsFilterer   // Log filterer for contract events
}

// GoerliTownsChannelsCaller is an auto generated read-only Go binding around an Ethereum contract.
type GoerliTownsChannelsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsChannelsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type GoerliTownsChannelsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsChannelsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type GoerliTownsChannelsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsChannelsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type GoerliTownsChannelsSession struct {
	Contract     *GoerliTownsChannels // Generic contract binding to set the session for
	CallOpts     bind.CallOpts        // Call options to use throughout this session
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// GoerliTownsChannelsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type GoerliTownsChannelsCallerSession struct {
	Contract *GoerliTownsChannelsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts              // Call options to use throughout this session
}

// GoerliTownsChannelsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type GoerliTownsChannelsTransactorSession struct {
	Contract     *GoerliTownsChannelsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// GoerliTownsChannelsRaw is an auto generated low-level Go binding around an Ethereum contract.
type GoerliTownsChannelsRaw struct {
	Contract *GoerliTownsChannels // Generic contract binding to access the raw methods on
}

// GoerliTownsChannelsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type GoerliTownsChannelsCallerRaw struct {
	Contract *GoerliTownsChannelsCaller // Generic read-only contract binding to access the raw methods on
}

// GoerliTownsChannelsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type GoerliTownsChannelsTransactorRaw struct {
	Contract *GoerliTownsChannelsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewGoerliTownsChannels creates a new instance of GoerliTownsChannels, bound to a specific deployed contract.
func NewGoerliTownsChannels(address common.Address, backend bind.ContractBackend) (*GoerliTownsChannels, error) {
	contract, err := bindGoerliTownsChannels(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannels{GoerliTownsChannelsCaller: GoerliTownsChannelsCaller{contract: contract}, GoerliTownsChannelsTransactor: GoerliTownsChannelsTransactor{contract: contract}, GoerliTownsChannelsFilterer: GoerliTownsChannelsFilterer{contract: contract}}, nil
}

// NewGoerliTownsChannelsCaller creates a new read-only instance of GoerliTownsChannels, bound to a specific deployed contract.
func NewGoerliTownsChannelsCaller(address common.Address, caller bind.ContractCaller) (*GoerliTownsChannelsCaller, error) {
	contract, err := bindGoerliTownsChannels(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsCaller{contract: contract}, nil
}

// NewGoerliTownsChannelsTransactor creates a new write-only instance of GoerliTownsChannels, bound to a specific deployed contract.
func NewGoerliTownsChannelsTransactor(address common.Address, transactor bind.ContractTransactor) (*GoerliTownsChannelsTransactor, error) {
	contract, err := bindGoerliTownsChannels(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsTransactor{contract: contract}, nil
}

// NewGoerliTownsChannelsFilterer creates a new log filterer instance of GoerliTownsChannels, bound to a specific deployed contract.
func NewGoerliTownsChannelsFilterer(address common.Address, filterer bind.ContractFilterer) (*GoerliTownsChannelsFilterer, error) {
	contract, err := bindGoerliTownsChannels(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsFilterer{contract: contract}, nil
}

// bindGoerliTownsChannels binds a generic wrapper to an already deployed contract.
func bindGoerliTownsChannels(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(GoerliTownsChannelsABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsChannels *GoerliTownsChannelsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsChannels.Contract.GoerliTownsChannelsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsChannels *GoerliTownsChannelsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.GoerliTownsChannelsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsChannels *GoerliTownsChannelsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.GoerliTownsChannelsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsChannels *GoerliTownsChannelsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsChannels.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsChannels *GoerliTownsChannelsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsChannels *GoerliTownsChannelsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.contract.Transact(opts, method, params...)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_GoerliTownsChannels *GoerliTownsChannelsCaller) GetChannel(opts *bind.CallOpts, channelId string) (IChannelBaseChannel, error) {
	var out []interface{}
	err := _GoerliTownsChannels.contract.Call(opts, &out, "getChannel", channelId)

	if err != nil {
		return *new(IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new(IChannelBaseChannel)).(*IChannelBaseChannel)

	return out0, err

}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_GoerliTownsChannels *GoerliTownsChannelsSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _GoerliTownsChannels.Contract.GetChannel(&_GoerliTownsChannels.CallOpts, channelId)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_GoerliTownsChannels *GoerliTownsChannelsCallerSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _GoerliTownsChannels.Contract.GetChannel(&_GoerliTownsChannels.CallOpts, channelId)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_GoerliTownsChannels *GoerliTownsChannelsCaller) GetChannels(opts *bind.CallOpts) ([]IChannelBaseChannel, error) {
	var out []interface{}
	err := _GoerliTownsChannels.contract.Call(opts, &out, "getChannels")

	if err != nil {
		return *new([]IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new([]IChannelBaseChannel)).(*[]IChannelBaseChannel)

	return out0, err

}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_GoerliTownsChannels *GoerliTownsChannelsSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _GoerliTownsChannels.Contract.GetChannels(&_GoerliTownsChannels.CallOpts)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_GoerliTownsChannels *GoerliTownsChannelsCallerSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _GoerliTownsChannels.Contract.GetChannels(&_GoerliTownsChannels.CallOpts)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactor) AddRoleToChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.contract.Transact(opts, "addRoleToChannel", channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.AddRoleToChannel(&_GoerliTownsChannels.TransactOpts, channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactorSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.AddRoleToChannel(&_GoerliTownsChannels.TransactOpts, channelId, roleId)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactor) CreateChannel(opts *bind.TransactOpts, channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.contract.Transact(opts, "createChannel", channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.CreateChannel(&_GoerliTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactorSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.CreateChannel(&_GoerliTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactor) RemoveChannel(opts *bind.TransactOpts, channelId string) (*types.Transaction, error) {
	return _GoerliTownsChannels.contract.Transact(opts, "removeChannel", channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.RemoveChannel(&_GoerliTownsChannels.TransactOpts, channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactorSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.RemoveChannel(&_GoerliTownsChannels.TransactOpts, channelId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactor) RemoveRoleFromChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.contract.Transact(opts, "removeRoleFromChannel", channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.RemoveRoleFromChannel(&_GoerliTownsChannels.TransactOpts, channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactorSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.RemoveRoleFromChannel(&_GoerliTownsChannels.TransactOpts, channelId, roleId)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactor) UpdateChannel(opts *bind.TransactOpts, channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _GoerliTownsChannels.contract.Transact(opts, "updateChannel", channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.UpdateChannel(&_GoerliTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_GoerliTownsChannels *GoerliTownsChannelsTransactorSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _GoerliTownsChannels.Contract.UpdateChannel(&_GoerliTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// GoerliTownsChannelsInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsInitializedIterator struct {
	Event *GoerliTownsChannelsInitialized // Event containing the contract specifics and raw log

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
func (it *GoerliTownsChannelsInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsChannelsInitialized)
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
		it.Event = new(GoerliTownsChannelsInitialized)
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
func (it *GoerliTownsChannelsInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsChannelsInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsChannelsInitialized represents a Initialized event raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) FilterInitialized(opts *bind.FilterOpts) (*GoerliTownsChannelsInitializedIterator, error) {

	logs, sub, err := _GoerliTownsChannels.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsInitializedIterator{contract: _GoerliTownsChannels.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *GoerliTownsChannelsInitialized) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsChannels.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsChannelsInitialized)
				if err := _GoerliTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) ParseInitialized(log types.Log) (*GoerliTownsChannelsInitialized, error) {
	event := new(GoerliTownsChannelsInitialized)
	if err := _GoerliTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsChannelsInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsInterfaceAddedIterator struct {
	Event *GoerliTownsChannelsInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *GoerliTownsChannelsInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsChannelsInterfaceAdded)
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
		it.Event = new(GoerliTownsChannelsInterfaceAdded)
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
func (it *GoerliTownsChannelsInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsChannelsInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsChannelsInterfaceAdded represents a InterfaceAdded event raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsChannelsInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsChannels.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsInterfaceAddedIterator{contract: _GoerliTownsChannels.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *GoerliTownsChannelsInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsChannels.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsChannelsInterfaceAdded)
				if err := _GoerliTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) ParseInterfaceAdded(log types.Log) (*GoerliTownsChannelsInterfaceAdded, error) {
	event := new(GoerliTownsChannelsInterfaceAdded)
	if err := _GoerliTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsChannelsInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsInterfaceRemovedIterator struct {
	Event *GoerliTownsChannelsInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *GoerliTownsChannelsInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsChannelsInterfaceRemoved)
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
		it.Event = new(GoerliTownsChannelsInterfaceRemoved)
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
func (it *GoerliTownsChannelsInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsChannelsInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsChannelsInterfaceRemoved represents a InterfaceRemoved event raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsChannelsInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsChannels.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsInterfaceRemovedIterator{contract: _GoerliTownsChannels.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *GoerliTownsChannelsInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsChannels.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsChannelsInterfaceRemoved)
				if err := _GoerliTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) ParseInterfaceRemoved(log types.Log) (*GoerliTownsChannelsInterfaceRemoved, error) {
	event := new(GoerliTownsChannelsInterfaceRemoved)
	if err := _GoerliTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsChannelsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsOwnershipTransferredIterator struct {
	Event *GoerliTownsChannelsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *GoerliTownsChannelsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsChannelsOwnershipTransferred)
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
		it.Event = new(GoerliTownsChannelsOwnershipTransferred)
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
func (it *GoerliTownsChannelsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsChannelsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsChannelsOwnershipTransferred represents a OwnershipTransferred event raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*GoerliTownsChannelsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _GoerliTownsChannels.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsOwnershipTransferredIterator{contract: _GoerliTownsChannels.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *GoerliTownsChannelsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _GoerliTownsChannels.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsChannelsOwnershipTransferred)
				if err := _GoerliTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) ParseOwnershipTransferred(log types.Log) (*GoerliTownsChannelsOwnershipTransferred, error) {
	event := new(GoerliTownsChannelsOwnershipTransferred)
	if err := _GoerliTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsChannelsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsPausedIterator struct {
	Event *GoerliTownsChannelsPaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsChannelsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsChannelsPaused)
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
		it.Event = new(GoerliTownsChannelsPaused)
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
func (it *GoerliTownsChannelsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsChannelsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsChannelsPaused represents a Paused event raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) FilterPaused(opts *bind.FilterOpts) (*GoerliTownsChannelsPausedIterator, error) {

	logs, sub, err := _GoerliTownsChannels.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsPausedIterator{contract: _GoerliTownsChannels.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsChannelsPaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsChannels.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsChannelsPaused)
				if err := _GoerliTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) ParsePaused(log types.Log) (*GoerliTownsChannelsPaused, error) {
	event := new(GoerliTownsChannelsPaused)
	if err := _GoerliTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsChannelsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsUnpausedIterator struct {
	Event *GoerliTownsChannelsUnpaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsChannelsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsChannelsUnpaused)
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
		it.Event = new(GoerliTownsChannelsUnpaused)
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
func (it *GoerliTownsChannelsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsChannelsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsChannelsUnpaused represents a Unpaused event raised by the GoerliTownsChannels contract.
type GoerliTownsChannelsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*GoerliTownsChannelsUnpausedIterator, error) {

	logs, sub, err := _GoerliTownsChannels.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsChannelsUnpausedIterator{contract: _GoerliTownsChannels.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsChannelsUnpaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsChannels.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsChannelsUnpaused)
				if err := _GoerliTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_GoerliTownsChannels *GoerliTownsChannelsFilterer) ParseUnpaused(log types.Log) (*GoerliTownsChannelsUnpaused, error) {
	event := new(GoerliTownsChannelsUnpaused)
	if err := _GoerliTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
