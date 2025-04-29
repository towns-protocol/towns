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
	_	= errors.New
	_	= big.NewInt
	_	= strings.NewReader
	_	= ethereum.NotFound
	_	= bind.Bind
	_	= common.Big1
	_	= types.BloomLookup
	_	= event.NewSubscription
	_	= abi.ConvertType
)

// ArchitectMetaData contains all meta data concerning the Architect contract.
var ArchitectMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"getProxyInitializer\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractISpaceProxyInitializer\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getSpaceArchitectImplementations\",\"inputs\":[],\"outputs\":[{\"name\":\"ownerTokenImplementation\",\"type\":\"address\",\"internalType\":\"contractISpaceOwner\"},{\"name\":\"userEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIUserEntitlement\"},{\"name\":\"ruleEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIRuleEntitlementV2\"},{\"name\":\"legacyRuleEntitlement\",\"type\":\"address\",\"internalType\":\"contractIRuleEntitlement\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getSpaceByTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getTokenIdBySpace\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setProxyInitializer\",\"inputs\":[{\"name\":\"proxyInitializer\",\"type\":\"address\",\"internalType\":\"contractISpaceProxyInitializer\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setSpaceArchitectImplementations\",\"inputs\":[{\"name\":\"ownerTokenImplementation\",\"type\":\"address\",\"internalType\":\"contractISpaceOwner\"},{\"name\":\"userEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIUserEntitlement\"},{\"name\":\"ruleEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIRuleEntitlementV2\"},{\"name\":\"legacyRuleEntitlement\",\"type\":\"address\",\"internalType\":\"contractIRuleEntitlement\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Architect__ProxyInitializerSet\",\"inputs\":[{\"name\":\"proxyInitializer\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SpaceCreated\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"space\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Architect__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__InvalidNetworkId\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__InvalidPricingModule\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__InvalidStringLength\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__NotContract\",\"inputs\":[]}]",
}

// ArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use ArchitectMetaData.ABI instead.
var ArchitectABI = ArchitectMetaData.ABI

// Architect is an auto generated Go binding around an Ethereum contract.
type Architect struct {
	ArchitectCaller		// Read-only binding to the contract
	ArchitectTransactor	// Write-only binding to the contract
	ArchitectFilterer	// Log filterer for contract events
}

// ArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type ArchitectCaller struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// ArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ArchitectTransactor struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// ArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ArchitectFilterer struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// ArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type ArchitectSession struct {
	Contract	*Architect		// Generic contract binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// ArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type ArchitectCallerSession struct {
	Contract	*ArchitectCaller	// Generic contract caller binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
}

// ArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type ArchitectTransactorSession struct {
	Contract	*ArchitectTransactor	// Generic contract transactor binding to set the session for
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// ArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type ArchitectRaw struct {
	Contract *Architect	// Generic contract binding to access the raw methods on
}

// ArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type ArchitectCallerRaw struct {
	Contract *ArchitectCaller	// Generic read-only contract binding to access the raw methods on
}

// ArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type ArchitectTransactorRaw struct {
	Contract *ArchitectTransactor	// Generic write-only contract binding to access the raw methods on
}

// NewArchitect creates a new instance of Architect, bound to a specific deployed contract.
func NewArchitect(address common.Address, backend bind.ContractBackend) (*Architect, error) {
	contract, err := bindArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Architect{ArchitectCaller: ArchitectCaller{contract: contract}, ArchitectTransactor: ArchitectTransactor{contract: contract}, ArchitectFilterer: ArchitectFilterer{contract: contract}}, nil
}

// NewArchitectCaller creates a new read-only instance of Architect, bound to a specific deployed contract.
func NewArchitectCaller(address common.Address, caller bind.ContractCaller) (*ArchitectCaller, error) {
	contract, err := bindArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ArchitectCaller{contract: contract}, nil
}

// NewArchitectTransactor creates a new write-only instance of Architect, bound to a specific deployed contract.
func NewArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*ArchitectTransactor, error) {
	contract, err := bindArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ArchitectTransactor{contract: contract}, nil
}

// NewArchitectFilterer creates a new log filterer instance of Architect, bound to a specific deployed contract.
func NewArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*ArchitectFilterer, error) {
	contract, err := bindArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ArchitectFilterer{contract: contract}, nil
}

// bindArchitect binds a generic wrapper to an already deployed contract.
func bindArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := ArchitectMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Architect *ArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Architect.Contract.ArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Architect *ArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Architect.Contract.ArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Architect *ArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Architect.Contract.ArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Architect *ArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Architect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Architect *ArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Architect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Architect *ArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Architect.Contract.contract.Transact(opts, method, params...)
}

// GetProxyInitializer is a free data retrieval call binding the contract method 0x6bd837f4.
//
// Solidity: function getProxyInitializer() view returns(address)
func (_Architect *ArchitectCaller) GetProxyInitializer(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Architect.contract.Call(opts, &out, "getProxyInitializer")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetProxyInitializer is a free data retrieval call binding the contract method 0x6bd837f4.
//
// Solidity: function getProxyInitializer() view returns(address)
func (_Architect *ArchitectSession) GetProxyInitializer() (common.Address, error) {
	return _Architect.Contract.GetProxyInitializer(&_Architect.CallOpts)
}

// GetProxyInitializer is a free data retrieval call binding the contract method 0x6bd837f4.
//
// Solidity: function getProxyInitializer() view returns(address)
func (_Architect *ArchitectCallerSession) GetProxyInitializer() (common.Address, error) {
	return _Architect.Contract.GetProxyInitializer(&_Architect.CallOpts)
}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation, address legacyRuleEntitlement)
func (_Architect *ArchitectCaller) GetSpaceArchitectImplementations(opts *bind.CallOpts) (struct {
	OwnerTokenImplementation	common.Address
	UserEntitlementImplementation	common.Address
	RuleEntitlementImplementation	common.Address
	LegacyRuleEntitlement		common.Address
}, error) {
	var out []interface{}
	err := _Architect.contract.Call(opts, &out, "getSpaceArchitectImplementations")

	outstruct := new(struct {
		OwnerTokenImplementation	common.Address
		UserEntitlementImplementation	common.Address
		RuleEntitlementImplementation	common.Address
		LegacyRuleEntitlement		common.Address
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.OwnerTokenImplementation = *abi.ConvertType(out[0], new(common.Address)).(*common.Address)
	outstruct.UserEntitlementImplementation = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.RuleEntitlementImplementation = *abi.ConvertType(out[2], new(common.Address)).(*common.Address)
	outstruct.LegacyRuleEntitlement = *abi.ConvertType(out[3], new(common.Address)).(*common.Address)

	return *outstruct, err

}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation, address legacyRuleEntitlement)
func (_Architect *ArchitectSession) GetSpaceArchitectImplementations() (struct {
	OwnerTokenImplementation	common.Address
	UserEntitlementImplementation	common.Address
	RuleEntitlementImplementation	common.Address
	LegacyRuleEntitlement		common.Address
}, error) {
	return _Architect.Contract.GetSpaceArchitectImplementations(&_Architect.CallOpts)
}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation, address legacyRuleEntitlement)
func (_Architect *ArchitectCallerSession) GetSpaceArchitectImplementations() (struct {
	OwnerTokenImplementation	common.Address
	UserEntitlementImplementation	common.Address
	RuleEntitlementImplementation	common.Address
	LegacyRuleEntitlement		common.Address
}, error) {
	return _Architect.Contract.GetSpaceArchitectImplementations(&_Architect.CallOpts)
}

// GetSpaceByTokenId is a free data retrieval call binding the contract method 0x673f0dd5.
//
// Solidity: function getSpaceByTokenId(uint256 tokenId) view returns(address space)
func (_Architect *ArchitectCaller) GetSpaceByTokenId(opts *bind.CallOpts, tokenId *big.Int) (common.Address, error) {
	var out []interface{}
	err := _Architect.contract.Call(opts, &out, "getSpaceByTokenId", tokenId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetSpaceByTokenId is a free data retrieval call binding the contract method 0x673f0dd5.
//
// Solidity: function getSpaceByTokenId(uint256 tokenId) view returns(address space)
func (_Architect *ArchitectSession) GetSpaceByTokenId(tokenId *big.Int) (common.Address, error) {
	return _Architect.Contract.GetSpaceByTokenId(&_Architect.CallOpts, tokenId)
}

// GetSpaceByTokenId is a free data retrieval call binding the contract method 0x673f0dd5.
//
// Solidity: function getSpaceByTokenId(uint256 tokenId) view returns(address space)
func (_Architect *ArchitectCallerSession) GetSpaceByTokenId(tokenId *big.Int) (common.Address, error) {
	return _Architect.Contract.GetSpaceByTokenId(&_Architect.CallOpts, tokenId)
}

// GetTokenIdBySpace is a free data retrieval call binding the contract method 0xc0bc6796.
//
// Solidity: function getTokenIdBySpace(address space) view returns(uint256)
func (_Architect *ArchitectCaller) GetTokenIdBySpace(opts *bind.CallOpts, space common.Address) (*big.Int, error) {
	var out []interface{}
	err := _Architect.contract.Call(opts, &out, "getTokenIdBySpace", space)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdBySpace is a free data retrieval call binding the contract method 0xc0bc6796.
//
// Solidity: function getTokenIdBySpace(address space) view returns(uint256)
func (_Architect *ArchitectSession) GetTokenIdBySpace(space common.Address) (*big.Int, error) {
	return _Architect.Contract.GetTokenIdBySpace(&_Architect.CallOpts, space)
}

// GetTokenIdBySpace is a free data retrieval call binding the contract method 0xc0bc6796.
//
// Solidity: function getTokenIdBySpace(address space) view returns(uint256)
func (_Architect *ArchitectCallerSession) GetTokenIdBySpace(space common.Address) (*big.Int, error) {
	return _Architect.Contract.GetTokenIdBySpace(&_Architect.CallOpts, space)
}

// SetProxyInitializer is a paid mutator transaction binding the contract method 0xe6907c9d.
//
// Solidity: function setProxyInitializer(address proxyInitializer) returns()
func (_Architect *ArchitectTransactor) SetProxyInitializer(opts *bind.TransactOpts, proxyInitializer common.Address) (*types.Transaction, error) {
	return _Architect.contract.Transact(opts, "setProxyInitializer", proxyInitializer)
}

// SetProxyInitializer is a paid mutator transaction binding the contract method 0xe6907c9d.
//
// Solidity: function setProxyInitializer(address proxyInitializer) returns()
func (_Architect *ArchitectSession) SetProxyInitializer(proxyInitializer common.Address) (*types.Transaction, error) {
	return _Architect.Contract.SetProxyInitializer(&_Architect.TransactOpts, proxyInitializer)
}

// SetProxyInitializer is a paid mutator transaction binding the contract method 0xe6907c9d.
//
// Solidity: function setProxyInitializer(address proxyInitializer) returns()
func (_Architect *ArchitectTransactorSession) SetProxyInitializer(proxyInitializer common.Address) (*types.Transaction, error) {
	return _Architect.Contract.SetProxyInitializer(&_Architect.TransactOpts, proxyInitializer)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0xcd7242b8.
//
// Solidity: function setSpaceArchitectImplementations(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation, address legacyRuleEntitlement) returns()
func (_Architect *ArchitectTransactor) SetSpaceArchitectImplementations(opts *bind.TransactOpts, ownerTokenImplementation common.Address, userEntitlementImplementation common.Address, ruleEntitlementImplementation common.Address, legacyRuleEntitlement common.Address) (*types.Transaction, error) {
	return _Architect.contract.Transact(opts, "setSpaceArchitectImplementations", ownerTokenImplementation, userEntitlementImplementation, ruleEntitlementImplementation, legacyRuleEntitlement)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0xcd7242b8.
//
// Solidity: function setSpaceArchitectImplementations(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation, address legacyRuleEntitlement) returns()
func (_Architect *ArchitectSession) SetSpaceArchitectImplementations(ownerTokenImplementation common.Address, userEntitlementImplementation common.Address, ruleEntitlementImplementation common.Address, legacyRuleEntitlement common.Address) (*types.Transaction, error) {
	return _Architect.Contract.SetSpaceArchitectImplementations(&_Architect.TransactOpts, ownerTokenImplementation, userEntitlementImplementation, ruleEntitlementImplementation, legacyRuleEntitlement)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0xcd7242b8.
//
// Solidity: function setSpaceArchitectImplementations(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation, address legacyRuleEntitlement) returns()
func (_Architect *ArchitectTransactorSession) SetSpaceArchitectImplementations(ownerTokenImplementation common.Address, userEntitlementImplementation common.Address, ruleEntitlementImplementation common.Address, legacyRuleEntitlement common.Address) (*types.Transaction, error) {
	return _Architect.Contract.SetSpaceArchitectImplementations(&_Architect.TransactOpts, ownerTokenImplementation, userEntitlementImplementation, ruleEntitlementImplementation, legacyRuleEntitlement)
}

// ArchitectArchitectProxyInitializerSetIterator is returned from FilterArchitectProxyInitializerSet and is used to iterate over the raw logs and unpacked data for ArchitectProxyInitializerSet events raised by the Architect contract.
type ArchitectArchitectProxyInitializerSetIterator struct {
	Event	*ArchitectArchitectProxyInitializerSet	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ArchitectArchitectProxyInitializerSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ArchitectArchitectProxyInitializerSet)
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
		it.Event = new(ArchitectArchitectProxyInitializerSet)
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
func (it *ArchitectArchitectProxyInitializerSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ArchitectArchitectProxyInitializerSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ArchitectArchitectProxyInitializerSet represents a ArchitectProxyInitializerSet event raised by the Architect contract.
type ArchitectArchitectProxyInitializerSet struct {
	ProxyInitializer	common.Address
	Raw			types.Log	// Blockchain specific contextual infos
}

// FilterArchitectProxyInitializerSet is a free log retrieval operation binding the contract event 0x50d234a64b07fd5931eedf717c2eca7f76ef13920a1330cc774176dbf9c66b3e.
//
// Solidity: event Architect__ProxyInitializerSet(address indexed proxyInitializer)
func (_Architect *ArchitectFilterer) FilterArchitectProxyInitializerSet(opts *bind.FilterOpts, proxyInitializer []common.Address) (*ArchitectArchitectProxyInitializerSetIterator, error) {

	var proxyInitializerRule []interface{}
	for _, proxyInitializerItem := range proxyInitializer {
		proxyInitializerRule = append(proxyInitializerRule, proxyInitializerItem)
	}

	logs, sub, err := _Architect.contract.FilterLogs(opts, "Architect__ProxyInitializerSet", proxyInitializerRule)
	if err != nil {
		return nil, err
	}
	return &ArchitectArchitectProxyInitializerSetIterator{contract: _Architect.contract, event: "Architect__ProxyInitializerSet", logs: logs, sub: sub}, nil
}

// WatchArchitectProxyInitializerSet is a free log subscription operation binding the contract event 0x50d234a64b07fd5931eedf717c2eca7f76ef13920a1330cc774176dbf9c66b3e.
//
// Solidity: event Architect__ProxyInitializerSet(address indexed proxyInitializer)
func (_Architect *ArchitectFilterer) WatchArchitectProxyInitializerSet(opts *bind.WatchOpts, sink chan<- *ArchitectArchitectProxyInitializerSet, proxyInitializer []common.Address) (event.Subscription, error) {

	var proxyInitializerRule []interface{}
	for _, proxyInitializerItem := range proxyInitializer {
		proxyInitializerRule = append(proxyInitializerRule, proxyInitializerItem)
	}

	logs, sub, err := _Architect.contract.WatchLogs(opts, "Architect__ProxyInitializerSet", proxyInitializerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ArchitectArchitectProxyInitializerSet)
				if err := _Architect.contract.UnpackLog(event, "Architect__ProxyInitializerSet", log); err != nil {
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

// ParseArchitectProxyInitializerSet is a log parse operation binding the contract event 0x50d234a64b07fd5931eedf717c2eca7f76ef13920a1330cc774176dbf9c66b3e.
//
// Solidity: event Architect__ProxyInitializerSet(address indexed proxyInitializer)
func (_Architect *ArchitectFilterer) ParseArchitectProxyInitializerSet(log types.Log) (*ArchitectArchitectProxyInitializerSet, error) {
	event := new(ArchitectArchitectProxyInitializerSet)
	if err := _Architect.contract.UnpackLog(event, "Architect__ProxyInitializerSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ArchitectSpaceCreatedIterator is returned from FilterSpaceCreated and is used to iterate over the raw logs and unpacked data for SpaceCreated events raised by the Architect contract.
type ArchitectSpaceCreatedIterator struct {
	Event	*ArchitectSpaceCreated	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ArchitectSpaceCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ArchitectSpaceCreated)
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
		it.Event = new(ArchitectSpaceCreated)
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
func (it *ArchitectSpaceCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ArchitectSpaceCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ArchitectSpaceCreated represents a SpaceCreated event raised by the Architect contract.
type ArchitectSpaceCreated struct {
	Owner	common.Address
	TokenId	*big.Int
	Space	common.Address
	Raw	types.Log	// Blockchain specific contextual infos
}

// FilterSpaceCreated is a free log retrieval operation binding the contract event 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b.
//
// Solidity: event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space)
func (_Architect *ArchitectFilterer) FilterSpaceCreated(opts *bind.FilterOpts, owner []common.Address, tokenId []*big.Int, space []common.Address) (*ArchitectSpaceCreatedIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}
	var spaceRule []interface{}
	for _, spaceItem := range space {
		spaceRule = append(spaceRule, spaceItem)
	}

	logs, sub, err := _Architect.contract.FilterLogs(opts, "SpaceCreated", ownerRule, tokenIdRule, spaceRule)
	if err != nil {
		return nil, err
	}
	return &ArchitectSpaceCreatedIterator{contract: _Architect.contract, event: "SpaceCreated", logs: logs, sub: sub}, nil
}

// WatchSpaceCreated is a free log subscription operation binding the contract event 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b.
//
// Solidity: event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space)
func (_Architect *ArchitectFilterer) WatchSpaceCreated(opts *bind.WatchOpts, sink chan<- *ArchitectSpaceCreated, owner []common.Address, tokenId []*big.Int, space []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}
	var spaceRule []interface{}
	for _, spaceItem := range space {
		spaceRule = append(spaceRule, spaceItem)
	}

	logs, sub, err := _Architect.contract.WatchLogs(opts, "SpaceCreated", ownerRule, tokenIdRule, spaceRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ArchitectSpaceCreated)
				if err := _Architect.contract.UnpackLog(event, "SpaceCreated", log); err != nil {
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

// ParseSpaceCreated is a log parse operation binding the contract event 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b.
//
// Solidity: event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space)
func (_Architect *ArchitectFilterer) ParseSpaceCreated(log types.Log) (*ArchitectSpaceCreated, error) {
	event := new(ArchitectSpaceCreated)
	if err := _Architect.contract.UnpackLog(event, "SpaceCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
