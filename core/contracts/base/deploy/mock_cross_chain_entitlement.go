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
	Bin: "0x6080604052348015600e575f5ffd5b506106248061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c806316089f651461004e5780637addd587146100765780638903573014610098578063b48900e8146100ad575b5f5ffd5b61006161005c36600461038c565b61015b565b60405190151581526020015b60405180910390f35b610061610084366004610427565b5f6020819052908152604090205460ff1681565b6100a0610235565b60405161006d919061048a565b6101596100bb366004610574565b6040805173ffffffffffffffffffffffffffffffffffffffff841660208201529081018490525f90606001604080518083037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe001815291815281516020928301205f90815291829052902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001692151592909217909155505050565b005b5f8061016983850185610427565b90505f5b85811015610227575f878783818110610188576101886105b5565b905060200201602081019061019d91906105e2565b6040805173ffffffffffffffffffffffffffffffffffffffff90921660208301528101849052606001604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe081840301815291815281516020928301205f8181529283905291205490915060ff161561021e576001935050505061022d565b5060010161016d565b505f9150505b949350505050565b6040805160018082528183019092526060915f9190816020015b61027360405180606001604052806060815260200160608152602001606081525090565b81526020019060019003908161024f57905050905060405180606001604052806040518060400160405280600281526020017f696400000000000000000000000000000000000000000000000000000000000081525081526020016040518060400160405280600781526020017f75696e7432353600000000000000000000000000000000000000000000000000815250815260200160405180606001604052806021815260200161060360219139815250815f81518110610337576103376105b5565b6020908102919091010152919050565b5f5f83601f840112610357575f5ffd5b50813567ffffffffffffffff81111561036e575f5ffd5b602083019150836020828501011115610385575f5ffd5b9250929050565b5f5f5f5f6040858703121561039f575f5ffd5b843567ffffffffffffffff8111156103b5575f5ffd5b8501601f810187136103c5575f5ffd5b803567ffffffffffffffff8111156103db575f5ffd5b8760208260051b84010111156103ef575f5ffd5b60209182019550935085013567ffffffffffffffff81111561040f575f5ffd5b61041b87828801610347565b95989497509550505050565b5f60208284031215610437575f5ffd5b5035919050565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b5f602082016020835280845180835260408501915060408160051b8601019250602086015f5b82811015610540577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc087860301845281518051606087526104f4606088018261043e565b90506020820151878203602089015261050d828261043e565b915050604082015191508681036040880152610529818361043e565b9650505060209384019391909101906001016104b0565b50929695505050505050565b803573ffffffffffffffffffffffffffffffffffffffff8116811461056f575f5ffd5b919050565b5f5f5f60608486031215610586575f5ffd5b833592506105966020850161054c565b9150604084013580151581146105aa575f5ffd5b809150509250925092565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f602082840312156105f2575f5ffd5b6105fb8261054c565b939250505056fe53696d706c6520706172616d65746572207479706520666f722074657374696e67",
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
