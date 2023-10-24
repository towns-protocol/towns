// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_goerli_towns_architect

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

// BaseGoerliTownsArchitectMetaData contains all meta data concerning the BaseGoerliTownsArchitect contract.
var BaseGoerliTownsArchitectMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Factory__FailedDeployment\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"GateFacetService__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ReentrancyGuard__ReentrantCall\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidNetworkId\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidStringLength\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__NotContract\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"townCreator\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"townId\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"TownCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townOwner\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"trustedForwarder\",\"type\":\"address\"}],\"name\":\"__TownArchitect_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"limit\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"}],\"name\":\"computeTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"limit\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"}],\"internalType\":\"structITownArchitectBase.ChannelInfo\",\"name\":\"channel\",\"type\":\"tuple\"}],\"internalType\":\"structITownArchitectBase.TownInfo\",\"name\":\"townInfo\",\"type\":\"tuple\"}],\"name\":\"createTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"}],\"name\":\"gateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTokenIdByTownId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getTownArchitectImplementations\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTownById\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"isTokenGated\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"name\":\"setTownArchitectImplementations\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"ungateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// BaseGoerliTownsArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseGoerliTownsArchitectMetaData.ABI instead.
var BaseGoerliTownsArchitectABI = BaseGoerliTownsArchitectMetaData.ABI

// BaseGoerliTownsArchitect is an auto generated Go binding around an Ethereum contract.
type BaseGoerliTownsArchitect struct {
	BaseGoerliTownsArchitectCaller     // Read-only binding to the contract
	BaseGoerliTownsArchitectTransactor // Write-only binding to the contract
	BaseGoerliTownsArchitectFilterer   // Log filterer for contract events
}

// BaseGoerliTownsArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseGoerliTownsArchitectCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseGoerliTownsArchitectTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseGoerliTownsArchitectFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseGoerliTownsArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseGoerliTownsArchitectSession struct {
	Contract     *BaseGoerliTownsArchitect // Generic contract binding to set the session for
	CallOpts     bind.CallOpts             // Call options to use throughout this session
	TransactOpts bind.TransactOpts         // Transaction auth options to use throughout this session
}

// BaseGoerliTownsArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseGoerliTownsArchitectCallerSession struct {
	Contract *BaseGoerliTownsArchitectCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                   // Call options to use throughout this session
}

// BaseGoerliTownsArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseGoerliTownsArchitectTransactorSession struct {
	Contract     *BaseGoerliTownsArchitectTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                   // Transaction auth options to use throughout this session
}

// BaseGoerliTownsArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseGoerliTownsArchitectRaw struct {
	Contract *BaseGoerliTownsArchitect // Generic contract binding to access the raw methods on
}

// BaseGoerliTownsArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseGoerliTownsArchitectCallerRaw struct {
	Contract *BaseGoerliTownsArchitectCaller // Generic read-only contract binding to access the raw methods on
}

// BaseGoerliTownsArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseGoerliTownsArchitectTransactorRaw struct {
	Contract *BaseGoerliTownsArchitectTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseGoerliTownsArchitect creates a new instance of BaseGoerliTownsArchitect, bound to a specific deployed contract.
func NewBaseGoerliTownsArchitect(address common.Address, backend bind.ContractBackend) (*BaseGoerliTownsArchitect, error) {
	contract, err := bindBaseGoerliTownsArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitect{BaseGoerliTownsArchitectCaller: BaseGoerliTownsArchitectCaller{contract: contract}, BaseGoerliTownsArchitectTransactor: BaseGoerliTownsArchitectTransactor{contract: contract}, BaseGoerliTownsArchitectFilterer: BaseGoerliTownsArchitectFilterer{contract: contract}}, nil
}

// NewBaseGoerliTownsArchitectCaller creates a new read-only instance of BaseGoerliTownsArchitect, bound to a specific deployed contract.
func NewBaseGoerliTownsArchitectCaller(address common.Address, caller bind.ContractCaller) (*BaseGoerliTownsArchitectCaller, error) {
	contract, err := bindBaseGoerliTownsArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectCaller{contract: contract}, nil
}

// NewBaseGoerliTownsArchitectTransactor creates a new write-only instance of BaseGoerliTownsArchitect, bound to a specific deployed contract.
func NewBaseGoerliTownsArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseGoerliTownsArchitectTransactor, error) {
	contract, err := bindBaseGoerliTownsArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectTransactor{contract: contract}, nil
}

// NewBaseGoerliTownsArchitectFilterer creates a new log filterer instance of BaseGoerliTownsArchitect, bound to a specific deployed contract.
func NewBaseGoerliTownsArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseGoerliTownsArchitectFilterer, error) {
	contract, err := bindBaseGoerliTownsArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectFilterer{contract: contract}, nil
}

// bindBaseGoerliTownsArchitect binds a generic wrapper to an already deployed contract.
func bindBaseGoerliTownsArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseGoerliTownsArchitectMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsArchitect.Contract.BaseGoerliTownsArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.BaseGoerliTownsArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.BaseGoerliTownsArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseGoerliTownsArchitect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.contract.Transact(opts, method, params...)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCaller) ComputeTown(opts *bind.CallOpts, townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	var out []interface{}
	err := _BaseGoerliTownsArchitect.contract.Call(opts, &out, "computeTown", townId, membership)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _BaseGoerliTownsArchitect.Contract.ComputeTown(&_BaseGoerliTownsArchitect.CallOpts, townId, membership)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCallerSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _BaseGoerliTownsArchitect.Contract.ComputeTown(&_BaseGoerliTownsArchitect.CallOpts, townId, membership)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCaller) GetTokenIdByTownId(opts *bind.CallOpts, townId string) (*big.Int, error) {
	var out []interface{}
	err := _BaseGoerliTownsArchitect.contract.Call(opts, &out, "getTokenIdByTownId", townId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _BaseGoerliTownsArchitect.Contract.GetTokenIdByTownId(&_BaseGoerliTownsArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCallerSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _BaseGoerliTownsArchitect.Contract.GetTokenIdByTownId(&_BaseGoerliTownsArchitect.CallOpts, townId)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCaller) GetTownArchitectImplementations(opts *bind.CallOpts) (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	var out []interface{}
	err := _BaseGoerliTownsArchitect.contract.Call(opts, &out, "getTownArchitectImplementations")

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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _BaseGoerliTownsArchitect.Contract.GetTownArchitectImplementations(&_BaseGoerliTownsArchitect.CallOpts)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCallerSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _BaseGoerliTownsArchitect.Contract.GetTownArchitectImplementations(&_BaseGoerliTownsArchitect.CallOpts)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCaller) GetTownById(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _BaseGoerliTownsArchitect.contract.Call(opts, &out, "getTownById", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) GetTownById(townId string) (common.Address, error) {
	return _BaseGoerliTownsArchitect.Contract.GetTownById(&_BaseGoerliTownsArchitect.CallOpts, townId)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCallerSession) GetTownById(townId string) (common.Address, error) {
	return _BaseGoerliTownsArchitect.Contract.GetTownById(&_BaseGoerliTownsArchitect.CallOpts, townId)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCaller) IsTokenGated(opts *bind.CallOpts, token common.Address) (bool, error) {
	var out []interface{}
	err := _BaseGoerliTownsArchitect.contract.Call(opts, &out, "isTokenGated", token)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) IsTokenGated(token common.Address) (bool, error) {
	return _BaseGoerliTownsArchitect.Contract.IsTokenGated(&_BaseGoerliTownsArchitect.CallOpts, token)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectCallerSession) IsTokenGated(token common.Address) (bool, error) {
	return _BaseGoerliTownsArchitect.Contract.IsTokenGated(&_BaseGoerliTownsArchitect.CallOpts, token)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactor) TownArchitectInit(opts *bind.TransactOpts, townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.contract.Transact(opts, "__TownArchitect_init", townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.TownArchitectInit(&_BaseGoerliTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactorSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.TownArchitectInit(&_BaseGoerliTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactor) CreateTown(opts *bind.TransactOpts, townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.contract.Transact(opts, "createTown", townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.CreateTown(&_BaseGoerliTownsArchitect.TransactOpts, townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactorSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.CreateTown(&_BaseGoerliTownsArchitect.TransactOpts, townInfo)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactor) GateByToken(opts *bind.TransactOpts, token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.contract.Transact(opts, "gateByToken", token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.GateByToken(&_BaseGoerliTownsArchitect.TransactOpts, token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactorSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.GateByToken(&_BaseGoerliTownsArchitect.TransactOpts, token, quantity)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactor) SetTownArchitectImplementations(opts *bind.TransactOpts, townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.contract.Transact(opts, "setTownArchitectImplementations", townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.SetTownArchitectImplementations(&_BaseGoerliTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactorSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.SetTownArchitectImplementations(&_BaseGoerliTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactor) UngateByToken(opts *bind.TransactOpts, token common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.contract.Transact(opts, "ungateByToken", token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.UngateByToken(&_BaseGoerliTownsArchitect.TransactOpts, token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectTransactorSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _BaseGoerliTownsArchitect.Contract.UngateByToken(&_BaseGoerliTownsArchitect.TransactOpts, token)
}

// BaseGoerliTownsArchitectInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectInitializedIterator struct {
	Event *BaseGoerliTownsArchitectInitialized // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsArchitectInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsArchitectInitialized)
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
		it.Event = new(BaseGoerliTownsArchitectInitialized)
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
func (it *BaseGoerliTownsArchitectInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsArchitectInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsArchitectInitialized represents a Initialized event raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) FilterInitialized(opts *bind.FilterOpts) (*BaseGoerliTownsArchitectInitializedIterator, error) {

	logs, sub, err := _BaseGoerliTownsArchitect.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectInitializedIterator{contract: _BaseGoerliTownsArchitect.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsArchitectInitialized) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsArchitect.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsArchitectInitialized)
				if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) ParseInitialized(log types.Log) (*BaseGoerliTownsArchitectInitialized, error) {
	event := new(BaseGoerliTownsArchitectInitialized)
	if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsArchitectInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectInterfaceAddedIterator struct {
	Event *BaseGoerliTownsArchitectInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsArchitectInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsArchitectInterfaceAdded)
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
		it.Event = new(BaseGoerliTownsArchitectInterfaceAdded)
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
func (it *BaseGoerliTownsArchitectInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsArchitectInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsArchitectInterfaceAdded represents a InterfaceAdded event raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseGoerliTownsArchitectInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectInterfaceAddedIterator{contract: _BaseGoerliTownsArchitect.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsArchitectInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsArchitectInterfaceAdded)
				if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) ParseInterfaceAdded(log types.Log) (*BaseGoerliTownsArchitectInterfaceAdded, error) {
	event := new(BaseGoerliTownsArchitectInterfaceAdded)
	if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsArchitectInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectInterfaceRemovedIterator struct {
	Event *BaseGoerliTownsArchitectInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsArchitectInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsArchitectInterfaceRemoved)
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
		it.Event = new(BaseGoerliTownsArchitectInterfaceRemoved)
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
func (it *BaseGoerliTownsArchitectInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsArchitectInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsArchitectInterfaceRemoved represents a InterfaceRemoved event raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseGoerliTownsArchitectInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectInterfaceRemovedIterator{contract: _BaseGoerliTownsArchitect.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsArchitectInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsArchitectInterfaceRemoved)
				if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) ParseInterfaceRemoved(log types.Log) (*BaseGoerliTownsArchitectInterfaceRemoved, error) {
	event := new(BaseGoerliTownsArchitectInterfaceRemoved)
	if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsArchitectOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectOwnershipTransferredIterator struct {
	Event *BaseGoerliTownsArchitectOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsArchitectOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsArchitectOwnershipTransferred)
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
		it.Event = new(BaseGoerliTownsArchitectOwnershipTransferred)
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
func (it *BaseGoerliTownsArchitectOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsArchitectOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsArchitectOwnershipTransferred represents a OwnershipTransferred event raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*BaseGoerliTownsArchitectOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectOwnershipTransferredIterator{contract: _BaseGoerliTownsArchitect.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsArchitectOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsArchitectOwnershipTransferred)
				if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) ParseOwnershipTransferred(log types.Log) (*BaseGoerliTownsArchitectOwnershipTransferred, error) {
	event := new(BaseGoerliTownsArchitectOwnershipTransferred)
	if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsArchitectPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectPausedIterator struct {
	Event *BaseGoerliTownsArchitectPaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsArchitectPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsArchitectPaused)
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
		it.Event = new(BaseGoerliTownsArchitectPaused)
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
func (it *BaseGoerliTownsArchitectPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsArchitectPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsArchitectPaused represents a Paused event raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseGoerliTownsArchitectPausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsArchitect.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectPausedIterator{contract: _BaseGoerliTownsArchitect.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsArchitectPaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsArchitect.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsArchitectPaused)
				if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) ParsePaused(log types.Log) (*BaseGoerliTownsArchitectPaused, error) {
	event := new(BaseGoerliTownsArchitectPaused)
	if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsArchitectTownCreatedIterator is returned from FilterTownCreated and is used to iterate over the raw logs and unpacked data for TownCreated events raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectTownCreatedIterator struct {
	Event *BaseGoerliTownsArchitectTownCreated // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsArchitectTownCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsArchitectTownCreated)
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
		it.Event = new(BaseGoerliTownsArchitectTownCreated)
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
func (it *BaseGoerliTownsArchitectTownCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsArchitectTownCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsArchitectTownCreated represents a TownCreated event raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectTownCreated struct {
	TownCreator common.Address
	TownId      *big.Int
	Town        common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterTownCreated is a free log retrieval operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) FilterTownCreated(opts *bind.FilterOpts, townCreator []common.Address, townId []*big.Int) (*BaseGoerliTownsArchitectTownCreatedIterator, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.FilterLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectTownCreatedIterator{contract: _BaseGoerliTownsArchitect.contract, event: "TownCreated", logs: logs, sub: sub}, nil
}

// WatchTownCreated is a free log subscription operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) WatchTownCreated(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsArchitectTownCreated, townCreator []common.Address, townId []*big.Int) (event.Subscription, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _BaseGoerliTownsArchitect.contract.WatchLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsArchitectTownCreated)
				if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) ParseTownCreated(log types.Log) (*BaseGoerliTownsArchitectTownCreated, error) {
	event := new(BaseGoerliTownsArchitectTownCreated)
	if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseGoerliTownsArchitectUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectUnpausedIterator struct {
	Event *BaseGoerliTownsArchitectUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseGoerliTownsArchitectUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseGoerliTownsArchitectUnpaused)
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
		it.Event = new(BaseGoerliTownsArchitectUnpaused)
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
func (it *BaseGoerliTownsArchitectUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseGoerliTownsArchitectUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseGoerliTownsArchitectUnpaused represents a Unpaused event raised by the BaseGoerliTownsArchitect contract.
type BaseGoerliTownsArchitectUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseGoerliTownsArchitectUnpausedIterator, error) {

	logs, sub, err := _BaseGoerliTownsArchitect.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseGoerliTownsArchitectUnpausedIterator{contract: _BaseGoerliTownsArchitect.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseGoerliTownsArchitectUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseGoerliTownsArchitect.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseGoerliTownsArchitectUnpaused)
				if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_BaseGoerliTownsArchitect *BaseGoerliTownsArchitectFilterer) ParseUnpaused(log types.Log) (*BaseGoerliTownsArchitectUnpaused, error) {
	event := new(BaseGoerliTownsArchitectUnpaused)
	if err := _BaseGoerliTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
