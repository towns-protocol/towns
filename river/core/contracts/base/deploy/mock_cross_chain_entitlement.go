// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package deploy

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

// ICrossChainEntitlementParameter is an auto generated low-level Go binding around an user-defined struct.
type ICrossChainEntitlementParameter struct {
	Name        string
	Primitive   string
	Description string
}

// MockCrossChainEntitlementMetaData contains all meta data concerning the MockCrossChainEntitlement contract.
var MockCrossChainEntitlementMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"isEntitled\",\"inputs\":[{\"name\":\"users\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isEntitledByUserAndId\",\"inputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"parameters\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structICrossChainEntitlement.Parameter[]\",\"components\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"primitive\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"description\",\"type\":\"string\",\"internalType\":\"string\"}]}],\"stateMutability\":\"pure\"},{\"type\":\"function\",\"name\":\"setIsEntitled\",\"inputs\":[{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"entitled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"}]",
	Bin: "0x608060405234801561001057600080fd5b50610531806100206000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806316089f65146100515780637addd58714610079578063890357301461009c578063b48900e8146100b1575b600080fd5b61006461005f3660046102af565b610118565b60405190151581526020015b60405180910390f35b610064610087366004610374565b60006020819052908152604090205460ff1681565b6100a46101cc565b60405161007091906103d3565b6101166100bf366004610492565b604080516001600160a01b038416602082015290810184905260009060600160408051808303601f1901815291815281516020928301206000908152918290529020805460ff191692151592909217909155505050565b005b60008061012783850185610374565b905060005b858110156101bd576000878783818110610148576101486104d7565b905060200201602081019061015d91906104ed565b604080516001600160a01b039092166020830152810184905260600160408051601f19818403018152918152815160209283012060008181529283905291205490915060ff16156101b457600193505050506101c4565b5060010161012c565b5060009150505b949350505050565b60408051600180825281830190925260609160009190816020015b61020b60405180606001604052806060815260200160608152602001606081525090565b8152602001906001900390816101e75790505090506040518060600160405280604051806040016040528060028152602001611a5960f21b8152508152602001604051806040016040528060078152602001663ab4b73a191a9b60c91b8152508152602001604051806060016040528060218152602001610510602191398152508160008151811061029f5761029f6104d7565b6020908102919091010152919050565b600080600080604085870312156102c557600080fd5b843567ffffffffffffffff808211156102dd57600080fd5b818701915087601f8301126102f157600080fd5b81358181111561030057600080fd5b8860208260051b850101111561031557600080fd5b60209283019650945090860135908082111561033057600080fd5b818701915087601f83011261034457600080fd5b81358181111561035357600080fd5b88602082850101111561036557600080fd5b95989497505060200194505050565b60006020828403121561038657600080fd5b5035919050565b6000815180845260005b818110156103b357602081850181015186830182015201610397565b506000602082860101526020601f19601f83011685010191505092915050565b600060208083018184528085518083526040925060408601915060408160051b87010184880160005b8381101561046857603f198984030185528151606081518186526104228287018261038d565b915050888201518582038a87015261043a828261038d565b91505087820151915084810388860152610454818361038d565b9689019694505050908601906001016103fc565b509098975050505050505050565b80356001600160a01b038116811461048d57600080fd5b919050565b6000806000606084860312156104a757600080fd5b833592506104b760208501610476565b9150604084013580151581146104cc57600080fd5b809150509250925092565b634e487b7160e01b600052603260045260246000fd5b6000602082840312156104ff57600080fd5b61050882610476565b939250505056fe53696d706c6520706172616d65746572207479706520666f722074657374696e67",
}

// MockCrossChainEntitlementABI is the input ABI used to generate the binding from.
// Deprecated: Use MockCrossChainEntitlementMetaData.ABI instead.
var MockCrossChainEntitlementABI = MockCrossChainEntitlementMetaData.ABI

// MockCrossChainEntitlementBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockCrossChainEntitlementMetaData.Bin instead.
var MockCrossChainEntitlementBin = MockCrossChainEntitlementMetaData.Bin

// DeployMockCrossChainEntitlement deploys a new Ethereum contract, binding an instance of MockCrossChainEntitlement to it.
func DeployMockCrossChainEntitlement(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *MockCrossChainEntitlement, error) {
	parsed, err := MockCrossChainEntitlementMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockCrossChainEntitlementBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockCrossChainEntitlement{MockCrossChainEntitlementCaller: MockCrossChainEntitlementCaller{contract: contract}, MockCrossChainEntitlementTransactor: MockCrossChainEntitlementTransactor{contract: contract}, MockCrossChainEntitlementFilterer: MockCrossChainEntitlementFilterer{contract: contract}}, nil
}

// MockCrossChainEntitlement is an auto generated Go binding around an Ethereum contract.
type MockCrossChainEntitlement struct {
	MockCrossChainEntitlementCaller     // Read-only binding to the contract
	MockCrossChainEntitlementTransactor // Write-only binding to the contract
	MockCrossChainEntitlementFilterer   // Log filterer for contract events
}

// MockCrossChainEntitlementCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockCrossChainEntitlementCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockCrossChainEntitlementTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockCrossChainEntitlementTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockCrossChainEntitlementFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockCrossChainEntitlementFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockCrossChainEntitlementSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockCrossChainEntitlementSession struct {
	Contract     *MockCrossChainEntitlement // Generic contract binding to set the session for
	CallOpts     bind.CallOpts              // Call options to use throughout this session
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// MockCrossChainEntitlementCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockCrossChainEntitlementCallerSession struct {
	Contract *MockCrossChainEntitlementCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                    // Call options to use throughout this session
}

// MockCrossChainEntitlementTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockCrossChainEntitlementTransactorSession struct {
	Contract     *MockCrossChainEntitlementTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                    // Transaction auth options to use throughout this session
}

// MockCrossChainEntitlementRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockCrossChainEntitlementRaw struct {
	Contract *MockCrossChainEntitlement // Generic contract binding to access the raw methods on
}

// MockCrossChainEntitlementCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockCrossChainEntitlementCallerRaw struct {
	Contract *MockCrossChainEntitlementCaller // Generic read-only contract binding to access the raw methods on
}

// MockCrossChainEntitlementTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockCrossChainEntitlementTransactorRaw struct {
	Contract *MockCrossChainEntitlementTransactor // Generic write-only contract binding to access the raw methods on
}

// NewMockCrossChainEntitlement creates a new instance of MockCrossChainEntitlement, bound to a specific deployed contract.
func NewMockCrossChainEntitlement(address common.Address, backend bind.ContractBackend) (*MockCrossChainEntitlement, error) {
	contract, err := bindMockCrossChainEntitlement(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockCrossChainEntitlement{MockCrossChainEntitlementCaller: MockCrossChainEntitlementCaller{contract: contract}, MockCrossChainEntitlementTransactor: MockCrossChainEntitlementTransactor{contract: contract}, MockCrossChainEntitlementFilterer: MockCrossChainEntitlementFilterer{contract: contract}}, nil
}

// NewMockCrossChainEntitlementCaller creates a new read-only instance of MockCrossChainEntitlement, bound to a specific deployed contract.
func NewMockCrossChainEntitlementCaller(address common.Address, caller bind.ContractCaller) (*MockCrossChainEntitlementCaller, error) {
	contract, err := bindMockCrossChainEntitlement(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockCrossChainEntitlementCaller{contract: contract}, nil
}

// NewMockCrossChainEntitlementTransactor creates a new write-only instance of MockCrossChainEntitlement, bound to a specific deployed contract.
func NewMockCrossChainEntitlementTransactor(address common.Address, transactor bind.ContractTransactor) (*MockCrossChainEntitlementTransactor, error) {
	contract, err := bindMockCrossChainEntitlement(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockCrossChainEntitlementTransactor{contract: contract}, nil
}

// NewMockCrossChainEntitlementFilterer creates a new log filterer instance of MockCrossChainEntitlement, bound to a specific deployed contract.
func NewMockCrossChainEntitlementFilterer(address common.Address, filterer bind.ContractFilterer) (*MockCrossChainEntitlementFilterer, error) {
	contract, err := bindMockCrossChainEntitlement(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockCrossChainEntitlementFilterer{contract: contract}, nil
}

// bindMockCrossChainEntitlement binds a generic wrapper to an already deployed contract.
func bindMockCrossChainEntitlement(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockCrossChainEntitlementMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockCrossChainEntitlement *MockCrossChainEntitlementRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockCrossChainEntitlement.Contract.MockCrossChainEntitlementCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockCrossChainEntitlement *MockCrossChainEntitlementRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockCrossChainEntitlement.Contract.MockCrossChainEntitlementTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockCrossChainEntitlement *MockCrossChainEntitlementRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockCrossChainEntitlement.Contract.MockCrossChainEntitlementTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockCrossChainEntitlement *MockCrossChainEntitlementCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockCrossChainEntitlement.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockCrossChainEntitlement *MockCrossChainEntitlementTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockCrossChainEntitlement.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockCrossChainEntitlement *MockCrossChainEntitlementTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockCrossChainEntitlement.Contract.contract.Transact(opts, method, params...)
}

// IsEntitled is a free data retrieval call binding the contract method 0x16089f65.
//
// Solidity: function isEntitled(address[] users, bytes data) view returns(bool)
func (_MockCrossChainEntitlement *MockCrossChainEntitlementCaller) IsEntitled(opts *bind.CallOpts, users []common.Address, data []byte) (bool, error) {
	var out []interface{}
	err := _MockCrossChainEntitlement.contract.Call(opts, &out, "isEntitled", users, data)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitled is a free data retrieval call binding the contract method 0x16089f65.
//
// Solidity: function isEntitled(address[] users, bytes data) view returns(bool)
func (_MockCrossChainEntitlement *MockCrossChainEntitlementSession) IsEntitled(users []common.Address, data []byte) (bool, error) {
	return _MockCrossChainEntitlement.Contract.IsEntitled(&_MockCrossChainEntitlement.CallOpts, users, data)
}

// IsEntitled is a free data retrieval call binding the contract method 0x16089f65.
//
// Solidity: function isEntitled(address[] users, bytes data) view returns(bool)
func (_MockCrossChainEntitlement *MockCrossChainEntitlementCallerSession) IsEntitled(users []common.Address, data []byte) (bool, error) {
	return _MockCrossChainEntitlement.Contract.IsEntitled(&_MockCrossChainEntitlement.CallOpts, users, data)
}

// IsEntitledByUserAndId is a free data retrieval call binding the contract method 0x7addd587.
//
// Solidity: function isEntitledByUserAndId(bytes32 ) view returns(bool)
func (_MockCrossChainEntitlement *MockCrossChainEntitlementCaller) IsEntitledByUserAndId(opts *bind.CallOpts, arg0 [32]byte) (bool, error) {
	var out []interface{}
	err := _MockCrossChainEntitlement.contract.Call(opts, &out, "isEntitledByUserAndId", arg0)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsEntitledByUserAndId is a free data retrieval call binding the contract method 0x7addd587.
//
// Solidity: function isEntitledByUserAndId(bytes32 ) view returns(bool)
func (_MockCrossChainEntitlement *MockCrossChainEntitlementSession) IsEntitledByUserAndId(arg0 [32]byte) (bool, error) {
	return _MockCrossChainEntitlement.Contract.IsEntitledByUserAndId(&_MockCrossChainEntitlement.CallOpts, arg0)
}

// IsEntitledByUserAndId is a free data retrieval call binding the contract method 0x7addd587.
//
// Solidity: function isEntitledByUserAndId(bytes32 ) view returns(bool)
func (_MockCrossChainEntitlement *MockCrossChainEntitlementCallerSession) IsEntitledByUserAndId(arg0 [32]byte) (bool, error) {
	return _MockCrossChainEntitlement.Contract.IsEntitledByUserAndId(&_MockCrossChainEntitlement.CallOpts, arg0)
}

// Parameters is a free data retrieval call binding the contract method 0x89035730.
//
// Solidity: function parameters() pure returns((string,string,string)[])
func (_MockCrossChainEntitlement *MockCrossChainEntitlementCaller) Parameters(opts *bind.CallOpts) ([]ICrossChainEntitlementParameter, error) {
	var out []interface{}
	err := _MockCrossChainEntitlement.contract.Call(opts, &out, "parameters")

	if err != nil {
		return *new([]ICrossChainEntitlementParameter), err
	}

	out0 := *abi.ConvertType(out[0], new([]ICrossChainEntitlementParameter)).(*[]ICrossChainEntitlementParameter)

	return out0, err

}

// Parameters is a free data retrieval call binding the contract method 0x89035730.
//
// Solidity: function parameters() pure returns((string,string,string)[])
func (_MockCrossChainEntitlement *MockCrossChainEntitlementSession) Parameters() ([]ICrossChainEntitlementParameter, error) {
	return _MockCrossChainEntitlement.Contract.Parameters(&_MockCrossChainEntitlement.CallOpts)
}

// Parameters is a free data retrieval call binding the contract method 0x89035730.
//
// Solidity: function parameters() pure returns((string,string,string)[])
func (_MockCrossChainEntitlement *MockCrossChainEntitlementCallerSession) Parameters() ([]ICrossChainEntitlementParameter, error) {
	return _MockCrossChainEntitlement.Contract.Parameters(&_MockCrossChainEntitlement.CallOpts)
}

// SetIsEntitled is a paid mutator transaction binding the contract method 0xb48900e8.
//
// Solidity: function setIsEntitled(uint256 id, address user, bool entitled) returns()
func (_MockCrossChainEntitlement *MockCrossChainEntitlementTransactor) SetIsEntitled(opts *bind.TransactOpts, id *big.Int, user common.Address, entitled bool) (*types.Transaction, error) {
	return _MockCrossChainEntitlement.contract.Transact(opts, "setIsEntitled", id, user, entitled)
}

// SetIsEntitled is a paid mutator transaction binding the contract method 0xb48900e8.
//
// Solidity: function setIsEntitled(uint256 id, address user, bool entitled) returns()
func (_MockCrossChainEntitlement *MockCrossChainEntitlementSession) SetIsEntitled(id *big.Int, user common.Address, entitled bool) (*types.Transaction, error) {
	return _MockCrossChainEntitlement.Contract.SetIsEntitled(&_MockCrossChainEntitlement.TransactOpts, id, user, entitled)
}

// SetIsEntitled is a paid mutator transaction binding the contract method 0xb48900e8.
//
// Solidity: function setIsEntitled(uint256 id, address user, bool entitled) returns()
func (_MockCrossChainEntitlement *MockCrossChainEntitlementTransactorSession) SetIsEntitled(id *big.Int, user common.Address, entitled bool) (*types.Transaction, error) {
	return _MockCrossChainEntitlement.Contract.SetIsEntitled(&_MockCrossChainEntitlement.TransactOpts, id, user, entitled)
}
