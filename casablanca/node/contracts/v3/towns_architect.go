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

// IMembershipBaseMembershipInfo is an auto generated low-level Go binding around an user-defined struct.
type IMembershipBaseMembershipInfo struct {
	Name         string
	Symbol       string
	Price        *big.Int
	MaxSupply    *big.Int
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

// TownsArchitectMetaData contains all meta data concerning the TownsArchitect contract.
var TownsArchitectMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Factory__FailedDeployment\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"GateFacetService__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ReentrancyGuard__ReentrantCall\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidNetworkId\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidStringLength\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__NotContract\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"townCreator\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"townId\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"TownCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townOwner\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"trustedForwarder\",\"type\":\"address\"}],\"name\":\"__TownArchitect_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"maxSupply\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"}],\"name\":\"computeTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"maxSupply\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"}],\"internalType\":\"structITownArchitectBase.ChannelInfo\",\"name\":\"channel\",\"type\":\"tuple\"}],\"internalType\":\"structITownArchitectBase.TownInfo\",\"name\":\"townInfo\",\"type\":\"tuple\"}],\"name\":\"createTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"}],\"name\":\"gateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"getTokenIdByTown\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTokenIdByTownId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getTownArchitectImplementations\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTownById\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"isTokenGated\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"isTown\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"name\":\"setTownArchitectImplementations\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"ungateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// TownsArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use TownsArchitectMetaData.ABI instead.
var TownsArchitectABI = TownsArchitectMetaData.ABI

// TownsArchitect is an auto generated Go binding around an Ethereum contract.
type TownsArchitect struct {
	TownsArchitectCaller     // Read-only binding to the contract
	TownsArchitectTransactor // Write-only binding to the contract
	TownsArchitectFilterer   // Log filterer for contract events
}

// TownsArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type TownsArchitectCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownsArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type TownsArchitectTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownsArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type TownsArchitectFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TownsArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type TownsArchitectSession struct {
	Contract     *TownsArchitect   // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// TownsArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type TownsArchitectCallerSession struct {
	Contract *TownsArchitectCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts         // Call options to use throughout this session
}

// TownsArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type TownsArchitectTransactorSession struct {
	Contract     *TownsArchitectTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts         // Transaction auth options to use throughout this session
}

// TownsArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type TownsArchitectRaw struct {
	Contract *TownsArchitect // Generic contract binding to access the raw methods on
}

// TownsArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type TownsArchitectCallerRaw struct {
	Contract *TownsArchitectCaller // Generic read-only contract binding to access the raw methods on
}

// TownsArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type TownsArchitectTransactorRaw struct {
	Contract *TownsArchitectTransactor // Generic write-only contract binding to access the raw methods on
}

// NewTownsArchitect creates a new instance of TownsArchitect, bound to a specific deployed contract.
func NewTownsArchitect(address common.Address, backend bind.ContractBackend) (*TownsArchitect, error) {
	contract, err := bindTownsArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &TownsArchitect{TownsArchitectCaller: TownsArchitectCaller{contract: contract}, TownsArchitectTransactor: TownsArchitectTransactor{contract: contract}, TownsArchitectFilterer: TownsArchitectFilterer{contract: contract}}, nil
}

// NewTownsArchitectCaller creates a new read-only instance of TownsArchitect, bound to a specific deployed contract.
func NewTownsArchitectCaller(address common.Address, caller bind.ContractCaller) (*TownsArchitectCaller, error) {
	contract, err := bindTownsArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &TownsArchitectCaller{contract: contract}, nil
}

// NewTownsArchitectTransactor creates a new write-only instance of TownsArchitect, bound to a specific deployed contract.
func NewTownsArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*TownsArchitectTransactor, error) {
	contract, err := bindTownsArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &TownsArchitectTransactor{contract: contract}, nil
}

// NewTownsArchitectFilterer creates a new log filterer instance of TownsArchitect, bound to a specific deployed contract.
func NewTownsArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*TownsArchitectFilterer, error) {
	contract, err := bindTownsArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &TownsArchitectFilterer{contract: contract}, nil
}

// bindTownsArchitect binds a generic wrapper to an already deployed contract.
func bindTownsArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := TownsArchitectMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TownsArchitect *TownsArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TownsArchitect.Contract.TownsArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TownsArchitect *TownsArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TownsArchitect.Contract.TownsArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TownsArchitect *TownsArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TownsArchitect.Contract.TownsArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TownsArchitect *TownsArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TownsArchitect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TownsArchitect *TownsArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TownsArchitect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TownsArchitect *TownsArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TownsArchitect.Contract.contract.Transact(opts, method, params...)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_TownsArchitect *TownsArchitectCaller) ComputeTown(opts *bind.CallOpts, townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	var out []interface{}
	err := _TownsArchitect.contract.Call(opts, &out, "computeTown", townId, membership)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_TownsArchitect *TownsArchitectSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _TownsArchitect.Contract.ComputeTown(&_TownsArchitect.CallOpts, townId, membership)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_TownsArchitect *TownsArchitectCallerSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _TownsArchitect.Contract.ComputeTown(&_TownsArchitect.CallOpts, townId, membership)
}

// GetTokenIdByTown is a free data retrieval call binding the contract method 0x40fb2169.
//
// Solidity: function getTokenIdByTown(address town) view returns(uint256)
func (_TownsArchitect *TownsArchitectCaller) GetTokenIdByTown(opts *bind.CallOpts, town common.Address) (*big.Int, error) {
	var out []interface{}
	err := _TownsArchitect.contract.Call(opts, &out, "getTokenIdByTown", town)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTown is a free data retrieval call binding the contract method 0x40fb2169.
//
// Solidity: function getTokenIdByTown(address town) view returns(uint256)
func (_TownsArchitect *TownsArchitectSession) GetTokenIdByTown(town common.Address) (*big.Int, error) {
	return _TownsArchitect.Contract.GetTokenIdByTown(&_TownsArchitect.CallOpts, town)
}

// GetTokenIdByTown is a free data retrieval call binding the contract method 0x40fb2169.
//
// Solidity: function getTokenIdByTown(address town) view returns(uint256)
func (_TownsArchitect *TownsArchitectCallerSession) GetTokenIdByTown(town common.Address) (*big.Int, error) {
	return _TownsArchitect.Contract.GetTokenIdByTown(&_TownsArchitect.CallOpts, town)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_TownsArchitect *TownsArchitectCaller) GetTokenIdByTownId(opts *bind.CallOpts, townId string) (*big.Int, error) {
	var out []interface{}
	err := _TownsArchitect.contract.Call(opts, &out, "getTokenIdByTownId", townId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_TownsArchitect *TownsArchitectSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _TownsArchitect.Contract.GetTokenIdByTownId(&_TownsArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_TownsArchitect *TownsArchitectCallerSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _TownsArchitect.Contract.GetTokenIdByTownId(&_TownsArchitect.CallOpts, townId)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_TownsArchitect *TownsArchitectCaller) GetTownArchitectImplementations(opts *bind.CallOpts) (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	var out []interface{}
	err := _TownsArchitect.contract.Call(opts, &out, "getTownArchitectImplementations")

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
func (_TownsArchitect *TownsArchitectSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _TownsArchitect.Contract.GetTownArchitectImplementations(&_TownsArchitect.CallOpts)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_TownsArchitect *TownsArchitectCallerSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _TownsArchitect.Contract.GetTownArchitectImplementations(&_TownsArchitect.CallOpts)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_TownsArchitect *TownsArchitectCaller) GetTownById(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _TownsArchitect.contract.Call(opts, &out, "getTownById", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_TownsArchitect *TownsArchitectSession) GetTownById(townId string) (common.Address, error) {
	return _TownsArchitect.Contract.GetTownById(&_TownsArchitect.CallOpts, townId)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_TownsArchitect *TownsArchitectCallerSession) GetTownById(townId string) (common.Address, error) {
	return _TownsArchitect.Contract.GetTownById(&_TownsArchitect.CallOpts, townId)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_TownsArchitect *TownsArchitectCaller) IsTokenGated(opts *bind.CallOpts, token common.Address) (bool, error) {
	var out []interface{}
	err := _TownsArchitect.contract.Call(opts, &out, "isTokenGated", token)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_TownsArchitect *TownsArchitectSession) IsTokenGated(token common.Address) (bool, error) {
	return _TownsArchitect.Contract.IsTokenGated(&_TownsArchitect.CallOpts, token)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_TownsArchitect *TownsArchitectCallerSession) IsTokenGated(token common.Address) (bool, error) {
	return _TownsArchitect.Contract.IsTokenGated(&_TownsArchitect.CallOpts, token)
}

// IsTown is a free data retrieval call binding the contract method 0x820f4a71.
//
// Solidity: function isTown(address town) view returns(bool)
func (_TownsArchitect *TownsArchitectCaller) IsTown(opts *bind.CallOpts, town common.Address) (bool, error) {
	var out []interface{}
	err := _TownsArchitect.contract.Call(opts, &out, "isTown", town)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTown is a free data retrieval call binding the contract method 0x820f4a71.
//
// Solidity: function isTown(address town) view returns(bool)
func (_TownsArchitect *TownsArchitectSession) IsTown(town common.Address) (bool, error) {
	return _TownsArchitect.Contract.IsTown(&_TownsArchitect.CallOpts, town)
}

// IsTown is a free data retrieval call binding the contract method 0x820f4a71.
//
// Solidity: function isTown(address town) view returns(bool)
func (_TownsArchitect *TownsArchitectCallerSession) IsTown(town common.Address) (bool, error) {
	return _TownsArchitect.Contract.IsTown(&_TownsArchitect.CallOpts, town)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_TownsArchitect *TownsArchitectTransactor) TownArchitectInit(opts *bind.TransactOpts, townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _TownsArchitect.contract.Transact(opts, "__TownArchitect_init", townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_TownsArchitect *TownsArchitectSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _TownsArchitect.Contract.TownArchitectInit(&_TownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_TownsArchitect *TownsArchitectTransactorSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _TownsArchitect.Contract.TownArchitectInit(&_TownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_TownsArchitect *TownsArchitectTransactor) CreateTown(opts *bind.TransactOpts, townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _TownsArchitect.contract.Transact(opts, "createTown", townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_TownsArchitect *TownsArchitectSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _TownsArchitect.Contract.CreateTown(&_TownsArchitect.TransactOpts, townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_TownsArchitect *TownsArchitectTransactorSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _TownsArchitect.Contract.CreateTown(&_TownsArchitect.TransactOpts, townInfo)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_TownsArchitect *TownsArchitectTransactor) GateByToken(opts *bind.TransactOpts, token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _TownsArchitect.contract.Transact(opts, "gateByToken", token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_TownsArchitect *TownsArchitectSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _TownsArchitect.Contract.GateByToken(&_TownsArchitect.TransactOpts, token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_TownsArchitect *TownsArchitectTransactorSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _TownsArchitect.Contract.GateByToken(&_TownsArchitect.TransactOpts, token, quantity)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownsArchitect *TownsArchitectTransactor) SetTownArchitectImplementations(opts *bind.TransactOpts, townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownsArchitect.contract.Transact(opts, "setTownArchitectImplementations", townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownsArchitect *TownsArchitectSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownsArchitect.Contract.SetTownArchitectImplementations(&_TownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_TownsArchitect *TownsArchitectTransactorSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _TownsArchitect.Contract.SetTownArchitectImplementations(&_TownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_TownsArchitect *TownsArchitectTransactor) UngateByToken(opts *bind.TransactOpts, token common.Address) (*types.Transaction, error) {
	return _TownsArchitect.contract.Transact(opts, "ungateByToken", token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_TownsArchitect *TownsArchitectSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _TownsArchitect.Contract.UngateByToken(&_TownsArchitect.TransactOpts, token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_TownsArchitect *TownsArchitectTransactorSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _TownsArchitect.Contract.UngateByToken(&_TownsArchitect.TransactOpts, token)
}

// TownsArchitectInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the TownsArchitect contract.
type TownsArchitectInitializedIterator struct {
	Event *TownsArchitectInitialized // Event containing the contract specifics and raw log

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
func (it *TownsArchitectInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsArchitectInitialized)
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
		it.Event = new(TownsArchitectInitialized)
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
func (it *TownsArchitectInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsArchitectInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsArchitectInitialized represents a Initialized event raised by the TownsArchitect contract.
type TownsArchitectInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_TownsArchitect *TownsArchitectFilterer) FilterInitialized(opts *bind.FilterOpts) (*TownsArchitectInitializedIterator, error) {

	logs, sub, err := _TownsArchitect.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &TownsArchitectInitializedIterator{contract: _TownsArchitect.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_TownsArchitect *TownsArchitectFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *TownsArchitectInitialized) (event.Subscription, error) {

	logs, sub, err := _TownsArchitect.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsArchitectInitialized)
				if err := _TownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_TownsArchitect *TownsArchitectFilterer) ParseInitialized(log types.Log) (*TownsArchitectInitialized, error) {
	event := new(TownsArchitectInitialized)
	if err := _TownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownsArchitectInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the TownsArchitect contract.
type TownsArchitectInterfaceAddedIterator struct {
	Event *TownsArchitectInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *TownsArchitectInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsArchitectInterfaceAdded)
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
		it.Event = new(TownsArchitectInterfaceAdded)
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
func (it *TownsArchitectInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsArchitectInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsArchitectInterfaceAdded represents a InterfaceAdded event raised by the TownsArchitect contract.
type TownsArchitectInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_TownsArchitect *TownsArchitectFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*TownsArchitectInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownsArchitect.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &TownsArchitectInterfaceAddedIterator{contract: _TownsArchitect.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_TownsArchitect *TownsArchitectFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *TownsArchitectInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownsArchitect.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsArchitectInterfaceAdded)
				if err := _TownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_TownsArchitect *TownsArchitectFilterer) ParseInterfaceAdded(log types.Log) (*TownsArchitectInterfaceAdded, error) {
	event := new(TownsArchitectInterfaceAdded)
	if err := _TownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownsArchitectInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the TownsArchitect contract.
type TownsArchitectInterfaceRemovedIterator struct {
	Event *TownsArchitectInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *TownsArchitectInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsArchitectInterfaceRemoved)
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
		it.Event = new(TownsArchitectInterfaceRemoved)
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
func (it *TownsArchitectInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsArchitectInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsArchitectInterfaceRemoved represents a InterfaceRemoved event raised by the TownsArchitect contract.
type TownsArchitectInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_TownsArchitect *TownsArchitectFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*TownsArchitectInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownsArchitect.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &TownsArchitectInterfaceRemovedIterator{contract: _TownsArchitect.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_TownsArchitect *TownsArchitectFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *TownsArchitectInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _TownsArchitect.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsArchitectInterfaceRemoved)
				if err := _TownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_TownsArchitect *TownsArchitectFilterer) ParseInterfaceRemoved(log types.Log) (*TownsArchitectInterfaceRemoved, error) {
	event := new(TownsArchitectInterfaceRemoved)
	if err := _TownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownsArchitectOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the TownsArchitect contract.
type TownsArchitectOwnershipTransferredIterator struct {
	Event *TownsArchitectOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *TownsArchitectOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsArchitectOwnershipTransferred)
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
		it.Event = new(TownsArchitectOwnershipTransferred)
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
func (it *TownsArchitectOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsArchitectOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsArchitectOwnershipTransferred represents a OwnershipTransferred event raised by the TownsArchitect contract.
type TownsArchitectOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_TownsArchitect *TownsArchitectFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*TownsArchitectOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _TownsArchitect.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &TownsArchitectOwnershipTransferredIterator{contract: _TownsArchitect.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_TownsArchitect *TownsArchitectFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *TownsArchitectOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _TownsArchitect.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsArchitectOwnershipTransferred)
				if err := _TownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_TownsArchitect *TownsArchitectFilterer) ParseOwnershipTransferred(log types.Log) (*TownsArchitectOwnershipTransferred, error) {
	event := new(TownsArchitectOwnershipTransferred)
	if err := _TownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownsArchitectPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the TownsArchitect contract.
type TownsArchitectPausedIterator struct {
	Event *TownsArchitectPaused // Event containing the contract specifics and raw log

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
func (it *TownsArchitectPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsArchitectPaused)
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
		it.Event = new(TownsArchitectPaused)
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
func (it *TownsArchitectPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsArchitectPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsArchitectPaused represents a Paused event raised by the TownsArchitect contract.
type TownsArchitectPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_TownsArchitect *TownsArchitectFilterer) FilterPaused(opts *bind.FilterOpts) (*TownsArchitectPausedIterator, error) {

	logs, sub, err := _TownsArchitect.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &TownsArchitectPausedIterator{contract: _TownsArchitect.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_TownsArchitect *TownsArchitectFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *TownsArchitectPaused) (event.Subscription, error) {

	logs, sub, err := _TownsArchitect.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsArchitectPaused)
				if err := _TownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_TownsArchitect *TownsArchitectFilterer) ParsePaused(log types.Log) (*TownsArchitectPaused, error) {
	event := new(TownsArchitectPaused)
	if err := _TownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownsArchitectTownCreatedIterator is returned from FilterTownCreated and is used to iterate over the raw logs and unpacked data for TownCreated events raised by the TownsArchitect contract.
type TownsArchitectTownCreatedIterator struct {
	Event *TownsArchitectTownCreated // Event containing the contract specifics and raw log

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
func (it *TownsArchitectTownCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsArchitectTownCreated)
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
		it.Event = new(TownsArchitectTownCreated)
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
func (it *TownsArchitectTownCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsArchitectTownCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsArchitectTownCreated represents a TownCreated event raised by the TownsArchitect contract.
type TownsArchitectTownCreated struct {
	TownCreator common.Address
	TownId      *big.Int
	Town        common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterTownCreated is a free log retrieval operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_TownsArchitect *TownsArchitectFilterer) FilterTownCreated(opts *bind.FilterOpts, townCreator []common.Address, townId []*big.Int) (*TownsArchitectTownCreatedIterator, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _TownsArchitect.contract.FilterLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return &TownsArchitectTownCreatedIterator{contract: _TownsArchitect.contract, event: "TownCreated", logs: logs, sub: sub}, nil
}

// WatchTownCreated is a free log subscription operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_TownsArchitect *TownsArchitectFilterer) WatchTownCreated(opts *bind.WatchOpts, sink chan<- *TownsArchitectTownCreated, townCreator []common.Address, townId []*big.Int) (event.Subscription, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _TownsArchitect.contract.WatchLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsArchitectTownCreated)
				if err := _TownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
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
func (_TownsArchitect *TownsArchitectFilterer) ParseTownCreated(log types.Log) (*TownsArchitectTownCreated, error) {
	event := new(TownsArchitectTownCreated)
	if err := _TownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TownsArchitectUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the TownsArchitect contract.
type TownsArchitectUnpausedIterator struct {
	Event *TownsArchitectUnpaused // Event containing the contract specifics and raw log

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
func (it *TownsArchitectUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TownsArchitectUnpaused)
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
		it.Event = new(TownsArchitectUnpaused)
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
func (it *TownsArchitectUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TownsArchitectUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TownsArchitectUnpaused represents a Unpaused event raised by the TownsArchitect contract.
type TownsArchitectUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_TownsArchitect *TownsArchitectFilterer) FilterUnpaused(opts *bind.FilterOpts) (*TownsArchitectUnpausedIterator, error) {

	logs, sub, err := _TownsArchitect.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &TownsArchitectUnpausedIterator{contract: _TownsArchitect.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_TownsArchitect *TownsArchitectFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *TownsArchitectUnpaused) (event.Subscription, error) {

	logs, sub, err := _TownsArchitect.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TownsArchitectUnpaused)
				if err := _TownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_TownsArchitect *TownsArchitectFilterer) ParseUnpaused(log types.Log) (*TownsArchitectUnpaused, error) {
	event := new(TownsArchitectUnpaused)
	if err := _TownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
