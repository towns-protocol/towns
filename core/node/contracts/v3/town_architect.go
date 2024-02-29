// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package v3

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

// IArchitectBaseChannelInfo is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseChannelInfo struct {
	Id       string
	Metadata string
}

// IArchitectBaseMembership is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseMembership struct {
	Settings     IMembershipBaseMembership
	Requirements IArchitectBaseMembershipRequirements
	Permissions  []string
}

// IArchitectBaseMembershipRequirements is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseMembershipRequirements struct {
	Everyone bool
	Tokens   []ITokenEntitlementExternalToken
	Users    []common.Address
	Rule     common.Address
}

// IArchitectBaseSpaceInfo is an auto generated low-level Go binding around an user-defined struct.
type IArchitectBaseSpaceInfo struct {
	Id         string
	Name       string
	Uri        string
	Membership IArchitectBaseMembership
	Channel    IArchitectBaseChannelInfo
}

// IMembershipBaseMembership is an auto generated low-level Go binding around an user-defined struct.
type IMembershipBaseMembership struct {
	Name           string
	Symbol         string
	Price          *big.Int
	MaxSupply      *big.Int
	Duration       uint64
	Currency       common.Address
	FeeRecipient   common.Address
	FreeAllocation *big.Int
	PricingModule  common.Address
}

// ITokenEntitlementExternalToken is an auto generated low-level Go binding around an user-defined struct.
type ITokenEntitlementExternalToken struct {
	ContractAddress common.Address
	Quantity        *big.Int
	IsSingleToken   bool
	TokenIds        []*big.Int
}

// TownArchitectMetaData contains all meta data concerning the TownArchitect contract.
var TownArchitectMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"__Architect_init\",\"inputs\":[{\"name\":\"ownerImplementation\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"userEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createSpace\",\"inputs\":[{\"name\":\"spaceInfo\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.SpaceInfo\",\"components\":[{\"name\":\"id\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"uri\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"membership\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.Membership\",\"components\":[{\"name\":\"settings\",\"type\":\"tuple\",\"internalType\":\"structIMembershipBase.Membership\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"price\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"maxSupply\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"duration\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"currency\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"feeRecipient\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"freeAllocation\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"pricingModule\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"name\":\"requirements\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.MembershipRequirements\",\"components\":[{\"name\":\"everyone\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"tokens\",\"type\":\"tuple[]\",\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"components\":[{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"quantity\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"isSingleToken\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"tokenIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]},{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"rule\",\"type\":\"address\",\"internalType\":\"contractIEntitlementRule\"}]},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}]},{\"name\":\"channel\",\"type\":\"tuple\",\"internalType\":\"structIArchitectBase.ChannelInfo\",\"components\":[{\"name\":\"id\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getSpaceArchitectImplementations\",\"inputs\":[],\"outputs\":[{\"name\":\"spaceToken\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"userEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getSpaceById\",\"inputs\":[{\"name\":\"spaceId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getTokenIdBySpace\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getTokenIdBySpaceId\",\"inputs\":[{\"name\":\"spaceId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isSpace\",\"inputs\":[{\"name\":\"space\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setSpaceArchitectImplementations\",\"inputs\":[{\"name\":\"spaceToken\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"userEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Paused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SpaceCreated\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"spaceId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"space\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unpaused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Architect__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__InvalidNetworkId\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__InvalidStringLength\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Architect__NotContract\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Factory__FailedDeployment\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__NotPaused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__Paused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ReentrancyGuard__ReentrantCall\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Validator__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Validator__InvalidStringLength\",\"inputs\":[]}]",
}

// TownArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use TownArchitectMetaData.ABI instead.
var TownArchitectABI = TownArchitectMetaData.ABI

// TownArchitect is an auto generated Go binding around an Ethereum contract.
type TownArchitect struct {
	TownArchitectCaller     // Read-only binding to the contract
	TownArchitectTransactor // Write-only binding to the contract
	TownArchitectFilterer   // Log filterer for contract events
}

// TownArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type TownArchitectCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type TownArchitectTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type TownArchitectFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type TownArchitectSession struct {
	Contract     *TownArchitect    // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// TownArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type TownArchitectCallerSession struct {
	Contract *TownArchitectCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts        // Call options to use throughout this session
}

// TownArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type TownArchitectTransactorSession struct {
	Contract     *TownArchitectTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// TownArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type TownArchitectRaw struct {
	Contract *TownArchitect // Generic contract binding to access the raw methods on
}

// TownArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type TownArchitectCallerRaw struct {
	Contract *TownArchitectCaller // Generic read-only contract binding to access the raw methods on
}

// TownArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type TownArchitectTransactorRaw struct {
	Contract *TownArchitectTransactor // Generic write-only contract binding to access the raw methods on
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
// Solidity: function getSpaceArchitectImplementations() view returns(address spaceToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_TownArchitect *TownArchitectCaller) GetSpaceArchitectImplementations(opts *bind.CallOpts) (struct {
	SpaceToken                     common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	var out []interface{}
	err := _TownArchitect.contract.Call(opts, &out, "getSpaceArchitectImplementations")

	outstruct := new(struct {
		SpaceToken                     common.Address
		UserEntitlementImplementation  common.Address
		TokenEntitlementImplementation common.Address
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.SpaceToken = *abi.ConvertType(out[0], new(common.Address)).(*common.Address)
	outstruct.UserEntitlementImplementation = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.TokenEntitlementImplementation = *abi.ConvertType(out[2], new(common.Address)).(*common.Address)

	return *outstruct, err

}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address spaceToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_TownArchitect *TownArchitectSession) GetSpaceArchitectImplementations() (struct {
	SpaceToken                     common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _TownArchitect.Contract.GetSpaceArchitectImplementations(&_TownArchitect.CallOpts)
}

// GetSpaceArchitectImplementations is a free data retrieval call binding the contract method 0x545efb2d.
//
// Solidity: function getSpaceArchitectImplementations() view returns(address spaceToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_TownArchitect *TownArchitectCallerSession) GetSpaceArchitectImplementations() (struct {
	SpaceToken                     common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
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

// ArchitectInit is a paid mutator transaction binding the contract method 0xdc1b9f23.
//
// Solidity: function __Architect_init(address ownerImplementation, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectTransactor) ArchitectInit(opts *bind.TransactOpts, ownerImplementation common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.contract.Transact(opts, "__Architect_init", ownerImplementation, userEntitlementImplementation, tokenEntitlementImplementation)
}

// ArchitectInit is a paid mutator transaction binding the contract method 0xdc1b9f23.
//
// Solidity: function __Architect_init(address ownerImplementation, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectSession) ArchitectInit(ownerImplementation common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.Contract.ArchitectInit(&_TownArchitect.TransactOpts, ownerImplementation, userEntitlementImplementation, tokenEntitlementImplementation)
}

// ArchitectInit is a paid mutator transaction binding the contract method 0xdc1b9f23.
//
// Solidity: function __Architect_init(address ownerImplementation, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectTransactorSession) ArchitectInit(ownerImplementation common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.Contract.ArchitectInit(&_TownArchitect.TransactOpts, ownerImplementation, userEntitlementImplementation, tokenEntitlementImplementation)
}

// CreateSpace is a paid mutator transaction binding the contract method 0x6e763131.
//
// Solidity: function createSpace((string,string,string,((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,(address,uint256,bool,uint256[])[],address[],address),string[]),(string,string)) spaceInfo) returns(address)
func (_TownArchitect *TownArchitectTransactor) CreateSpace(opts *bind.TransactOpts, spaceInfo IArchitectBaseSpaceInfo) (*types.Transaction, error) {
	return _TownArchitect.contract.Transact(opts, "createSpace", spaceInfo)
}

// CreateSpace is a paid mutator transaction binding the contract method 0x6e763131.
//
// Solidity: function createSpace((string,string,string,((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,(address,uint256,bool,uint256[])[],address[],address),string[]),(string,string)) spaceInfo) returns(address)
func (_TownArchitect *TownArchitectSession) CreateSpace(spaceInfo IArchitectBaseSpaceInfo) (*types.Transaction, error) {
	return _TownArchitect.Contract.CreateSpace(&_TownArchitect.TransactOpts, spaceInfo)
}

// CreateSpace is a paid mutator transaction binding the contract method 0x6e763131.
//
// Solidity: function createSpace((string,string,string,((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,(address,uint256,bool,uint256[])[],address[],address),string[]),(string,string)) spaceInfo) returns(address)
func (_TownArchitect *TownArchitectTransactorSession) CreateSpace(spaceInfo IArchitectBaseSpaceInfo) (*types.Transaction, error) {
	return _TownArchitect.Contract.CreateSpace(&_TownArchitect.TransactOpts, spaceInfo)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0x8bfc94b9.
//
// Solidity: function setSpaceArchitectImplementations(address spaceToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectTransactor) SetSpaceArchitectImplementations(opts *bind.TransactOpts, spaceToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.contract.Transact(opts, "setSpaceArchitectImplementations", spaceToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0x8bfc94b9.
//
// Solidity: function setSpaceArchitectImplementations(address spaceToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectSession) SetSpaceArchitectImplementations(spaceToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.Contract.SetSpaceArchitectImplementations(&_TownArchitect.TransactOpts, spaceToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetSpaceArchitectImplementations is a paid mutator transaction binding the contract method 0x8bfc94b9.
//
// Solidity: function setSpaceArchitectImplementations(address spaceToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownArchitect *TownArchitectTransactorSession) SetSpaceArchitectImplementations(spaceToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownArchitect.Contract.SetSpaceArchitectImplementations(&_TownArchitect.TransactOpts, spaceToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// TownArchitectInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the TownArchitect contract.
type TownArchitectInitializedIterator struct {
	Event *TownArchitectInitialized // Event containing the contract specifics and raw log

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
func (it *TownArchitectInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownArchitectInitialized)
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
		it.Event = new(TownArchitectInitialized)
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
func (it *TownArchitectInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownArchitectInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownArchitectInitialized represents a Initialized event raised by the TownArchitect contract.
type TownArchitectInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_TownArchitect *TownArchitectFilterer) FilterInitialized(opts *bind.FilterOpts) (*TownArchitectInitializedIterator, error) {

	logs, sub, err := _TownArchitect.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &TownArchitectInitializedIterator{contract: _TownArchitect.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_TownArchitect *TownArchitectFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *TownArchitectInitialized) (event.Subscription, error) {

	logs, sub, err := _TownArchitect.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownArchitectInitialized)
				if err := _TownArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_TownArchitect *TownArchitectFilterer) ParseInitialized(log types.Log) (*TownArchitectInitialized, error) {
	event := new(TownArchitectInitialized)
	if err := _TownArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownArchitectInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the TownArchitect contract.
type TownArchitectInterfaceAddedIterator struct {
	Event *TownArchitectInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *TownArchitectInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownArchitectInterfaceAdded)
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
		it.Event = new(TownArchitectInterfaceAdded)
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
func (it *TownArchitectInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownArchitectInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownArchitectInterfaceAdded represents a InterfaceAdded event raised by the TownArchitect contract.
type TownArchitectInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_TownArchitect *TownArchitectFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*TownArchitectInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownArchitect.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &TownArchitectInterfaceAddedIterator{contract: _TownArchitect.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_TownArchitect *TownArchitectFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *TownArchitectInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownArchitect.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownArchitectInterfaceAdded)
				if err := _TownArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_TownArchitect *TownArchitectFilterer) ParseInterfaceAdded(log types.Log) (*TownArchitectInterfaceAdded, error) {
	event := new(TownArchitectInterfaceAdded)
	if err := _TownArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownArchitectInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the TownArchitect contract.
type TownArchitectInterfaceRemovedIterator struct {
	Event *TownArchitectInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *TownArchitectInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownArchitectInterfaceRemoved)
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
		it.Event = new(TownArchitectInterfaceRemoved)
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
func (it *TownArchitectInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownArchitectInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownArchitectInterfaceRemoved represents a InterfaceRemoved event raised by the TownArchitect contract.
type TownArchitectInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_TownArchitect *TownArchitectFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*TownArchitectInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownArchitect.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &TownArchitectInterfaceRemovedIterator{contract: _TownArchitect.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_TownArchitect *TownArchitectFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *TownArchitectInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownArchitect.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownArchitectInterfaceRemoved)
				if err := _TownArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_TownArchitect *TownArchitectFilterer) ParseInterfaceRemoved(log types.Log) (*TownArchitectInterfaceRemoved, error) {
	event := new(TownArchitectInterfaceRemoved)
	if err := _TownArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownArchitectOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the TownArchitect contract.
type TownArchitectOwnershipTransferredIterator struct {
	Event *TownArchitectOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *TownArchitectOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownArchitectOwnershipTransferred)
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
		it.Event = new(TownArchitectOwnershipTransferred)
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
func (it *TownArchitectOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownArchitectOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownArchitectOwnershipTransferred represents a OwnershipTransferred event raised by the TownArchitect contract.
type TownArchitectOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_TownArchitect *TownArchitectFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*TownArchitectOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _TownArchitect.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &TownArchitectOwnershipTransferredIterator{contract: _TownArchitect.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_TownArchitect *TownArchitectFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *TownArchitectOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _TownArchitect.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownArchitectOwnershipTransferred)
				if err := _TownArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_TownArchitect *TownArchitectFilterer) ParseOwnershipTransferred(log types.Log) (*TownArchitectOwnershipTransferred, error) {
	event := new(TownArchitectOwnershipTransferred)
	if err := _TownArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownArchitectPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the TownArchitect contract.
type TownArchitectPausedIterator struct {
	Event *TownArchitectPaused // Event containing the contract specifics and raw log

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
func (it *TownArchitectPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownArchitectPaused)
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
		it.Event = new(TownArchitectPaused)
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
func (it *TownArchitectPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownArchitectPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownArchitectPaused represents a Paused event raised by the TownArchitect contract.
type TownArchitectPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_TownArchitect *TownArchitectFilterer) FilterPaused(opts *bind.FilterOpts) (*TownArchitectPausedIterator, error) {

	logs, sub, err := _TownArchitect.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &TownArchitectPausedIterator{contract: _TownArchitect.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_TownArchitect *TownArchitectFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *TownArchitectPaused) (event.Subscription, error) {

	logs, sub, err := _TownArchitect.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownArchitectPaused)
				if err := _TownArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_TownArchitect *TownArchitectFilterer) ParsePaused(log types.Log) (*TownArchitectPaused, error) {
	event := new(TownArchitectPaused)
	if err := _TownArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownArchitectSpaceCreatedIterator is returned from FilterSpaceCreated and is used to iterate over the raw logs and unpacked data for SpaceCreated events raised by the TownArchitect contract.
type TownArchitectSpaceCreatedIterator struct {
	Event *TownArchitectSpaceCreated // Event containing the contract specifics and raw log

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
	Owner   common.Address
	SpaceId *big.Int
	Space   common.Address
	Raw     types.Log // Blockchain specific contextual infos
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

// TownArchitectUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the TownArchitect contract.
type TownArchitectUnpausedIterator struct {
	Event *TownArchitectUnpaused // Event containing the contract specifics and raw log

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
func (it *TownArchitectUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownArchitectUnpaused)
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
		it.Event = new(TownArchitectUnpaused)
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
func (it *TownArchitectUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownArchitectUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownArchitectUnpaused represents a Unpaused event raised by the TownArchitect contract.
type TownArchitectUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_TownArchitect *TownArchitectFilterer) FilterUnpaused(opts *bind.FilterOpts) (*TownArchitectUnpausedIterator, error) {

	logs, sub, err := _TownArchitect.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &TownArchitectUnpausedIterator{contract: _TownArchitect.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_TownArchitect *TownArchitectFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *TownArchitectUnpaused) (event.Subscription, error) {

	logs, sub, err := _TownArchitect.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownArchitectUnpaused)
				if err := _TownArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_TownArchitect *TownArchitectFilterer) ParseUnpaused(log types.Log) (*TownArchitectUnpaused, error) {
	event := new(TownArchitectUnpaused)
	if err := _TownArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
