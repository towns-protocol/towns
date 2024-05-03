// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package ierc5313

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

// Ierc5313MetaData contains all meta data concerning the Ierc5313 contract.
var Ierc5313MetaData = &bind.MetaData{
	ABI: "[{\"constant\":true,\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// Ierc5313ABI is the input ABI used to generate the binding from.
// Deprecated: Use Ierc5313MetaData.ABI instead.
var Ierc5313ABI = Ierc5313MetaData.ABI

// Ierc5313 is an auto generated Go binding around an Ethereum contract.
type Ierc5313 struct {
	Ierc5313Caller     // Read-only binding to the contract
	Ierc5313Transactor // Write-only binding to the contract
	Ierc5313Filterer   // Log filterer for contract events
}

// Ierc5313Caller is an auto generated read-only Go binding around an Ethereum contract.
type Ierc5313Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// Ierc5313Transactor is an auto generated write-only Go binding around an Ethereum contract.
type Ierc5313Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// Ierc5313Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type Ierc5313Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// Ierc5313Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type Ierc5313Session struct {
	Contract     *Ierc5313         // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// Ierc5313CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type Ierc5313CallerSession struct {
	Contract *Ierc5313Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts   // Call options to use throughout this session
}

// Ierc5313TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type Ierc5313TransactorSession struct {
	Contract     *Ierc5313Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// Ierc5313Raw is an auto generated low-level Go binding around an Ethereum contract.
type Ierc5313Raw struct {
	Contract *Ierc5313 // Generic contract binding to access the raw methods on
}

// Ierc5313CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type Ierc5313CallerRaw struct {
	Contract *Ierc5313Caller // Generic read-only contract binding to access the raw methods on
}

// Ierc5313TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type Ierc5313TransactorRaw struct {
	Contract *Ierc5313Transactor // Generic write-only contract binding to access the raw methods on
}

// NewIerc5313 creates a new instance of Ierc5313, bound to a specific deployed contract.
func NewIerc5313(address common.Address, backend bind.ContractBackend) (*Ierc5313, error) {
	contract, err := bindIerc5313(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Ierc5313{Ierc5313Caller: Ierc5313Caller{contract: contract}, Ierc5313Transactor: Ierc5313Transactor{contract: contract}, Ierc5313Filterer: Ierc5313Filterer{contract: contract}}, nil
}

// NewIerc5313Caller creates a new read-only instance of Ierc5313, bound to a specific deployed contract.
func NewIerc5313Caller(address common.Address, caller bind.ContractCaller) (*Ierc5313Caller, error) {
	contract, err := bindIerc5313(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &Ierc5313Caller{contract: contract}, nil
}

// NewIerc5313Transactor creates a new write-only instance of Ierc5313, bound to a specific deployed contract.
func NewIerc5313Transactor(address common.Address, transactor bind.ContractTransactor) (*Ierc5313Transactor, error) {
	contract, err := bindIerc5313(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &Ierc5313Transactor{contract: contract}, nil
}

// NewIerc5313Filterer creates a new log filterer instance of Ierc5313, bound to a specific deployed contract.
func NewIerc5313Filterer(address common.Address, filterer bind.ContractFilterer) (*Ierc5313Filterer, error) {
	contract, err := bindIerc5313(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &Ierc5313Filterer{contract: contract}, nil
}

// bindIerc5313 binds a generic wrapper to an already deployed contract.
func bindIerc5313(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := Ierc5313MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Ierc5313 *Ierc5313Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Ierc5313.Contract.Ierc5313Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Ierc5313 *Ierc5313Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Ierc5313.Contract.Ierc5313Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Ierc5313 *Ierc5313Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Ierc5313.Contract.Ierc5313Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Ierc5313 *Ierc5313CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Ierc5313.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Ierc5313 *Ierc5313TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Ierc5313.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Ierc5313 *Ierc5313TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Ierc5313.Contract.contract.Transact(opts, method, params...)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Ierc5313 *Ierc5313Caller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Ierc5313.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Ierc5313 *Ierc5313Session) Owner() (common.Address, error) {
	return _Ierc5313.Contract.Owner(&_Ierc5313.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Ierc5313 *Ierc5313CallerSession) Owner() (common.Address, error) {
	return _Ierc5313.Contract.Owner(&_Ierc5313.CallOpts)
}
