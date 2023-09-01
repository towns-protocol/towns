// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sepolia_towns_channels

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

// SepoliaTownsChannelsMetaData contains all meta data concerning the SepoliaTownsChannels contract.
var SepoliaTownsChannelsMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"ChannelService__ChannelAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDisabled\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__ChannelDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ChannelService__RoleDoesNotExist\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__InvalidValue\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Entitlement__ValueAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"addRoleToChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"name\":\"createChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"getChannel\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel\",\"name\":\"channel\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getChannels\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"uint256[]\",\"name\":\"roleIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structIChannelBase.Channel[]\",\"name\":\"channels\",\"type\":\"tuple[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"}],\"name\":\"removeChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"roleId\",\"type\":\"uint256\"}],\"name\":\"removeRoleFromChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"channelId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"internalType\":\"bool\",\"name\":\"disabled\",\"type\":\"bool\"}],\"name\":\"updateChannel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// SepoliaTownsChannelsABI is the input ABI used to generate the binding from.
// Deprecated: Use SepoliaTownsChannelsMetaData.ABI instead.
var SepoliaTownsChannelsABI = SepoliaTownsChannelsMetaData.ABI

// SepoliaTownsChannels is an auto generated Go binding around an Ethereum contract.
type SepoliaTownsChannels struct {
	SepoliaTownsChannelsCaller     // Read-only binding to the contract
	SepoliaTownsChannelsTransactor // Write-only binding to the contract
	SepoliaTownsChannelsFilterer   // Log filterer for contract events
}

// SepoliaTownsChannelsCaller is an auto generated read-only Go binding around an Ethereum contract.
type SepoliaTownsChannelsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsChannelsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SepoliaTownsChannelsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsChannelsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SepoliaTownsChannelsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaTownsChannelsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SepoliaTownsChannelsSession struct {
	Contract     *SepoliaTownsChannels // Generic contract binding to set the session for
	CallOpts     bind.CallOpts         // Call options to use throughout this session
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// SepoliaTownsChannelsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SepoliaTownsChannelsCallerSession struct {
	Contract *SepoliaTownsChannelsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts               // Call options to use throughout this session
}

// SepoliaTownsChannelsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SepoliaTownsChannelsTransactorSession struct {
	Contract     *SepoliaTownsChannelsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts               // Transaction auth options to use throughout this session
}

// SepoliaTownsChannelsRaw is an auto generated low-level Go binding around an Ethereum contract.
type SepoliaTownsChannelsRaw struct {
	Contract *SepoliaTownsChannels // Generic contract binding to access the raw methods on
}

// SepoliaTownsChannelsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SepoliaTownsChannelsCallerRaw struct {
	Contract *SepoliaTownsChannelsCaller // Generic read-only contract binding to access the raw methods on
}

// SepoliaTownsChannelsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SepoliaTownsChannelsTransactorRaw struct {
	Contract *SepoliaTownsChannelsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSepoliaTownsChannels creates a new instance of SepoliaTownsChannels, bound to a specific deployed contract.
func NewSepoliaTownsChannels(address common.Address, backend bind.ContractBackend) (*SepoliaTownsChannels, error) {
	contract, err := bindSepoliaTownsChannels(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannels{SepoliaTownsChannelsCaller: SepoliaTownsChannelsCaller{contract: contract}, SepoliaTownsChannelsTransactor: SepoliaTownsChannelsTransactor{contract: contract}, SepoliaTownsChannelsFilterer: SepoliaTownsChannelsFilterer{contract: contract}}, nil
}

// NewSepoliaTownsChannelsCaller creates a new read-only instance of SepoliaTownsChannels, bound to a specific deployed contract.
func NewSepoliaTownsChannelsCaller(address common.Address, caller bind.ContractCaller) (*SepoliaTownsChannelsCaller, error) {
	contract, err := bindSepoliaTownsChannels(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsCaller{contract: contract}, nil
}

// NewSepoliaTownsChannelsTransactor creates a new write-only instance of SepoliaTownsChannels, bound to a specific deployed contract.
func NewSepoliaTownsChannelsTransactor(address common.Address, transactor bind.ContractTransactor) (*SepoliaTownsChannelsTransactor, error) {
	contract, err := bindSepoliaTownsChannels(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsTransactor{contract: contract}, nil
}

// NewSepoliaTownsChannelsFilterer creates a new log filterer instance of SepoliaTownsChannels, bound to a specific deployed contract.
func NewSepoliaTownsChannelsFilterer(address common.Address, filterer bind.ContractFilterer) (*SepoliaTownsChannelsFilterer, error) {
	contract, err := bindSepoliaTownsChannels(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsFilterer{contract: contract}, nil
}

// bindSepoliaTownsChannels binds a generic wrapper to an already deployed contract.
func bindSepoliaTownsChannels(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := SepoliaTownsChannelsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsChannels *SepoliaTownsChannelsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsChannels.Contract.SepoliaTownsChannelsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsChannels *SepoliaTownsChannelsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.SepoliaTownsChannelsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsChannels *SepoliaTownsChannelsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.SepoliaTownsChannelsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaTownsChannels *SepoliaTownsChannelsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaTownsChannels.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.contract.Transact(opts, method, params...)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_SepoliaTownsChannels *SepoliaTownsChannelsCaller) GetChannel(opts *bind.CallOpts, channelId string) (IChannelBaseChannel, error) {
	var out []interface{}
	err := _SepoliaTownsChannels.contract.Call(opts, &out, "getChannel", channelId)

	if err != nil {
		return *new(IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new(IChannelBaseChannel)).(*IChannelBaseChannel)

	return out0, err

}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_SepoliaTownsChannels *SepoliaTownsChannelsSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _SepoliaTownsChannels.Contract.GetChannel(&_SepoliaTownsChannels.CallOpts, channelId)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_SepoliaTownsChannels *SepoliaTownsChannelsCallerSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _SepoliaTownsChannels.Contract.GetChannel(&_SepoliaTownsChannels.CallOpts, channelId)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_SepoliaTownsChannels *SepoliaTownsChannelsCaller) GetChannels(opts *bind.CallOpts) ([]IChannelBaseChannel, error) {
	var out []interface{}
	err := _SepoliaTownsChannels.contract.Call(opts, &out, "getChannels")

	if err != nil {
		return *new([]IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new([]IChannelBaseChannel)).(*[]IChannelBaseChannel)

	return out0, err

}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_SepoliaTownsChannels *SepoliaTownsChannelsSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _SepoliaTownsChannels.Contract.GetChannels(&_SepoliaTownsChannels.CallOpts)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_SepoliaTownsChannels *SepoliaTownsChannelsCallerSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _SepoliaTownsChannels.Contract.GetChannels(&_SepoliaTownsChannels.CallOpts)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactor) AddRoleToChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.contract.Transact(opts, "addRoleToChannel", channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.AddRoleToChannel(&_SepoliaTownsChannels.TransactOpts, channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactorSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.AddRoleToChannel(&_SepoliaTownsChannels.TransactOpts, channelId, roleId)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactor) CreateChannel(opts *bind.TransactOpts, channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.contract.Transact(opts, "createChannel", channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.CreateChannel(&_SepoliaTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactorSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.CreateChannel(&_SepoliaTownsChannels.TransactOpts, channelId, metadata, roleIds)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactor) RemoveChannel(opts *bind.TransactOpts, channelId string) (*types.Transaction, error) {
	return _SepoliaTownsChannels.contract.Transact(opts, "removeChannel", channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.RemoveChannel(&_SepoliaTownsChannels.TransactOpts, channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactorSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.RemoveChannel(&_SepoliaTownsChannels.TransactOpts, channelId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactor) RemoveRoleFromChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.contract.Transact(opts, "removeRoleFromChannel", channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.RemoveRoleFromChannel(&_SepoliaTownsChannels.TransactOpts, channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactorSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.RemoveRoleFromChannel(&_SepoliaTownsChannels.TransactOpts, channelId, roleId)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactor) UpdateChannel(opts *bind.TransactOpts, channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _SepoliaTownsChannels.contract.Transact(opts, "updateChannel", channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.UpdateChannel(&_SepoliaTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_SepoliaTownsChannels *SepoliaTownsChannelsTransactorSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _SepoliaTownsChannels.Contract.UpdateChannel(&_SepoliaTownsChannels.TransactOpts, channelId, metadata, disabled)
}

// SepoliaTownsChannelsInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsInitializedIterator struct {
	Event *SepoliaTownsChannelsInitialized // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsChannelsInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsChannelsInitialized)
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
		it.Event = new(SepoliaTownsChannelsInitialized)
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
func (it *SepoliaTownsChannelsInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsChannelsInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsChannelsInitialized represents a Initialized event raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) FilterInitialized(opts *bind.FilterOpts) (*SepoliaTownsChannelsInitializedIterator, error) {

	logs, sub, err := _SepoliaTownsChannels.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsInitializedIterator{contract: _SepoliaTownsChannels.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *SepoliaTownsChannelsInitialized) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsChannels.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsChannelsInitialized)
				if err := _SepoliaTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) ParseInitialized(log types.Log) (*SepoliaTownsChannelsInitialized, error) {
	event := new(SepoliaTownsChannelsInitialized)
	if err := _SepoliaTownsChannels.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsChannelsInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsInterfaceAddedIterator struct {
	Event *SepoliaTownsChannelsInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsChannelsInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsChannelsInterfaceAdded)
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
		it.Event = new(SepoliaTownsChannelsInterfaceAdded)
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
func (it *SepoliaTownsChannelsInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsChannelsInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsChannelsInterfaceAdded represents a InterfaceAdded event raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*SepoliaTownsChannelsInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsChannels.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsInterfaceAddedIterator{contract: _SepoliaTownsChannels.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *SepoliaTownsChannelsInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsChannels.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsChannelsInterfaceAdded)
				if err := _SepoliaTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) ParseInterfaceAdded(log types.Log) (*SepoliaTownsChannelsInterfaceAdded, error) {
	event := new(SepoliaTownsChannelsInterfaceAdded)
	if err := _SepoliaTownsChannels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsChannelsInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsInterfaceRemovedIterator struct {
	Event *SepoliaTownsChannelsInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsChannelsInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsChannelsInterfaceRemoved)
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
		it.Event = new(SepoliaTownsChannelsInterfaceRemoved)
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
func (it *SepoliaTownsChannelsInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsChannelsInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsChannelsInterfaceRemoved represents a InterfaceRemoved event raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*SepoliaTownsChannelsInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsChannels.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsInterfaceRemovedIterator{contract: _SepoliaTownsChannels.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *SepoliaTownsChannelsInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _SepoliaTownsChannels.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsChannelsInterfaceRemoved)
				if err := _SepoliaTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) ParseInterfaceRemoved(log types.Log) (*SepoliaTownsChannelsInterfaceRemoved, error) {
	event := new(SepoliaTownsChannelsInterfaceRemoved)
	if err := _SepoliaTownsChannels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsChannelsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsOwnershipTransferredIterator struct {
	Event *SepoliaTownsChannelsOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsChannelsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsChannelsOwnershipTransferred)
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
		it.Event = new(SepoliaTownsChannelsOwnershipTransferred)
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
func (it *SepoliaTownsChannelsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsChannelsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsChannelsOwnershipTransferred represents a OwnershipTransferred event raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*SepoliaTownsChannelsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _SepoliaTownsChannels.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsOwnershipTransferredIterator{contract: _SepoliaTownsChannels.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *SepoliaTownsChannelsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _SepoliaTownsChannels.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsChannelsOwnershipTransferred)
				if err := _SepoliaTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) ParseOwnershipTransferred(log types.Log) (*SepoliaTownsChannelsOwnershipTransferred, error) {
	event := new(SepoliaTownsChannelsOwnershipTransferred)
	if err := _SepoliaTownsChannels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsChannelsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsPausedIterator struct {
	Event *SepoliaTownsChannelsPaused // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsChannelsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsChannelsPaused)
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
		it.Event = new(SepoliaTownsChannelsPaused)
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
func (it *SepoliaTownsChannelsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsChannelsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsChannelsPaused represents a Paused event raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) FilterPaused(opts *bind.FilterOpts) (*SepoliaTownsChannelsPausedIterator, error) {

	logs, sub, err := _SepoliaTownsChannels.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsPausedIterator{contract: _SepoliaTownsChannels.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *SepoliaTownsChannelsPaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsChannels.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsChannelsPaused)
				if err := _SepoliaTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) ParsePaused(log types.Log) (*SepoliaTownsChannelsPaused, error) {
	event := new(SepoliaTownsChannelsPaused)
	if err := _SepoliaTownsChannels.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaTownsChannelsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsUnpausedIterator struct {
	Event *SepoliaTownsChannelsUnpaused // Event containing the contract specifics and raw log

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
func (it *SepoliaTownsChannelsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaTownsChannelsUnpaused)
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
		it.Event = new(SepoliaTownsChannelsUnpaused)
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
func (it *SepoliaTownsChannelsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaTownsChannelsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaTownsChannelsUnpaused represents a Unpaused event raised by the SepoliaTownsChannels contract.
type SepoliaTownsChannelsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*SepoliaTownsChannelsUnpausedIterator, error) {

	logs, sub, err := _SepoliaTownsChannels.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &SepoliaTownsChannelsUnpausedIterator{contract: _SepoliaTownsChannels.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *SepoliaTownsChannelsUnpaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaTownsChannels.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaTownsChannelsUnpaused)
				if err := _SepoliaTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_SepoliaTownsChannels *SepoliaTownsChannelsFilterer) ParseUnpaused(log types.Log) (*SepoliaTownsChannelsUnpaused, error) {
	event := new(SepoliaTownsChannelsUnpaused)
	if err := _SepoliaTownsChannels.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
