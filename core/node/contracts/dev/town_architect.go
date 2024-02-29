// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package dev

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

// IArchitectBaseChannelInfo is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseChannelInfo struct {
	Id		string
	Metadata	string
}

// IArchitectBaseMembership is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseMembership struct {
	Settings	IMembershipBaseMembership
	Requirements	IArchitectBaseMembershipRequirements
	Permissions	[]string
}

// IArchitectBaseMembershipRequirements is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseMembershipRequirements struct {
	Everyone	bool
	Users		[]common.Address
	RuleData	IRuleEntitlementRuleData
}

// IArchitectBaseSpaceInfo is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseSpaceInfo struct {
	Id		string
	Name		string
	Uri		string
	Membership	IArchitectBaseMembership
	Channel		IArchitectBaseChannelInfo
}

// IMembershipBaseMembership is an auto generated low-level Go binding around an user-defined struct.
type IMembershipBaseMembership struct {
	Name		string
	Symbol		string
	Price		*big.Int
	MaxSupply	*big.Int
	Duration	uint64
	Currency	common.Address
	FeeRecipient	common.Address
	FreeAllocation	*big.Int
	PricingModule	common.Address
}

// TownArchitectMetaData contains all meta data concerning the TownArchitect contract.
var TownArchitectMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"createSpace\",\"inputs\":[{\"name\":\"SpaceInfo\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.SpaceInfo\",\"components\":[{\"name\":\"id\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"uri\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"membership\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.Membership\",\"components\":[{\"name\":\"settings\",\"type\":\"tuple\",\"internalType\":\"structIMembershipBase.Membership\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"price\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"maxSupply\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"duration\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"currency\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"feeRecipient\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"freeAllocation\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"pricingModule\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"name\":\"requirements\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.MembershipRequirements\",\"components\":[{\"name\":\"everyone\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}]},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}]},{\"name\":\"channel\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.ChannelInfo\",\"components\":[{\"name\":\"id\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getSpaceArchitectImplementations\",\"inputs\":[],\"outputs\":[{\"name\":\"ownerTokenImplementation\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"userEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIUserEntitlement\"},{\"name\":\"ruleEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIRuleEntitlement\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getSpaceById\",\"inputs\":[{\"name\":\"spaceId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getTokenIdBySpace\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getTokenIdBySpaceId\",\"inputs\":[{\"name\":\"spaceId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isSpace\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setSpaceArchitectImplementations\",\"inputs\":[{\"name\":\"ownerTokenImplementation\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"userEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIUserEntitlement\"},{\"name\":\"ruleEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"contractIRuleEntitlement\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"SpaceCreated\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"spaceId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"space\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Architect__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__InvalidNetworkId\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__InvalidStringLength\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__NotContract\",\"inputs\":[]}]",
}

// TownArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use TownArchitectMetaData.ABI instead.
var TownArchitectABI = TownArchitectMetaData.ABI

// TownArchitect is an auto generated Go binding around an Ethereum contract.
type TownArchitect struct {
	TownArchitectCaller	// Read-only binding to the contract
	TownArchitectTransactor	// Write-only binding to the contract
	TownArchitectFilterer	// Log filterer for contract events
}

// TownArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type TownArchitectCaller struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// TownArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type TownArchitectTransactor struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// TownArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type TownArchitectFilterer struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// TownArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type TownArchitectSession struct {
	Contract	*TownArchitect		// Generic contract binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// TownArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type TownArchitectCallerSession struct {
	Contract	*TownArchitectCaller	// Generic contract caller binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
}

// TownArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type TownArchitectTransactorSession struct {
	Contract	*TownArchitectTransactor	// Generic contract transactor binding to set the session for
	TransactOpts	bind.TransactOpts		// Transaction auth options to use throughout this session
}

// TownArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type TownArchitectRaw struct {
	Contract *TownArchitect	// Generic contract binding to access the raw methods on
}

// TownArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type TownArchitectCallerRaw struct {
	Contract *TownArchitectCaller	// Generic read-only contract binding to access the raw methods on
}

// TownArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type TownArchitectTransactorRaw struct {
	Contract *TownArchitectTransactor	// Generic write-only contract binding to access the raw methods on
}

// NewTownArchitect creates a new instance of TownArchitect, bound to a specific deployed contract.
func NewTownArchitect(address common.Address, backend bind.ContractBackend) (*TownArchitect, error) {
	contract, err := bindTownArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &TownArchitect{TownArchitectCaller: TownArchitectCaller{contract: contract}, TownArchitectTransactor: TownArchitectTransactor{contract: contract}, TownArchitectFilterer: TownArchitectFilterer{contract: contract}}, nil
}

// NewTownArchitectCaller creates a new read-only instance of TownArchitect, bound to a specific deployed contract.
func NewTownArchitectCaller(address common.Address, caller bind.ContractCaller) (*TownArchitectCaller, error) {
	contract, err := bindTownArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &TownArchitectCaller{contract: contract}, nil
}

// NewTownArchitectTransactor creates a new write-only instance of TownArchitect, bound to a specific deployed contract.
func NewTownArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*TownArchitectTransactor, error) {
	contract, err := bindTownArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &TownArchitectTransactor{contract: contract}, nil
}

// NewTownArchitectFilterer creates a new log filterer instance of TownArchitect, bound to a specific deployed contract.
func NewTownArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*TownArchitectFilterer, error) {
	contract, err := bindTownArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &TownArchitectFilterer{contract: contract}, nil
}

// bindTownArchitect binds a generic wrapper to an already deployed contract.
func bindTownArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := TownArchitectMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TownArchitect *TownArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TownArchitect.Contract.TownArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TownArchitect *TownArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TownArchitect.Contract.TownArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TownArchitect *TownArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TownArchitect.Contract.TownArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TownArchitect *TownArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TownArchitect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TownArchitect *TownArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TownArchitect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TownArchitect *TownArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TownArchitect.Contract.contract.Transact(opts, method, params...)
}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation)
func (_TownArchitect *TownArchitectCaller) GetSpaceArchitectImplementations(opts *bind.CallOpts) (struct {
	OwnerTokenImplementation	common.Address
	UserEntitlementImplementation	common.Address
	RuleEntitlementImplementation	common.Address
}, error) {
	var out []interface{}
	err := _TownArchitect.contract.Call(opts, &out, "getSpaceArchitectImplementations")

	outstruct := new(struct {
		OwnerTokenImplementation	common.Address
		UserEntitlementImplementation	common.Address
		RuleEntitlementImplementation	common.Address
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.OwnerTokenImplementation = *abi.ConvertType(out[0], new(common.Address)).(*common.Address)
	outstruct.UserEntitlementImplementation = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.RuleEntitlementImplementation = *abi.ConvertType(out[2], new(common.Address)).(*common.Address)

	return *outstruct, err

}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation)
func (_TownArchitect *TownArchitectSession) GetSpaceArchitectImplementations() (struct {
	OwnerTokenImplementation	common.Address
	UserEntitlementImplementation	common.Address
	RuleEntitlementImplementation	common.Address
}, error) {
	return _TownArchitect.Contract.GetSpaceArchitectImplementations(&_TownArchitect.CallOpts)
}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation)
func (_TownArchitect *TownArchitectCallerSession) GetSpaceArchitectImplementations() (struct {
	OwnerTokenImplementation	common.Address
	UserEntitlementImplementation	common.Address
	RuleEntitlementImplementation	common.Address
}, error) {
	return _TownArchitect.Contract.GetSpaceArchitectImplementations(&_TownArchitect.CallOpts)
}

// GetSpaceById is a free data retrieval call binding the contract method 0xf181942a.
//
// Solidity: function getSpaceById(string spaceId) view returns(address)
func (_TownArchitect *TownArchitectCaller) GetSpaceById(opts *bind.CallOpts, spaceId string) (common.Address, error) {
	var out []interface{}
	err := _TownArchitect.contract.Call(opts, &out, "getSpaceById", spaceId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetSpaceById is a free data retrieval call binding the contract method 0xf181942a.
//
// Solidity: function getSpaceById(string spaceId) view returns(address)
func (_TownArchitect *TownArchitectSession) GetSpaceById(spaceId string) (common.Address, error) {
	return _TownArchitect.Contract.GetSpaceById(&_TownArchitect.CallOpts, spaceId)
}

// GetSpaceById is a free data retrieval call binding the contract method 0xf181942a.
//
// Solidity: function getSpaceById(string spaceId) view returns(address)
func (_TownArchitect *TownArchitectCallerSession) GetSpaceById(spaceId string) (common.Address, error) {
	return _TownArchitect.Contract.GetSpaceById(&_TownArchitect.CallOpts, spaceId)
}

// GetTokenIdBySpace is a free data retrieval call binding the contract method 0xc0bc6796.
//
// Solidity: function getTokenIdBySpace(address space) view returns(uint256)
func (_TownArchitect *TownArchitectCaller) GetTokenIdBySpace(opts *bind.CallOpts, space common.Address) (*big.Int, error) {
	var out []interface{}
	err := _TownArchitect.contract.Call(opts, &out, "getTokenIdBySpace", space)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdBySpace is a free data retrieval call binding the contract method 0xc0bc6796.
//
// Solidity: function getTokenIdBySpace(address space) view returns(uint256)
func (_TownArchitect *TownArchitectSession) GetTokenIdBySpace(space common.Address) (*big.Int, error) {
	return _TownArchitect.Contract.GetTokenIdBySpace(&_TownArchitect.CallOpts, space)
}

// GetTokenIdBySpace is a free data retrieval call binding the contract method 0xc0bc6796.
//
// Solidity: function getTokenIdBySpace(address space) view returns(uint256)
func (_TownArchitect *TownArchitectCallerSession) GetTokenIdBySpace(space common.Address) (*big.Int, error) {
	return _TownArchitect.Contract.GetTokenIdBySpace(&_TownArchitect.CallOpts, space)
}

// GetTokenIdBySpaceId is a free data retrieval call binding the contract method 0xbed8f27c.
//
// Solidity: function getTokenIdBySpaceId(string spaceId) view returns(uint256)
func (_TownArchitect *TownArchitectCaller) GetTokenIdBySpaceId(opts *bind.CallOpts, spaceId string) (*big.Int, error) {
	var out []interface{}
	err := _TownArchitect.contract.Call(opts, &out, "getTokenIdBySpaceId", spaceId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdBySpaceId is a free data retrieval call binding the contract method 0xbed8f27c.
//
// Solidity: function getTokenIdBySpaceId(string spaceId) view returns(uint256)
func (_TownArchitect *TownArchitectSession) GetTokenIdBySpaceId(spaceId string) (*big.Int, error) {
	return _TownArchitect.Contract.GetTokenIdBySpaceId(&_TownArchitect.CallOpts, spaceId)
}

// GetTokenIdBySpaceId is a free data retrieval call binding the contract method 0xbed8f27c.
//
// Solidity: function getTokenIdBySpaceId(string spaceId) view returns(uint256)
func (_TownArchitect *TownArchitectCallerSession) GetTokenIdBySpaceId(spaceId string) (*big.Int, error) {
	return _TownArchitect.Contract.GetTokenIdBySpaceId(&_TownArchitect.CallOpts, spaceId)
}

// IsSpace is a free data retrieval call binding the contract method 0x33518c80.
//
// Solidity: function isSpace(address space) view returns(bool)
func (_TownArchitect *TownArchitectCaller) IsSpace(opts *bind.CallOpts, space common.Address) (bool, error) {
	var out []interface{}
	err := _TownArchitect.contract.Call(opts, &out, "isSpace", space)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsSpace is a free data retrieval call binding the contract method 0x33518c80.
//
// Solidity: function isSpace(address space) view returns(bool)
func (_TownArchitect *TownArchitectSession) IsSpace(space common.Address) (bool, error) {
	return _TownArchitect.Contract.IsSpace(&_TownArchitect.CallOpts, space)
}

// IsSpace is a free data retrieval call binding the contract method 0x33518c80.
//
// Solidity: function isSpace(address space) view returns(bool)
func (_TownArchitect *TownArchitectCallerSession) IsSpace(space common.Address) (bool, error) {
	return _TownArchitect.Contract.IsSpace(&_TownArchitect.CallOpts, space)
}

// CreateSpace is a paid mutator transaction binding the contract method 0xe530ee5c.
//
// Solidity: function createSpace((string,string,string,((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[])),string[]),(string,string)) SpaceInfo) returns(address)
func (_TownArchitect *TownArchitectTransactor) CreateSpace(opts *bind.TransactOpts, SpaceInfo IArchitectBaseSpaceInfo) (*types.Transaction, error) {
	return _TownArchitect.contract.Transact(opts, "createSpace", SpaceInfo)
}

// CreateSpace is a paid mutator transaction binding the contract method 0xe530ee5c.
//
// Solidity: function createSpace((string,string,string,((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[])),string[]),(string,string)) SpaceInfo) returns(address)
func (_TownArchitect *TownArchitectSession) CreateSpace(SpaceInfo IArchitectBaseSpaceInfo) (*types.Transaction, error) {
	return _TownArchitect.Contract.CreateSpace(&_TownArchitect.TransactOpts, SpaceInfo)
}

// CreateSpace is a paid mutator transaction binding the contract method 0xe530ee5c.
//
// Solidity: function createSpace((string,string,string,((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[])),string[]),(string,string)) SpaceInfo) returns(address)
func (_TownArchitect *TownArchitectTransactorSession) CreateSpace(SpaceInfo IArchitectBaseSpaceInfo) (*types.Transaction, error) {
	return _TownArchitect.Contract.CreateSpace(&_TownArchitect.TransactOpts, SpaceInfo)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0x8bfc94b9.
//
// Solidity: function setSpaceArchitectImplementations(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectTransactor) SetSpaceArchitectImplementations(opts *bind.TransactOpts, ownerTokenImplementation common.Address, userEntitlementImplementation common.Address, ruleEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.contract.Transact(opts, "setSpaceArchitectImplementations", ownerTokenImplementation, userEntitlementImplementation, ruleEntitlementImplementation)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0x8bfc94b9.
//
// Solidity: function setSpaceArchitectImplementations(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectSession) SetSpaceArchitectImplementations(ownerTokenImplementation common.Address, userEntitlementImplementation common.Address, ruleEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.Contract.SetSpaceArchitectImplementations(&_TownArchitect.TransactOpts, ownerTokenImplementation, userEntitlementImplementation, ruleEntitlementImplementation)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0x8bfc94b9.
//
// Solidity: function setSpaceArchitectImplementations(address ownerTokenImplementation, address userEntitlementImplementation, address ruleEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectTransactorSession) SetSpaceArchitectImplementations(ownerTokenImplementation common.Address, userEntitlementImplementation common.Address, ruleEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.Contract.SetSpaceArchitectImplementations(&_TownArchitect.TransactOpts, ownerTokenImplementation, userEntitlementImplementation, ruleEntitlementImplementation)
}

// TownArchitectSpaceCreatedIterator is returned from FilterSpaceCreated and is used to iterate over the raw logs and unpacked data for SpaceCreated events raised by the TownArchitect contract.
type TownArchitectSpaceCreatedIterator struct {
	Event	*TownArchitectSpaceCreated	// Event containing the contract specifics and raw log

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
func (it *TownArchitectSpaceCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownArchitectSpaceCreated)
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
		it.Event = new(TownArchitectSpaceCreated)
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
func (it *TownArchitectSpaceCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownArchitectSpaceCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownArchitectSpaceCreated represents a SpaceCreated event raised by the TownArchitect contract.
type TownArchitectSpaceCreated struct {
	Owner	common.Address
	SpaceId	*big.Int
	Space	common.Address
	Raw	types.Log	// Blockchain specific contextual infos
}

// FilterSpaceCreated is a free log retrieval operation binding the contract event 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b.
//
// Solidity: event SpaceCreated(address indexed owner, uint256 indexed spaceId, address space)
func (_TownArchitect *TownArchitectFilterer) FilterSpaceCreated(opts *bind.FilterOpts, owner []common.Address, spaceId []*big.Int) (*TownArchitectSpaceCreatedIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spaceIdRule []interface{}
	for _, spaceIdItem := range spaceId {
		spaceIdRule = append(spaceIdRule, spaceIdItem)
	}

	logs, sub, err := _TownArchitect.contract.FilterLogs(opts, "SpaceCreated", ownerRule, spaceIdRule)
	if err != nil {
		return nil, err
	}
	return &TownArchitectSpaceCreatedIterator{contract: _TownArchitect.contract, event: "SpaceCreated", logs: logs, sub: sub}, nil
}

// WatchSpaceCreated is a free log subscription operation binding the contract event 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b.
//
// Solidity: event SpaceCreated(address indexed owner, uint256 indexed spaceId, address space)
func (_TownArchitect *TownArchitectFilterer) WatchSpaceCreated(opts *bind.WatchOpts, sink chan<- *TownArchitectSpaceCreated, owner []common.Address, spaceId []*big.Int) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spaceIdRule []interface{}
	for _, spaceIdItem := range spaceId {
		spaceIdRule = append(spaceIdRule, spaceIdItem)
	}

	logs, sub, err := _TownArchitect.contract.WatchLogs(opts, "SpaceCreated", ownerRule, spaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownArchitectSpaceCreated)
				if err := _TownArchitect.contract.UnpackLog(event, "SpaceCreated", log); err != nil {
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
// Solidity: event SpaceCreated(address indexed owner, uint256 indexed spaceId, address space)
func (_TownArchitect *TownArchitectFilterer) ParseSpaceCreated(log types.Log) (*TownArchitectSpaceCreated, error) {
	event := new(TownArchitectSpaceCreated)
	if err := _TownArchitect.contract.UnpackLog(event, "SpaceCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
