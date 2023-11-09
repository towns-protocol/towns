// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base_towns_architect

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

// BaseTownsArchitectMetaData contains all meta data concerning the BaseTownsArchitect contract.
var BaseTownsArchitectMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"name\":\"Factory__FailedDeployment\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"GateFacetService__NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_InInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Initializable_NotInInitializingState\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_AlreadySupported\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Introspection_NotSupported\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Ownable__NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Ownable__ZeroAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__NotPaused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Pausable__Paused\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ReentrancyGuard__ReentrantCall\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidNetworkId\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__InvalidStringLength\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TownArchitect__NotContract\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidAddress\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"Validator__InvalidStringLength\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"version\",\"type\":\"uint32\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceAdded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"InterfaceRemoved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"townCreator\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"townId\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"TownCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townOwner\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"trustedForwarder\",\"type\":\"address\"}],\"name\":\"__TownArchitect_init\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"limit\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"}],\"name\":\"computeTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"components\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"symbol\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"price\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"limit\",\"type\":\"uint256\"},{\"internalType\":\"uint64\",\"name\":\"duration\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"currency\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"feeRecipient\",\"type\":\"address\"}],\"internalType\":\"structIMembershipBase.MembershipInfo\",\"name\":\"settings\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"bool\",\"name\":\"everyone\",\"type\":\"bool\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structITokenEntitlement.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structITownArchitectBase.MembershipRequirements\",\"name\":\"requirements\",\"type\":\"tuple\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"}],\"internalType\":\"structITownArchitectBase.Membership\",\"name\":\"membership\",\"type\":\"tuple\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"id\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"metadata\",\"type\":\"string\"}],\"internalType\":\"structITownArchitectBase.ChannelInfo\",\"name\":\"channel\",\"type\":\"tuple\"}],\"internalType\":\"structITownArchitectBase.TownInfo\",\"name\":\"townInfo\",\"type\":\"tuple\"}],\"name\":\"createTown\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"}],\"name\":\"gateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"getTokenIdByTown\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTokenIdByTownId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getTownArchitectImplementations\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"townId\",\"type\":\"string\"}],\"name\":\"getTownById\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"isTokenGated\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"town\",\"type\":\"address\"}],\"name\":\"isTown\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"townToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"userEntitlementImplementation\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"tokenEntitlementImplementation\",\"type\":\"address\"}],\"name\":\"setTownArchitectImplementations\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"token\",\"type\":\"address\"}],\"name\":\"ungateByToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// BaseTownsArchitectABI is the input ABI used to generate the binding from.
// Deprecated: Use BaseTownsArchitectMetaData.ABI instead.
var BaseTownsArchitectABI = BaseTownsArchitectMetaData.ABI

// BaseTownsArchitect is an auto generated Go binding around an Ethereum contract.
type BaseTownsArchitect struct {
	BaseTownsArchitectCaller     // Read-only binding to the contract
	BaseTownsArchitectTransactor // Write-only binding to the contract
	BaseTownsArchitectFilterer   // Log filterer for contract events
}

// BaseTownsArchitectCaller is an auto generated read-only Go binding around an Ethereum contract.
type BaseTownsArchitectCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsArchitectTransactor is an auto generated write-only Go binding around an Ethereum contract.
type BaseTownsArchitectTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsArchitectFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type BaseTownsArchitectFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// BaseTownsArchitectSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type BaseTownsArchitectSession struct {
	Contract     *BaseTownsArchitect // Generic contract binding to set the session for
	CallOpts     bind.CallOpts       // Call options to use throughout this session
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// BaseTownsArchitectCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type BaseTownsArchitectCallerSession struct {
	Contract *BaseTownsArchitectCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts             // Call options to use throughout this session
}

// BaseTownsArchitectTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type BaseTownsArchitectTransactorSession struct {
	Contract     *BaseTownsArchitectTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts             // Transaction auth options to use throughout this session
}

// BaseTownsArchitectRaw is an auto generated low-level Go binding around an Ethereum contract.
type BaseTownsArchitectRaw struct {
	Contract *BaseTownsArchitect // Generic contract binding to access the raw methods on
}

// BaseTownsArchitectCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type BaseTownsArchitectCallerRaw struct {
	Contract *BaseTownsArchitectCaller // Generic read-only contract binding to access the raw methods on
}

// BaseTownsArchitectTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type BaseTownsArchitectTransactorRaw struct {
	Contract *BaseTownsArchitectTransactor // Generic write-only contract binding to access the raw methods on
}

// NewBaseTownsArchitect creates a new instance of BaseTownsArchitect, bound to a specific deployed contract.
func NewBaseTownsArchitect(address common.Address, backend bind.ContractBackend) (*BaseTownsArchitect, error) {
	contract, err := bindBaseTownsArchitect(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitect{BaseTownsArchitectCaller: BaseTownsArchitectCaller{contract: contract}, BaseTownsArchitectTransactor: BaseTownsArchitectTransactor{contract: contract}, BaseTownsArchitectFilterer: BaseTownsArchitectFilterer{contract: contract}}, nil
}

// NewBaseTownsArchitectCaller creates a new read-only instance of BaseTownsArchitect, bound to a specific deployed contract.
func NewBaseTownsArchitectCaller(address common.Address, caller bind.ContractCaller) (*BaseTownsArchitectCaller, error) {
	contract, err := bindBaseTownsArchitect(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectCaller{contract: contract}, nil
}

// NewBaseTownsArchitectTransactor creates a new write-only instance of BaseTownsArchitect, bound to a specific deployed contract.
func NewBaseTownsArchitectTransactor(address common.Address, transactor bind.ContractTransactor) (*BaseTownsArchitectTransactor, error) {
	contract, err := bindBaseTownsArchitect(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectTransactor{contract: contract}, nil
}

// NewBaseTownsArchitectFilterer creates a new log filterer instance of BaseTownsArchitect, bound to a specific deployed contract.
func NewBaseTownsArchitectFilterer(address common.Address, filterer bind.ContractFilterer) (*BaseTownsArchitectFilterer, error) {
	contract, err := bindBaseTownsArchitect(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectFilterer{contract: contract}, nil
}

// bindBaseTownsArchitect binds a generic wrapper to an already deployed contract.
func bindBaseTownsArchitect(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := BaseTownsArchitectMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsArchitect *BaseTownsArchitectRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsArchitect.Contract.BaseTownsArchitectCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsArchitect *BaseTownsArchitectRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.BaseTownsArchitectTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsArchitect *BaseTownsArchitectRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.BaseTownsArchitectTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_BaseTownsArchitect *BaseTownsArchitectCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _BaseTownsArchitect.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_BaseTownsArchitect *BaseTownsArchitectTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_BaseTownsArchitect *BaseTownsArchitectTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.contract.Transact(opts, method, params...)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectCaller) ComputeTown(opts *bind.CallOpts, townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	var out []interface{}
	err := _BaseTownsArchitect.contract.Call(opts, &out, "computeTown", townId, membership)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _BaseTownsArchitect.Contract.ComputeTown(&_BaseTownsArchitect.CallOpts, townId, membership)
}

// ComputeTown is a free data retrieval call binding the contract method 0xad213f92.
//
// Solidity: function computeTown(string townId, ((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]) membership) view returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectCallerSession) ComputeTown(townId string, membership ITownArchitectBaseMembership) (common.Address, error) {
	return _BaseTownsArchitect.Contract.ComputeTown(&_BaseTownsArchitect.CallOpts, townId, membership)
}

// GetTokenIdByTown is a free data retrieval call binding the contract method 0x40fb2169.
//
// Solidity: function getTokenIdByTown(address town) view returns(uint256)
func (_BaseTownsArchitect *BaseTownsArchitectCaller) GetTokenIdByTown(opts *bind.CallOpts, town common.Address) (*big.Int, error) {
	var out []interface{}
	err := _BaseTownsArchitect.contract.Call(opts, &out, "getTokenIdByTown", town)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTown is a free data retrieval call binding the contract method 0x40fb2169.
//
// Solidity: function getTokenIdByTown(address town) view returns(uint256)
func (_BaseTownsArchitect *BaseTownsArchitectSession) GetTokenIdByTown(town common.Address) (*big.Int, error) {
	return _BaseTownsArchitect.Contract.GetTokenIdByTown(&_BaseTownsArchitect.CallOpts, town)
}

// GetTokenIdByTown is a free data retrieval call binding the contract method 0x40fb2169.
//
// Solidity: function getTokenIdByTown(address town) view returns(uint256)
func (_BaseTownsArchitect *BaseTownsArchitectCallerSession) GetTokenIdByTown(town common.Address) (*big.Int, error) {
	return _BaseTownsArchitect.Contract.GetTokenIdByTown(&_BaseTownsArchitect.CallOpts, town)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_BaseTownsArchitect *BaseTownsArchitectCaller) GetTokenIdByTownId(opts *bind.CallOpts, townId string) (*big.Int, error) {
	var out []interface{}
	err := _BaseTownsArchitect.contract.Call(opts, &out, "getTokenIdByTownId", townId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_BaseTownsArchitect *BaseTownsArchitectSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _BaseTownsArchitect.Contract.GetTokenIdByTownId(&_BaseTownsArchitect.CallOpts, townId)
}

// GetTokenIdByTownId is a free data retrieval call binding the contract method 0x9c7843c2.
//
// Solidity: function getTokenIdByTownId(string townId) view returns(uint256)
func (_BaseTownsArchitect *BaseTownsArchitectCallerSession) GetTokenIdByTownId(townId string) (*big.Int, error) {
	return _BaseTownsArchitect.Contract.GetTokenIdByTownId(&_BaseTownsArchitect.CallOpts, townId)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_BaseTownsArchitect *BaseTownsArchitectCaller) GetTownArchitectImplementations(opts *bind.CallOpts) (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	var out []interface{}
	err := _BaseTownsArchitect.contract.Call(opts, &out, "getTownArchitectImplementations")

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
func (_BaseTownsArchitect *BaseTownsArchitectSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _BaseTownsArchitect.Contract.GetTownArchitectImplementations(&_BaseTownsArchitect.CallOpts)
}

// GetTownArchitectImplementations is a free data retrieval call binding the contract method 0x18c7f066.
//
// Solidity: function getTownArchitectImplementations() view returns(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation)
func (_BaseTownsArchitect *BaseTownsArchitectCallerSession) GetTownArchitectImplementations() (struct {
	TownToken                      common.Address
	UserEntitlementImplementation  common.Address
	TokenEntitlementImplementation common.Address
}, error) {
	return _BaseTownsArchitect.Contract.GetTownArchitectImplementations(&_BaseTownsArchitect.CallOpts)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectCaller) GetTownById(opts *bind.CallOpts, townId string) (common.Address, error) {
	var out []interface{}
	err := _BaseTownsArchitect.contract.Call(opts, &out, "getTownById", townId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectSession) GetTownById(townId string) (common.Address, error) {
	return _BaseTownsArchitect.Contract.GetTownById(&_BaseTownsArchitect.CallOpts, townId)
}

// GetTownById is a free data retrieval call binding the contract method 0x11a8b382.
//
// Solidity: function getTownById(string townId) view returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectCallerSession) GetTownById(townId string) (common.Address, error) {
	return _BaseTownsArchitect.Contract.GetTownById(&_BaseTownsArchitect.CallOpts, townId)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_BaseTownsArchitect *BaseTownsArchitectCaller) IsTokenGated(opts *bind.CallOpts, token common.Address) (bool, error) {
	var out []interface{}
	err := _BaseTownsArchitect.contract.Call(opts, &out, "isTokenGated", token)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_BaseTownsArchitect *BaseTownsArchitectSession) IsTokenGated(token common.Address) (bool, error) {
	return _BaseTownsArchitect.Contract.IsTokenGated(&_BaseTownsArchitect.CallOpts, token)
}

// IsTokenGated is a free data retrieval call binding the contract method 0x1c05bbc7.
//
// Solidity: function isTokenGated(address token) view returns(bool)
func (_BaseTownsArchitect *BaseTownsArchitectCallerSession) IsTokenGated(token common.Address) (bool, error) {
	return _BaseTownsArchitect.Contract.IsTokenGated(&_BaseTownsArchitect.CallOpts, token)
}

// IsTown is a free data retrieval call binding the contract method 0x820f4a71.
//
// Solidity: function isTown(address town) view returns(bool)
func (_BaseTownsArchitect *BaseTownsArchitectCaller) IsTown(opts *bind.CallOpts, town common.Address) (bool, error) {
	var out []interface{}
	err := _BaseTownsArchitect.contract.Call(opts, &out, "isTown", town)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsTown is a free data retrieval call binding the contract method 0x820f4a71.
//
// Solidity: function isTown(address town) view returns(bool)
func (_BaseTownsArchitect *BaseTownsArchitectSession) IsTown(town common.Address) (bool, error) {
	return _BaseTownsArchitect.Contract.IsTown(&_BaseTownsArchitect.CallOpts, town)
}

// IsTown is a free data retrieval call binding the contract method 0x820f4a71.
//
// Solidity: function isTown(address town) view returns(bool)
func (_BaseTownsArchitect *BaseTownsArchitectCallerSession) IsTown(town common.Address) (bool, error) {
	return _BaseTownsArchitect.Contract.IsTown(&_BaseTownsArchitect.CallOpts, town)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactor) TownArchitectInit(opts *bind.TransactOpts, townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.contract.Transact(opts, "__TownArchitect_init", townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_BaseTownsArchitect *BaseTownsArchitectSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.TownArchitectInit(&_BaseTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// TownArchitectInit is a paid mutator transaction binding the contract method 0xfc833cd2.
//
// Solidity: function __TownArchitect_init(address townOwner, address userEntitlementImplementation, address tokenEntitlementImplementation, address trustedForwarder) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactorSession) TownArchitectInit(townOwner common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address, trustedForwarder common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.TownArchitectInit(&_BaseTownsArchitect.TransactOpts, townOwner, userEntitlementImplementation, tokenEntitlementImplementation, trustedForwarder)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectTransactor) CreateTown(opts *bind.TransactOpts, townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _BaseTownsArchitect.contract.Transact(opts, "createTown", townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.CreateTown(&_BaseTownsArchitect.TransactOpts, townInfo)
}

// CreateTown is a paid mutator transaction binding the contract method 0xc9a397c4.
//
// Solidity: function createTown((string,string,string,((string,string,uint256,uint256,uint64,address,address),(bool,(address,uint256,bool,uint256[])[],address[]),string[]),(string,string)) townInfo) returns(address)
func (_BaseTownsArchitect *BaseTownsArchitectTransactorSession) CreateTown(townInfo ITownArchitectBaseTownInfo) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.CreateTown(&_BaseTownsArchitect.TransactOpts, townInfo)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactor) GateByToken(opts *bind.TransactOpts, token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _BaseTownsArchitect.contract.Transact(opts, "gateByToken", token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_BaseTownsArchitect *BaseTownsArchitectSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.GateByToken(&_BaseTownsArchitect.TransactOpts, token, quantity)
}

// GateByToken is a paid mutator transaction binding the contract method 0x5b560b67.
//
// Solidity: function gateByToken(address token, uint256 quantity) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactorSession) GateByToken(token common.Address, quantity *big.Int) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.GateByToken(&_BaseTownsArchitect.TransactOpts, token, quantity)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactor) SetTownArchitectImplementations(opts *bind.TransactOpts, townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.contract.Transact(opts, "setTownArchitectImplementations", townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_BaseTownsArchitect *BaseTownsArchitectSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.SetTownArchitectImplementations(&_BaseTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// SetTownArchitectImplementations is a paid mutator transaction binding the contract method 0x51ec4c1d.
//
// Solidity: function setTownArchitectImplementations(address townToken, address userEntitlementImplementation, address tokenEntitlementImplementation) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactorSession) SetTownArchitectImplementations(townToken common.Address, userEntitlementImplementation common.Address, tokenEntitlementImplementation common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.SetTownArchitectImplementations(&_BaseTownsArchitect.TransactOpts, townToken, userEntitlementImplementation, tokenEntitlementImplementation)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactor) UngateByToken(opts *bind.TransactOpts, token common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.contract.Transact(opts, "ungateByToken", token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_BaseTownsArchitect *BaseTownsArchitectSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.UngateByToken(&_BaseTownsArchitect.TransactOpts, token)
}

// UngateByToken is a paid mutator transaction binding the contract method 0xedddeb4d.
//
// Solidity: function ungateByToken(address token) returns()
func (_BaseTownsArchitect *BaseTownsArchitectTransactorSession) UngateByToken(token common.Address) (*types.Transaction, error) {
	return _BaseTownsArchitect.Contract.UngateByToken(&_BaseTownsArchitect.TransactOpts, token)
}

// BaseTownsArchitectInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the BaseTownsArchitect contract.
type BaseTownsArchitectInitializedIterator struct {
	Event *BaseTownsArchitectInitialized // Event containing the contract specifics and raw log

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
func (it *BaseTownsArchitectInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsArchitectInitialized)
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
		it.Event = new(BaseTownsArchitectInitialized)
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
func (it *BaseTownsArchitectInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsArchitectInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsArchitectInitialized represents a Initialized event raised by the BaseTownsArchitect contract.
type BaseTownsArchitectInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) FilterInitialized(opts *bind.FilterOpts) (*BaseTownsArchitectInitializedIterator, error) {

	logs, sub, err := _BaseTownsArchitect.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectInitializedIterator{contract: _BaseTownsArchitect.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *BaseTownsArchitectInitialized) (event.Subscription, error) {

	logs, sub, err := _BaseTownsArchitect.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsArchitectInitialized)
				if err := _BaseTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) ParseInitialized(log types.Log) (*BaseTownsArchitectInitialized, error) {
	event := new(BaseTownsArchitectInitialized)
	if err := _BaseTownsArchitect.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsArchitectInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the BaseTownsArchitect contract.
type BaseTownsArchitectInterfaceAddedIterator struct {
	Event *BaseTownsArchitectInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *BaseTownsArchitectInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsArchitectInterfaceAdded)
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
		it.Event = new(BaseTownsArchitectInterfaceAdded)
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
func (it *BaseTownsArchitectInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsArchitectInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsArchitectInterfaceAdded represents a InterfaceAdded event raised by the BaseTownsArchitect contract.
type BaseTownsArchitectInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseTownsArchitectInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectInterfaceAddedIterator{contract: _BaseTownsArchitect.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *BaseTownsArchitectInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsArchitectInterfaceAdded)
				if err := _BaseTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) ParseInterfaceAdded(log types.Log) (*BaseTownsArchitectInterfaceAdded, error) {
	event := new(BaseTownsArchitectInterfaceAdded)
	if err := _BaseTownsArchitect.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsArchitectInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the BaseTownsArchitect contract.
type BaseTownsArchitectInterfaceRemovedIterator struct {
	Event *BaseTownsArchitectInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *BaseTownsArchitectInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsArchitectInterfaceRemoved)
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
		it.Event = new(BaseTownsArchitectInterfaceRemoved)
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
func (it *BaseTownsArchitectInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsArchitectInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsArchitectInterfaceRemoved represents a InterfaceRemoved event raised by the BaseTownsArchitect contract.
type BaseTownsArchitectInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*BaseTownsArchitectInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectInterfaceRemovedIterator{contract: _BaseTownsArchitect.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *BaseTownsArchitectInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsArchitectInterfaceRemoved)
				if err := _BaseTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) ParseInterfaceRemoved(log types.Log) (*BaseTownsArchitectInterfaceRemoved, error) {
	event := new(BaseTownsArchitectInterfaceRemoved)
	if err := _BaseTownsArchitect.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsArchitectOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the BaseTownsArchitect contract.
type BaseTownsArchitectOwnershipTransferredIterator struct {
	Event *BaseTownsArchitectOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *BaseTownsArchitectOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsArchitectOwnershipTransferred)
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
		it.Event = new(BaseTownsArchitectOwnershipTransferred)
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
func (it *BaseTownsArchitectOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsArchitectOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsArchitectOwnershipTransferred represents a OwnershipTransferred event raised by the BaseTownsArchitect contract.
type BaseTownsArchitectOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*BaseTownsArchitectOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectOwnershipTransferredIterator{contract: _BaseTownsArchitect.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *BaseTownsArchitectOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsArchitectOwnershipTransferred)
				if err := _BaseTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) ParseOwnershipTransferred(log types.Log) (*BaseTownsArchitectOwnershipTransferred, error) {
	event := new(BaseTownsArchitectOwnershipTransferred)
	if err := _BaseTownsArchitect.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsArchitectPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the BaseTownsArchitect contract.
type BaseTownsArchitectPausedIterator struct {
	Event *BaseTownsArchitectPaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsArchitectPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsArchitectPaused)
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
		it.Event = new(BaseTownsArchitectPaused)
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
func (it *BaseTownsArchitectPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsArchitectPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsArchitectPaused represents a Paused event raised by the BaseTownsArchitect contract.
type BaseTownsArchitectPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) FilterPaused(opts *bind.FilterOpts) (*BaseTownsArchitectPausedIterator, error) {

	logs, sub, err := _BaseTownsArchitect.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectPausedIterator{contract: _BaseTownsArchitect.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *BaseTownsArchitectPaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsArchitect.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsArchitectPaused)
				if err := _BaseTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) ParsePaused(log types.Log) (*BaseTownsArchitectPaused, error) {
	event := new(BaseTownsArchitectPaused)
	if err := _BaseTownsArchitect.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsArchitectTownCreatedIterator is returned from FilterTownCreated and is used to iterate over the raw logs and unpacked data for TownCreated events raised by the BaseTownsArchitect contract.
type BaseTownsArchitectTownCreatedIterator struct {
	Event *BaseTownsArchitectTownCreated // Event containing the contract specifics and raw log

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
func (it *BaseTownsArchitectTownCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsArchitectTownCreated)
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
		it.Event = new(BaseTownsArchitectTownCreated)
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
func (it *BaseTownsArchitectTownCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsArchitectTownCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsArchitectTownCreated represents a TownCreated event raised by the BaseTownsArchitect contract.
type BaseTownsArchitectTownCreated struct {
	TownCreator common.Address
	TownId      *big.Int
	Town        common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterTownCreated is a free log retrieval operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) FilterTownCreated(opts *bind.FilterOpts, townCreator []common.Address, townId []*big.Int) (*BaseTownsArchitectTownCreatedIterator, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.FilterLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectTownCreatedIterator{contract: _BaseTownsArchitect.contract, event: "TownCreated", logs: logs, sub: sub}, nil
}

// WatchTownCreated is a free log subscription operation binding the contract event 0x3a9b63f709203f3b6dabc8d90e98bff22696c86fc5608f54453424cabab52985.
//
// Solidity: event TownCreated(address indexed townCreator, uint256 indexed townId, address town)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) WatchTownCreated(opts *bind.WatchOpts, sink chan<- *BaseTownsArchitectTownCreated, townCreator []common.Address, townId []*big.Int) (event.Subscription, error) {

	var townCreatorRule []interface{}
	for _, townCreatorItem := range townCreator {
		townCreatorRule = append(townCreatorRule, townCreatorItem)
	}
	var townIdRule []interface{}
	for _, townIdItem := range townId {
		townIdRule = append(townIdRule, townIdItem)
	}

	logs, sub, err := _BaseTownsArchitect.contract.WatchLogs(opts, "TownCreated", townCreatorRule, townIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsArchitectTownCreated)
				if err := _BaseTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
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
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) ParseTownCreated(log types.Log) (*BaseTownsArchitectTownCreated, error) {
	event := new(BaseTownsArchitectTownCreated)
	if err := _BaseTownsArchitect.contract.UnpackLog(event, "TownCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// BaseTownsArchitectUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the BaseTownsArchitect contract.
type BaseTownsArchitectUnpausedIterator struct {
	Event *BaseTownsArchitectUnpaused // Event containing the contract specifics and raw log

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
func (it *BaseTownsArchitectUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(BaseTownsArchitectUnpaused)
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
		it.Event = new(BaseTownsArchitectUnpaused)
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
func (it *BaseTownsArchitectUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *BaseTownsArchitectUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// BaseTownsArchitectUnpaused represents a Unpaused event raised by the BaseTownsArchitect contract.
type BaseTownsArchitectUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) FilterUnpaused(opts *bind.FilterOpts) (*BaseTownsArchitectUnpausedIterator, error) {

	logs, sub, err := _BaseTownsArchitect.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &BaseTownsArchitectUnpausedIterator{contract: _BaseTownsArchitect.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *BaseTownsArchitectUnpaused) (event.Subscription, error) {

	logs, sub, err := _BaseTownsArchitect.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(BaseTownsArchitectUnpaused)
				if err := _BaseTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_BaseTownsArchitect *BaseTownsArchitectFilterer) ParseUnpaused(log types.Log) (*BaseTownsArchitectUnpaused, error) {
	event := new(BaseTownsArchitectUnpaused)
	if err := _BaseTownsArchitect.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
