// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_towns_architect

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

// IMembershipBaseMembershipInfo is an auto generated low-level Go binding around an user-defined struct.
type IMembershipBaseMembershipInfo struct {
	Name         string
	Symbol       string
	Price        *big.Int
	Limit        *big.Int
	Duration     uint64
	Currency     common.Address
	FeeRecipient common.Address
}

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

// ITownArchitectBaseMembership is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectBaseMembership struct {
	Settings     IMembershipBaseMembershipInfo
	Requirements ITownArchitectBaseMembershipRequirements
	Permissions  []string
}

// ITownArchitectBaseMembershipRequirements is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectBaseMembershipRequirements struct {
	Everyone bool
	Tokens   []ITokenEntitlementExternalToken
	Users    []common.Address
}

// ITownArchitectBaseTownInfo is an auto generated low-level Go binding around an user-defined struct.
type ITownArchitectBaseTownInfo struct {
	Id         string
	Name       string
	Uri        string
	Membership ITownArchitectBaseMembership
	Channel    ITownArchitectBaseChannelInfo
}

// LocalhostTownsArchitectMetaData contains all meta data concerning the LocalhostTownsArchitect contract.
var LocalhostTownsArchitectMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Factory__FailedDeployment\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"GateFacetService__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ReentrancyGuard__ReentrantCall\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidNetworkId\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidStringLength\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__NotContract\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"townCreator\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"townId\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"TownCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townOwner\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"trustedForwarder\",\"type\":\"address\"}],\"name\":\"__TownArchitect_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"limit\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"}],\"name\":\"computeTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"limit\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"}],\"internalType\":\"structITownArchitectBase.ChannelInfo\",\"name\":\"channel\",\"type\":\"tuple\"}],\"internalType\":\"structITownArchitectBase.TownInfo\",\"name\":\"townInfo\",\"type\":\"tuple\"}],\"name\":\"createTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"}],\"name\":\"gateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTokenIdByTownId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getTownArchitectImplementations\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTownById\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"isTokenGated\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"name\":\"setTownArchitectImplementations\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"ungateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// LocalhostTownsArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostTownsArchitectMetaData.ABI instead.
var LocalhostTownsArchitectABI = LocalhostTownsArchitectMetaData.ABI

// LocalhostTownsArchitect is an auto generated Go binding around an Ethereum contract.
type LocalhostTownsArchitect struct {
	LocalhostTownsArchitectCaller     // Read-only binding to the contract
	LocalhostTownsArchitectTransactor // Write-only binding to the contract
	LocalhostTownsArchitectFilterer   // Log filterer for contract events
}

// LocalhostTownsArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostTownsArchitectCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostTownsArchitectTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostTownsArchitectFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostTownsArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostTownsArchitectSession struct {
	Contract     *LocalhostTownsArchitect // Generic contract binding to set the session for
	CallOpts     bind.CallOpts            // Call options to use throughout this session
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// LocalhostTownsArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostTownsArchitectCallerSession struct {
	Contract *LocalhostTownsArchitectCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                  // Call options to use throughout this session
}

// LocalhostTownsArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostTownsArchitectTransactorSession struct {
	Contract     *LocalhostTownsArchitectTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                  // Transaction auth options to use throughout this session
}

// LocalhostTownsArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostTownsArchitectRaw struct {
	Contract *LocalhostTownsArchitect // Generic contract binding to access the raw methods on
}

// LocalhostTownsArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostTownsArchitectCallerRaw struct {
	Contract *LocalhostTownsArchitectCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostTownsArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostTownsArchitectTransactorRaw struct {
	Contract *LocalhostTownsArchitectTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostTownsArchitect creates a new instance of LocalhostTownsArchitect, bound to a specific deployed contract.
func NewLocalhostTownsArchitect(address common.Address, backend bind.ContractBackend) (*LocalhostTownsArchitect, error) {
	contract, err := bindLocalhostTownsArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitect{LocalhostTownsArchitectCaller: LocalhostTownsArchitectCaller{contract: contract}, LocalhostTownsArchitectTransactor: LocalhostTownsArchitectTransactor{contract: contract}, LocalhostTownsArchitectFilterer: LocalhostTownsArchitectFilterer{contract: contract}}, nil
}

// NewLocalhostTownsArchitectCaller creates a new read-only instance of LocalhostTownsArchitect, bound to a specific deployed contract.
func NewLocalhostTownsArchitectCaller(address common.Address, caller bind.ContractCaller) (*LocalhostTownsArchitectCaller, error) {
	contract, err := bindLocalhostTownsArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectCaller{contract: contract}, nil
}

// NewLocalhostTownsArchitectTransactor creates a new write-only instance of LocalhostTownsArchitect, bound to a specific deployed contract.
func NewLocalhostTownsArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostTownsArchitectTransactor, error) {
	contract, err := bindLocalhostTownsArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectTransactor{contract: contract}, nil
}

// NewLocalhostTownsArchitectFilterer creates a new log filterer instance of LocalhostTownsArchitect, bound to a specific deployed contract.
func NewLocalhostTownsArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostTownsArchitectFilterer, error) {
	contract, err := bindLocalhostTownsArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectFilterer{contract: contract}, nil
}

// bindLocalhostTownsArchitect binds a generic wrapper to an already deployed contract.
func bindLocalhostTownsArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LocalhostTownsArchitectMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsArchitect *LocalhostTownsArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsArchitect.Contract.LocalhostTownsArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsArchitect *LocalhostTownsArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.LocalhostTownsArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsArchitect *LocalhostTownsArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.LocalhostTownsArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostTownsArchitect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.contract.Transact(opts, method, params...)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCaller) ComputeTown(opts *bind.CallOpts, townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	var out []interface{}
	err := _LocalhostTownsArchitect.contract.Call(opts, &out, "computeTown", townId, membership)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _LocalhostTownsArchitect.Contract.ComputeTown(&_LocalhostTownsArchitect.CallOpts, townId, membership)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCallerSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _LocalhostTownsArchitect.Contract.ComputeTown(&_LocalhostTownsArchitect.CallOpts, townId, membership)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCaller) GetTokenIdByTownId(opts *bind.CallOpts, townId string) (*big.Int, error) {
	var out []interface{}
	err := _LocalhostTownsArchitect.contract.Call(opts, &out, "getTokenIdByTownId", townId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _LocalhostTownsArchitect.Contract.GetTokenIdByTownId(&_LocalhostTownsArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCallerSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _LocalhostTownsArchitect.Contract.GetTokenIdByTownId(&_LocalhostTownsArchitect.CallOpts, townId)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCaller) GetTownArchitectImplementations(opts *bind.CallOpts) (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	var out []interface{}
	err := _LocalhostTownsArchitect.contract.Call(opts, &out, "getTownArchitectImplementations")

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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _LocalhostTownsArchitect.Contract.GetTownArchitectImplementations(&_LocalhostTownsArchitect.CallOpts)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCallerSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _LocalhostTownsArchitect.Contract.GetTownArchitectImplementations(&_LocalhostTownsArchitect.CallOpts)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCaller) GetTownById(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _LocalhostTownsArchitect.contract.Call(opts, &out, "getTownById", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) GetTownById(townId string) (common.Address, error) {
	return _LocalhostTownsArchitect.Contract.GetTownById(&_LocalhostTownsArchitect.CallOpts, townId)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCallerSession) GetTownById(townId string) (common.Address, error) {
	return _LocalhostTownsArchitect.Contract.GetTownById(&_LocalhostTownsArchitect.CallOpts, townId)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCaller) IsTokenGated(opts *bind.CallOpts, token common.Address) (bool, error) {
	var out []interface{}
	err := _LocalhostTownsArchitect.contract.Call(opts, &out, "isTokenGated", token)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) IsTokenGated(token common.Address) (bool, error) {
	return _LocalhostTownsArchitect.Contract.IsTokenGated(&_LocalhostTownsArchitect.CallOpts, token)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectCallerSession) IsTokenGated(token common.Address) (bool, error) {
	return _LocalhostTownsArchitect.Contract.IsTokenGated(&_LocalhostTownsArchitect.CallOpts, token)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactor) TownArchitectInit(opts *bind.TransactOpts, townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.contract.Transact(opts, "__TownArchitect_init", townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.TownArchitectInit(&_LocalhostTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactorSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.TownArchitectInit(&_LocalhostTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactor) CreateTown(opts *bind.TransactOpts, townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.contract.Transact(opts, "createTown", townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.CreateTown(&_LocalhostTownsArchitect.TransactOpts, townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactorSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.CreateTown(&_LocalhostTownsArchitect.TransactOpts, townInfo)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactor) GateByToken(opts *bind.TransactOpts, token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.contract.Transact(opts, "gateByToken", token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.GateByToken(&_LocalhostTownsArchitect.TransactOpts, token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactorSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.GateByToken(&_LocalhostTownsArchitect.TransactOpts, token, quantity)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactor) SetTownArchitectImplementations(opts *bind.TransactOpts, townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.contract.Transact(opts, "setTownArchitectImplementations", townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.SetTownArchitectImplementations(&_LocalhostTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactorSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.SetTownArchitectImplementations(&_LocalhostTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactor) UngateByToken(opts *bind.TransactOpts, token common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.contract.Transact(opts, "ungateByToken", token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.UngateByToken(&_LocalhostTownsArchitect.TransactOpts, token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_LocalhostTownsArchitect *LocalhostTownsArchitectTransactorSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _LocalhostTownsArchitect.Contract.UngateByToken(&_LocalhostTownsArchitect.TransactOpts, token)
}

// LocalhostTownsArchitectInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectInitializedIterator struct {
	Event *LocalhostTownsArchitectInitialized // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsArchitectInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsArchitectInitialized)
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
		it.Event = new(LocalhostTownsArchitectInitialized)
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
func (it *LocalhostTownsArchitectInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsArchitectInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsArchitectInitialized represents a Initialized event raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) FilterInitialized(opts *bind.FilterOpts) (*LocalhostTownsArchitectInitializedIterator, error) {

	logs, sub, err := _LocalhostTownsArchitect.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectInitializedIterator{contract: _LocalhostTownsArchitect.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *LocalhostTownsArchitectInitialized) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsArchitect.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsArchitectInitialized)
				if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) ParseInitialized(log types.Log) (*LocalhostTownsArchitectInitialized, error) {
	event := new(LocalhostTownsArchitectInitialized)
	if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsArchitectInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectInterfaceAddedIterator struct {
	Event *LocalhostTownsArchitectInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsArchitectInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsArchitectInterfaceAdded)
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
		it.Event = new(LocalhostTownsArchitectInterfaceAdded)
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
func (it *LocalhostTownsArchitectInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsArchitectInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsArchitectInterfaceAdded represents a InterfaceAdded event raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*LocalhostTownsArchitectInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectInterfaceAddedIterator{contract: _LocalhostTownsArchitect.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *LocalhostTownsArchitectInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsArchitectInterfaceAdded)
				if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) ParseInterfaceAdded(log types.Log) (*LocalhostTownsArchitectInterfaceAdded, error) {
	event := new(LocalhostTownsArchitectInterfaceAdded)
	if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsArchitectInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectInterfaceRemovedIterator struct {
	Event *LocalhostTownsArchitectInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsArchitectInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsArchitectInterfaceRemoved)
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
		it.Event = new(LocalhostTownsArchitectInterfaceRemoved)
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
func (it *LocalhostTownsArchitectInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsArchitectInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsArchitectInterfaceRemoved represents a InterfaceRemoved event raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*LocalhostTownsArchitectInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectInterfaceRemovedIterator{contract: _LocalhostTownsArchitect.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *LocalhostTownsArchitectInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsArchitectInterfaceRemoved)
				if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) ParseInterfaceRemoved(log types.Log) (*LocalhostTownsArchitectInterfaceRemoved, error) {
	event := new(LocalhostTownsArchitectInterfaceRemoved)
	if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsArchitectOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectOwnershipTransferredIterator struct {
	Event *LocalhostTownsArchitectOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsArchitectOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsArchitectOwnershipTransferred)
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
		it.Event = new(LocalhostTownsArchitectOwnershipTransferred)
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
func (it *LocalhostTownsArchitectOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsArchitectOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsArchitectOwnershipTransferred represents a OwnershipTransferred event raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*LocalhostTownsArchitectOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectOwnershipTransferredIterator{contract: _LocalhostTownsArchitect.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *LocalhostTownsArchitectOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsArchitectOwnershipTransferred)
				if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) ParseOwnershipTransferred(log types.Log) (*LocalhostTownsArchitectOwnershipTransferred, error) {
	event := new(LocalhostTownsArchitectOwnershipTransferred)
	if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsArchitectPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectPausedIterator struct {
	Event *LocalhostTownsArchitectPaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsArchitectPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsArchitectPaused)
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
		it.Event = new(LocalhostTownsArchitectPaused)
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
func (it *LocalhostTownsArchitectPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsArchitectPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsArchitectPaused represents a Paused event raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) FilterPaused(opts *bind.FilterOpts) (*LocalhostTownsArchitectPausedIterator, error) {

	logs, sub, err := _LocalhostTownsArchitect.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectPausedIterator{contract: _LocalhostTownsArchitect.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownsArchitectPaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsArchitect.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsArchitectPaused)
				if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) ParsePaused(log types.Log) (*LocalhostTownsArchitectPaused, error) {
	event := new(LocalhostTownsArchitectPaused)
	if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsArchitectTownCreatedIterator is returned from FilterTownCreated and is used to iterate over the raw logs and unpacked data for TownCreated events raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectTownCreatedIterator struct {
	Event *LocalhostTownsArchitectTownCreated // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsArchitectTownCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsArchitectTownCreated)
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
		it.Event = new(LocalhostTownsArchitectTownCreated)
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
func (it *LocalhostTownsArchitectTownCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsArchitectTownCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsArchitectTownCreated represents a TownCreated event raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectTownCreated struct {
	TownCreator common.Address
	TownId      *big.Int
	Town        common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterTownCreated is a free log retrieval operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) FilterTownCreated(opts *bind.FilterOpts, townCreator []common.Address, townId []*big.Int) (*LocalhostTownsArchitectTownCreatedIterator, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.FilterLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectTownCreatedIterator{contract: _LocalhostTownsArchitect.contract, event: "TownCreated", logs: logs, sub: sub}, nil
}

// WatchTownCreated is a free log subscription operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) WatchTownCreated(opts *bind.WatchOpts, sink chan<- *LocalhostTownsArchitectTownCreated, townCreator []common.Address, townId []*big.Int) (event.Subscription, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _LocalhostTownsArchitect.contract.WatchLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsArchitectTownCreated)
				if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) ParseTownCreated(log types.Log) (*LocalhostTownsArchitectTownCreated, error) {
	event := new(LocalhostTownsArchitectTownCreated)
	if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostTownsArchitectUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectUnpausedIterator struct {
	Event *LocalhostTownsArchitectUnpaused // Event containing the contract specifics and raw log

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
func (it *LocalhostTownsArchitectUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostTownsArchitectUnpaused)
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
		it.Event = new(LocalhostTownsArchitectUnpaused)
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
func (it *LocalhostTownsArchitectUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostTownsArchitectUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostTownsArchitectUnpaused represents a Unpaused event raised by the LocalhostTownsArchitect contract.
type LocalhostTownsArchitectUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) FilterUnpaused(opts *bind.FilterOpts) (*LocalhostTownsArchitectUnpausedIterator, error) {

	logs, sub, err := _LocalhostTownsArchitect.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &LocalhostTownsArchitectUnpausedIterator{contract: _LocalhostTownsArchitect.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *LocalhostTownsArchitectUnpaused) (event.Subscription, error) {

	logs, sub, err := _LocalhostTownsArchitect.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostTownsArchitectUnpaused)
				if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_LocalhostTownsArchitect *LocalhostTownsArchitectFilterer) ParseUnpaused(log types.Log) (*LocalhostTownsArchitectUnpaused, error) {
	event := new(LocalhostTownsArchitectUnpaused)
	if err := _LocalhostTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
