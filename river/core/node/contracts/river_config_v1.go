// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contracts

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

// Setting is an auto generated low-level Go binding around an user-defined struct.
type Setting struct {
	Key         [32]byte
	BlockNumber uint64
	Value       []byte
}

// RiverConfigV1MetaData contains all meta data concerning the RiverConfigV1 contract.
var RiverConfigV1MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"approveConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"configurationExists\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"deleteConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"deleteConfigurationOnBlock\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllConfiguration\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"ConfigurationChanged\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"block\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"},{\"name\":\"deleted\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerAdded\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerRemoved\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false}]",
}

// RiverConfigV1ABI is the input ABI used to generate the binding from.
// Deprecated: Use RiverConfigV1MetaData.ABI instead.
var RiverConfigV1ABI = RiverConfigV1MetaData.ABI

// RiverConfigV1 is an auto generated Go binding around an Ethereum contract.
type RiverConfigV1 struct {
	RiverConfigV1Caller     // Read-only binding to the contract
	RiverConfigV1Transactor // Write-only binding to the contract
	RiverConfigV1Filterer   // Log filterer for contract events
}

// RiverConfigV1Caller is an auto generated read-only Go binding around an Ethereum contract.
type RiverConfigV1Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverConfigV1Transactor is an auto generated write-only Go binding around an Ethereum contract.
type RiverConfigV1Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverConfigV1Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type RiverConfigV1Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverConfigV1Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type RiverConfigV1Session struct {
	Contract     *RiverConfigV1    // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// RiverConfigV1CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type RiverConfigV1CallerSession struct {
	Contract *RiverConfigV1Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts        // Call options to use throughout this session
}

// RiverConfigV1TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type RiverConfigV1TransactorSession struct {
	Contract     *RiverConfigV1Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// RiverConfigV1Raw is an auto generated low-level Go binding around an Ethereum contract.
type RiverConfigV1Raw struct {
	Contract *RiverConfigV1 // Generic contract binding to access the raw methods on
}

// RiverConfigV1CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type RiverConfigV1CallerRaw struct {
	Contract *RiverConfigV1Caller // Generic read-only contract binding to access the raw methods on
}

// RiverConfigV1TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type RiverConfigV1TransactorRaw struct {
	Contract *RiverConfigV1Transactor // Generic write-only contract binding to access the raw methods on
}

// NewRiverConfigV1 creates a new instance of RiverConfigV1, bound to a specific deployed contract.
func NewRiverConfigV1(address common.Address, backend bind.ContractBackend) (*RiverConfigV1, error) {
	contract, err := bindRiverConfigV1(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &RiverConfigV1{RiverConfigV1Caller: RiverConfigV1Caller{contract: contract}, RiverConfigV1Transactor: RiverConfigV1Transactor{contract: contract}, RiverConfigV1Filterer: RiverConfigV1Filterer{contract: contract}}, nil
}

// NewRiverConfigV1Caller creates a new read-only instance of RiverConfigV1, bound to a specific deployed contract.
func NewRiverConfigV1Caller(address common.Address, caller bind.ContractCaller) (*RiverConfigV1Caller, error) {
	contract, err := bindRiverConfigV1(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &RiverConfigV1Caller{contract: contract}, nil
}

// NewRiverConfigV1Transactor creates a new write-only instance of RiverConfigV1, bound to a specific deployed contract.
func NewRiverConfigV1Transactor(address common.Address, transactor bind.ContractTransactor) (*RiverConfigV1Transactor, error) {
	contract, err := bindRiverConfigV1(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &RiverConfigV1Transactor{contract: contract}, nil
}

// NewRiverConfigV1Filterer creates a new log filterer instance of RiverConfigV1, bound to a specific deployed contract.
func NewRiverConfigV1Filterer(address common.Address, filterer bind.ContractFilterer) (*RiverConfigV1Filterer, error) {
	contract, err := bindRiverConfigV1(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &RiverConfigV1Filterer{contract: contract}, nil
}

// bindRiverConfigV1 binds a generic wrapper to an already deployed contract.
func bindRiverConfigV1(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := RiverConfigV1MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RiverConfigV1 *RiverConfigV1Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RiverConfigV1.Contract.RiverConfigV1Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RiverConfigV1 *RiverConfigV1Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.RiverConfigV1Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RiverConfigV1 *RiverConfigV1Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.RiverConfigV1Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RiverConfigV1 *RiverConfigV1CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RiverConfigV1.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RiverConfigV1 *RiverConfigV1TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RiverConfigV1 *RiverConfigV1TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.contract.Transact(opts, method, params...)
}

// ConfigurationExists is a free data retrieval call binding the contract method 0xfc207c01.
//
// Solidity: function configurationExists(bytes32 key) view returns(bool)
func (_RiverConfigV1 *RiverConfigV1Caller) ConfigurationExists(opts *bind.CallOpts, key [32]byte) (bool, error) {
	var out []interface{}
	err := _RiverConfigV1.contract.Call(opts, &out, "configurationExists", key)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// ConfigurationExists is a free data retrieval call binding the contract method 0xfc207c01.
//
// Solidity: function configurationExists(bytes32 key) view returns(bool)
func (_RiverConfigV1 *RiverConfigV1Session) ConfigurationExists(key [32]byte) (bool, error) {
	return _RiverConfigV1.Contract.ConfigurationExists(&_RiverConfigV1.CallOpts, key)
}

// ConfigurationExists is a free data retrieval call binding the contract method 0xfc207c01.
//
// Solidity: function configurationExists(bytes32 key) view returns(bool)
func (_RiverConfigV1 *RiverConfigV1CallerSession) ConfigurationExists(key [32]byte) (bool, error) {
	return _RiverConfigV1.Contract.ConfigurationExists(&_RiverConfigV1.CallOpts, key)
}

// GetAllConfiguration is a free data retrieval call binding the contract method 0x081814db.
//
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[])
func (_RiverConfigV1 *RiverConfigV1Caller) GetAllConfiguration(opts *bind.CallOpts) ([]Setting, error) {
	var out []interface{}
	err := _RiverConfigV1.contract.Call(opts, &out, "getAllConfiguration")

	if err != nil {
		return *new([]Setting), err
	}

	out0 := *abi.ConvertType(out[0], new([]Setting)).(*[]Setting)

	return out0, err

}

// GetAllConfiguration is a free data retrieval call binding the contract method 0x081814db.
//
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[])
func (_RiverConfigV1 *RiverConfigV1Session) GetAllConfiguration() ([]Setting, error) {
	return _RiverConfigV1.Contract.GetAllConfiguration(&_RiverConfigV1.CallOpts)
}

// GetAllConfiguration is a free data retrieval call binding the contract method 0x081814db.
//
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[])
func (_RiverConfigV1 *RiverConfigV1CallerSession) GetAllConfiguration() ([]Setting, error) {
	return _RiverConfigV1.Contract.GetAllConfiguration(&_RiverConfigV1.CallOpts)
}

// GetConfiguration is a free data retrieval call binding the contract method 0x9283ae3a.
//
// Solidity: function getConfiguration(bytes32 key) view returns((bytes32,uint64,bytes)[])
func (_RiverConfigV1 *RiverConfigV1Caller) GetConfiguration(opts *bind.CallOpts, key [32]byte) ([]Setting, error) {
	var out []interface{}
	err := _RiverConfigV1.contract.Call(opts, &out, "getConfiguration", key)

	if err != nil {
		return *new([]Setting), err
	}

	out0 := *abi.ConvertType(out[0], new([]Setting)).(*[]Setting)

	return out0, err

}

// GetConfiguration is a free data retrieval call binding the contract method 0x9283ae3a.
//
// Solidity: function getConfiguration(bytes32 key) view returns((bytes32,uint64,bytes)[])
func (_RiverConfigV1 *RiverConfigV1Session) GetConfiguration(key [32]byte) ([]Setting, error) {
	return _RiverConfigV1.Contract.GetConfiguration(&_RiverConfigV1.CallOpts, key)
}

// GetConfiguration is a free data retrieval call binding the contract method 0x9283ae3a.
//
// Solidity: function getConfiguration(bytes32 key) view returns((bytes32,uint64,bytes)[])
func (_RiverConfigV1 *RiverConfigV1CallerSession) GetConfiguration(key [32]byte) ([]Setting, error) {
	return _RiverConfigV1.Contract.GetConfiguration(&_RiverConfigV1.CallOpts, key)
}

// IsConfigurationManager is a free data retrieval call binding the contract method 0xd4bd44a0.
//
// Solidity: function isConfigurationManager(address manager) view returns(bool)
func (_RiverConfigV1 *RiverConfigV1Caller) IsConfigurationManager(opts *bind.CallOpts, manager common.Address) (bool, error) {
	var out []interface{}
	err := _RiverConfigV1.contract.Call(opts, &out, "isConfigurationManager", manager)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsConfigurationManager is a free data retrieval call binding the contract method 0xd4bd44a0.
//
// Solidity: function isConfigurationManager(address manager) view returns(bool)
func (_RiverConfigV1 *RiverConfigV1Session) IsConfigurationManager(manager common.Address) (bool, error) {
	return _RiverConfigV1.Contract.IsConfigurationManager(&_RiverConfigV1.CallOpts, manager)
}

// IsConfigurationManager is a free data retrieval call binding the contract method 0xd4bd44a0.
//
// Solidity: function isConfigurationManager(address manager) view returns(bool)
func (_RiverConfigV1 *RiverConfigV1CallerSession) IsConfigurationManager(manager common.Address) (bool, error) {
	return _RiverConfigV1.Contract.IsConfigurationManager(&_RiverConfigV1.CallOpts, manager)
}

// ApproveConfigurationManager is a paid mutator transaction binding the contract method 0xc179b85f.
//
// Solidity: function approveConfigurationManager(address manager) returns()
func (_RiverConfigV1 *RiverConfigV1Transactor) ApproveConfigurationManager(opts *bind.TransactOpts, manager common.Address) (*types.Transaction, error) {
	return _RiverConfigV1.contract.Transact(opts, "approveConfigurationManager", manager)
}

// ApproveConfigurationManager is a paid mutator transaction binding the contract method 0xc179b85f.
//
// Solidity: function approveConfigurationManager(address manager) returns()
func (_RiverConfigV1 *RiverConfigV1Session) ApproveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.ApproveConfigurationManager(&_RiverConfigV1.TransactOpts, manager)
}

// ApproveConfigurationManager is a paid mutator transaction binding the contract method 0xc179b85f.
//
// Solidity: function approveConfigurationManager(address manager) returns()
func (_RiverConfigV1 *RiverConfigV1TransactorSession) ApproveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.ApproveConfigurationManager(&_RiverConfigV1.TransactOpts, manager)
}

// DeleteConfiguration is a paid mutator transaction binding the contract method 0x035759e1.
//
// Solidity: function deleteConfiguration(bytes32 key) returns()
func (_RiverConfigV1 *RiverConfigV1Transactor) DeleteConfiguration(opts *bind.TransactOpts, key [32]byte) (*types.Transaction, error) {
	return _RiverConfigV1.contract.Transact(opts, "deleteConfiguration", key)
}

// DeleteConfiguration is a paid mutator transaction binding the contract method 0x035759e1.
//
// Solidity: function deleteConfiguration(bytes32 key) returns()
func (_RiverConfigV1 *RiverConfigV1Session) DeleteConfiguration(key [32]byte) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.DeleteConfiguration(&_RiverConfigV1.TransactOpts, key)
}

// DeleteConfiguration is a paid mutator transaction binding the contract method 0x035759e1.
//
// Solidity: function deleteConfiguration(bytes32 key) returns()
func (_RiverConfigV1 *RiverConfigV1TransactorSession) DeleteConfiguration(key [32]byte) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.DeleteConfiguration(&_RiverConfigV1.TransactOpts, key)
}

// DeleteConfigurationOnBlock is a paid mutator transaction binding the contract method 0xb7f227ee.
//
// Solidity: function deleteConfigurationOnBlock(bytes32 key, uint64 blockNumber) returns()
func (_RiverConfigV1 *RiverConfigV1Transactor) DeleteConfigurationOnBlock(opts *bind.TransactOpts, key [32]byte, blockNumber uint64) (*types.Transaction, error) {
	return _RiverConfigV1.contract.Transact(opts, "deleteConfigurationOnBlock", key, blockNumber)
}

// DeleteConfigurationOnBlock is a paid mutator transaction binding the contract method 0xb7f227ee.
//
// Solidity: function deleteConfigurationOnBlock(bytes32 key, uint64 blockNumber) returns()
func (_RiverConfigV1 *RiverConfigV1Session) DeleteConfigurationOnBlock(key [32]byte, blockNumber uint64) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.DeleteConfigurationOnBlock(&_RiverConfigV1.TransactOpts, key, blockNumber)
}

// DeleteConfigurationOnBlock is a paid mutator transaction binding the contract method 0xb7f227ee.
//
// Solidity: function deleteConfigurationOnBlock(bytes32 key, uint64 blockNumber) returns()
func (_RiverConfigV1 *RiverConfigV1TransactorSession) DeleteConfigurationOnBlock(key [32]byte, blockNumber uint64) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.DeleteConfigurationOnBlock(&_RiverConfigV1.TransactOpts, key, blockNumber)
}

// RemoveConfigurationManager is a paid mutator transaction binding the contract method 0x813049ec.
//
// Solidity: function removeConfigurationManager(address manager) returns()
func (_RiverConfigV1 *RiverConfigV1Transactor) RemoveConfigurationManager(opts *bind.TransactOpts, manager common.Address) (*types.Transaction, error) {
	return _RiverConfigV1.contract.Transact(opts, "removeConfigurationManager", manager)
}

// RemoveConfigurationManager is a paid mutator transaction binding the contract method 0x813049ec.
//
// Solidity: function removeConfigurationManager(address manager) returns()
func (_RiverConfigV1 *RiverConfigV1Session) RemoveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.RemoveConfigurationManager(&_RiverConfigV1.TransactOpts, manager)
}

// RemoveConfigurationManager is a paid mutator transaction binding the contract method 0x813049ec.
//
// Solidity: function removeConfigurationManager(address manager) returns()
func (_RiverConfigV1 *RiverConfigV1TransactorSession) RemoveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.RemoveConfigurationManager(&_RiverConfigV1.TransactOpts, manager)
}

// SetConfiguration is a paid mutator transaction binding the contract method 0xa09449a6.
//
// Solidity: function setConfiguration(bytes32 key, uint64 blockNumber, bytes value) returns()
func (_RiverConfigV1 *RiverConfigV1Transactor) SetConfiguration(opts *bind.TransactOpts, key [32]byte, blockNumber uint64, value []byte) (*types.Transaction, error) {
	return _RiverConfigV1.contract.Transact(opts, "setConfiguration", key, blockNumber, value)
}

// SetConfiguration is a paid mutator transaction binding the contract method 0xa09449a6.
//
// Solidity: function setConfiguration(bytes32 key, uint64 blockNumber, bytes value) returns()
func (_RiverConfigV1 *RiverConfigV1Session) SetConfiguration(key [32]byte, blockNumber uint64, value []byte) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.SetConfiguration(&_RiverConfigV1.TransactOpts, key, blockNumber, value)
}

// SetConfiguration is a paid mutator transaction binding the contract method 0xa09449a6.
//
// Solidity: function setConfiguration(bytes32 key, uint64 blockNumber, bytes value) returns()
func (_RiverConfigV1 *RiverConfigV1TransactorSession) SetConfiguration(key [32]byte, blockNumber uint64, value []byte) (*types.Transaction, error) {
	return _RiverConfigV1.Contract.SetConfiguration(&_RiverConfigV1.TransactOpts, key, blockNumber, value)
}

// RiverConfigV1ConfigurationChangedIterator is returned from FilterConfigurationChanged and is used to iterate over the raw logs and unpacked data for ConfigurationChanged events raised by the RiverConfigV1 contract.
type RiverConfigV1ConfigurationChangedIterator struct {
	Event *RiverConfigV1ConfigurationChanged // Event containing the contract specifics and raw log

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
func (it *RiverConfigV1ConfigurationChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverConfigV1ConfigurationChanged)
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
		it.Event = new(RiverConfigV1ConfigurationChanged)
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
func (it *RiverConfigV1ConfigurationChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverConfigV1ConfigurationChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverConfigV1ConfigurationChanged represents a ConfigurationChanged event raised by the RiverConfigV1 contract.
type RiverConfigV1ConfigurationChanged struct {
	Key     [32]byte
	Block   uint64
	Value   []byte
	Deleted bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterConfigurationChanged is a free log retrieval operation binding the contract event 0xc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98.
//
// Solidity: event ConfigurationChanged(bytes32 key, uint64 block, bytes value, bool deleted)
func (_RiverConfigV1 *RiverConfigV1Filterer) FilterConfigurationChanged(opts *bind.FilterOpts) (*RiverConfigV1ConfigurationChangedIterator, error) {

	logs, sub, err := _RiverConfigV1.contract.FilterLogs(opts, "ConfigurationChanged")
	if err != nil {
		return nil, err
	}
	return &RiverConfigV1ConfigurationChangedIterator{contract: _RiverConfigV1.contract, event: "ConfigurationChanged", logs: logs, sub: sub}, nil
}

// WatchConfigurationChanged is a free log subscription operation binding the contract event 0xc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98.
//
// Solidity: event ConfigurationChanged(bytes32 key, uint64 block, bytes value, bool deleted)
func (_RiverConfigV1 *RiverConfigV1Filterer) WatchConfigurationChanged(opts *bind.WatchOpts, sink chan<- *RiverConfigV1ConfigurationChanged) (event.Subscription, error) {

	logs, sub, err := _RiverConfigV1.contract.WatchLogs(opts, "ConfigurationChanged")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverConfigV1ConfigurationChanged)
				if err := _RiverConfigV1.contract.UnpackLog(event, "ConfigurationChanged", log); err != nil {
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

// ParseConfigurationChanged is a log parse operation binding the contract event 0xc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98.
//
// Solidity: event ConfigurationChanged(bytes32 key, uint64 block, bytes value, bool deleted)
func (_RiverConfigV1 *RiverConfigV1Filterer) ParseConfigurationChanged(log types.Log) (*RiverConfigV1ConfigurationChanged, error) {
	event := new(RiverConfigV1ConfigurationChanged)
	if err := _RiverConfigV1.contract.UnpackLog(event, "ConfigurationChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverConfigV1ConfigurationManagerAddedIterator is returned from FilterConfigurationManagerAdded and is used to iterate over the raw logs and unpacked data for ConfigurationManagerAdded events raised by the RiverConfigV1 contract.
type RiverConfigV1ConfigurationManagerAddedIterator struct {
	Event *RiverConfigV1ConfigurationManagerAdded // Event containing the contract specifics and raw log

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
func (it *RiverConfigV1ConfigurationManagerAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverConfigV1ConfigurationManagerAdded)
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
		it.Event = new(RiverConfigV1ConfigurationManagerAdded)
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
func (it *RiverConfigV1ConfigurationManagerAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverConfigV1ConfigurationManagerAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverConfigV1ConfigurationManagerAdded represents a ConfigurationManagerAdded event raised by the RiverConfigV1 contract.
type RiverConfigV1ConfigurationManagerAdded struct {
	Manager common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterConfigurationManagerAdded is a free log retrieval operation binding the contract event 0x7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2.
//
// Solidity: event ConfigurationManagerAdded(address indexed manager)
func (_RiverConfigV1 *RiverConfigV1Filterer) FilterConfigurationManagerAdded(opts *bind.FilterOpts, manager []common.Address) (*RiverConfigV1ConfigurationManagerAddedIterator, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _RiverConfigV1.contract.FilterLogs(opts, "ConfigurationManagerAdded", managerRule)
	if err != nil {
		return nil, err
	}
	return &RiverConfigV1ConfigurationManagerAddedIterator{contract: _RiverConfigV1.contract, event: "ConfigurationManagerAdded", logs: logs, sub: sub}, nil
}

// WatchConfigurationManagerAdded is a free log subscription operation binding the contract event 0x7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2.
//
// Solidity: event ConfigurationManagerAdded(address indexed manager)
func (_RiverConfigV1 *RiverConfigV1Filterer) WatchConfigurationManagerAdded(opts *bind.WatchOpts, sink chan<- *RiverConfigV1ConfigurationManagerAdded, manager []common.Address) (event.Subscription, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _RiverConfigV1.contract.WatchLogs(opts, "ConfigurationManagerAdded", managerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverConfigV1ConfigurationManagerAdded)
				if err := _RiverConfigV1.contract.UnpackLog(event, "ConfigurationManagerAdded", log); err != nil {
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

// ParseConfigurationManagerAdded is a log parse operation binding the contract event 0x7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2.
//
// Solidity: event ConfigurationManagerAdded(address indexed manager)
func (_RiverConfigV1 *RiverConfigV1Filterer) ParseConfigurationManagerAdded(log types.Log) (*RiverConfigV1ConfigurationManagerAdded, error) {
	event := new(RiverConfigV1ConfigurationManagerAdded)
	if err := _RiverConfigV1.contract.UnpackLog(event, "ConfigurationManagerAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverConfigV1ConfigurationManagerRemovedIterator is returned from FilterConfigurationManagerRemoved and is used to iterate over the raw logs and unpacked data for ConfigurationManagerRemoved events raised by the RiverConfigV1 contract.
type RiverConfigV1ConfigurationManagerRemovedIterator struct {
	Event *RiverConfigV1ConfigurationManagerRemoved // Event containing the contract specifics and raw log

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
func (it *RiverConfigV1ConfigurationManagerRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverConfigV1ConfigurationManagerRemoved)
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
		it.Event = new(RiverConfigV1ConfigurationManagerRemoved)
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
func (it *RiverConfigV1ConfigurationManagerRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverConfigV1ConfigurationManagerRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverConfigV1ConfigurationManagerRemoved represents a ConfigurationManagerRemoved event raised by the RiverConfigV1 contract.
type RiverConfigV1ConfigurationManagerRemoved struct {
	Manager common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterConfigurationManagerRemoved is a free log retrieval operation binding the contract event 0xf9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5.
//
// Solidity: event ConfigurationManagerRemoved(address indexed manager)
func (_RiverConfigV1 *RiverConfigV1Filterer) FilterConfigurationManagerRemoved(opts *bind.FilterOpts, manager []common.Address) (*RiverConfigV1ConfigurationManagerRemovedIterator, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _RiverConfigV1.contract.FilterLogs(opts, "ConfigurationManagerRemoved", managerRule)
	if err != nil {
		return nil, err
	}
	return &RiverConfigV1ConfigurationManagerRemovedIterator{contract: _RiverConfigV1.contract, event: "ConfigurationManagerRemoved", logs: logs, sub: sub}, nil
}

// WatchConfigurationManagerRemoved is a free log subscription operation binding the contract event 0xf9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5.
//
// Solidity: event ConfigurationManagerRemoved(address indexed manager)
func (_RiverConfigV1 *RiverConfigV1Filterer) WatchConfigurationManagerRemoved(opts *bind.WatchOpts, sink chan<- *RiverConfigV1ConfigurationManagerRemoved, manager []common.Address) (event.Subscription, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _RiverConfigV1.contract.WatchLogs(opts, "ConfigurationManagerRemoved", managerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverConfigV1ConfigurationManagerRemoved)
				if err := _RiverConfigV1.contract.UnpackLog(event, "ConfigurationManagerRemoved", log); err != nil {
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

// ParseConfigurationManagerRemoved is a log parse operation binding the contract event 0xf9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5.
//
// Solidity: event ConfigurationManagerRemoved(address indexed manager)
func (_RiverConfigV1 *RiverConfigV1Filterer) ParseConfigurationManagerRemoved(log types.Log) (*RiverConfigV1ConfigurationManagerRemoved, error) {
	event := new(RiverConfigV1ConfigurationManagerRemoved)
	if err := _RiverConfigV1.contract.UnpackLog(event, "ConfigurationManagerRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
