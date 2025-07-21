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

// IMembershipBaseReferralTypes is an auto generated low-level Go binding around an user-defined struct.
type IMembershipBaseReferralTypes struct {
	Partner      common.Address
	UserReferral common.Address
	ReferralCode string
}

// MembershipMetaData contains all meta data concerning the Membership contract.
var MembershipMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"expiresAt\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipCurrency\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipDuration\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipFreeAllocation\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipImage\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipLimit\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipPrice\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipPricingModule\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getMembershipRenewalPrice\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getProtocolFee\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getSpaceFactory\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"joinSpace\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"joinSpaceWithReferral\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"referral\",\"type\":\"tuple\",\"internalType\":\"structIMembershipBase.ReferralTypes\",\"components\":[{\"name\":\"partner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"userReferral\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"referralCode\",\"type\":\"string\",\"internalType\":\"string\"}]}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"renewMembership\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"revenue\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setMembershipDuration\",\"inputs\":[{\"name\":\"duration\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setMembershipFreeAllocation\",\"inputs\":[{\"name\":\"newAllocation\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setMembershipImage\",\"inputs\":[{\"name\":\"image\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setMembershipLimit\",\"inputs\":[{\"name\":\"newLimit\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setMembershipPrice\",\"inputs\":[{\"name\":\"newPrice\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setMembershipPricingModule\",\"inputs\":[{\"name\":\"pricingModule\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"MembershipCurrencyUpdated\",\"inputs\":[{\"name\":\"currency\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"MembershipFeeRecipientUpdated\",\"inputs\":[{\"name\":\"recipient\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"MembershipFreeAllocationUpdated\",\"inputs\":[{\"name\":\"allocation\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"MembershipLimitUpdated\",\"inputs\":[{\"name\":\"limit\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"MembershipPriceUpdated\",\"inputs\":[{\"name\":\"price\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"MembershipTokenIssued\",\"inputs\":[{\"name\":\"recipient\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"MembershipTokenRejected\",\"inputs\":[{\"name\":\"recipient\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"MembershipWithdrawal\",\"inputs\":[{\"name\":\"recipient\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Membership__AlreadyMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__Banned\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InsufficientAllowance\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InsufficientPayment\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidCurrency\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidDuration\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidFeeRecipient\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidFreeAllocation\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidLimit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidMaxSupply\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidPayment\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidPrice\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidPricingModule\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidTokenId\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__InvalidTransactionType\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__MaxSupplyReached\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__NotExpired\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Membership__PriceTooLow\",\"inputs\":[]}]",
}

// MembershipABI is the input ABI used to generate the binding from.
// Deprecated: Use MembershipMetaData.ABI instead.
var MembershipABI = MembershipMetaData.ABI

// Membership is an auto generated Go binding around an Ethereum contract.
type Membership struct {
	MembershipCaller     // Read-only binding to the contract
	MembershipTransactor // Write-only binding to the contract
	MembershipFilterer   // Log filterer for contract events
}

// MembershipCaller is an auto generated read-only Go binding around an Ethereum contract.
type MembershipCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MembershipTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MembershipTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MembershipFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MembershipFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MembershipSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MembershipSession struct {
	Contract     *Membership       // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// MembershipCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MembershipCallerSession struct {
	Contract *MembershipCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts     // Call options to use throughout this session
}

// MembershipTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MembershipTransactorSession struct {
	Contract     *MembershipTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// MembershipRaw is an auto generated low-level Go binding around an Ethereum contract.
type MembershipRaw struct {
	Contract *Membership // Generic contract binding to access the raw methods on
}

// MembershipCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MembershipCallerRaw struct {
	Contract *MembershipCaller // Generic read-only contract binding to access the raw methods on
}

// MembershipTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MembershipTransactorRaw struct {
	Contract *MembershipTransactor // Generic write-only contract binding to access the raw methods on
}

// NewMembership creates a new instance of Membership, bound to a specific deployed contract.
func NewMembership(address common.Address, backend bind.ContractBackend) (*Membership, error) {
	contract, err := bindMembership(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Membership{MembershipCaller: MembershipCaller{contract: contract}, MembershipTransactor: MembershipTransactor{contract: contract}, MembershipFilterer: MembershipFilterer{contract: contract}}, nil
}

// NewMembershipCaller creates a new read-only instance of Membership, bound to a specific deployed contract.
func NewMembershipCaller(address common.Address, caller bind.ContractCaller) (*MembershipCaller, error) {
	contract, err := bindMembership(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MembershipCaller{contract: contract}, nil
}

// NewMembershipTransactor creates a new write-only instance of Membership, bound to a specific deployed contract.
func NewMembershipTransactor(address common.Address, transactor bind.ContractTransactor) (*MembershipTransactor, error) {
	contract, err := bindMembership(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MembershipTransactor{contract: contract}, nil
}

// NewMembershipFilterer creates a new log filterer instance of Membership, bound to a specific deployed contract.
func NewMembershipFilterer(address common.Address, filterer bind.ContractFilterer) (*MembershipFilterer, error) {
	contract, err := bindMembership(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MembershipFilterer{contract: contract}, nil
}

// bindMembership binds a generic wrapper to an already deployed contract.
func bindMembership(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MembershipMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Membership *MembershipRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Membership.Contract.MembershipCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Membership *MembershipRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Membership.Contract.MembershipTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Membership *MembershipRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Membership.Contract.MembershipTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Membership *MembershipCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Membership.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Membership *MembershipTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Membership.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Membership *MembershipTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Membership.Contract.contract.Transact(opts, method, params...)
}

// ExpiresAt is a free data retrieval call binding the contract method 0x17c95709.
//
// Solidity: function expiresAt(uint256 tokenId) view returns(uint256)
func (_Membership *MembershipCaller) ExpiresAt(opts *bind.CallOpts, tokenId *big.Int) (*big.Int, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "expiresAt", tokenId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// ExpiresAt is a free data retrieval call binding the contract method 0x17c95709.
//
// Solidity: function expiresAt(uint256 tokenId) view returns(uint256)
func (_Membership *MembershipSession) ExpiresAt(tokenId *big.Int) (*big.Int, error) {
	return _Membership.Contract.ExpiresAt(&_Membership.CallOpts, tokenId)
}

// ExpiresAt is a free data retrieval call binding the contract method 0x17c95709.
//
// Solidity: function expiresAt(uint256 tokenId) view returns(uint256)
func (_Membership *MembershipCallerSession) ExpiresAt(tokenId *big.Int) (*big.Int, error) {
	return _Membership.Contract.ExpiresAt(&_Membership.CallOpts, tokenId)
}

// GetMembershipCurrency is a free data retrieval call binding the contract method 0x657e45e8.
//
// Solidity: function getMembershipCurrency() view returns(address)
func (_Membership *MembershipCaller) GetMembershipCurrency(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipCurrency")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetMembershipCurrency is a free data retrieval call binding the contract method 0x657e45e8.
//
// Solidity: function getMembershipCurrency() view returns(address)
func (_Membership *MembershipSession) GetMembershipCurrency() (common.Address, error) {
	return _Membership.Contract.GetMembershipCurrency(&_Membership.CallOpts)
}

// GetMembershipCurrency is a free data retrieval call binding the contract method 0x657e45e8.
//
// Solidity: function getMembershipCurrency() view returns(address)
func (_Membership *MembershipCallerSession) GetMembershipCurrency() (common.Address, error) {
	return _Membership.Contract.GetMembershipCurrency(&_Membership.CallOpts)
}

// GetMembershipDuration is a free data retrieval call binding the contract method 0x8120f0ba.
//
// Solidity: function getMembershipDuration() view returns(uint64)
func (_Membership *MembershipCaller) GetMembershipDuration(opts *bind.CallOpts) (uint64, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipDuration")

	if err != nil {
		return *new(uint64), err
	}

	out0 := *abi.ConvertType(out[0], new(uint64)).(*uint64)

	return out0, err

}

// GetMembershipDuration is a free data retrieval call binding the contract method 0x8120f0ba.
//
// Solidity: function getMembershipDuration() view returns(uint64)
func (_Membership *MembershipSession) GetMembershipDuration() (uint64, error) {
	return _Membership.Contract.GetMembershipDuration(&_Membership.CallOpts)
}

// GetMembershipDuration is a free data retrieval call binding the contract method 0x8120f0ba.
//
// Solidity: function getMembershipDuration() view returns(uint64)
func (_Membership *MembershipCallerSession) GetMembershipDuration() (uint64, error) {
	return _Membership.Contract.GetMembershipDuration(&_Membership.CallOpts)
}

// GetMembershipFreeAllocation is a free data retrieval call binding the contract method 0x706b8e09.
//
// Solidity: function getMembershipFreeAllocation() view returns(uint256)
func (_Membership *MembershipCaller) GetMembershipFreeAllocation(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipFreeAllocation")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetMembershipFreeAllocation is a free data retrieval call binding the contract method 0x706b8e09.
//
// Solidity: function getMembershipFreeAllocation() view returns(uint256)
func (_Membership *MembershipSession) GetMembershipFreeAllocation() (*big.Int, error) {
	return _Membership.Contract.GetMembershipFreeAllocation(&_Membership.CallOpts)
}

// GetMembershipFreeAllocation is a free data retrieval call binding the contract method 0x706b8e09.
//
// Solidity: function getMembershipFreeAllocation() view returns(uint256)
func (_Membership *MembershipCallerSession) GetMembershipFreeAllocation() (*big.Int, error) {
	return _Membership.Contract.GetMembershipFreeAllocation(&_Membership.CallOpts)
}

// GetMembershipImage is a free data retrieval call binding the contract method 0x93b13cb7.
//
// Solidity: function getMembershipImage() view returns(string)
func (_Membership *MembershipCaller) GetMembershipImage(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipImage")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// GetMembershipImage is a free data retrieval call binding the contract method 0x93b13cb7.
//
// Solidity: function getMembershipImage() view returns(string)
func (_Membership *MembershipSession) GetMembershipImage() (string, error) {
	return _Membership.Contract.GetMembershipImage(&_Membership.CallOpts)
}

// GetMembershipImage is a free data retrieval call binding the contract method 0x93b13cb7.
//
// Solidity: function getMembershipImage() view returns(string)
func (_Membership *MembershipCallerSession) GetMembershipImage() (string, error) {
	return _Membership.Contract.GetMembershipImage(&_Membership.CallOpts)
}

// GetMembershipLimit is a free data retrieval call binding the contract method 0x95d600c8.
//
// Solidity: function getMembershipLimit() view returns(uint256)
func (_Membership *MembershipCaller) GetMembershipLimit(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipLimit")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetMembershipLimit is a free data retrieval call binding the contract method 0x95d600c8.
//
// Solidity: function getMembershipLimit() view returns(uint256)
func (_Membership *MembershipSession) GetMembershipLimit() (*big.Int, error) {
	return _Membership.Contract.GetMembershipLimit(&_Membership.CallOpts)
}

// GetMembershipLimit is a free data retrieval call binding the contract method 0x95d600c8.
//
// Solidity: function getMembershipLimit() view returns(uint256)
func (_Membership *MembershipCallerSession) GetMembershipLimit() (*big.Int, error) {
	return _Membership.Contract.GetMembershipLimit(&_Membership.CallOpts)
}

// GetMembershipPrice is a free data retrieval call binding the contract method 0x1278076a.
//
// Solidity: function getMembershipPrice() view returns(uint256)
func (_Membership *MembershipCaller) GetMembershipPrice(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipPrice")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetMembershipPrice is a free data retrieval call binding the contract method 0x1278076a.
//
// Solidity: function getMembershipPrice() view returns(uint256)
func (_Membership *MembershipSession) GetMembershipPrice() (*big.Int, error) {
	return _Membership.Contract.GetMembershipPrice(&_Membership.CallOpts)
}

// GetMembershipPrice is a free data retrieval call binding the contract method 0x1278076a.
//
// Solidity: function getMembershipPrice() view returns(uint256)
func (_Membership *MembershipCallerSession) GetMembershipPrice() (*big.Int, error) {
	return _Membership.Contract.GetMembershipPrice(&_Membership.CallOpts)
}

// GetMembershipPricingModule is a free data retrieval call binding the contract method 0xe847abdd.
//
// Solidity: function getMembershipPricingModule() view returns(address)
func (_Membership *MembershipCaller) GetMembershipPricingModule(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipPricingModule")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetMembershipPricingModule is a free data retrieval call binding the contract method 0xe847abdd.
//
// Solidity: function getMembershipPricingModule() view returns(address)
func (_Membership *MembershipSession) GetMembershipPricingModule() (common.Address, error) {
	return _Membership.Contract.GetMembershipPricingModule(&_Membership.CallOpts)
}

// GetMembershipPricingModule is a free data retrieval call binding the contract method 0xe847abdd.
//
// Solidity: function getMembershipPricingModule() view returns(address)
func (_Membership *MembershipCallerSession) GetMembershipPricingModule() (common.Address, error) {
	return _Membership.Contract.GetMembershipPricingModule(&_Membership.CallOpts)
}

// GetMembershipRenewalPrice is a free data retrieval call binding the contract method 0x5803909f.
//
// Solidity: function getMembershipRenewalPrice(uint256 tokenId) view returns(uint256)
func (_Membership *MembershipCaller) GetMembershipRenewalPrice(opts *bind.CallOpts, tokenId *big.Int) (*big.Int, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getMembershipRenewalPrice", tokenId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetMembershipRenewalPrice is a free data retrieval call binding the contract method 0x5803909f.
//
// Solidity: function getMembershipRenewalPrice(uint256 tokenId) view returns(uint256)
func (_Membership *MembershipSession) GetMembershipRenewalPrice(tokenId *big.Int) (*big.Int, error) {
	return _Membership.Contract.GetMembershipRenewalPrice(&_Membership.CallOpts, tokenId)
}

// GetMembershipRenewalPrice is a free data retrieval call binding the contract method 0x5803909f.
//
// Solidity: function getMembershipRenewalPrice(uint256 tokenId) view returns(uint256)
func (_Membership *MembershipCallerSession) GetMembershipRenewalPrice(tokenId *big.Int) (*big.Int, error) {
	return _Membership.Contract.GetMembershipRenewalPrice(&_Membership.CallOpts, tokenId)
}

// GetProtocolFee is a free data retrieval call binding the contract method 0xa5a41031.
//
// Solidity: function getProtocolFee() view returns(uint256)
func (_Membership *MembershipCaller) GetProtocolFee(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getProtocolFee")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetProtocolFee is a free data retrieval call binding the contract method 0xa5a41031.
//
// Solidity: function getProtocolFee() view returns(uint256)
func (_Membership *MembershipSession) GetProtocolFee() (*big.Int, error) {
	return _Membership.Contract.GetProtocolFee(&_Membership.CallOpts)
}

// GetProtocolFee is a free data retrieval call binding the contract method 0xa5a41031.
//
// Solidity: function getProtocolFee() view returns(uint256)
func (_Membership *MembershipCallerSession) GetProtocolFee() (*big.Int, error) {
	return _Membership.Contract.GetProtocolFee(&_Membership.CallOpts)
}

// GetSpaceFactory is a free data retrieval call binding the contract method 0x79dda585.
//
// Solidity: function getSpaceFactory() view returns(address)
func (_Membership *MembershipCaller) GetSpaceFactory(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "getSpaceFactory")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetSpaceFactory is a free data retrieval call binding the contract method 0x79dda585.
//
// Solidity: function getSpaceFactory() view returns(address)
func (_Membership *MembershipSession) GetSpaceFactory() (common.Address, error) {
	return _Membership.Contract.GetSpaceFactory(&_Membership.CallOpts)
}

// GetSpaceFactory is a free data retrieval call binding the contract method 0x79dda585.
//
// Solidity: function getSpaceFactory() view returns(address)
func (_Membership *MembershipCallerSession) GetSpaceFactory() (common.Address, error) {
	return _Membership.Contract.GetSpaceFactory(&_Membership.CallOpts)
}

// Revenue is a free data retrieval call binding the contract method 0x3e9491a2.
//
// Solidity: function revenue() view returns(uint256)
func (_Membership *MembershipCaller) Revenue(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Membership.contract.Call(opts, &out, "revenue")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Revenue is a free data retrieval call binding the contract method 0x3e9491a2.
//
// Solidity: function revenue() view returns(uint256)
func (_Membership *MembershipSession) Revenue() (*big.Int, error) {
	return _Membership.Contract.Revenue(&_Membership.CallOpts)
}

// Revenue is a free data retrieval call binding the contract method 0x3e9491a2.
//
// Solidity: function revenue() view returns(uint256)
func (_Membership *MembershipCallerSession) Revenue() (*big.Int, error) {
	return _Membership.Contract.Revenue(&_Membership.CallOpts)
}

// JoinSpace is a paid mutator transaction binding the contract method 0x8c625b06.
//
// Solidity: function joinSpace(address receiver) payable returns()
func (_Membership *MembershipTransactor) JoinSpace(opts *bind.TransactOpts, receiver common.Address) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "joinSpace", receiver)
}

// JoinSpace is a paid mutator transaction binding the contract method 0x8c625b06.
//
// Solidity: function joinSpace(address receiver) payable returns()
func (_Membership *MembershipSession) JoinSpace(receiver common.Address) (*types.Transaction, error) {
	return _Membership.Contract.JoinSpace(&_Membership.TransactOpts, receiver)
}

// JoinSpace is a paid mutator transaction binding the contract method 0x8c625b06.
//
// Solidity: function joinSpace(address receiver) payable returns()
func (_Membership *MembershipTransactorSession) JoinSpace(receiver common.Address) (*types.Transaction, error) {
	return _Membership.Contract.JoinSpace(&_Membership.TransactOpts, receiver)
}

// JoinSpaceWithReferral is a paid mutator transaction binding the contract method 0x686f7684.
//
// Solidity: function joinSpaceWithReferral(address receiver, (address,address,string) referral) payable returns()
func (_Membership *MembershipTransactor) JoinSpaceWithReferral(opts *bind.TransactOpts, receiver common.Address, referral IMembershipBaseReferralTypes) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "joinSpaceWithReferral", receiver, referral)
}

// JoinSpaceWithReferral is a paid mutator transaction binding the contract method 0x686f7684.
//
// Solidity: function joinSpaceWithReferral(address receiver, (address,address,string) referral) payable returns()
func (_Membership *MembershipSession) JoinSpaceWithReferral(receiver common.Address, referral IMembershipBaseReferralTypes) (*types.Transaction, error) {
	return _Membership.Contract.JoinSpaceWithReferral(&_Membership.TransactOpts, receiver, referral)
}

// JoinSpaceWithReferral is a paid mutator transaction binding the contract method 0x686f7684.
//
// Solidity: function joinSpaceWithReferral(address receiver, (address,address,string) referral) payable returns()
func (_Membership *MembershipTransactorSession) JoinSpaceWithReferral(receiver common.Address, referral IMembershipBaseReferralTypes) (*types.Transaction, error) {
	return _Membership.Contract.JoinSpaceWithReferral(&_Membership.TransactOpts, receiver, referral)
}

// RenewMembership is a paid mutator transaction binding the contract method 0x7c9669ac.
//
// Solidity: function renewMembership(uint256 tokenId) payable returns()
func (_Membership *MembershipTransactor) RenewMembership(opts *bind.TransactOpts, tokenId *big.Int) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "renewMembership", tokenId)
}

// RenewMembership is a paid mutator transaction binding the contract method 0x7c9669ac.
//
// Solidity: function renewMembership(uint256 tokenId) payable returns()
func (_Membership *MembershipSession) RenewMembership(tokenId *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.RenewMembership(&_Membership.TransactOpts, tokenId)
}

// RenewMembership is a paid mutator transaction binding the contract method 0x7c9669ac.
//
// Solidity: function renewMembership(uint256 tokenId) payable returns()
func (_Membership *MembershipTransactorSession) RenewMembership(tokenId *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.RenewMembership(&_Membership.TransactOpts, tokenId)
}

// SetMembershipDuration is a paid mutator transaction binding the contract method 0x83f3f0dc.
//
// Solidity: function setMembershipDuration(uint64 duration) returns()
func (_Membership *MembershipTransactor) SetMembershipDuration(opts *bind.TransactOpts, duration uint64) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "setMembershipDuration", duration)
}

// SetMembershipDuration is a paid mutator transaction binding the contract method 0x83f3f0dc.
//
// Solidity: function setMembershipDuration(uint64 duration) returns()
func (_Membership *MembershipSession) SetMembershipDuration(duration uint64) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipDuration(&_Membership.TransactOpts, duration)
}

// SetMembershipDuration is a paid mutator transaction binding the contract method 0x83f3f0dc.
//
// Solidity: function setMembershipDuration(uint64 duration) returns()
func (_Membership *MembershipTransactorSession) SetMembershipDuration(duration uint64) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipDuration(&_Membership.TransactOpts, duration)
}

// SetMembershipFreeAllocation is a paid mutator transaction binding the contract method 0x5becd24a.
//
// Solidity: function setMembershipFreeAllocation(uint256 newAllocation) returns()
func (_Membership *MembershipTransactor) SetMembershipFreeAllocation(opts *bind.TransactOpts, newAllocation *big.Int) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "setMembershipFreeAllocation", newAllocation)
}

// SetMembershipFreeAllocation is a paid mutator transaction binding the contract method 0x5becd24a.
//
// Solidity: function setMembershipFreeAllocation(uint256 newAllocation) returns()
func (_Membership *MembershipSession) SetMembershipFreeAllocation(newAllocation *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipFreeAllocation(&_Membership.TransactOpts, newAllocation)
}

// SetMembershipFreeAllocation is a paid mutator transaction binding the contract method 0x5becd24a.
//
// Solidity: function setMembershipFreeAllocation(uint256 newAllocation) returns()
func (_Membership *MembershipTransactorSession) SetMembershipFreeAllocation(newAllocation *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipFreeAllocation(&_Membership.TransactOpts, newAllocation)
}

// SetMembershipImage is a paid mutator transaction binding the contract method 0x0ef1be5f.
//
// Solidity: function setMembershipImage(string image) returns()
func (_Membership *MembershipTransactor) SetMembershipImage(opts *bind.TransactOpts, image string) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "setMembershipImage", image)
}

// SetMembershipImage is a paid mutator transaction binding the contract method 0x0ef1be5f.
//
// Solidity: function setMembershipImage(string image) returns()
func (_Membership *MembershipSession) SetMembershipImage(image string) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipImage(&_Membership.TransactOpts, image)
}

// SetMembershipImage is a paid mutator transaction binding the contract method 0x0ef1be5f.
//
// Solidity: function setMembershipImage(string image) returns()
func (_Membership *MembershipTransactorSession) SetMembershipImage(image string) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipImage(&_Membership.TransactOpts, image)
}

// SetMembershipLimit is a paid mutator transaction binding the contract method 0x97fb7c1e.
//
// Solidity: function setMembershipLimit(uint256 newLimit) returns()
func (_Membership *MembershipTransactor) SetMembershipLimit(opts *bind.TransactOpts, newLimit *big.Int) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "setMembershipLimit", newLimit)
}

// SetMembershipLimit is a paid mutator transaction binding the contract method 0x97fb7c1e.
//
// Solidity: function setMembershipLimit(uint256 newLimit) returns()
func (_Membership *MembershipSession) SetMembershipLimit(newLimit *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipLimit(&_Membership.TransactOpts, newLimit)
}

// SetMembershipLimit is a paid mutator transaction binding the contract method 0x97fb7c1e.
//
// Solidity: function setMembershipLimit(uint256 newLimit) returns()
func (_Membership *MembershipTransactorSession) SetMembershipLimit(newLimit *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipLimit(&_Membership.TransactOpts, newLimit)
}

// SetMembershipPrice is a paid mutator transaction binding the contract method 0x69d5f38a.
//
// Solidity: function setMembershipPrice(uint256 newPrice) returns()
func (_Membership *MembershipTransactor) SetMembershipPrice(opts *bind.TransactOpts, newPrice *big.Int) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "setMembershipPrice", newPrice)
}

// SetMembershipPrice is a paid mutator transaction binding the contract method 0x69d5f38a.
//
// Solidity: function setMembershipPrice(uint256 newPrice) returns()
func (_Membership *MembershipSession) SetMembershipPrice(newPrice *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipPrice(&_Membership.TransactOpts, newPrice)
}

// SetMembershipPrice is a paid mutator transaction binding the contract method 0x69d5f38a.
//
// Solidity: function setMembershipPrice(uint256 newPrice) returns()
func (_Membership *MembershipTransactorSession) SetMembershipPrice(newPrice *big.Int) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipPrice(&_Membership.TransactOpts, newPrice)
}

// SetMembershipPricingModule is a paid mutator transaction binding the contract method 0xdf9a9fe6.
//
// Solidity: function setMembershipPricingModule(address pricingModule) returns()
func (_Membership *MembershipTransactor) SetMembershipPricingModule(opts *bind.TransactOpts, pricingModule common.Address) (*types.Transaction, error) {
	return _Membership.contract.Transact(opts, "setMembershipPricingModule", pricingModule)
}

// SetMembershipPricingModule is a paid mutator transaction binding the contract method 0xdf9a9fe6.
//
// Solidity: function setMembershipPricingModule(address pricingModule) returns()
func (_Membership *MembershipSession) SetMembershipPricingModule(pricingModule common.Address) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipPricingModule(&_Membership.TransactOpts, pricingModule)
}

// SetMembershipPricingModule is a paid mutator transaction binding the contract method 0xdf9a9fe6.
//
// Solidity: function setMembershipPricingModule(address pricingModule) returns()
func (_Membership *MembershipTransactorSession) SetMembershipPricingModule(pricingModule common.Address) (*types.Transaction, error) {
	return _Membership.Contract.SetMembershipPricingModule(&_Membership.TransactOpts, pricingModule)
}

// MembershipMembershipCurrencyUpdatedIterator is returned from FilterMembershipCurrencyUpdated and is used to iterate over the raw logs and unpacked data for MembershipCurrencyUpdated events raised by the Membership contract.
type MembershipMembershipCurrencyUpdatedIterator struct {
	Event *MembershipMembershipCurrencyUpdated // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipCurrencyUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipCurrencyUpdated)
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
		it.Event = new(MembershipMembershipCurrencyUpdated)
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
func (it *MembershipMembershipCurrencyUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipCurrencyUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipCurrencyUpdated represents a MembershipCurrencyUpdated event raised by the Membership contract.
type MembershipMembershipCurrencyUpdated struct {
	Currency common.Address
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterMembershipCurrencyUpdated is a free log retrieval operation binding the contract event 0x14b7cb0621729ad169b573c8b04f2ba383bf36b3724f2e2809df566f45df16ec.
//
// Solidity: event MembershipCurrencyUpdated(address indexed currency)
func (_Membership *MembershipFilterer) FilterMembershipCurrencyUpdated(opts *bind.FilterOpts, currency []common.Address) (*MembershipMembershipCurrencyUpdatedIterator, error) {

	var currencyRule []interface{}
	for _, currencyItem := range currency {
		currencyRule = append(currencyRule, currencyItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipCurrencyUpdated", currencyRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipCurrencyUpdatedIterator{contract: _Membership.contract, event: "MembershipCurrencyUpdated", logs: logs, sub: sub}, nil
}

// WatchMembershipCurrencyUpdated is a free log subscription operation binding the contract event 0x14b7cb0621729ad169b573c8b04f2ba383bf36b3724f2e2809df566f45df16ec.
//
// Solidity: event MembershipCurrencyUpdated(address indexed currency)
func (_Membership *MembershipFilterer) WatchMembershipCurrencyUpdated(opts *bind.WatchOpts, sink chan<- *MembershipMembershipCurrencyUpdated, currency []common.Address) (event.Subscription, error) {

	var currencyRule []interface{}
	for _, currencyItem := range currency {
		currencyRule = append(currencyRule, currencyItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipCurrencyUpdated", currencyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipCurrencyUpdated)
				if err := _Membership.contract.UnpackLog(event, "MembershipCurrencyUpdated", log); err != nil {
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

// ParseMembershipCurrencyUpdated is a log parse operation binding the contract event 0x14b7cb0621729ad169b573c8b04f2ba383bf36b3724f2e2809df566f45df16ec.
//
// Solidity: event MembershipCurrencyUpdated(address indexed currency)
func (_Membership *MembershipFilterer) ParseMembershipCurrencyUpdated(log types.Log) (*MembershipMembershipCurrencyUpdated, error) {
	event := new(MembershipMembershipCurrencyUpdated)
	if err := _Membership.contract.UnpackLog(event, "MembershipCurrencyUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MembershipMembershipFeeRecipientUpdatedIterator is returned from FilterMembershipFeeRecipientUpdated and is used to iterate over the raw logs and unpacked data for MembershipFeeRecipientUpdated events raised by the Membership contract.
type MembershipMembershipFeeRecipientUpdatedIterator struct {
	Event *MembershipMembershipFeeRecipientUpdated // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipFeeRecipientUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipFeeRecipientUpdated)
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
		it.Event = new(MembershipMembershipFeeRecipientUpdated)
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
func (it *MembershipMembershipFeeRecipientUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipFeeRecipientUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipFeeRecipientUpdated represents a MembershipFeeRecipientUpdated event raised by the Membership contract.
type MembershipMembershipFeeRecipientUpdated struct {
	Recipient common.Address
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterMembershipFeeRecipientUpdated is a free log retrieval operation binding the contract event 0x38f508804eec828bf38bd955cb759fee5612470bd612855dcc11e2c91d7f3380.
//
// Solidity: event MembershipFeeRecipientUpdated(address indexed recipient)
func (_Membership *MembershipFilterer) FilterMembershipFeeRecipientUpdated(opts *bind.FilterOpts, recipient []common.Address) (*MembershipMembershipFeeRecipientUpdatedIterator, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipFeeRecipientUpdated", recipientRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipFeeRecipientUpdatedIterator{contract: _Membership.contract, event: "MembershipFeeRecipientUpdated", logs: logs, sub: sub}, nil
}

// WatchMembershipFeeRecipientUpdated is a free log subscription operation binding the contract event 0x38f508804eec828bf38bd955cb759fee5612470bd612855dcc11e2c91d7f3380.
//
// Solidity: event MembershipFeeRecipientUpdated(address indexed recipient)
func (_Membership *MembershipFilterer) WatchMembershipFeeRecipientUpdated(opts *bind.WatchOpts, sink chan<- *MembershipMembershipFeeRecipientUpdated, recipient []common.Address) (event.Subscription, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipFeeRecipientUpdated", recipientRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipFeeRecipientUpdated)
				if err := _Membership.contract.UnpackLog(event, "MembershipFeeRecipientUpdated", log); err != nil {
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

// ParseMembershipFeeRecipientUpdated is a log parse operation binding the contract event 0x38f508804eec828bf38bd955cb759fee5612470bd612855dcc11e2c91d7f3380.
//
// Solidity: event MembershipFeeRecipientUpdated(address indexed recipient)
func (_Membership *MembershipFilterer) ParseMembershipFeeRecipientUpdated(log types.Log) (*MembershipMembershipFeeRecipientUpdated, error) {
	event := new(MembershipMembershipFeeRecipientUpdated)
	if err := _Membership.contract.UnpackLog(event, "MembershipFeeRecipientUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MembershipMembershipFreeAllocationUpdatedIterator is returned from FilterMembershipFreeAllocationUpdated and is used to iterate over the raw logs and unpacked data for MembershipFreeAllocationUpdated events raised by the Membership contract.
type MembershipMembershipFreeAllocationUpdatedIterator struct {
	Event *MembershipMembershipFreeAllocationUpdated // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipFreeAllocationUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipFreeAllocationUpdated)
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
		it.Event = new(MembershipMembershipFreeAllocationUpdated)
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
func (it *MembershipMembershipFreeAllocationUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipFreeAllocationUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipFreeAllocationUpdated represents a MembershipFreeAllocationUpdated event raised by the Membership contract.
type MembershipMembershipFreeAllocationUpdated struct {
	Allocation *big.Int
	Raw        types.Log // Blockchain specific contextual infos
}

// FilterMembershipFreeAllocationUpdated is a free log retrieval operation binding the contract event 0xab14a23e88fb272313490d4f20d63098e64fd38304c0e07a377db98c2b39b92f.
//
// Solidity: event MembershipFreeAllocationUpdated(uint256 indexed allocation)
func (_Membership *MembershipFilterer) FilterMembershipFreeAllocationUpdated(opts *bind.FilterOpts, allocation []*big.Int) (*MembershipMembershipFreeAllocationUpdatedIterator, error) {

	var allocationRule []interface{}
	for _, allocationItem := range allocation {
		allocationRule = append(allocationRule, allocationItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipFreeAllocationUpdated", allocationRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipFreeAllocationUpdatedIterator{contract: _Membership.contract, event: "MembershipFreeAllocationUpdated", logs: logs, sub: sub}, nil
}

// WatchMembershipFreeAllocationUpdated is a free log subscription operation binding the contract event 0xab14a23e88fb272313490d4f20d63098e64fd38304c0e07a377db98c2b39b92f.
//
// Solidity: event MembershipFreeAllocationUpdated(uint256 indexed allocation)
func (_Membership *MembershipFilterer) WatchMembershipFreeAllocationUpdated(opts *bind.WatchOpts, sink chan<- *MembershipMembershipFreeAllocationUpdated, allocation []*big.Int) (event.Subscription, error) {

	var allocationRule []interface{}
	for _, allocationItem := range allocation {
		allocationRule = append(allocationRule, allocationItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipFreeAllocationUpdated", allocationRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipFreeAllocationUpdated)
				if err := _Membership.contract.UnpackLog(event, "MembershipFreeAllocationUpdated", log); err != nil {
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

// ParseMembershipFreeAllocationUpdated is a log parse operation binding the contract event 0xab14a23e88fb272313490d4f20d63098e64fd38304c0e07a377db98c2b39b92f.
//
// Solidity: event MembershipFreeAllocationUpdated(uint256 indexed allocation)
func (_Membership *MembershipFilterer) ParseMembershipFreeAllocationUpdated(log types.Log) (*MembershipMembershipFreeAllocationUpdated, error) {
	event := new(MembershipMembershipFreeAllocationUpdated)
	if err := _Membership.contract.UnpackLog(event, "MembershipFreeAllocationUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MembershipMembershipLimitUpdatedIterator is returned from FilterMembershipLimitUpdated and is used to iterate over the raw logs and unpacked data for MembershipLimitUpdated events raised by the Membership contract.
type MembershipMembershipLimitUpdatedIterator struct {
	Event *MembershipMembershipLimitUpdated // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipLimitUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipLimitUpdated)
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
		it.Event = new(MembershipMembershipLimitUpdated)
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
func (it *MembershipMembershipLimitUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipLimitUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipLimitUpdated represents a MembershipLimitUpdated event raised by the Membership contract.
type MembershipMembershipLimitUpdated struct {
	Limit *big.Int
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterMembershipLimitUpdated is a free log retrieval operation binding the contract event 0xa1e660a904fb2fb278a899c0aeac39941e5f2e5a5b44a5aaf1ce32b39777c8f4.
//
// Solidity: event MembershipLimitUpdated(uint256 indexed limit)
func (_Membership *MembershipFilterer) FilterMembershipLimitUpdated(opts *bind.FilterOpts, limit []*big.Int) (*MembershipMembershipLimitUpdatedIterator, error) {

	var limitRule []interface{}
	for _, limitItem := range limit {
		limitRule = append(limitRule, limitItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipLimitUpdated", limitRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipLimitUpdatedIterator{contract: _Membership.contract, event: "MembershipLimitUpdated", logs: logs, sub: sub}, nil
}

// WatchMembershipLimitUpdated is a free log subscription operation binding the contract event 0xa1e660a904fb2fb278a899c0aeac39941e5f2e5a5b44a5aaf1ce32b39777c8f4.
//
// Solidity: event MembershipLimitUpdated(uint256 indexed limit)
func (_Membership *MembershipFilterer) WatchMembershipLimitUpdated(opts *bind.WatchOpts, sink chan<- *MembershipMembershipLimitUpdated, limit []*big.Int) (event.Subscription, error) {

	var limitRule []interface{}
	for _, limitItem := range limit {
		limitRule = append(limitRule, limitItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipLimitUpdated", limitRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipLimitUpdated)
				if err := _Membership.contract.UnpackLog(event, "MembershipLimitUpdated", log); err != nil {
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

// ParseMembershipLimitUpdated is a log parse operation binding the contract event 0xa1e660a904fb2fb278a899c0aeac39941e5f2e5a5b44a5aaf1ce32b39777c8f4.
//
// Solidity: event MembershipLimitUpdated(uint256 indexed limit)
func (_Membership *MembershipFilterer) ParseMembershipLimitUpdated(log types.Log) (*MembershipMembershipLimitUpdated, error) {
	event := new(MembershipMembershipLimitUpdated)
	if err := _Membership.contract.UnpackLog(event, "MembershipLimitUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MembershipMembershipPriceUpdatedIterator is returned from FilterMembershipPriceUpdated and is used to iterate over the raw logs and unpacked data for MembershipPriceUpdated events raised by the Membership contract.
type MembershipMembershipPriceUpdatedIterator struct {
	Event *MembershipMembershipPriceUpdated // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipPriceUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipPriceUpdated)
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
		it.Event = new(MembershipMembershipPriceUpdated)
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
func (it *MembershipMembershipPriceUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipPriceUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipPriceUpdated represents a MembershipPriceUpdated event raised by the Membership contract.
type MembershipMembershipPriceUpdated struct {
	Price *big.Int
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterMembershipPriceUpdated is a free log retrieval operation binding the contract event 0xe3b51bfc59d6e44e4da024e028d277b0284e6695cce36d919aea83e2c7de2843.
//
// Solidity: event MembershipPriceUpdated(uint256 indexed price)
func (_Membership *MembershipFilterer) FilterMembershipPriceUpdated(opts *bind.FilterOpts, price []*big.Int) (*MembershipMembershipPriceUpdatedIterator, error) {

	var priceRule []interface{}
	for _, priceItem := range price {
		priceRule = append(priceRule, priceItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipPriceUpdated", priceRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipPriceUpdatedIterator{contract: _Membership.contract, event: "MembershipPriceUpdated", logs: logs, sub: sub}, nil
}

// WatchMembershipPriceUpdated is a free log subscription operation binding the contract event 0xe3b51bfc59d6e44e4da024e028d277b0284e6695cce36d919aea83e2c7de2843.
//
// Solidity: event MembershipPriceUpdated(uint256 indexed price)
func (_Membership *MembershipFilterer) WatchMembershipPriceUpdated(opts *bind.WatchOpts, sink chan<- *MembershipMembershipPriceUpdated, price []*big.Int) (event.Subscription, error) {

	var priceRule []interface{}
	for _, priceItem := range price {
		priceRule = append(priceRule, priceItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipPriceUpdated", priceRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipPriceUpdated)
				if err := _Membership.contract.UnpackLog(event, "MembershipPriceUpdated", log); err != nil {
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

// ParseMembershipPriceUpdated is a log parse operation binding the contract event 0xe3b51bfc59d6e44e4da024e028d277b0284e6695cce36d919aea83e2c7de2843.
//
// Solidity: event MembershipPriceUpdated(uint256 indexed price)
func (_Membership *MembershipFilterer) ParseMembershipPriceUpdated(log types.Log) (*MembershipMembershipPriceUpdated, error) {
	event := new(MembershipMembershipPriceUpdated)
	if err := _Membership.contract.UnpackLog(event, "MembershipPriceUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MembershipMembershipTokenIssuedIterator is returned from FilterMembershipTokenIssued and is used to iterate over the raw logs and unpacked data for MembershipTokenIssued events raised by the Membership contract.
type MembershipMembershipTokenIssuedIterator struct {
	Event *MembershipMembershipTokenIssued // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipTokenIssuedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipTokenIssued)
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
		it.Event = new(MembershipMembershipTokenIssued)
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
func (it *MembershipMembershipTokenIssuedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipTokenIssuedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipTokenIssued represents a MembershipTokenIssued event raised by the Membership contract.
type MembershipMembershipTokenIssued struct {
	Recipient common.Address
	TokenId   *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterMembershipTokenIssued is a free log retrieval operation binding the contract event 0x2f40b0474996b72a4251e00fb9170cdd960deea1dc749772cbbab61395b9b576.
//
// Solidity: event MembershipTokenIssued(address indexed recipient, uint256 indexed tokenId)
func (_Membership *MembershipFilterer) FilterMembershipTokenIssued(opts *bind.FilterOpts, recipient []common.Address, tokenId []*big.Int) (*MembershipMembershipTokenIssuedIterator, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipTokenIssued", recipientRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipTokenIssuedIterator{contract: _Membership.contract, event: "MembershipTokenIssued", logs: logs, sub: sub}, nil
}

// WatchMembershipTokenIssued is a free log subscription operation binding the contract event 0x2f40b0474996b72a4251e00fb9170cdd960deea1dc749772cbbab61395b9b576.
//
// Solidity: event MembershipTokenIssued(address indexed recipient, uint256 indexed tokenId)
func (_Membership *MembershipFilterer) WatchMembershipTokenIssued(opts *bind.WatchOpts, sink chan<- *MembershipMembershipTokenIssued, recipient []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipTokenIssued", recipientRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipTokenIssued)
				if err := _Membership.contract.UnpackLog(event, "MembershipTokenIssued", log); err != nil {
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

// ParseMembershipTokenIssued is a log parse operation binding the contract event 0x2f40b0474996b72a4251e00fb9170cdd960deea1dc749772cbbab61395b9b576.
//
// Solidity: event MembershipTokenIssued(address indexed recipient, uint256 indexed tokenId)
func (_Membership *MembershipFilterer) ParseMembershipTokenIssued(log types.Log) (*MembershipMembershipTokenIssued, error) {
	event := new(MembershipMembershipTokenIssued)
	if err := _Membership.contract.UnpackLog(event, "MembershipTokenIssued", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MembershipMembershipTokenRejectedIterator is returned from FilterMembershipTokenRejected and is used to iterate over the raw logs and unpacked data for MembershipTokenRejected events raised by the Membership contract.
type MembershipMembershipTokenRejectedIterator struct {
	Event *MembershipMembershipTokenRejected // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipTokenRejectedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipTokenRejected)
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
		it.Event = new(MembershipMembershipTokenRejected)
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
func (it *MembershipMembershipTokenRejectedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipTokenRejectedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipTokenRejected represents a MembershipTokenRejected event raised by the Membership contract.
type MembershipMembershipTokenRejected struct {
	Recipient common.Address
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterMembershipTokenRejected is a free log retrieval operation binding the contract event 0x86fd446d5c04e892d58b448a924dcd9c3ece3a5e0d2960b8c35cd475a5595a1f.
//
// Solidity: event MembershipTokenRejected(address indexed recipient)
func (_Membership *MembershipFilterer) FilterMembershipTokenRejected(opts *bind.FilterOpts, recipient []common.Address) (*MembershipMembershipTokenRejectedIterator, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipTokenRejected", recipientRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipTokenRejectedIterator{contract: _Membership.contract, event: "MembershipTokenRejected", logs: logs, sub: sub}, nil
}

// WatchMembershipTokenRejected is a free log subscription operation binding the contract event 0x86fd446d5c04e892d58b448a924dcd9c3ece3a5e0d2960b8c35cd475a5595a1f.
//
// Solidity: event MembershipTokenRejected(address indexed recipient)
func (_Membership *MembershipFilterer) WatchMembershipTokenRejected(opts *bind.WatchOpts, sink chan<- *MembershipMembershipTokenRejected, recipient []common.Address) (event.Subscription, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipTokenRejected", recipientRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipTokenRejected)
				if err := _Membership.contract.UnpackLog(event, "MembershipTokenRejected", log); err != nil {
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

// ParseMembershipTokenRejected is a log parse operation binding the contract event 0x86fd446d5c04e892d58b448a924dcd9c3ece3a5e0d2960b8c35cd475a5595a1f.
//
// Solidity: event MembershipTokenRejected(address indexed recipient)
func (_Membership *MembershipFilterer) ParseMembershipTokenRejected(log types.Log) (*MembershipMembershipTokenRejected, error) {
	event := new(MembershipMembershipTokenRejected)
	if err := _Membership.contract.UnpackLog(event, "MembershipTokenRejected", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MembershipMembershipWithdrawalIterator is returned from FilterMembershipWithdrawal and is used to iterate over the raw logs and unpacked data for MembershipWithdrawal events raised by the Membership contract.
type MembershipMembershipWithdrawalIterator struct {
	Event *MembershipMembershipWithdrawal // Event containing the contract specifics and raw log

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
func (it *MembershipMembershipWithdrawalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MembershipMembershipWithdrawal)
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
		it.Event = new(MembershipMembershipWithdrawal)
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
func (it *MembershipMembershipWithdrawalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MembershipMembershipWithdrawalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MembershipMembershipWithdrawal represents a MembershipWithdrawal event raised by the Membership contract.
type MembershipMembershipWithdrawal struct {
	Recipient common.Address
	Amount    *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterMembershipWithdrawal is a free log retrieval operation binding the contract event 0x6a88f9e03ef4a1786c4d5b1eb17d944dbdecbd661e86a6b18dfa7aaa28f172be.
//
// Solidity: event MembershipWithdrawal(address indexed recipient, uint256 amount)
func (_Membership *MembershipFilterer) FilterMembershipWithdrawal(opts *bind.FilterOpts, recipient []common.Address) (*MembershipMembershipWithdrawalIterator, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _Membership.contract.FilterLogs(opts, "MembershipWithdrawal", recipientRule)
	if err != nil {
		return nil, err
	}
	return &MembershipMembershipWithdrawalIterator{contract: _Membership.contract, event: "MembershipWithdrawal", logs: logs, sub: sub}, nil
}

// WatchMembershipWithdrawal is a free log subscription operation binding the contract event 0x6a88f9e03ef4a1786c4d5b1eb17d944dbdecbd661e86a6b18dfa7aaa28f172be.
//
// Solidity: event MembershipWithdrawal(address indexed recipient, uint256 amount)
func (_Membership *MembershipFilterer) WatchMembershipWithdrawal(opts *bind.WatchOpts, sink chan<- *MembershipMembershipWithdrawal, recipient []common.Address) (event.Subscription, error) {

	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _Membership.contract.WatchLogs(opts, "MembershipWithdrawal", recipientRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MembershipMembershipWithdrawal)
				if err := _Membership.contract.UnpackLog(event, "MembershipWithdrawal", log); err != nil {
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

// ParseMembershipWithdrawal is a log parse operation binding the contract event 0x6a88f9e03ef4a1786c4d5b1eb17d944dbdecbd661e86a6b18dfa7aaa28f172be.
//
// Solidity: event MembershipWithdrawal(address indexed recipient, uint256 amount)
func (_Membership *MembershipFilterer) ParseMembershipWithdrawal(log types.Log) (*MembershipMembershipWithdrawal, error) {
	event := new(MembershipMembershipWithdrawal)
	if err := _Membership.contract.UnpackLog(event, "MembershipWithdrawal", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
