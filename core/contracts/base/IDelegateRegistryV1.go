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

// IDelegateRegistryV1DelegationInfo is an auto generated low-level Go binding around an user-defined struct.
type IDelegateRegistryV1DelegationInfo struct {
	Type     uint8
	Vault    common.Address
	Delegate common.Address
	Contract common.Address
	TokenId  *big.Int
}

// IDelegateRegistryV1MetaData contains all meta data concerning the IDelegateRegistryV1 contract.
var IDelegateRegistryV1MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"getDelegationsByDelegate\",\"inputs\":[{\"name\":\"delegate\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIDelegateRegistryV1.DelegationInfo[]\",\"components\":[{\"name\":\"type_\",\"type\":\"uint8\",\"internalType\":\"enumIDelegateRegistryV1.DelegationType\"},{\"name\":\"vault\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"delegate\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"contract_\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}],\"stateMutability\":\"view\"}]",
}

// IDelegateRegistryV1ABI is the input ABI used to generate the binding from.
// Deprecated: Use IDelegateRegistryV1MetaData.ABI instead.
var IDelegateRegistryV1ABI = IDelegateRegistryV1MetaData.ABI

// IDelegateRegistryV1 is an auto generated Go binding around an Ethereum contract.
type IDelegateRegistryV1 struct {
	IDelegateRegistryV1Caller     // Read-only binding to the contract
	IDelegateRegistryV1Transactor // Write-only binding to the contract
	IDelegateRegistryV1Filterer   // Log filterer for contract events
}

// IDelegateRegistryV1Caller is an auto generated read-only Go binding around an Ethereum contract.
type IDelegateRegistryV1Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IDelegateRegistryV1Transactor is an auto generated write-only Go binding around an Ethereum contract.
type IDelegateRegistryV1Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IDelegateRegistryV1Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type IDelegateRegistryV1Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IDelegateRegistryV1Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type IDelegateRegistryV1Session struct {
	Contract     *IDelegateRegistryV1 // Generic contract binding to set the session for
	CallOpts     bind.CallOpts        // Call options to use throughout this session
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// IDelegateRegistryV1CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type IDelegateRegistryV1CallerSession struct {
	Contract *IDelegateRegistryV1Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts              // Call options to use throughout this session
}

// IDelegateRegistryV1TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type IDelegateRegistryV1TransactorSession struct {
	Contract     *IDelegateRegistryV1Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// IDelegateRegistryV1Raw is an auto generated low-level Go binding around an Ethereum contract.
type IDelegateRegistryV1Raw struct {
	Contract *IDelegateRegistryV1 // Generic contract binding to access the raw methods on
}

// IDelegateRegistryV1CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type IDelegateRegistryV1CallerRaw struct {
	Contract *IDelegateRegistryV1Caller // Generic read-only contract binding to access the raw methods on
}

// IDelegateRegistryV1TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type IDelegateRegistryV1TransactorRaw struct {
	Contract *IDelegateRegistryV1Transactor // Generic write-only contract binding to access the raw methods on
}

// NewIDelegateRegistryV1 creates a new instance of IDelegateRegistryV1, bound to a specific deployed contract.
func NewIDelegateRegistryV1(address common.Address, backend bind.ContractBackend) (*IDelegateRegistryV1, error) {
	contract, err := bindIDelegateRegistryV1(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &IDelegateRegistryV1{IDelegateRegistryV1Caller: IDelegateRegistryV1Caller{contract: contract}, IDelegateRegistryV1Transactor: IDelegateRegistryV1Transactor{contract: contract}, IDelegateRegistryV1Filterer: IDelegateRegistryV1Filterer{contract: contract}}, nil
}

// NewIDelegateRegistryV1Caller creates a new read-only instance of IDelegateRegistryV1, bound to a specific deployed contract.
func NewIDelegateRegistryV1Caller(address common.Address, caller bind.ContractCaller) (*IDelegateRegistryV1Caller, error) {
	contract, err := bindIDelegateRegistryV1(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &IDelegateRegistryV1Caller{contract: contract}, nil
}

// NewIDelegateRegistryV1Transactor creates a new write-only instance of IDelegateRegistryV1, bound to a specific deployed contract.
func NewIDelegateRegistryV1Transactor(address common.Address, transactor bind.ContractTransactor) (*IDelegateRegistryV1Transactor, error) {
	contract, err := bindIDelegateRegistryV1(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &IDelegateRegistryV1Transactor{contract: contract}, nil
}

// NewIDelegateRegistryV1Filterer creates a new log filterer instance of IDelegateRegistryV1, bound to a specific deployed contract.
func NewIDelegateRegistryV1Filterer(address common.Address, filterer bind.ContractFilterer) (*IDelegateRegistryV1Filterer, error) {
	contract, err := bindIDelegateRegistryV1(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &IDelegateRegistryV1Filterer{contract: contract}, nil
}

// bindIDelegateRegistryV1 binds a generic wrapper to an already deployed contract.
func bindIDelegateRegistryV1(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := IDelegateRegistryV1MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IDelegateRegistryV1 *IDelegateRegistryV1Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IDelegateRegistryV1.Contract.IDelegateRegistryV1Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IDelegateRegistryV1 *IDelegateRegistryV1Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IDelegateRegistryV1.Contract.IDelegateRegistryV1Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IDelegateRegistryV1 *IDelegateRegistryV1Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IDelegateRegistryV1.Contract.IDelegateRegistryV1Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IDelegateRegistryV1 *IDelegateRegistryV1CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IDelegateRegistryV1.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IDelegateRegistryV1 *IDelegateRegistryV1TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IDelegateRegistryV1.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IDelegateRegistryV1 *IDelegateRegistryV1TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IDelegateRegistryV1.Contract.contract.Transact(opts, method, params...)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((uint8,address,address,address,uint256)[])
func (_IDelegateRegistryV1 *IDelegateRegistryV1Caller) GetDelegationsByDelegate(opts *bind.CallOpts, delegate common.Address) ([]IDelegateRegistryV1DelegationInfo, error) {
	var out []interface{}
	err := _IDelegateRegistryV1.contract.Call(opts, &out, "getDelegationsByDelegate", delegate)

	if err != nil {
		return *new([]IDelegateRegistryV1DelegationInfo), err
	}

	out0 := *abi.ConvertType(out[0], new([]IDelegateRegistryV1DelegationInfo)).(*[]IDelegateRegistryV1DelegationInfo)

	return out0, err

}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((uint8,address,address,address,uint256)[])
func (_IDelegateRegistryV1 *IDelegateRegistryV1Session) GetDelegationsByDelegate(delegate common.Address) ([]IDelegateRegistryV1DelegationInfo, error) {
	return _IDelegateRegistryV1.Contract.GetDelegationsByDelegate(&_IDelegateRegistryV1.CallOpts, delegate)
}

// GetDelegationsByDelegate is a free data retrieval call binding the contract method 0x4fc69282.
//
// Solidity: function getDelegationsByDelegate(address delegate) view returns((uint8,address,address,address,uint256)[])
func (_IDelegateRegistryV1 *IDelegateRegistryV1CallerSession) GetDelegationsByDelegate(delegate common.Address) ([]IDelegateRegistryV1DelegationInfo, error) {
	return _IDelegateRegistryV1.Contract.GetDelegationsByDelegate(&_IDelegateRegistryV1.CallOpts, delegate)
}
