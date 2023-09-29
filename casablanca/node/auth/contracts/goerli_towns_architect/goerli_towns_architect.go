// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package goerli_towns_architect

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

// ITokenEntitlementExternalToken is an auto generated low-level Go binding around an user-defined struct.
type ITokenEntitlementExternalToken struct {
	ContractAddress common.Address
	Quantity        *big.Int
	IsSingleToken   bool
	TokenIds        []*big.Int
}

// ITownArchitectBaseChannelInfo is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectBaseChannelInfo struct {
	Id       string
	Metadata string
}

// ITownArchitectBaseMemberEntitlement is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectBaseMemberEntitlement struct {
	Role   ITownArchitectBaseRoleInfo
	Tokens []ITokenEntitlementExternalToken
	Users  []common.Address
}

// ITownArchitectBaseRoleInfo is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectBaseRoleInfo struct {
	Name        string
	Permissions []string
}

// ITownArchitectBaseTownInfo is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectBaseTownInfo struct {
	Id                  string
	Name                string
	Uri                 string
	EveryoneEntitlement ITownArchitectBaseRoleInfo
	MemberEntitlement   ITownArchitectBaseMemberEntitlement
	Channel             ITownArchitectBaseChannelInfo
}

// GoerliTownsArchitectMetaData contains all meta data concerning the GoerliTownsArchitect contract.
var GoerliTownsArchitectMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Factory__FailedDeployment\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"GateFacetService__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ReentrancyGuard__ReentrantCall\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidNetworkId\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidStringLength\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__NotContract\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"townCreator\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"townId\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"TownCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townOwner\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"name\":\"__TownArchitect_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"computeTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.RoleInfo\",\"name\":\"everyoneEntitlement\",\"type\":\"tuple\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.RoleInfo\",\"name\":\"role\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MemberEntitlement\",\"name\":\"memberEntitlement\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"}],\"internalType\":\"structITownArchitectBase.ChannelInfo\",\"name\":\"channel\",\"type\":\"tuple\"}],\"internalType\":\"structITownArchitectBase.TownInfo\",\"name\":\"townInfo\",\"type\":\"tuple\"}],\"name\":\"createTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"}],\"name\":\"gateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTokenIdByTownId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getTownArchitectImplementations\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTownById\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"isTokenGated\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"name\":\"setTownArchitectImplementations\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"ungateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// GoerliTownsArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use GoerliTownsArchitectMetaData.ABI instead.
var GoerliTownsArchitectABI = GoerliTownsArchitectMetaData.ABI

// GoerliTownsArchitect is an auto generated Go binding around an Ethereum contract.
type GoerliTownsArchitect struct {
	GoerliTownsArchitectCaller     // Read-only binding to the contract
	GoerliTownsArchitectTransactor // Write-only binding to the contract
	GoerliTownsArchitectFilterer   // Log filterer for contract events
}

// GoerliTownsArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type GoerliTownsArchitectCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type GoerliTownsArchitectTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type GoerliTownsArchitectFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// GoerliTownsArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type GoerliTownsArchitectSession struct {
	Contract     *GoerliTownsArchitect // Generic contract binding to set the session for
	CallOpts     bind.CallOpts         // Call options to use throughout this session
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// GoerliTownsArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type GoerliTownsArchitectCallerSession struct {
	Contract *GoerliTownsArchitectCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts               // Call options to use throughout this session
}

// GoerliTownsArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type GoerliTownsArchitectTransactorSession struct {
	Contract     *GoerliTownsArchitectTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts               // Transaction auth options to use throughout this session
}

// GoerliTownsArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type GoerliTownsArchitectRaw struct {
	Contract *GoerliTownsArchitect // Generic contract binding to access the raw methods on
}

// GoerliTownsArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type GoerliTownsArchitectCallerRaw struct {
	Contract *GoerliTownsArchitectCaller // Generic read-only contract binding to access the raw methods on
}

// GoerliTownsArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type GoerliTownsArchitectTransactorRaw struct {
	Contract *GoerliTownsArchitectTransactor // Generic write-only contract binding to access the raw methods on
}

// NewGoerliTownsArchitect creates a new instance of GoerliTownsArchitect, bound to a specific deployed contract.
func NewGoerliTownsArchitect(address common.Address, backend bind.ContractBackend) (*GoerliTownsArchitect, error) {
	contract, err := bindGoerliTownsArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitect{GoerliTownsArchitectCaller: GoerliTownsArchitectCaller{contract: contract}, GoerliTownsArchitectTransactor: GoerliTownsArchitectTransactor{contract: contract}, GoerliTownsArchitectFilterer: GoerliTownsArchitectFilterer{contract: contract}}, nil
}

// NewGoerliTownsArchitectCaller creates a new read-only instance of GoerliTownsArchitect, bound to a specific deployed contract.
func NewGoerliTownsArchitectCaller(address common.Address, caller bind.ContractCaller) (*GoerliTownsArchitectCaller, error) {
	contract, err := bindGoerliTownsArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectCaller{contract: contract}, nil
}

// NewGoerliTownsArchitectTransactor creates a new write-only instance of GoerliTownsArchitect, bound to a specific deployed contract.
func NewGoerliTownsArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*GoerliTownsArchitectTransactor, error) {
	contract, err := bindGoerliTownsArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectTransactor{contract: contract}, nil
}

// NewGoerliTownsArchitectFilterer creates a new log filterer instance of GoerliTownsArchitect, bound to a specific deployed contract.
func NewGoerliTownsArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*GoerliTownsArchitectFilterer, error) {
	contract, err := bindGoerliTownsArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectFilterer{contract: contract}, nil
}

// bindGoerliTownsArchitect binds a generic wrapper to an already deployed contract.
func bindGoerliTownsArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := GoerliTownsArchitectMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsArchitect *GoerliTownsArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsArchitect.Contract.GoerliTownsArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsArchitect *GoerliTownsArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.GoerliTownsArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsArchitect *GoerliTownsArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.GoerliTownsArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_GoerliTownsArchitect *GoerliTownsArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _GoerliTownsArchitect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.contract.Transact(opts, method, params...)
}

// ComputeTown is a free data retrieval call binding the contract method 0xac6eec37.
//
// Solidity: function computeTown(string townId) view returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectCaller) ComputeTown(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _GoerliTownsArchitect.contract.Call(opts, &out, "computeTown", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// ComputeTown is a free data retrieval call binding the contract method 0xac6eec37.
//
// Solidity: function computeTown(string townId) view returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) ComputeTown(townId string) (common.Address, error) {
	return _GoerliTownsArchitect.Contract.ComputeTown(&_GoerliTownsArchitect.CallOpts, townId)
}

// ComputeTown is a free data retrieval call binding the contract method 0xac6eec37.
//
// Solidity: function computeTown(string townId) view returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectCallerSession) ComputeTown(townId string) (common.Address, error) {
	return _GoerliTownsArchitect.Contract.ComputeTown(&_GoerliTownsArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_GoerliTownsArchitect *GoerliTownsArchitectCaller) GetTokenIdByTownId(opts *bind.CallOpts, townId string) (*big.Int, error) {
	var out []interface{}
	err := _GoerliTownsArchitect.contract.Call(opts, &out, "getTokenIdByTownId", townId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _GoerliTownsArchitect.Contract.GetTokenIdByTownId(&_GoerliTownsArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_GoerliTownsArchitect *GoerliTownsArchitectCallerSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _GoerliTownsArchitect.Contract.GetTokenIdByTownId(&_GoerliTownsArchitect.CallOpts, townId)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_GoerliTownsArchitect *GoerliTownsArchitectCaller) GetTownArchitectImplementations(opts *bind.CallOpts) (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	var out []interface{}
	err := _GoerliTownsArchitect.contract.Call(opts, &out, "getTownArchitectImplementations")

	outstruct := new(struct {
		TownToken                      common.Address
		UserEntitlementImplementation  common.Address
		TokenEntitlementImplementation common.Address
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.TownToken = *abi.ConvertType(out[0], new(common.Address)).(*common.Address)
	outstruct.UserEntitlementImplementation = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.TokenEntitlementImplementation = *abi.ConvertType(out[2], new(common.Address)).(*common.Address)

	return *outstruct, err

}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _GoerliTownsArchitect.Contract.GetTownArchitectImplementations(&_GoerliTownsArchitect.CallOpts)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_GoerliTownsArchitect *GoerliTownsArchitectCallerSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _GoerliTownsArchitect.Contract.GetTownArchitectImplementations(&_GoerliTownsArchitect.CallOpts)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectCaller) GetTownById(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _GoerliTownsArchitect.contract.Call(opts, &out, "getTownById", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) GetTownById(townId string) (common.Address, error) {
	return _GoerliTownsArchitect.Contract.GetTownById(&_GoerliTownsArchitect.CallOpts, townId)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectCallerSession) GetTownById(townId string) (common.Address, error) {
	return _GoerliTownsArchitect.Contract.GetTownById(&_GoerliTownsArchitect.CallOpts, townId)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_GoerliTownsArchitect *GoerliTownsArchitectCaller) IsTokenGated(opts *bind.CallOpts, token common.Address) (bool, error) {
	var out []interface{}
	err := _GoerliTownsArchitect.contract.Call(opts, &out, "isTokenGated", token)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) IsTokenGated(token common.Address) (bool, error) {
	return _GoerliTownsArchitect.Contract.IsTokenGated(&_GoerliTownsArchitect.CallOpts, token)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_GoerliTownsArchitect *GoerliTownsArchitectCallerSession) IsTokenGated(token common.Address) (bool, error) {
	return _GoerliTownsArchitect.Contract.IsTokenGated(&_GoerliTownsArchitect.CallOpts, token)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xf8c5908d.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactor) TownArchitectInit(opts *bind.TransactOpts, townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.contract.Transact(opts, "__TownArchitect_init", townOwner, userEntitlementImplementation, tokenEntitlementImplementation)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xf8c5908d.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.TownArchitectInit(&_GoerliTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xf8c5908d.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactorSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.TownArchitectInit(&_GoerliTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation)
}

// CreateTown is a paid mutator transaction binding the contract method 0xba656dbd.
//
// Solidity: function createTown((string,string,string,(string,string[]),((string,string[]),(address,uint256,bool,uint256[])[],address[]),(string,string)) townInfo) returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactor) CreateTown(opts *bind.TransactOpts, townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _GoerliTownsArchitect.contract.Transact(opts, "createTown", townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xba656dbd.
//
// Solidity: function createTown((string,string,string,(string,string[]),((string,string[]),(address,uint256,bool,uint256[])[],address[]),(string,string)) townInfo) returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.CreateTown(&_GoerliTownsArchitect.TransactOpts, townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xba656dbd.
//
// Solidity: function createTown((string,string,string,(string,string[]),((string,string[]),(address,uint256,bool,uint256[])[],address[]),(string,string)) townInfo) returns(address)
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactorSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.CreateTown(&_GoerliTownsArchitect.TransactOpts, townInfo)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactor) GateByToken(opts *bind.TransactOpts, token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _GoerliTownsArchitect.contract.Transact(opts, "gateByToken", token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.GateByToken(&_GoerliTownsArchitect.TransactOpts, token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactorSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.GateByToken(&_GoerliTownsArchitect.TransactOpts, token, quantity)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactor) SetTownArchitectImplementations(opts *bind.TransactOpts, townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.contract.Transact(opts, "setTownArchitectImplementations", townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.SetTownArchitectImplementations(&_GoerliTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactorSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.SetTownArchitectImplementations(&_GoerliTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactor) UngateByToken(opts *bind.TransactOpts, token common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.contract.Transact(opts, "ungateByToken", token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.UngateByToken(&_GoerliTownsArchitect.TransactOpts, token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_GoerliTownsArchitect *GoerliTownsArchitectTransactorSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _GoerliTownsArchitect.Contract.UngateByToken(&_GoerliTownsArchitect.TransactOpts, token)
}

// GoerliTownsArchitectInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectInitializedIterator struct {
	Event *GoerliTownsArchitectInitialized // Event containing the contract specifics and raw log

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
func (it *GoerliTownsArchitectInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsArchitectInitialized)
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
		it.Event = new(GoerliTownsArchitectInitialized)
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
func (it *GoerliTownsArchitectInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsArchitectInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsArchitectInitialized represents a Initialized event raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) FilterInitialized(opts *bind.FilterOpts) (*GoerliTownsArchitectInitializedIterator, error) {

	logs, sub, err := _GoerliTownsArchitect.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectInitializedIterator{contract: _GoerliTownsArchitect.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *GoerliTownsArchitectInitialized) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsArchitect.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsArchitectInitialized)
				if err := _GoerliTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) ParseInitialized(log types.Log) (*GoerliTownsArchitectInitialized, error) {
	event := new(GoerliTownsArchitectInitialized)
	if err := _GoerliTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsArchitectInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectInterfaceAddedIterator struct {
	Event *GoerliTownsArchitectInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *GoerliTownsArchitectInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsArchitectInterfaceAdded)
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
		it.Event = new(GoerliTownsArchitectInterfaceAdded)
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
func (it *GoerliTownsArchitectInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsArchitectInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsArchitectInterfaceAdded represents a InterfaceAdded event raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsArchitectInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectInterfaceAddedIterator{contract: _GoerliTownsArchitect.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *GoerliTownsArchitectInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsArchitectInterfaceAdded)
				if err := _GoerliTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) ParseInterfaceAdded(log types.Log) (*GoerliTownsArchitectInterfaceAdded, error) {
	event := new(GoerliTownsArchitectInterfaceAdded)
	if err := _GoerliTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsArchitectInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectInterfaceRemovedIterator struct {
	Event *GoerliTownsArchitectInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *GoerliTownsArchitectInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsArchitectInterfaceRemoved)
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
		it.Event = new(GoerliTownsArchitectInterfaceRemoved)
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
func (it *GoerliTownsArchitectInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsArchitectInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsArchitectInterfaceRemoved represents a InterfaceRemoved event raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*GoerliTownsArchitectInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectInterfaceRemovedIterator{contract: _GoerliTownsArchitect.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *GoerliTownsArchitectInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsArchitectInterfaceRemoved)
				if err := _GoerliTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) ParseInterfaceRemoved(log types.Log) (*GoerliTownsArchitectInterfaceRemoved, error) {
	event := new(GoerliTownsArchitectInterfaceRemoved)
	if err := _GoerliTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsArchitectOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectOwnershipTransferredIterator struct {
	Event *GoerliTownsArchitectOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *GoerliTownsArchitectOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsArchitectOwnershipTransferred)
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
		it.Event = new(GoerliTownsArchitectOwnershipTransferred)
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
func (it *GoerliTownsArchitectOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsArchitectOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsArchitectOwnershipTransferred represents a OwnershipTransferred event raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*GoerliTownsArchitectOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectOwnershipTransferredIterator{contract: _GoerliTownsArchitect.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *GoerliTownsArchitectOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsArchitectOwnershipTransferred)
				if err := _GoerliTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) ParseOwnershipTransferred(log types.Log) (*GoerliTownsArchitectOwnershipTransferred, error) {
	event := new(GoerliTownsArchitectOwnershipTransferred)
	if err := _GoerliTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsArchitectPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectPausedIterator struct {
	Event *GoerliTownsArchitectPaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsArchitectPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsArchitectPaused)
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
		it.Event = new(GoerliTownsArchitectPaused)
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
func (it *GoerliTownsArchitectPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsArchitectPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsArchitectPaused represents a Paused event raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) FilterPaused(opts *bind.FilterOpts) (*GoerliTownsArchitectPausedIterator, error) {

	logs, sub, err := _GoerliTownsArchitect.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectPausedIterator{contract: _GoerliTownsArchitect.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsArchitectPaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsArchitect.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsArchitectPaused)
				if err := _GoerliTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) ParsePaused(log types.Log) (*GoerliTownsArchitectPaused, error) {
	event := new(GoerliTownsArchitectPaused)
	if err := _GoerliTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsArchitectTownCreatedIterator is returned from FilterTownCreated and is used to iterate over the raw logs and unpacked data for TownCreated events raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectTownCreatedIterator struct {
	Event *GoerliTownsArchitectTownCreated // Event containing the contract specifics and raw log

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
func (it *GoerliTownsArchitectTownCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsArchitectTownCreated)
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
		it.Event = new(GoerliTownsArchitectTownCreated)
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
func (it *GoerliTownsArchitectTownCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsArchitectTownCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsArchitectTownCreated represents a TownCreated event raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectTownCreated struct {
	TownCreator common.Address
	TownId      *big.Int
	Town        common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterTownCreated is a free log retrieval operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) FilterTownCreated(opts *bind.FilterOpts, townCreator []common.Address, townId []*big.Int) (*GoerliTownsArchitectTownCreatedIterator, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.FilterLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectTownCreatedIterator{contract: _GoerliTownsArchitect.contract, event: "TownCreated", logs: logs, sub: sub}, nil
}

// WatchTownCreated is a free log subscription operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) WatchTownCreated(opts *bind.WatchOpts, sink chan<- *GoerliTownsArchitectTownCreated, townCreator []common.Address, townId []*big.Int) (event.Subscription, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _GoerliTownsArchitect.contract.WatchLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsArchitectTownCreated)
				if err := _GoerliTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
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

// ParseTownCreated is a log parse operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) ParseTownCreated(log types.Log) (*GoerliTownsArchitectTownCreated, error) {
	event := new(GoerliTownsArchitectTownCreated)
	if err := _GoerliTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// GoerliTownsArchitectUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectUnpausedIterator struct {
	Event *GoerliTownsArchitectUnpaused // Event containing the contract specifics and raw log

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
func (it *GoerliTownsArchitectUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(GoerliTownsArchitectUnpaused)
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
		it.Event = new(GoerliTownsArchitectUnpaused)
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
func (it *GoerliTownsArchitectUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *GoerliTownsArchitectUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// GoerliTownsArchitectUnpaused represents a Unpaused event raised by the GoerliTownsArchitect contract.
type GoerliTownsArchitectUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) FilterUnpaused(opts *bind.FilterOpts) (*GoerliTownsArchitectUnpausedIterator, error) {

	logs, sub, err := _GoerliTownsArchitect.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &GoerliTownsArchitectUnpausedIterator{contract: _GoerliTownsArchitect.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *GoerliTownsArchitectUnpaused) (event.Subscription, error) {

	logs, sub, err := _GoerliTownsArchitect.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(GoerliTownsArchitectUnpaused)
				if err := _GoerliTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_GoerliTownsArchitect *GoerliTownsArchitectFilterer) ParseUnpaused(log types.Log) (*GoerliTownsArchitectUnpaused, error) {
	event := new(GoerliTownsArchitectUnpaused)
	if err := _GoerliTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
