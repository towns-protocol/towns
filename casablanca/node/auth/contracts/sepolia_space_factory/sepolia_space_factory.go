// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sepolia_space_factory

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

// DataTypesCreateSpaceExtraEntitlements is an auto generated low-level Go binding around an user-defined struct.
type DataTypesCreateSpaceExtraEntitlements struct {
	RoleName    string
	Permissions []string
	Tokens      []DataTypesExternalToken
	Users       []common.Address
}

// DataTypesExternalToken is an auto generated low-level Go binding around an user-defined struct.
type DataTypesExternalToken struct {
	ContractAddress common.Address
	Quantity        *big.Int
	IsSingleToken   bool
	TokenIds        []*big.Int
}

// SepoliaSpaceFactoryMetaData contains all meta data concerning the SepoliaSpaceFactory contract.
var SepoliaSpaceFactoryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"inputs\":[],\"name\":\"InvalidParameters\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NameContainsInvalidCharacters\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NameLengthInvalid\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NotAllowed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"PermissionAlreadyExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"SpaceAlreadyRegistered\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"previousAdmin\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"newAdmin\",\"type\":\"address\"}],\"name\":\"AdminChanged\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"beacon\",\"type\":\"address\"}],\"name\":\"BeaconUpgraded\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint8\",\"name\":\"version\",\"type\":\"uint8\"}],\"name\":\"Initialized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"implementation\",\"type\":\"address\"}],\"name\":\"Upgraded\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"GATE_TOKEN_ADDRESS\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"SPACE_IMPLEMENTATION_ADDRESS\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"SPACE_TOKEN_ADDRESS\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"TOKEN_IMPLEMENTATION_ADDRESS\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"USER_IMPLEMENTATION_ADDRESS\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string[]\",\"name\":\"_permissions\",\"type\":\"string[]\"}],\"name\":\"addOwnerPermissions\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"spaceName\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"spaceNetworkId\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"spaceMetadata\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"_everyonePermissions\",\"type\":\"string[]\"},{\"components\":[{\"internalType\":\"string\",\"name\":\"roleName\",\"type\":\"string\"},{\"internalType\":\"string[]\",\"name\":\"permissions\",\"type\":\"string[]\"},{\"components\":[{\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"quantity\",\"type\":\"uint256\"},{\"internalType\":\"bool\",\"name\":\"isSingleToken\",\"type\":\"bool\"},{\"internalType\":\"uint256[]\",\"name\":\"tokenIds\",\"type\":\"uint256[]\"}],\"internalType\":\"structDataTypes.ExternalToken[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"internalType\":\"address[]\",\"name\":\"users\",\"type\":\"address[]\"}],\"internalType\":\"structDataTypes.CreateSpaceExtraEntitlements\",\"name\":\"_extraEntitlements\",\"type\":\"tuple\"}],\"name\":\"createSpace\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"_spaceAddress\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"gatingEnabled\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getOwnerPermissions\",\"outputs\":[{\"internalType\":\"string[]\",\"name\":\"\",\"type\":\"string[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"spaceNetworkId\",\"type\":\"string\"}],\"name\":\"getSpaceAddressByNetworkId\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"spaceNetworkId\",\"type\":\"string\"}],\"name\":\"getTokenIdByNetworkId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_space\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_tokenEntitlement\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_userEntitlement\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_spaceToken\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_gateToken\",\"type\":\"address\"},{\"internalType\":\"string[]\",\"name\":\"_permissions\",\"type\":\"string[]\"}],\"name\":\"initialize\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"},{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"name\":\"onERC721Received\",\"outputs\":[{\"internalType\":\"bytes4\",\"name\":\"\",\"type\":\"bytes4\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"ownerPermissions\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"proxiableUUID\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"renounceOwnership\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bool\",\"name\":\"_gatingEnabled\",\"type\":\"bool\"}],\"name\":\"setGatingEnabled\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bool\",\"name\":\"_paused\",\"type\":\"bool\"}],\"name\":\"setPaused\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_spaceToken\",\"type\":\"address\"}],\"name\":\"setSpaceToken\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"name\":\"spaceByHash\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"name\":\"tokenByHash\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"transferOwnership\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_space\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_tokenEntitlement\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_userEntitlement\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_gateToken\",\"type\":\"address\"}],\"name\":\"updateImplementations\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newImplementation\",\"type\":\"address\"}],\"name\":\"upgradeTo\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newImplementation\",\"type\":\"address\"},{\"internalType\":\"bytes\",\"name\":\"data\",\"type\":\"bytes\"}],\"name\":\"upgradeToAndCall\",\"outputs\":[],\"stateMutability\":\"payable\",\"type\":\"function\"}]",
}

// SepoliaSpaceFactoryABI is the input ABI used to generate the binding from.
// Deprecated: Use SepoliaSpaceFactoryMetaData.ABI instead.
var SepoliaSpaceFactoryABI = SepoliaSpaceFactoryMetaData.ABI

// SepoliaSpaceFactory is an auto generated Go binding around an Ethereum contract.
type SepoliaSpaceFactory struct {
	SepoliaSpaceFactoryCaller     // Read-only binding to the contract
	SepoliaSpaceFactoryTransactor // Write-only binding to the contract
	SepoliaSpaceFactoryFilterer   // Log filterer for contract events
}

// SepoliaSpaceFactoryCaller is an auto generated read-only Go binding around an Ethereum contract.
type SepoliaSpaceFactoryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaSpaceFactoryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SepoliaSpaceFactoryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaSpaceFactoryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SepoliaSpaceFactoryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SepoliaSpaceFactorySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SepoliaSpaceFactorySession struct {
	Contract     *SepoliaSpaceFactory // Generic contract binding to set the session for
	CallOpts     bind.CallOpts        // Call options to use throughout this session
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// SepoliaSpaceFactoryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SepoliaSpaceFactoryCallerSession struct {
	Contract *SepoliaSpaceFactoryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts              // Call options to use throughout this session
}

// SepoliaSpaceFactoryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SepoliaSpaceFactoryTransactorSession struct {
	Contract     *SepoliaSpaceFactoryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// SepoliaSpaceFactoryRaw is an auto generated low-level Go binding around an Ethereum contract.
type SepoliaSpaceFactoryRaw struct {
	Contract *SepoliaSpaceFactory // Generic contract binding to access the raw methods on
}

// SepoliaSpaceFactoryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SepoliaSpaceFactoryCallerRaw struct {
	Contract *SepoliaSpaceFactoryCaller // Generic read-only contract binding to access the raw methods on
}

// SepoliaSpaceFactoryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SepoliaSpaceFactoryTransactorRaw struct {
	Contract *SepoliaSpaceFactoryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSepoliaSpaceFactory creates a new instance of SepoliaSpaceFactory, bound to a specific deployed contract.
func NewSepoliaSpaceFactory(address common.Address, backend bind.ContractBackend) (*SepoliaSpaceFactory, error) {
	contract, err := bindSepoliaSpaceFactory(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactory{SepoliaSpaceFactoryCaller: SepoliaSpaceFactoryCaller{contract: contract}, SepoliaSpaceFactoryTransactor: SepoliaSpaceFactoryTransactor{contract: contract}, SepoliaSpaceFactoryFilterer: SepoliaSpaceFactoryFilterer{contract: contract}}, nil
}

// NewSepoliaSpaceFactoryCaller creates a new read-only instance of SepoliaSpaceFactory, bound to a specific deployed contract.
func NewSepoliaSpaceFactoryCaller(address common.Address, caller bind.ContractCaller) (*SepoliaSpaceFactoryCaller, error) {
	contract, err := bindSepoliaSpaceFactory(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryCaller{contract: contract}, nil
}

// NewSepoliaSpaceFactoryTransactor creates a new write-only instance of SepoliaSpaceFactory, bound to a specific deployed contract.
func NewSepoliaSpaceFactoryTransactor(address common.Address, transactor bind.ContractTransactor) (*SepoliaSpaceFactoryTransactor, error) {
	contract, err := bindSepoliaSpaceFactory(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryTransactor{contract: contract}, nil
}

// NewSepoliaSpaceFactoryFilterer creates a new log filterer instance of SepoliaSpaceFactory, bound to a specific deployed contract.
func NewSepoliaSpaceFactoryFilterer(address common.Address, filterer bind.ContractFilterer) (*SepoliaSpaceFactoryFilterer, error) {
	contract, err := bindSepoliaSpaceFactory(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryFilterer{contract: contract}, nil
}

// bindSepoliaSpaceFactory binds a generic wrapper to an already deployed contract.
func bindSepoliaSpaceFactory(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(SepoliaSpaceFactoryABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaSpaceFactory.Contract.SepoliaSpaceFactoryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SepoliaSpaceFactoryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SepoliaSpaceFactoryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SepoliaSpaceFactory.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.contract.Transact(opts, method, params...)
}

// GATETOKENADDRESS is a free data retrieval call binding the contract method 0xed267116.
//
// Solidity: function GATE_TOKEN_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) GATETOKENADDRESS(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "GATE_TOKEN_ADDRESS")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GATETOKENADDRESS is a free data retrieval call binding the contract method 0xed267116.
//
// Solidity: function GATE_TOKEN_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) GATETOKENADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.GATETOKENADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// GATETOKENADDRESS is a free data retrieval call binding the contract method 0xed267116.
//
// Solidity: function GATE_TOKEN_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) GATETOKENADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.GATETOKENADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// SPACEIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0xf21cd401.
//
// Solidity: function SPACE_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) SPACEIMPLEMENTATIONADDRESS(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "SPACE_IMPLEMENTATION_ADDRESS")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// SPACEIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0xf21cd401.
//
// Solidity: function SPACE_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) SPACEIMPLEMENTATIONADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.SPACEIMPLEMENTATIONADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// SPACEIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0xf21cd401.
//
// Solidity: function SPACE_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) SPACEIMPLEMENTATIONADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.SPACEIMPLEMENTATIONADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// SPACETOKENADDRESS is a free data retrieval call binding the contract method 0x683c72b6.
//
// Solidity: function SPACE_TOKEN_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) SPACETOKENADDRESS(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "SPACE_TOKEN_ADDRESS")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// SPACETOKENADDRESS is a free data retrieval call binding the contract method 0x683c72b6.
//
// Solidity: function SPACE_TOKEN_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) SPACETOKENADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.SPACETOKENADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// SPACETOKENADDRESS is a free data retrieval call binding the contract method 0x683c72b6.
//
// Solidity: function SPACE_TOKEN_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) SPACETOKENADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.SPACETOKENADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// TOKENIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0xcfc27037.
//
// Solidity: function TOKEN_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) TOKENIMPLEMENTATIONADDRESS(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "TOKEN_IMPLEMENTATION_ADDRESS")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// TOKENIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0xcfc27037.
//
// Solidity: function TOKEN_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) TOKENIMPLEMENTATIONADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.TOKENIMPLEMENTATIONADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// TOKENIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0xcfc27037.
//
// Solidity: function TOKEN_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) TOKENIMPLEMENTATIONADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.TOKENIMPLEMENTATIONADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// USERIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0x08bc0b4b.
//
// Solidity: function USER_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) USERIMPLEMENTATIONADDRESS(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "USER_IMPLEMENTATION_ADDRESS")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// USERIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0x08bc0b4b.
//
// Solidity: function USER_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) USERIMPLEMENTATIONADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.USERIMPLEMENTATIONADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// USERIMPLEMENTATIONADDRESS is a free data retrieval call binding the contract method 0x08bc0b4b.
//
// Solidity: function USER_IMPLEMENTATION_ADDRESS() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) USERIMPLEMENTATIONADDRESS() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.USERIMPLEMENTATIONADDRESS(&_SepoliaSpaceFactory.CallOpts)
}

// GatingEnabled is a free data retrieval call binding the contract method 0xc45f396b.
//
// Solidity: function gatingEnabled() view returns(bool)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) GatingEnabled(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "gatingEnabled")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// GatingEnabled is a free data retrieval call binding the contract method 0xc45f396b.
//
// Solidity: function gatingEnabled() view returns(bool)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) GatingEnabled() (bool, error) {
	return _SepoliaSpaceFactory.Contract.GatingEnabled(&_SepoliaSpaceFactory.CallOpts)
}

// GatingEnabled is a free data retrieval call binding the contract method 0xc45f396b.
//
// Solidity: function gatingEnabled() view returns(bool)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) GatingEnabled() (bool, error) {
	return _SepoliaSpaceFactory.Contract.GatingEnabled(&_SepoliaSpaceFactory.CallOpts)
}

// GetOwnerPermissions is a free data retrieval call binding the contract method 0xdf2cd9fe.
//
// Solidity: function getOwnerPermissions() view returns(string[])
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) GetOwnerPermissions(opts *bind.CallOpts) ([]string, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "getOwnerPermissions")

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetOwnerPermissions is a free data retrieval call binding the contract method 0xdf2cd9fe.
//
// Solidity: function getOwnerPermissions() view returns(string[])
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) GetOwnerPermissions() ([]string, error) {
	return _SepoliaSpaceFactory.Contract.GetOwnerPermissions(&_SepoliaSpaceFactory.CallOpts)
}

// GetOwnerPermissions is a free data retrieval call binding the contract method 0xdf2cd9fe.
//
// Solidity: function getOwnerPermissions() view returns(string[])
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) GetOwnerPermissions() ([]string, error) {
	return _SepoliaSpaceFactory.Contract.GetOwnerPermissions(&_SepoliaSpaceFactory.CallOpts)
}

// GetSpaceAddressByNetworkId is a free data retrieval call binding the contract method 0x96dc21e4.
//
// Solidity: function getSpaceAddressByNetworkId(string spaceNetworkId) view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) GetSpaceAddressByNetworkId(opts *bind.CallOpts, spaceNetworkId string) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "getSpaceAddressByNetworkId", spaceNetworkId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetSpaceAddressByNetworkId is a free data retrieval call binding the contract method 0x96dc21e4.
//
// Solidity: function getSpaceAddressByNetworkId(string spaceNetworkId) view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) GetSpaceAddressByNetworkId(spaceNetworkId string) (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.GetSpaceAddressByNetworkId(&_SepoliaSpaceFactory.CallOpts, spaceNetworkId)
}

// GetSpaceAddressByNetworkId is a free data retrieval call binding the contract method 0x96dc21e4.
//
// Solidity: function getSpaceAddressByNetworkId(string spaceNetworkId) view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) GetSpaceAddressByNetworkId(spaceNetworkId string) (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.GetSpaceAddressByNetworkId(&_SepoliaSpaceFactory.CallOpts, spaceNetworkId)
}

// GetTokenIdByNetworkId is a free data retrieval call binding the contract method 0x8a9ef426.
//
// Solidity: function getTokenIdByNetworkId(string spaceNetworkId) view returns(uint256)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) GetTokenIdByNetworkId(opts *bind.CallOpts, spaceNetworkId string) (*big.Int, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "getTokenIdByNetworkId", spaceNetworkId)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetTokenIdByNetworkId is a free data retrieval call binding the contract method 0x8a9ef426.
//
// Solidity: function getTokenIdByNetworkId(string spaceNetworkId) view returns(uint256)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) GetTokenIdByNetworkId(spaceNetworkId string) (*big.Int, error) {
	return _SepoliaSpaceFactory.Contract.GetTokenIdByNetworkId(&_SepoliaSpaceFactory.CallOpts, spaceNetworkId)
}

// GetTokenIdByNetworkId is a free data retrieval call binding the contract method 0x8a9ef426.
//
// Solidity: function getTokenIdByNetworkId(string spaceNetworkId) view returns(uint256)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) GetTokenIdByNetworkId(spaceNetworkId string) (*big.Int, error) {
	return _SepoliaSpaceFactory.Contract.GetTokenIdByNetworkId(&_SepoliaSpaceFactory.CallOpts, spaceNetworkId)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) Owner() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.Owner(&_SepoliaSpaceFactory.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) Owner() (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.Owner(&_SepoliaSpaceFactory.CallOpts)
}

// OwnerPermissions is a free data retrieval call binding the contract method 0xb28032f9.
//
// Solidity: function ownerPermissions(uint256 ) view returns(string)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) OwnerPermissions(opts *bind.CallOpts, arg0 *big.Int) (string, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "ownerPermissions", arg0)

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// OwnerPermissions is a free data retrieval call binding the contract method 0xb28032f9.
//
// Solidity: function ownerPermissions(uint256 ) view returns(string)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) OwnerPermissions(arg0 *big.Int) (string, error) {
	return _SepoliaSpaceFactory.Contract.OwnerPermissions(&_SepoliaSpaceFactory.CallOpts, arg0)
}

// OwnerPermissions is a free data retrieval call binding the contract method 0xb28032f9.
//
// Solidity: function ownerPermissions(uint256 ) view returns(string)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) OwnerPermissions(arg0 *big.Int) (string, error) {
	return _SepoliaSpaceFactory.Contract.OwnerPermissions(&_SepoliaSpaceFactory.CallOpts, arg0)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "paused")

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) Paused() (bool, error) {
	return _SepoliaSpaceFactory.Contract.Paused(&_SepoliaSpaceFactory.CallOpts)
}

// Paused is a free data retrieval call binding the contract method 0x5c975abb.
//
// Solidity: function paused() view returns(bool)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) Paused() (bool, error) {
	return _SepoliaSpaceFactory.Contract.Paused(&_SepoliaSpaceFactory.CallOpts)
}

// ProxiableUUID is a free data retrieval call binding the contract method 0x52d1902d.
//
// Solidity: function proxiableUUID() view returns(bytes32)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) ProxiableUUID(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "proxiableUUID")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// ProxiableUUID is a free data retrieval call binding the contract method 0x52d1902d.
//
// Solidity: function proxiableUUID() view returns(bytes32)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) ProxiableUUID() ([32]byte, error) {
	return _SepoliaSpaceFactory.Contract.ProxiableUUID(&_SepoliaSpaceFactory.CallOpts)
}

// ProxiableUUID is a free data retrieval call binding the contract method 0x52d1902d.
//
// Solidity: function proxiableUUID() view returns(bytes32)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) ProxiableUUID() ([32]byte, error) {
	return _SepoliaSpaceFactory.Contract.ProxiableUUID(&_SepoliaSpaceFactory.CallOpts)
}

// SpaceByHash is a free data retrieval call binding the contract method 0x3312540a.
//
// Solidity: function spaceByHash(bytes32 ) view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) SpaceByHash(opts *bind.CallOpts, arg0 [32]byte) (common.Address, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "spaceByHash", arg0)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// SpaceByHash is a free data retrieval call binding the contract method 0x3312540a.
//
// Solidity: function spaceByHash(bytes32 ) view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) SpaceByHash(arg0 [32]byte) (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.SpaceByHash(&_SepoliaSpaceFactory.CallOpts, arg0)
}

// SpaceByHash is a free data retrieval call binding the contract method 0x3312540a.
//
// Solidity: function spaceByHash(bytes32 ) view returns(address)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) SpaceByHash(arg0 [32]byte) (common.Address, error) {
	return _SepoliaSpaceFactory.Contract.SpaceByHash(&_SepoliaSpaceFactory.CallOpts, arg0)
}

// TokenByHash is a free data retrieval call binding the contract method 0xf3aba305.
//
// Solidity: function tokenByHash(bytes32 ) view returns(uint256)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCaller) TokenByHash(opts *bind.CallOpts, arg0 [32]byte) (*big.Int, error) {
	var out []interface{}
	err := _SepoliaSpaceFactory.contract.Call(opts, &out, "tokenByHash", arg0)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TokenByHash is a free data retrieval call binding the contract method 0xf3aba305.
//
// Solidity: function tokenByHash(bytes32 ) view returns(uint256)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) TokenByHash(arg0 [32]byte) (*big.Int, error) {
	return _SepoliaSpaceFactory.Contract.TokenByHash(&_SepoliaSpaceFactory.CallOpts, arg0)
}

// TokenByHash is a free data retrieval call binding the contract method 0xf3aba305.
//
// Solidity: function tokenByHash(bytes32 ) view returns(uint256)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryCallerSession) TokenByHash(arg0 [32]byte) (*big.Int, error) {
	return _SepoliaSpaceFactory.Contract.TokenByHash(&_SepoliaSpaceFactory.CallOpts, arg0)
}

// AddOwnerPermissions is a paid mutator transaction binding the contract method 0xbe8b5967.
//
// Solidity: function addOwnerPermissions(string[] _permissions) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) AddOwnerPermissions(opts *bind.TransactOpts, _permissions []string) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "addOwnerPermissions", _permissions)
}

// AddOwnerPermissions is a paid mutator transaction binding the contract method 0xbe8b5967.
//
// Solidity: function addOwnerPermissions(string[] _permissions) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) AddOwnerPermissions(_permissions []string) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.AddOwnerPermissions(&_SepoliaSpaceFactory.TransactOpts, _permissions)
}

// AddOwnerPermissions is a paid mutator transaction binding the contract method 0xbe8b5967.
//
// Solidity: function addOwnerPermissions(string[] _permissions) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) AddOwnerPermissions(_permissions []string) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.AddOwnerPermissions(&_SepoliaSpaceFactory.TransactOpts, _permissions)
}

// CreateSpace is a paid mutator transaction binding the contract method 0xad78faf3.
//
// Solidity: function createSpace(string spaceName, string spaceNetworkId, string spaceMetadata, string[] _everyonePermissions, (string,string[],(address,uint256,bool,uint256[])[],address[]) _extraEntitlements) returns(address _spaceAddress)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) CreateSpace(opts *bind.TransactOpts, spaceName string, spaceNetworkId string, spaceMetadata string, _everyonePermissions []string, _extraEntitlements DataTypesCreateSpaceExtraEntitlements) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "createSpace", spaceName, spaceNetworkId, spaceMetadata, _everyonePermissions, _extraEntitlements)
}

// CreateSpace is a paid mutator transaction binding the contract method 0xad78faf3.
//
// Solidity: function createSpace(string spaceName, string spaceNetworkId, string spaceMetadata, string[] _everyonePermissions, (string,string[],(address,uint256,bool,uint256[])[],address[]) _extraEntitlements) returns(address _spaceAddress)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) CreateSpace(spaceName string, spaceNetworkId string, spaceMetadata string, _everyonePermissions []string, _extraEntitlements DataTypesCreateSpaceExtraEntitlements) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.CreateSpace(&_SepoliaSpaceFactory.TransactOpts, spaceName, spaceNetworkId, spaceMetadata, _everyonePermissions, _extraEntitlements)
}

// CreateSpace is a paid mutator transaction binding the contract method 0xad78faf3.
//
// Solidity: function createSpace(string spaceName, string spaceNetworkId, string spaceMetadata, string[] _everyonePermissions, (string,string[],(address,uint256,bool,uint256[])[],address[]) _extraEntitlements) returns(address _spaceAddress)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) CreateSpace(spaceName string, spaceNetworkId string, spaceMetadata string, _everyonePermissions []string, _extraEntitlements DataTypesCreateSpaceExtraEntitlements) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.CreateSpace(&_SepoliaSpaceFactory.TransactOpts, spaceName, spaceNetworkId, spaceMetadata, _everyonePermissions, _extraEntitlements)
}

// Initialize is a paid mutator transaction binding the contract method 0x6e9ea7ca.
//
// Solidity: function initialize(address _space, address _tokenEntitlement, address _userEntitlement, address _spaceToken, address _gateToken, string[] _permissions) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) Initialize(opts *bind.TransactOpts, _space common.Address, _tokenEntitlement common.Address, _userEntitlement common.Address, _spaceToken common.Address, _gateToken common.Address, _permissions []string) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "initialize", _space, _tokenEntitlement, _userEntitlement, _spaceToken, _gateToken, _permissions)
}

// Initialize is a paid mutator transaction binding the contract method 0x6e9ea7ca.
//
// Solidity: function initialize(address _space, address _tokenEntitlement, address _userEntitlement, address _spaceToken, address _gateToken, string[] _permissions) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) Initialize(_space common.Address, _tokenEntitlement common.Address, _userEntitlement common.Address, _spaceToken common.Address, _gateToken common.Address, _permissions []string) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.Initialize(&_SepoliaSpaceFactory.TransactOpts, _space, _tokenEntitlement, _userEntitlement, _spaceToken, _gateToken, _permissions)
}

// Initialize is a paid mutator transaction binding the contract method 0x6e9ea7ca.
//
// Solidity: function initialize(address _space, address _tokenEntitlement, address _userEntitlement, address _spaceToken, address _gateToken, string[] _permissions) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) Initialize(_space common.Address, _tokenEntitlement common.Address, _userEntitlement common.Address, _spaceToken common.Address, _gateToken common.Address, _permissions []string) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.Initialize(&_SepoliaSpaceFactory.TransactOpts, _space, _tokenEntitlement, _userEntitlement, _spaceToken, _gateToken, _permissions)
}

// OnERC721Received is a paid mutator transaction binding the contract method 0x150b7a02.
//
// Solidity: function onERC721Received(address , address , uint256 , bytes ) returns(bytes4)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) OnERC721Received(opts *bind.TransactOpts, arg0 common.Address, arg1 common.Address, arg2 *big.Int, arg3 []byte) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "onERC721Received", arg0, arg1, arg2, arg3)
}

// OnERC721Received is a paid mutator transaction binding the contract method 0x150b7a02.
//
// Solidity: function onERC721Received(address , address , uint256 , bytes ) returns(bytes4)
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) OnERC721Received(arg0 common.Address, arg1 common.Address, arg2 *big.Int, arg3 []byte) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.OnERC721Received(&_SepoliaSpaceFactory.TransactOpts, arg0, arg1, arg2, arg3)
}

// OnERC721Received is a paid mutator transaction binding the contract method 0x150b7a02.
//
// Solidity: function onERC721Received(address , address , uint256 , bytes ) returns(bytes4)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) OnERC721Received(arg0 common.Address, arg1 common.Address, arg2 *big.Int, arg3 []byte) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.OnERC721Received(&_SepoliaSpaceFactory.TransactOpts, arg0, arg1, arg2, arg3)
}

// RenounceOwnership is a paid mutator transaction binding the contract method 0x715018a6.
//
// Solidity: function renounceOwnership() returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) RenounceOwnership(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "renounceOwnership")
}

// RenounceOwnership is a paid mutator transaction binding the contract method 0x715018a6.
//
// Solidity: function renounceOwnership() returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) RenounceOwnership() (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.RenounceOwnership(&_SepoliaSpaceFactory.TransactOpts)
}

// RenounceOwnership is a paid mutator transaction binding the contract method 0x715018a6.
//
// Solidity: function renounceOwnership() returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) RenounceOwnership() (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.RenounceOwnership(&_SepoliaSpaceFactory.TransactOpts)
}

// SetGatingEnabled is a paid mutator transaction binding the contract method 0x4689cd04.
//
// Solidity: function setGatingEnabled(bool _gatingEnabled) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) SetGatingEnabled(opts *bind.TransactOpts, _gatingEnabled bool) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "setGatingEnabled", _gatingEnabled)
}

// SetGatingEnabled is a paid mutator transaction binding the contract method 0x4689cd04.
//
// Solidity: function setGatingEnabled(bool _gatingEnabled) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) SetGatingEnabled(_gatingEnabled bool) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SetGatingEnabled(&_SepoliaSpaceFactory.TransactOpts, _gatingEnabled)
}

// SetGatingEnabled is a paid mutator transaction binding the contract method 0x4689cd04.
//
// Solidity: function setGatingEnabled(bool _gatingEnabled) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) SetGatingEnabled(_gatingEnabled bool) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SetGatingEnabled(&_SepoliaSpaceFactory.TransactOpts, _gatingEnabled)
}

// SetPaused is a paid mutator transaction binding the contract method 0x16c38b3c.
//
// Solidity: function setPaused(bool _paused) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) SetPaused(opts *bind.TransactOpts, _paused bool) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "setPaused", _paused)
}

// SetPaused is a paid mutator transaction binding the contract method 0x16c38b3c.
//
// Solidity: function setPaused(bool _paused) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) SetPaused(_paused bool) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SetPaused(&_SepoliaSpaceFactory.TransactOpts, _paused)
}

// SetPaused is a paid mutator transaction binding the contract method 0x16c38b3c.
//
// Solidity: function setPaused(bool _paused) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) SetPaused(_paused bool) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SetPaused(&_SepoliaSpaceFactory.TransactOpts, _paused)
}

// SetSpaceToken is a paid mutator transaction binding the contract method 0xf6ac70b7.
//
// Solidity: function setSpaceToken(address _spaceToken) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) SetSpaceToken(opts *bind.TransactOpts, _spaceToken common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "setSpaceToken", _spaceToken)
}

// SetSpaceToken is a paid mutator transaction binding the contract method 0xf6ac70b7.
//
// Solidity: function setSpaceToken(address _spaceToken) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) SetSpaceToken(_spaceToken common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SetSpaceToken(&_SepoliaSpaceFactory.TransactOpts, _spaceToken)
}

// SetSpaceToken is a paid mutator transaction binding the contract method 0xf6ac70b7.
//
// Solidity: function setSpaceToken(address _spaceToken) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) SetSpaceToken(_spaceToken common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.SetSpaceToken(&_SepoliaSpaceFactory.TransactOpts, _spaceToken)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) TransferOwnership(opts *bind.TransactOpts, newOwner common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "transferOwnership", newOwner)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.TransferOwnership(&_SepoliaSpaceFactory.TransactOpts, newOwner)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.TransferOwnership(&_SepoliaSpaceFactory.TransactOpts, newOwner)
}

// UpdateImplementations is a paid mutator transaction binding the contract method 0x9ad622b7.
//
// Solidity: function updateImplementations(address _space, address _tokenEntitlement, address _userEntitlement, address _gateToken) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) UpdateImplementations(opts *bind.TransactOpts, _space common.Address, _tokenEntitlement common.Address, _userEntitlement common.Address, _gateToken common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "updateImplementations", _space, _tokenEntitlement, _userEntitlement, _gateToken)
}

// UpdateImplementations is a paid mutator transaction binding the contract method 0x9ad622b7.
//
// Solidity: function updateImplementations(address _space, address _tokenEntitlement, address _userEntitlement, address _gateToken) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) UpdateImplementations(_space common.Address, _tokenEntitlement common.Address, _userEntitlement common.Address, _gateToken common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.UpdateImplementations(&_SepoliaSpaceFactory.TransactOpts, _space, _tokenEntitlement, _userEntitlement, _gateToken)
}

// UpdateImplementations is a paid mutator transaction binding the contract method 0x9ad622b7.
//
// Solidity: function updateImplementations(address _space, address _tokenEntitlement, address _userEntitlement, address _gateToken) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) UpdateImplementations(_space common.Address, _tokenEntitlement common.Address, _userEntitlement common.Address, _gateToken common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.UpdateImplementations(&_SepoliaSpaceFactory.TransactOpts, _space, _tokenEntitlement, _userEntitlement, _gateToken)
}

// UpgradeTo is a paid mutator transaction binding the contract method 0x3659cfe6.
//
// Solidity: function upgradeTo(address newImplementation) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) UpgradeTo(opts *bind.TransactOpts, newImplementation common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "upgradeTo", newImplementation)
}

// UpgradeTo is a paid mutator transaction binding the contract method 0x3659cfe6.
//
// Solidity: function upgradeTo(address newImplementation) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) UpgradeTo(newImplementation common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.UpgradeTo(&_SepoliaSpaceFactory.TransactOpts, newImplementation)
}

// UpgradeTo is a paid mutator transaction binding the contract method 0x3659cfe6.
//
// Solidity: function upgradeTo(address newImplementation) returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) UpgradeTo(newImplementation common.Address) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.UpgradeTo(&_SepoliaSpaceFactory.TransactOpts, newImplementation)
}

// UpgradeToAndCall is a paid mutator transaction binding the contract method 0x4f1ef286.
//
// Solidity: function upgradeToAndCall(address newImplementation, bytes data) payable returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactor) UpgradeToAndCall(opts *bind.TransactOpts, newImplementation common.Address, data []byte) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.contract.Transact(opts, "upgradeToAndCall", newImplementation, data)
}

// UpgradeToAndCall is a paid mutator transaction binding the contract method 0x4f1ef286.
//
// Solidity: function upgradeToAndCall(address newImplementation, bytes data) payable returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactorySession) UpgradeToAndCall(newImplementation common.Address, data []byte) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.UpgradeToAndCall(&_SepoliaSpaceFactory.TransactOpts, newImplementation, data)
}

// UpgradeToAndCall is a paid mutator transaction binding the contract method 0x4f1ef286.
//
// Solidity: function upgradeToAndCall(address newImplementation, bytes data) payable returns()
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryTransactorSession) UpgradeToAndCall(newImplementation common.Address, data []byte) (*types.Transaction, error) {
	return _SepoliaSpaceFactory.Contract.UpgradeToAndCall(&_SepoliaSpaceFactory.TransactOpts, newImplementation, data)
}

// SepoliaSpaceFactoryAdminChangedIterator is returned from FilterAdminChanged and is used to iterate over the raw logs and unpacked data for AdminChanged events raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryAdminChangedIterator struct {
	Event *SepoliaSpaceFactoryAdminChanged // Event containing the contract specifics and raw log

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
func (it *SepoliaSpaceFactoryAdminChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaSpaceFactoryAdminChanged)
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
		it.Event = new(SepoliaSpaceFactoryAdminChanged)
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
func (it *SepoliaSpaceFactoryAdminChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaSpaceFactoryAdminChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaSpaceFactoryAdminChanged represents a AdminChanged event raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryAdminChanged struct {
	PreviousAdmin common.Address
	NewAdmin      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterAdminChanged is a free log retrieval operation binding the contract event 0x7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f.
//
// Solidity: event AdminChanged(address previousAdmin, address newAdmin)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) FilterAdminChanged(opts *bind.FilterOpts) (*SepoliaSpaceFactoryAdminChangedIterator, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.FilterLogs(opts, "AdminChanged")
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryAdminChangedIterator{contract: _SepoliaSpaceFactory.contract, event: "AdminChanged", logs: logs, sub: sub}, nil
}

// WatchAdminChanged is a free log subscription operation binding the contract event 0x7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f.
//
// Solidity: event AdminChanged(address previousAdmin, address newAdmin)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) WatchAdminChanged(opts *bind.WatchOpts, sink chan<- *SepoliaSpaceFactoryAdminChanged) (event.Subscription, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.WatchLogs(opts, "AdminChanged")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaSpaceFactoryAdminChanged)
				if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "AdminChanged", log); err != nil {
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

// ParseAdminChanged is a log parse operation binding the contract event 0x7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f.
//
// Solidity: event AdminChanged(address previousAdmin, address newAdmin)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) ParseAdminChanged(log types.Log) (*SepoliaSpaceFactoryAdminChanged, error) {
	event := new(SepoliaSpaceFactoryAdminChanged)
	if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "AdminChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaSpaceFactoryBeaconUpgradedIterator is returned from FilterBeaconUpgraded and is used to iterate over the raw logs and unpacked data for BeaconUpgraded events raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryBeaconUpgradedIterator struct {
	Event *SepoliaSpaceFactoryBeaconUpgraded // Event containing the contract specifics and raw log

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
func (it *SepoliaSpaceFactoryBeaconUpgradedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaSpaceFactoryBeaconUpgraded)
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
		it.Event = new(SepoliaSpaceFactoryBeaconUpgraded)
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
func (it *SepoliaSpaceFactoryBeaconUpgradedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaSpaceFactoryBeaconUpgradedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaSpaceFactoryBeaconUpgraded represents a BeaconUpgraded event raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryBeaconUpgraded struct {
	Beacon common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterBeaconUpgraded is a free log retrieval operation binding the contract event 0x1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e.
//
// Solidity: event BeaconUpgraded(address indexed beacon)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) FilterBeaconUpgraded(opts *bind.FilterOpts, beacon []common.Address) (*SepoliaSpaceFactoryBeaconUpgradedIterator, error) {

	var beaconRule []interface{}
	for _, beaconItem := range beacon {
		beaconRule = append(beaconRule, beaconItem)
	}

	logs, sub, err := _SepoliaSpaceFactory.contract.FilterLogs(opts, "BeaconUpgraded", beaconRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryBeaconUpgradedIterator{contract: _SepoliaSpaceFactory.contract, event: "BeaconUpgraded", logs: logs, sub: sub}, nil
}

// WatchBeaconUpgraded is a free log subscription operation binding the contract event 0x1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e.
//
// Solidity: event BeaconUpgraded(address indexed beacon)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) WatchBeaconUpgraded(opts *bind.WatchOpts, sink chan<- *SepoliaSpaceFactoryBeaconUpgraded, beacon []common.Address) (event.Subscription, error) {

	var beaconRule []interface{}
	for _, beaconItem := range beacon {
		beaconRule = append(beaconRule, beaconItem)
	}

	logs, sub, err := _SepoliaSpaceFactory.contract.WatchLogs(opts, "BeaconUpgraded", beaconRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaSpaceFactoryBeaconUpgraded)
				if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "BeaconUpgraded", log); err != nil {
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

// ParseBeaconUpgraded is a log parse operation binding the contract event 0x1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e.
//
// Solidity: event BeaconUpgraded(address indexed beacon)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) ParseBeaconUpgraded(log types.Log) (*SepoliaSpaceFactoryBeaconUpgraded, error) {
	event := new(SepoliaSpaceFactoryBeaconUpgraded)
	if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "BeaconUpgraded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaSpaceFactoryInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryInitializedIterator struct {
	Event *SepoliaSpaceFactoryInitialized // Event containing the contract specifics and raw log

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
func (it *SepoliaSpaceFactoryInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaSpaceFactoryInitialized)
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
		it.Event = new(SepoliaSpaceFactoryInitialized)
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
func (it *SepoliaSpaceFactoryInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaSpaceFactoryInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaSpaceFactoryInitialized represents a Initialized event raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryInitialized struct {
	Version uint8
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498.
//
// Solidity: event Initialized(uint8 version)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) FilterInitialized(opts *bind.FilterOpts) (*SepoliaSpaceFactoryInitializedIterator, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryInitializedIterator{contract: _SepoliaSpaceFactory.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498.
//
// Solidity: event Initialized(uint8 version)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *SepoliaSpaceFactoryInitialized) (event.Subscription, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaSpaceFactoryInitialized)
				if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Initialized", log); err != nil {
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

// ParseInitialized is a log parse operation binding the contract event 0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498.
//
// Solidity: event Initialized(uint8 version)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) ParseInitialized(log types.Log) (*SepoliaSpaceFactoryInitialized, error) {
	event := new(SepoliaSpaceFactoryInitialized)
	if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaSpaceFactoryOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryOwnershipTransferredIterator struct {
	Event *SepoliaSpaceFactoryOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *SepoliaSpaceFactoryOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaSpaceFactoryOwnershipTransferred)
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
		it.Event = new(SepoliaSpaceFactoryOwnershipTransferred)
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
func (it *SepoliaSpaceFactoryOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaSpaceFactoryOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaSpaceFactoryOwnershipTransferred represents a OwnershipTransferred event raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*SepoliaSpaceFactoryOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _SepoliaSpaceFactory.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryOwnershipTransferredIterator{contract: _SepoliaSpaceFactory.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *SepoliaSpaceFactoryOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _SepoliaSpaceFactory.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaSpaceFactoryOwnershipTransferred)
				if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) ParseOwnershipTransferred(log types.Log) (*SepoliaSpaceFactoryOwnershipTransferred, error) {
	event := new(SepoliaSpaceFactoryOwnershipTransferred)
	if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaSpaceFactoryPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryPausedIterator struct {
	Event *SepoliaSpaceFactoryPaused // Event containing the contract specifics and raw log

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
func (it *SepoliaSpaceFactoryPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaSpaceFactoryPaused)
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
		it.Event = new(SepoliaSpaceFactoryPaused)
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
func (it *SepoliaSpaceFactoryPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaSpaceFactoryPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaSpaceFactoryPaused represents a Paused event raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) FilterPaused(opts *bind.FilterOpts) (*SepoliaSpaceFactoryPausedIterator, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryPausedIterator{contract: _SepoliaSpaceFactory.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *SepoliaSpaceFactoryPaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaSpaceFactoryPaused)
				if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Paused", log); err != nil {
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
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) ParsePaused(log types.Log) (*SepoliaSpaceFactoryPaused, error) {
	event := new(SepoliaSpaceFactoryPaused)
	if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaSpaceFactoryUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryUnpausedIterator struct {
	Event *SepoliaSpaceFactoryUnpaused // Event containing the contract specifics and raw log

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
func (it *SepoliaSpaceFactoryUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaSpaceFactoryUnpaused)
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
		it.Event = new(SepoliaSpaceFactoryUnpaused)
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
func (it *SepoliaSpaceFactoryUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaSpaceFactoryUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaSpaceFactoryUnpaused represents a Unpaused event raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) FilterUnpaused(opts *bind.FilterOpts) (*SepoliaSpaceFactoryUnpausedIterator, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryUnpausedIterator{contract: _SepoliaSpaceFactory.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *SepoliaSpaceFactoryUnpaused) (event.Subscription, error) {

	logs, sub, err := _SepoliaSpaceFactory.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaSpaceFactoryUnpaused)
				if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Unpaused", log); err != nil {
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
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) ParseUnpaused(log types.Log) (*SepoliaSpaceFactoryUnpaused, error) {
	event := new(SepoliaSpaceFactoryUnpaused)
	if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// SepoliaSpaceFactoryUpgradedIterator is returned from FilterUpgraded and is used to iterate over the raw logs and unpacked data for Upgraded events raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryUpgradedIterator struct {
	Event *SepoliaSpaceFactoryUpgraded // Event containing the contract specifics and raw log

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
func (it *SepoliaSpaceFactoryUpgradedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SepoliaSpaceFactoryUpgraded)
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
		it.Event = new(SepoliaSpaceFactoryUpgraded)
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
func (it *SepoliaSpaceFactoryUpgradedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SepoliaSpaceFactoryUpgradedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SepoliaSpaceFactoryUpgraded represents a Upgraded event raised by the SepoliaSpaceFactory contract.
type SepoliaSpaceFactoryUpgraded struct {
	Implementation common.Address
	Raw            types.Log // Blockchain specific contextual infos
}

// FilterUpgraded is a free log retrieval operation binding the contract event 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b.
//
// Solidity: event Upgraded(address indexed implementation)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) FilterUpgraded(opts *bind.FilterOpts, implementation []common.Address) (*SepoliaSpaceFactoryUpgradedIterator, error) {

	var implementationRule []interface{}
	for _, implementationItem := range implementation {
		implementationRule = append(implementationRule, implementationItem)
	}

	logs, sub, err := _SepoliaSpaceFactory.contract.FilterLogs(opts, "Upgraded", implementationRule)
	if err != nil {
		return nil, err
	}
	return &SepoliaSpaceFactoryUpgradedIterator{contract: _SepoliaSpaceFactory.contract, event: "Upgraded", logs: logs, sub: sub}, nil
}

// WatchUpgraded is a free log subscription operation binding the contract event 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b.
//
// Solidity: event Upgraded(address indexed implementation)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) WatchUpgraded(opts *bind.WatchOpts, sink chan<- *SepoliaSpaceFactoryUpgraded, implementation []common.Address) (event.Subscription, error) {

	var implementationRule []interface{}
	for _, implementationItem := range implementation {
		implementationRule = append(implementationRule, implementationItem)
	}

	logs, sub, err := _SepoliaSpaceFactory.contract.WatchLogs(opts, "Upgraded", implementationRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SepoliaSpaceFactoryUpgraded)
				if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Upgraded", log); err != nil {
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

// ParseUpgraded is a log parse operation binding the contract event 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b.
//
// Solidity: event Upgraded(address indexed implementation)
func (_SepoliaSpaceFactory *SepoliaSpaceFactoryFilterer) ParseUpgraded(log types.Log) (*SepoliaSpaceFactoryUpgraded, error) {
	event := new(SepoliaSpaceFactoryUpgraded)
	if err := _SepoliaSpaceFactory.contract.UnpackLog(event, "Upgraded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
