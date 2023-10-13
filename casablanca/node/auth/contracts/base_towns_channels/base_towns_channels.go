// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_towns_channels

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

// BaseTownsChannelsMetaData contains all meta data concerning the BaseTownsChannels contract.
var BaseTownsChannelsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"ChannelService__ChannelAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDisabled\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"addRoleToChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"name\":\"createChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"getChannel\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel\",\"name\":\"channel\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getChannels\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel[]\",\"name\":\"channels\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"removeChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"removeRoleFromChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"}],\"name\":\"updateChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// BaseTownsChannelsABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseTownsChannelsMetaData.ABI instead.
var BaseTownsChannelsABI = BaseTownsChannelsMetaData.ABI

// BaseTownsChannels is an auto generated Go binding around an Ethereum contract.
type BaseTownsChannels struct {
	BaseTownsChannelsCaller     // Read-only binding to the contract
	BaseTownsChannelsTransactor // Write-only binding to the contract
	BaseTownsChannelsFilterer   // Log filterer for contract events
}

// BaseTownsChannelsCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseTownsChannelsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsChannelsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseTownsChannelsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsChannelsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseTownsChannelsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsChannelsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseTownsChannelsSession struct {
	Contract     *BaseTownsChannels // Generic contract binding to set the session for
	CallOpts     bind.CallOpts      // Call options to use throughout this session
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// BaseTownsChannelsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseTownsChannelsCallerSession struct {
	Contract *BaseTownsChannelsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts            // Call options to use throughout this session
}

// BaseTownsChannelsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseTownsChannelsTransactorSession struct {
	Contract     *BaseTownsChannelsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// BaseTownsChannelsRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseTownsChannelsRaw struct {
	Contract *BaseTownsChannels // Generic contract binding to access the raw methods on
}

// BaseTownsChannelsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseTownsChannelsCallerRaw struct {
	Contract *BaseTownsChannelsCaller // Generic read-only contract binding to access the raw methods on
}

// BaseTownsChannelsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseTownsChannelsTransactorRaw struct {
	Contract *BaseTownsChannelsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseTownsChannels creates a new instance of BaseTownsChannels, bound to a specific deployed contract.
func NewBaseTownsChannels(address common.Address, backend bind.ContractBackend) (*BaseTownsChannels, error) {
	contract, err := bindBaseTownsChannels(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannels{BaseTownsChannelsCaller: BaseTownsChannelsCaller{contract: contract}, BaseTownsChannelsTransactor: BaseTownsChannelsTransactor{contract: contract}, BaseTownsChannelsFilterer: BaseTownsChannelsFilterer{contract: contract}}, nil
}

// NewBaseTownsChannelsCaller creates a new read-only instance of BaseTownsChannels, bound to a specific deployed contract.
func NewBaseTownsChannelsCaller(address common.Address, caller bind.ContractCaller) (*BaseTownsChannelsCaller, error) {
	contract, err := bindBaseTownsChannels(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsCaller{contract: contract}, nil
}

// NewBaseTownsChannelsTransactor creates a new write-only instance of BaseTownsChannels, bound to a specific deployed contract.
func NewBaseTownsChannelsTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseTownsChannelsTransactor, error) {
	contract, err := bindBaseTownsChannels(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsTransactor{contract: contract}, nil
}

// NewBaseTownsChannelsFilterer creates a new log filterer instance of BaseTownsChannels, bound to a specific deployed contract.
func NewBaseTownsChannelsFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseTownsChannelsFilterer, error) {
	contract, err := bindBaseTownsChannels(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsFilterer{contract: contract}, nil
}

// bindBaseTownsChannels binds a generic wrapper to an already deployed contract.
func bindBaseTownsChannels(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseTownsChannelsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsChannels *BaseTownsChannelsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsChannels.Contract.BaseTownsChannelsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsChannels *BaseTownsChannelsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.BaseTownsChannelsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsChannels *BaseTownsChannelsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.BaseTownsChannelsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsChannels *BaseTownsChannelsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsChannels.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsChannels *BaseTownsChannelsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsChannels *BaseTownsChannelsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.contract.Transact(opts, method, params...)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_BaseTownsChannels *BaseTownsChannelsCaller) GetChannel(opts *bind.CallOpts, channelId string) (IChannelBaseChannel, error) {
	var out []interface{}
	err := _BaseTownsChannels.contract.Call(opts, &out, "getChannel", channelId)

	if err != nil {
		return *new(IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new(IChannelBaseChannel)).(*IChannelBaseChannel)

	return out0, err

}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_BaseTownsChannels *BaseTownsChannelsSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _BaseTownsChannels.Contract.GetChannel(&_BaseTownsChannels.CallOpts, channelId)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_BaseTownsChannels *BaseTownsChannelsCallerSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _BaseTownsChannels.Contract.GetChannel(&_BaseTownsChannels.CallOpts, channelId)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_BaseTownsChannels *BaseTownsChannelsCaller) GetChannels(opts *bind.CallOpts) ([]IChannelBaseChannel, error) {
	var out []interface{}
	err := _BaseTownsChannels.contract.Call(opts, &out, "getChannels")

	if err != nil {
		return *new([]IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new([]IChannelBaseChannel)).(*[]IChannelBaseChannel)

	return out0, err

}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_BaseTownsChannels *BaseTownsChannelsSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _BaseTownsChannels.Contract.GetChannels(&_BaseTownsChannels.CallOpts)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_BaseTownsChannels *BaseTownsChannelsCallerSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _BaseTownsChannels.Contract.GetChannels(&_BaseTownsChannels.CallOpts)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactor) AddRoleToChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.contract.Transact(opts, "addRoleToChannel", channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_BaseTownsChannels *BaseTownsChannelsSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.AddRoleToChannel(&_BaseTownsChannels.TransactOpts, channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactorSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.AddRoleToChannel(&_BaseTownsChannels.TransactOpts, channelId, roleId)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactor) CreateChannel(opts *bind.TransactOpts, channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.contract.Transact(opts, "createChannel", channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_BaseTownsChannels *BaseTownsChannelsSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.CreateChannel(&_BaseTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactorSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.CreateChannel(&_BaseTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactor) RemoveChannel(opts *bind.TransactOpts, channelId string) (*types.Transaction, error) {
	return _BaseTownsChannels.contract.Transact(opts, "removeChannel", channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_BaseTownsChannels *BaseTownsChannelsSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.RemoveChannel(&_BaseTownsChannels.TransactOpts, channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactorSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.RemoveChannel(&_BaseTownsChannels.TransactOpts, channelId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactor) RemoveRoleFromChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.contract.Transact(opts, "removeRoleFromChannel", channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_BaseTownsChannels *BaseTownsChannelsSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.RemoveRoleFromChannel(&_BaseTownsChannels.TransactOpts, channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactorSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.RemoveRoleFromChannel(&_BaseTownsChannels.TransactOpts, channelId, roleId)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactor) UpdateChannel(opts *bind.TransactOpts, channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _BaseTownsChannels.contract.Transact(opts, "updateChannel", channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_BaseTownsChannels *BaseTownsChannelsSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.UpdateChannel(&_BaseTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_BaseTownsChannels *BaseTownsChannelsTransactorSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _BaseTownsChannels.Contract.UpdateChannel(&_BaseTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// BaseTownsChannelsInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the BaseTownsChannels contract.
type BaseTownsChannelsInitializedIterator struct {
	Event *BaseTownsChannelsInitialized // Event containing the contract specifics and raw log

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
func (it *BaseTownsChannelsInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsChannelsInitialized)
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
		it.Event = new(BaseTownsChannelsInitialized)
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
func (it *BaseTownsChannelsInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsChannelsInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsChannelsInitialized represents a Initialized event raised by the BaseTownsChannels contract.
type BaseTownsChannelsInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) FilterInitialized(opts *bind.FilterOpts) (*BaseTownsChannelsInitializedIterator, error) {

	logs, sub, err := _BaseTownsChannels.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsInitializedIterator{contract: _BaseTownsChannels.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *BaseTownsChannelsInitialized) (event.Subscription, error) {

	logs, sub, err := _BaseTownsChannels.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsChannelsInitialized)
				if err := _BaseTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_BaseTownsChannels *BaseTownsChannelsFilterer) ParseInitialized(log types.Log) (*BaseTownsChannelsInitialized, error) {
	event := new(BaseTownsChannelsInitialized)
	if err := _BaseTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsChannelsInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the BaseTownsChannels contract.
type BaseTownsChannelsInterfaceAddedIterator struct {
	Event *BaseTownsChannelsInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *BaseTownsChannelsInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsChannelsInterfaceAdded)
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
		it.Event = new(BaseTownsChannelsInterfaceAdded)
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
func (it *BaseTownsChannelsInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsChannelsInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsChannelsInterfaceAdded represents a InterfaceAdded event raised by the BaseTownsChannels contract.
type BaseTownsChannelsInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseTownsChannelsInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsChannels.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsInterfaceAddedIterator{contract: _BaseTownsChannels.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *BaseTownsChannelsInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsChannels.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsChannelsInterfaceAdded)
				if err := _BaseTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_BaseTownsChannels *BaseTownsChannelsFilterer) ParseInterfaceAdded(log types.Log) (*BaseTownsChannelsInterfaceAdded, error) {
	event := new(BaseTownsChannelsInterfaceAdded)
	if err := _BaseTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsChannelsInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the BaseTownsChannels contract.
type BaseTownsChannelsInterfaceRemovedIterator struct {
	Event *BaseTownsChannelsInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *BaseTownsChannelsInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsChannelsInterfaceRemoved)
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
		it.Event = new(BaseTownsChannelsInterfaceRemoved)
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
func (it *BaseTownsChannelsInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsChannelsInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsChannelsInterfaceRemoved represents a InterfaceRemoved event raised by the BaseTownsChannels contract.
type BaseTownsChannelsInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseTownsChannelsInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsChannels.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsInterfaceRemovedIterator{contract: _BaseTownsChannels.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *BaseTownsChannelsInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsChannels.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsChannelsInterfaceRemoved)
				if err := _BaseTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_BaseTownsChannels *BaseTownsChannelsFilterer) ParseInterfaceRemoved(log types.Log) (*BaseTownsChannelsInterfaceRemoved, error) {
	event := new(BaseTownsChannelsInterfaceRemoved)
	if err := _BaseTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsChannelsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the BaseTownsChannels contract.
type BaseTownsChannelsOwnershipTransferredIterator struct {
	Event *BaseTownsChannelsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *BaseTownsChannelsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsChannelsOwnershipTransferred)
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
		it.Event = new(BaseTownsChannelsOwnershipTransferred)
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
func (it *BaseTownsChannelsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsChannelsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsChannelsOwnershipTransferred represents a OwnershipTransferred event raised by the BaseTownsChannels contract.
type BaseTownsChannelsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*BaseTownsChannelsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseTownsChannels.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsOwnershipTransferredIterator{contract: _BaseTownsChannels.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *BaseTownsChannelsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseTownsChannels.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsChannelsOwnershipTransferred)
				if err := _BaseTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_BaseTownsChannels *BaseTownsChannelsFilterer) ParseOwnershipTransferred(log types.Log) (*BaseTownsChannelsOwnershipTransferred, error) {
	event := new(BaseTownsChannelsOwnershipTransferred)
	if err := _BaseTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsChannelsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseTownsChannels contract.
type BaseTownsChannelsPausedIterator struct {
	Event *BaseTownsChannelsPaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsChannelsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsChannelsPaused)
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
		it.Event = new(BaseTownsChannelsPaused)
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
func (it *BaseTownsChannelsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsChannelsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsChannelsPaused represents a Paused event raised by the BaseTownsChannels contract.
type BaseTownsChannelsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseTownsChannelsPausedIterator, error) {

	logs, sub, err := _BaseTownsChannels.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsPausedIterator{contract: _BaseTownsChannels.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseTownsChannelsPaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsChannels.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsChannelsPaused)
				if err := _BaseTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_BaseTownsChannels *BaseTownsChannelsFilterer) ParsePaused(log types.Log) (*BaseTownsChannelsPaused, error) {
	event := new(BaseTownsChannelsPaused)
	if err := _BaseTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsChannelsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseTownsChannels contract.
type BaseTownsChannelsUnpausedIterator struct {
	Event *BaseTownsChannelsUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsChannelsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsChannelsUnpaused)
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
		it.Event = new(BaseTownsChannelsUnpaused)
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
func (it *BaseTownsChannelsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsChannelsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsChannelsUnpaused represents a Unpaused event raised by the BaseTownsChannels contract.
type BaseTownsChannelsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseTownsChannelsUnpausedIterator, error) {

	logs, sub, err := _BaseTownsChannels.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsChannelsUnpausedIterator{contract: _BaseTownsChannels.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsChannels *BaseTownsChannelsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseTownsChannelsUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsChannels.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsChannelsUnpaused)
				if err := _BaseTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_BaseTownsChannels *BaseTownsChannelsFilterer) ParseUnpaused(log types.Log) (*BaseTownsChannelsUnpaused, error) {
	event := new(BaseTownsChannelsUnpaused)
	if err := _BaseTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
