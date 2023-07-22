// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_town_architect

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
)

// ITokenEntitlementExternalToken is an auto generated low-level Go binding around an user-defined struct.
type ITokenEntitlementExternalToken struct {
	ContractAddress common.Address
	Quantity        *big.Int
	IsSingleToken   bool
	TokenIds        []*big.Int
}

// ITownArchitectStructsChannelInfo is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectStructsChannelInfo struct {
	Id       string
	Metadata string
}

// ITownArchitectStructsMemberEntitlement is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectStructsMemberEntitlement struct {
	Role   ITownArchitectStructsRoleInfo
	Tokens []ITokenEntitlementExternalToken
	Users  []common.Address
}

// ITownArchitectStructsRoleInfo is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectStructsRoleInfo struct {
	Name        string
	Permissions []string
}

// ITownArchitectStructsTownInfo is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectStructsTownInfo struct {
	Id                  string
	Metadata            string
	EveryoneEntitlement ITownArchitectStructsRoleInfo
	MemberEntitlement   ITownArchitectStructsMemberEntitlement
	Channel             ITownArchitectStructsChannelInfo
}

// LocalhostTownArchitectMetaData contains all meta data concerning the LocalhostTownArchitect contract.
var LocalhostTownArchitectMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Factory__FailedDeployment\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"GateFacetService__NotAllowed\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ReentrancyGuard__ReentrantCall\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitectService__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitectService__InvalidNetworkId\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitectService__InvalidStringLength\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitectService__NotContract\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"TownCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"computeTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectStructs.RoleInfo\",\"name\":\"everyoneEntitlement\",\"type\":\"tuple\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectStructs.RoleInfo\",\"name\":\"role\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectStructs.MemberEntitlement\",\"name\":\"memberEntitlement\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"}],\"internalType\":\"structITownArchitectStructs.ChannelInfo\",\"name\":\"channel\",\"type\":\"tuple\"}],\"internalType\":\"structITownArchitectStructs.TownInfo\",\"name\":\"townInfo\",\"type\":\"tuple\"}],\"name\":\"createTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"}],\"name\":\"gateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTokenIdByTownId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getTownArchitectImplementations\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTownById\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"isTokenGated\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"name\":\"setTownArchitectImplementations\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"ungateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// LocalhostTownArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostTownArchitectMetaData.ABI instead.
var LocalhostTownArchitectABI = LocalhostTownArchitectMetaData.ABI

// LocalhostTownArchitect is an auto generated Go binding around an Ethereum contract.
type LocalhostTownArchitect struct {
	LocalhostTownArchitectCaller     // Read-only binding to the contract
	LocalhostTownArchitectTransactor // Write-only binding to the contract
	LocalhostTownArchitectFilterer   // Log filterer for contract events
}

// LocalhostTownArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostTownArchitectCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostTownArchitectTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostTownArchitectFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostTownArchitectSession struct {
	Contract     *LocalhostTownArchitect // Generic contract binding to set the session for
	CallOpts     bind.CallOpts           // Call options to use throughout this session
	TransactOpts bind.TransactOpts       // Transaction auth options to use throughout this session
}

// LocalhostTownArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostTownArchitectCallerSession struct {
	Contract *LocalhostTownArchitectCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                 // Call options to use throughout this session
}

// LocalhostTownArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostTownArchitectTransactorSession struct {
	Contract     *LocalhostTownArchitectTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                 // Transaction auth options to use throughout this session
}

// LocalhostTownArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostTownArchitectRaw struct {
	Contract *LocalhostTownArchitect // Generic contract binding to access the raw methods on
}

// LocalhostTownArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostTownArchitectCallerRaw struct {
	Contract *LocalhostTownArchitectCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostTownArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostTownArchitectTransactorRaw struct {
	Contract *LocalhostTownArchitectTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostTownArchitect creates a new instance of LocalhostTownArchitect, bound to a specific deployed contract.
func NewLocalhostTownArchitect(address common.Address, backend bind.ContractBackend) (*LocalhostTownArchitect, error) {
	contract, err := bindLocalhostTownArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitect{LocalhostTownArchitectCaller: LocalhostTownArchitectCaller{contract: contract}, LocalhostTownArchitectTransactor: LocalhostTownArchitectTransactor{contract: contract}, LocalhostTownArchitectFilterer: LocalhostTownArchitectFilterer{contract: contract}}, nil
}

// NewLocalhostTownArchitectCaller creates a new read-only instance of LocalhostTownArchitect, bound to a specific deployed contract.
func NewLocalhostTownArchitectCaller(address common.Address, caller bind.ContractCaller) (*LocalhostTownArchitectCaller, error) {
	contract, err := bindLocalhostTownArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitectCaller{contract: contract}, nil
}

// NewLocalhostTownArchitectTransactor creates a new write-only instance of LocalhostTownArchitect, bound to a specific deployed contract.
func NewLocalhostTownArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostTownArchitectTransactor, error) {
	contract, err := bindLocalhostTownArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitectTransactor{contract: contract}, nil
}

// NewLocalhostTownArchitectFilterer creates a new log filterer instance of LocalhostTownArchitect, bound to a specific deployed contract.
func NewLocalhostTownArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostTownArchitectFilterer, error) {
	contract, err := bindLocalhostTownArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitectFilterer{contract: contract}, nil
}

// bindLocalhostTownArchitect binds a generic wrapper to an already deployed contract.
func bindLocalhostTownArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(LocalhostTownArchitectABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownArchitect *LocalhostTownArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownArchitect.Contract.LocalhostTownArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownArchitect *LocalhostTownArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.LocalhostTownArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownArchitect *LocalhostTownArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.LocalhostTownArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownArchitect *LocalhostTownArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownArchitect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.contract.Transact(opts, method, params...)
}

// ComputeTown is a free data retrieval call binding the contract method 0xac6eec37.
//
// Solidity: function computeTown(string townId) view returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectCaller) ComputeTown(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _LocalhostTownArchitect.contract.Call(opts, &out, "computeTown", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// ComputeTown is a free data retrieval call binding the contract method 0xac6eec37.
//
// Solidity: function computeTown(string townId) view returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) ComputeTown(townId string) (common.Address, error) {
	return _LocalhostTownArchitect.Contract.ComputeTown(&_LocalhostTownArchitect.CallOpts, townId)
}

// ComputeTown is a free data retrieval call binding the contract method 0xac6eec37.
//
// Solidity: function computeTown(string townId) view returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectCallerSession) ComputeTown(townId string) (common.Address, error) {
	return _LocalhostTownArchitect.Contract.ComputeTown(&_LocalhostTownArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_LocalhostTownArchitect *LocalhostTownArchitectCaller) GetTokenIdByTownId(opts *bind.CallOpts, townId string) (*big.Int, error) {
	var out []interface{}
	err := _LocalhostTownArchitect.contract.Call(opts, &out, "getTokenIdByTownId", townId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _LocalhostTownArchitect.Contract.GetTokenIdByTownId(&_LocalhostTownArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_LocalhostTownArchitect *LocalhostTownArchitectCallerSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _LocalhostTownArchitect.Contract.GetTokenIdByTownId(&_LocalhostTownArchitect.CallOpts, townId)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_LocalhostTownArchitect *LocalhostTownArchitectCaller) GetTownArchitectImplementations(opts *bind.CallOpts) (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	var out []interface{}
	err := _LocalhostTownArchitect.contract.Call(opts, &out, "getTownArchitectImplementations")

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
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _LocalhostTownArchitect.Contract.GetTownArchitectImplementations(&_LocalhostTownArchitect.CallOpts)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_LocalhostTownArchitect *LocalhostTownArchitectCallerSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _LocalhostTownArchitect.Contract.GetTownArchitectImplementations(&_LocalhostTownArchitect.CallOpts)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectCaller) GetTownById(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _LocalhostTownArchitect.contract.Call(opts, &out, "getTownById", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) GetTownById(townId string) (common.Address, error) {
	return _LocalhostTownArchitect.Contract.GetTownById(&_LocalhostTownArchitect.CallOpts, townId)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectCallerSession) GetTownById(townId string) (common.Address, error) {
	return _LocalhostTownArchitect.Contract.GetTownById(&_LocalhostTownArchitect.CallOpts, townId)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_LocalhostTownArchitect *LocalhostTownArchitectCaller) IsTokenGated(opts *bind.CallOpts, token common.Address) (bool, error) {
	var out []interface{}
	err := _LocalhostTownArchitect.contract.Call(opts, &out, "isTokenGated", token)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) IsTokenGated(token common.Address) (bool, error) {
	return _LocalhostTownArchitect.Contract.IsTokenGated(&_LocalhostTownArchitect.CallOpts, token)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_LocalhostTownArchitect *LocalhostTownArchitectCallerSession) IsTokenGated(token common.Address) (bool, error) {
	return _LocalhostTownArchitect.Contract.IsTokenGated(&_LocalhostTownArchitect.CallOpts, token)
}

// CreateTown is a paid mutator transaction binding the contract method 0x344fe721.
//
// Solidity: function createTown((string,string,(string,string[]),((string,string[]),(address,uint256,bool,uint256[])[],address[]),(string,string)) townInfo) returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactor) CreateTown(opts *bind.TransactOpts, townInfo ITownArchitectStructsTownInfo) (*types.Transaction, error) {
	return _LocalhostTownArchitect.contract.Transact(opts, "createTown", townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0x344fe721.
//
// Solidity: function createTown((string,string,(string,string[]),((string,string[]),(address,uint256,bool,uint256[])[],address[]),(string,string)) townInfo) returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) CreateTown(townInfo ITownArchitectStructsTownInfo) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.CreateTown(&_LocalhostTownArchitect.TransactOpts, townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0x344fe721.
//
// Solidity: function createTown((string,string,(string,string[]),((string,string[]),(address,uint256,bool,uint256[])[],address[]),(string,string)) townInfo) returns(address)
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactorSession) CreateTown(townInfo ITownArchitectStructsTownInfo) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.CreateTown(&_LocalhostTownArchitect.TransactOpts, townInfo)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactor) GateByToken(opts *bind.TransactOpts, token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _LocalhostTownArchitect.contract.Transact(opts, "gateByToken", token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.GateByToken(&_LocalhostTownArchitect.TransactOpts, token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactorSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.GateByToken(&_LocalhostTownArchitect.TransactOpts, token, quantity)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactor) SetTownArchitectImplementations(opts *bind.TransactOpts, townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _LocalhostTownArchitect.contract.Transact(opts, "setTownArchitectImplementations", townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.SetTownArchitectImplementations(&_LocalhostTownArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactorSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.SetTownArchitectImplementations(&_LocalhostTownArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactor) UngateByToken(opts *bind.TransactOpts, token common.Address) (*types.Transaction, error) {
	return _LocalhostTownArchitect.contract.Transact(opts, "ungateByToken", token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.UngateByToken(&_LocalhostTownArchitect.TransactOpts, token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_LocalhostTownArchitect *LocalhostTownArchitectTransactorSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _LocalhostTownArchitect.Contract.UngateByToken(&_LocalhostTownArchitect.TransactOpts, token)
}

// LocalhostTownArchitectOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectOwnershipTransferredIterator struct {
	Event *LocalhostTownArchitectOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *LocalhostTownArchitectOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownArchitectOwnershipTransferred)
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
		it.Event = new(LocalhostTownArchitectOwnershipTransferred)
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
func (it *LocalhostTownArchitectOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownArchitectOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownArchitectOwnershipTransferred represents a OwnershipTransferred event raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*LocalhostTownArchitectOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _LocalhostTownArchitect.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitectOwnershipTransferredIterator{contract: _LocalhostTownArchitect.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *LocalhostTownArchitectOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _LocalhostTownArchitect.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownArchitectOwnershipTransferred)
				if err := _LocalhostTownArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) ParseOwnershipTransferred(log types.Log) (*LocalhostTownArchitectOwnershipTransferred, error) {
	event := new(LocalhostTownArchitectOwnershipTransferred)
	if err := _LocalhostTownArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownArchitectPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectPausedIterator struct {
	Event *LocalhostTownArchitectPaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownArchitectPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownArchitectPaused)
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
		it.Event = new(LocalhostTownArchitectPaused)
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
func (it *LocalhostTownArchitectPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownArchitectPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownArchitectPaused represents a Paused event raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) FilterPaused(opts *bind.FilterOpts) (*LocalhostTownArchitectPausedIterator, error) {

	logs, sub, err := _LocalhostTownArchitect.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitectPausedIterator{contract: _LocalhostTownArchitect.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownArchitectPaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownArchitect.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownArchitectPaused)
				if err := _LocalhostTownArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) ParsePaused(log types.Log) (*LocalhostTownArchitectPaused, error) {
	event := new(LocalhostTownArchitectPaused)
	if err := _LocalhostTownArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownArchitectTownCreatedIterator is returned from FilterTownCreated and is used to iterate over the raw logs and unpacked data for TownCreated events raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectTownCreatedIterator struct {
	Event *LocalhostTownArchitectTownCreated // Event containing the contract specifics and raw log

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
func (it *LocalhostTownArchitectTownCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownArchitectTownCreated)
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
		it.Event = new(LocalhostTownArchitectTownCreated)
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
func (it *LocalhostTownArchitectTownCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownArchitectTownCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownArchitectTownCreated represents a TownCreated event raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectTownCreated struct {
	Town common.Address
	Raw  types.Log // Blockchain specific contextual infos
}

// FilterTownCreated is a free log retrieval operation binding the contract event 0x71bcf3e2a9d5705886c642b1bab018544ad0b1206a775cd4431edc6a85300498.
//
// Solidity: event TownCreated(address indexed town)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) FilterTownCreated(opts *bind.FilterOpts, town []common.Address) (*LocalhostTownArchitectTownCreatedIterator, error) {

	var townRule []interface{}
	for _, townItem := range town {
		townRule = append(townRule, townItem)
	}

	logs, sub, err := _LocalhostTownArchitect.contract.FilterLogs(opts, "TownCreated", townRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitectTownCreatedIterator{contract: _LocalhostTownArchitect.contract, event: "TownCreated", logs: logs, sub: sub}, nil
}

// WatchTownCreated is a free log subscription operation binding the contract event 0x71bcf3e2a9d5705886c642b1bab018544ad0b1206a775cd4431edc6a85300498.
//
// Solidity: event TownCreated(address indexed town)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) WatchTownCreated(opts *bind.WatchOpts, sink chan<- *LocalhostTownArchitectTownCreated, town []common.Address) (event.Subscription, error) {

	var townRule []interface{}
	for _, townItem := range town {
		townRule = append(townRule, townItem)
	}

	logs, sub, err := _LocalhostTownArchitect.contract.WatchLogs(opts, "TownCreated", townRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownArchitectTownCreated)
				if err := _LocalhostTownArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
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

// ParseTownCreated is a log parse operation binding the contract event 0x71bcf3e2a9d5705886c642b1bab018544ad0b1206a775cd4431edc6a85300498.
//
// Solidity: event TownCreated(address indexed town)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) ParseTownCreated(log types.Log) (*LocalhostTownArchitectTownCreated, error) {
	event := new(LocalhostTownArchitectTownCreated)
	if err := _LocalhostTownArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownArchitectUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectUnpausedIterator struct {
	Event *LocalhostTownArchitectUnpaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownArchitectUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownArchitectUnpaused)
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
		it.Event = new(LocalhostTownArchitectUnpaused)
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
func (it *LocalhostTownArchitectUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownArchitectUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownArchitectUnpaused represents a Unpaused event raised by the LocalhostTownArchitect contract.
type LocalhostTownArchitectUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) FilterUnpaused(opts *bind.FilterOpts) (*LocalhostTownArchitectUnpausedIterator, error) {

	logs, sub, err := _LocalhostTownArchitect.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownArchitectUnpausedIterator{contract: _LocalhostTownArchitect.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownArchitectUnpaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownArchitect.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownArchitectUnpaused)
				if err := _LocalhostTownArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_LocalhostTownArchitect *LocalhostTownArchitectFilterer) ParseUnpaused(log types.Log) (*LocalhostTownArchitectUnpaused, error) {
	event := new(LocalhostTownArchitectUnpaused)
	if err := _LocalhostTownArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
