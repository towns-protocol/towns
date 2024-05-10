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

// EntitlementCheckerMetaData contains all meta data concerning the EntitlementChecker contract.
var EntitlementCheckerMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"__EntitlementChecker_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getNodeAtIndex\",\"inputs\":[{\"name\":\"index\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRandomNodes\",\"inputs\":[{\"name\":\"count\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isValidNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheck\",\"inputs\":[{\"name\":\"callerAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"unregisterNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckRequested\",\"inputs\":[{\"name\":\"callerAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRegistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUnregistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientNumberOfNodes\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidNodeOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]}]",
	Bin: "0x608060405234801561001057600080fd5b5061001961001e565b6100c4565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff161561006a576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156100c157805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b610b5a806100d36000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063541da4e51161005b578063541da4e5146100fd578063672d7a0d146101105780639ebd11ef14610123578063c5e41cf61461014657600080fd5b806339bf397e1461008d57806339dc5b3e146100a85780633c59f126146100b25780634f845445146100dd575b600080fd5b610095610159565b6040519081526020015b60405180910390f35b6100b0610179565b005b6100c56100c03660046108bf565b6101d5565b6040516001600160a01b03909116815260200161009f565b6100f06100eb3660046108bf565b610248565b60405161009f919061091d565b6100b061010b366004610962565b610259565b6100b061011e366004610a4b565b61029e565b610136610131366004610a4b565b610334565b604051901515815260200161009f565b6100b0610154366004610a4b565b61034f565b6000600080516020610b3a833981519152610173816103e2565b91505090565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166101c357604051630ef4733760e31b815260040160405180910390fd5b6101d3630882d3fb60e21b6103ec565b565b6000600080516020610b3a8339815191526101ef816103e2565b83106102375760405162461bcd60e51b8152602060048201526013602482015272496e646578206f7574206f6620626f756e647360681b604482015260640160405180910390fd5b61024181846104ca565b9392505050565b6060610253826104d6565b92915050565b7f4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f38433858585604051610290959493929190610a66565b60405180910390a150505050565b600080516020610b3a8339815191526102b781836106ab565b156102d55760405163d1922fc160e01b815260040160405180910390fd5b6102df81836106cd565b506001600160a01b038216600081815260028301602052604080822080546001600160a01b03191633179055517f564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf69190a25050565b6000600080516020610b3a83398151915261024181846106ab565b600080516020610b3a83398151915261036881836106ab565b610385576040516317e3e0b960e01b815260040160405180910390fd5b61038f81836106e2565b506001600160a01b038216600081815260028301602052604080822080546001600160a01b0319169055517fb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a9190a25050565b6000610253825490565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff161515600114610479576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610492565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b600061024183836106f7565b6060600080516020610b3a83398151915260006104f2826103e2565b90508084111561051557604051631762997d60e01b815260040160405180910390fd5b60008467ffffffffffffffff8111156105305761053061094c565b604051908082528060200260200182016040528015610559578160200160208202803683370190505b50905060008267ffffffffffffffff8111156105775761057761094c565b6040519080825280602002602001820160405280156105a0578160200160208202803683370190505b50905060005b838110156105d457808282815181106105c1576105c1610aab565b60209081029190910101526001016105a6565b508260005b8781101561069f5760006105ed8284610721565b905061061e84828151811061060457610604610aab565b6020026020010151886000016104ca90919063ffffffff16565b85838151811061063057610630610aab565b6001600160a01b039092166020928302919091019091015283610654600185610ad7565b8151811061066457610664610aab565b602002602001015184828151811061067e5761067e610aab565b60209081029190910101528261069381610aea565b935050506001016105d9565b50919695505050505050565b6001600160a01b03811660009081526001830160205260408120541515610241565b6000610241836001600160a01b03841661077d565b6000610241836001600160a01b0384166107cc565b600082600001828154811061070e5761070e610aab565b9060005260206000200154905092915050565b604080514460208201524291810191909152606080820184905233901b6bffffffffffffffffffffffff1916608082015260009082906094016040516020818303038152906040528051906020012060001c6102419190610b01565b60008181526001830160205260408120546107c457508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610253565b506000610253565b600081815260018301602052604081205480156108b55760006107f0600183610ad7565b855490915060009061080490600190610ad7565b905080821461086957600086600001828154811061082457610824610aab565b906000526020600020015490508087600001848154811061084757610847610aab565b6000918252602080832090910192909255918252600188019052604090208390555b855486908061087a5761087a610b23565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610253565b6000915050610253565b6000602082840312156108d157600080fd5b5035919050565b60008151808452602080850194506020840160005b838110156109125781516001600160a01b0316875295820195908201906001016108ed565b509495945050505050565b60208152600061024160208301846108d8565b80356001600160a01b038116811461094757600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b6000806000806080858703121561097857600080fd5b61098185610930565b9350602080860135935060408601359250606086013567ffffffffffffffff808211156109ad57600080fd5b818801915088601f8301126109c157600080fd5b8135818111156109d3576109d361094c565b8060051b604051601f19603f830116810181811085821117156109f8576109f861094c565b60405291825284820192508381018501918b831115610a1657600080fd5b938501935b82851015610a3b57610a2c85610930565b84529385019392850192610a1b565b989b979a50959850505050505050565b600060208284031215610a5d57600080fd5b61024182610930565b6001600160a01b03868116825285166020820152604081018490526060810183905260a060808201819052600090610aa0908301846108d8565b979650505050505050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b8181038181111561025357610253610ac1565b600081610af957610af9610ac1565b506000190190565b600082610b1e57634e487b7160e01b600052601260045260246000fd5b500690565b634e487b7160e01b600052603160045260246000fdfe180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f602600",
}

// EntitlementCheckerABI is the input ABI used to generate the binding from.
// Deprecated: Use EntitlementCheckerMetaData.ABI instead.
var EntitlementCheckerABI = EntitlementCheckerMetaData.ABI

// EntitlementCheckerBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use EntitlementCheckerMetaData.Bin instead.
var EntitlementCheckerBin = EntitlementCheckerMetaData.Bin

// DeployEntitlementChecker deploys a new Ethereum contract, binding an instance of EntitlementChecker to it.
func DeployEntitlementChecker(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *EntitlementChecker, error) {
	parsed, err := EntitlementCheckerMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(EntitlementCheckerBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &EntitlementChecker{EntitlementCheckerCaller: EntitlementCheckerCaller{contract: contract}, EntitlementCheckerTransactor: EntitlementCheckerTransactor{contract: contract}, EntitlementCheckerFilterer: EntitlementCheckerFilterer{contract: contract}}, nil
}

// EntitlementChecker is an auto generated Go binding around an Ethereum contract.
type EntitlementChecker struct {
	EntitlementCheckerCaller     // Read-only binding to the contract
	EntitlementCheckerTransactor // Write-only binding to the contract
	EntitlementCheckerFilterer   // Log filterer for contract events
}

// EntitlementCheckerCaller is an auto generated read-only Go binding around an Ethereum contract.
type EntitlementCheckerCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementCheckerTransactor is an auto generated write-only Go binding around an Ethereum contract.
type EntitlementCheckerTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementCheckerFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type EntitlementCheckerFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// EntitlementCheckerSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type EntitlementCheckerSession struct {
	Contract     *EntitlementChecker // Generic contract binding to set the session for
	CallOpts     bind.CallOpts       // Call options to use throughout this session
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// EntitlementCheckerCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type EntitlementCheckerCallerSession struct {
	Contract *EntitlementCheckerCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts             // Call options to use throughout this session
}

// EntitlementCheckerTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type EntitlementCheckerTransactorSession struct {
	Contract     *EntitlementCheckerTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts             // Transaction auth options to use throughout this session
}

// EntitlementCheckerRaw is an auto generated low-level Go binding around an Ethereum contract.
type EntitlementCheckerRaw struct {
	Contract *EntitlementChecker // Generic contract binding to access the raw methods on
}

// EntitlementCheckerCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type EntitlementCheckerCallerRaw struct {
	Contract *EntitlementCheckerCaller // Generic read-only contract binding to access the raw methods on
}

// EntitlementCheckerTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type EntitlementCheckerTransactorRaw struct {
	Contract *EntitlementCheckerTransactor // Generic write-only contract binding to access the raw methods on
}

// NewEntitlementChecker creates a new instance of EntitlementChecker, bound to a specific deployed contract.
func NewEntitlementChecker(address common.Address, backend bind.ContractBackend) (*EntitlementChecker, error) {
	contract, err := bindEntitlementChecker(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &EntitlementChecker{EntitlementCheckerCaller: EntitlementCheckerCaller{contract: contract}, EntitlementCheckerTransactor: EntitlementCheckerTransactor{contract: contract}, EntitlementCheckerFilterer: EntitlementCheckerFilterer{contract: contract}}, nil
}

// NewEntitlementCheckerCaller creates a new read-only instance of EntitlementChecker, bound to a specific deployed contract.
func NewEntitlementCheckerCaller(address common.Address, caller bind.ContractCaller) (*EntitlementCheckerCaller, error) {
	contract, err := bindEntitlementChecker(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerCaller{contract: contract}, nil
}

// NewEntitlementCheckerTransactor creates a new write-only instance of EntitlementChecker, bound to a specific deployed contract.
func NewEntitlementCheckerTransactor(address common.Address, transactor bind.ContractTransactor) (*EntitlementCheckerTransactor, error) {
	contract, err := bindEntitlementChecker(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerTransactor{contract: contract}, nil
}

// NewEntitlementCheckerFilterer creates a new log filterer instance of EntitlementChecker, bound to a specific deployed contract.
func NewEntitlementCheckerFilterer(address common.Address, filterer bind.ContractFilterer) (*EntitlementCheckerFilterer, error) {
	contract, err := bindEntitlementChecker(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerFilterer{contract: contract}, nil
}

// bindEntitlementChecker binds a generic wrapper to an already deployed contract.
func bindEntitlementChecker(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := EntitlementCheckerMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementChecker *EntitlementCheckerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementChecker.Contract.EntitlementCheckerCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementChecker *EntitlementCheckerRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.EntitlementCheckerTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementChecker *EntitlementCheckerRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.EntitlementCheckerTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_EntitlementChecker *EntitlementCheckerCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _EntitlementChecker.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_EntitlementChecker *EntitlementCheckerTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_EntitlementChecker *EntitlementCheckerTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.contract.Transact(opts, method, params...)
}

// GetNodeAtIndex is a free data retrieval call binding the contract method 0x3c59f126.
//
// Solidity: function getNodeAtIndex(uint256 index) view returns(address)
func (_EntitlementChecker *EntitlementCheckerCaller) GetNodeAtIndex(opts *bind.CallOpts, index *big.Int) (common.Address, error) {
	var out []interface{}
	err := _EntitlementChecker.contract.Call(opts, &out, "getNodeAtIndex", index)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetNodeAtIndex is a free data retrieval call binding the contract method 0x3c59f126.
//
// Solidity: function getNodeAtIndex(uint256 index) view returns(address)
func (_EntitlementChecker *EntitlementCheckerSession) GetNodeAtIndex(index *big.Int) (common.Address, error) {
	return _EntitlementChecker.Contract.GetNodeAtIndex(&_EntitlementChecker.CallOpts, index)
}

// GetNodeAtIndex is a free data retrieval call binding the contract method 0x3c59f126.
//
// Solidity: function getNodeAtIndex(uint256 index) view returns(address)
func (_EntitlementChecker *EntitlementCheckerCallerSession) GetNodeAtIndex(index *big.Int) (common.Address, error) {
	return _EntitlementChecker.Contract.GetNodeAtIndex(&_EntitlementChecker.CallOpts, index)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_EntitlementChecker *EntitlementCheckerCaller) GetNodeCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _EntitlementChecker.contract.Call(opts, &out, "getNodeCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_EntitlementChecker *EntitlementCheckerSession) GetNodeCount() (*big.Int, error) {
	return _EntitlementChecker.Contract.GetNodeCount(&_EntitlementChecker.CallOpts)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_EntitlementChecker *EntitlementCheckerCallerSession) GetNodeCount() (*big.Int, error) {
	return _EntitlementChecker.Contract.GetNodeCount(&_EntitlementChecker.CallOpts)
}

// GetRandomNodes is a free data retrieval call binding the contract method 0x4f845445.
//
// Solidity: function getRandomNodes(uint256 count) view returns(address[])
func (_EntitlementChecker *EntitlementCheckerCaller) GetRandomNodes(opts *bind.CallOpts, count *big.Int) ([]common.Address, error) {
	var out []interface{}
	err := _EntitlementChecker.contract.Call(opts, &out, "getRandomNodes", count)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetRandomNodes is a free data retrieval call binding the contract method 0x4f845445.
//
// Solidity: function getRandomNodes(uint256 count) view returns(address[])
func (_EntitlementChecker *EntitlementCheckerSession) GetRandomNodes(count *big.Int) ([]common.Address, error) {
	return _EntitlementChecker.Contract.GetRandomNodes(&_EntitlementChecker.CallOpts, count)
}

// GetRandomNodes is a free data retrieval call binding the contract method 0x4f845445.
//
// Solidity: function getRandomNodes(uint256 count) view returns(address[])
func (_EntitlementChecker *EntitlementCheckerCallerSession) GetRandomNodes(count *big.Int) ([]common.Address, error) {
	return _EntitlementChecker.Contract.GetRandomNodes(&_EntitlementChecker.CallOpts, count)
}

// IsValidNode is a free data retrieval call binding the contract method 0x9ebd11ef.
//
// Solidity: function isValidNode(address node) view returns(bool)
func (_EntitlementChecker *EntitlementCheckerCaller) IsValidNode(opts *bind.CallOpts, node common.Address) (bool, error) {
	var out []interface{}
	err := _EntitlementChecker.contract.Call(opts, &out, "isValidNode", node)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsValidNode is a free data retrieval call binding the contract method 0x9ebd11ef.
//
// Solidity: function isValidNode(address node) view returns(bool)
func (_EntitlementChecker *EntitlementCheckerSession) IsValidNode(node common.Address) (bool, error) {
	return _EntitlementChecker.Contract.IsValidNode(&_EntitlementChecker.CallOpts, node)
}

// IsValidNode is a free data retrieval call binding the contract method 0x9ebd11ef.
//
// Solidity: function isValidNode(address node) view returns(bool)
func (_EntitlementChecker *EntitlementCheckerCallerSession) IsValidNode(node common.Address) (bool, error) {
	return _EntitlementChecker.Contract.IsValidNode(&_EntitlementChecker.CallOpts, node)
}

// EntitlementCheckerInit is a paid mutator transaction binding the contract method 0x39dc5b3e.
//
// Solidity: function __EntitlementChecker_init() returns()
func (_EntitlementChecker *EntitlementCheckerTransactor) EntitlementCheckerInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _EntitlementChecker.contract.Transact(opts, "__EntitlementChecker_init")
}

// EntitlementCheckerInit is a paid mutator transaction binding the contract method 0x39dc5b3e.
//
// Solidity: function __EntitlementChecker_init() returns()
func (_EntitlementChecker *EntitlementCheckerSession) EntitlementCheckerInit() (*types.Transaction, error) {
	return _EntitlementChecker.Contract.EntitlementCheckerInit(&_EntitlementChecker.TransactOpts)
}

// EntitlementCheckerInit is a paid mutator transaction binding the contract method 0x39dc5b3e.
//
// Solidity: function __EntitlementChecker_init() returns()
func (_EntitlementChecker *EntitlementCheckerTransactorSession) EntitlementCheckerInit() (*types.Transaction, error) {
	return _EntitlementChecker.Contract.EntitlementCheckerInit(&_EntitlementChecker.TransactOpts)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x672d7a0d.
//
// Solidity: function registerNode(address node) returns()
func (_EntitlementChecker *EntitlementCheckerTransactor) RegisterNode(opts *bind.TransactOpts, node common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.contract.Transact(opts, "registerNode", node)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x672d7a0d.
//
// Solidity: function registerNode(address node) returns()
func (_EntitlementChecker *EntitlementCheckerSession) RegisterNode(node common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RegisterNode(&_EntitlementChecker.TransactOpts, node)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x672d7a0d.
//
// Solidity: function registerNode(address node) returns()
func (_EntitlementChecker *EntitlementCheckerTransactorSession) RegisterNode(node common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RegisterNode(&_EntitlementChecker.TransactOpts, node)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address callerAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_EntitlementChecker *EntitlementCheckerTransactor) RequestEntitlementCheck(opts *bind.TransactOpts, callerAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.contract.Transact(opts, "requestEntitlementCheck", callerAddress, transactionId, roleId, nodes)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address callerAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_EntitlementChecker *EntitlementCheckerSession) RequestEntitlementCheck(callerAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RequestEntitlementCheck(&_EntitlementChecker.TransactOpts, callerAddress, transactionId, roleId, nodes)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address callerAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_EntitlementChecker *EntitlementCheckerTransactorSession) RequestEntitlementCheck(callerAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RequestEntitlementCheck(&_EntitlementChecker.TransactOpts, callerAddress, transactionId, roleId, nodes)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0xc5e41cf6.
//
// Solidity: function unregisterNode(address node) returns()
func (_EntitlementChecker *EntitlementCheckerTransactor) UnregisterNode(opts *bind.TransactOpts, node common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.contract.Transact(opts, "unregisterNode", node)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0xc5e41cf6.
//
// Solidity: function unregisterNode(address node) returns()
func (_EntitlementChecker *EntitlementCheckerSession) UnregisterNode(node common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.UnregisterNode(&_EntitlementChecker.TransactOpts, node)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0xc5e41cf6.
//
// Solidity: function unregisterNode(address node) returns()
func (_EntitlementChecker *EntitlementCheckerTransactorSession) UnregisterNode(node common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.UnregisterNode(&_EntitlementChecker.TransactOpts, node)
}

// EntitlementCheckerEntitlementCheckRequestedIterator is returned from FilterEntitlementCheckRequested and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequested events raised by the EntitlementChecker contract.
type EntitlementCheckerEntitlementCheckRequestedIterator struct {
	Event *EntitlementCheckerEntitlementCheckRequested // Event containing the contract specifics and raw log

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
func (it *EntitlementCheckerEntitlementCheckRequestedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementCheckerEntitlementCheckRequested)
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
		it.Event = new(EntitlementCheckerEntitlementCheckRequested)
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
func (it *EntitlementCheckerEntitlementCheckRequestedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementCheckerEntitlementCheckRequestedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementCheckerEntitlementCheckRequested represents a EntitlementCheckRequested event raised by the EntitlementChecker contract.
type EntitlementCheckerEntitlementCheckRequested struct {
	CallerAddress   common.Address
	ContractAddress common.Address
	TransactionId   [32]byte
	RoleId          *big.Int
	SelectedNodes   []common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckRequested is a free log retrieval operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_EntitlementChecker *EntitlementCheckerFilterer) FilterEntitlementCheckRequested(opts *bind.FilterOpts) (*EntitlementCheckerEntitlementCheckRequestedIterator, error) {

	logs, sub, err := _EntitlementChecker.contract.FilterLogs(opts, "EntitlementCheckRequested")
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerEntitlementCheckRequestedIterator{contract: _EntitlementChecker.contract, event: "EntitlementCheckRequested", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequested is a free log subscription operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_EntitlementChecker *EntitlementCheckerFilterer) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *EntitlementCheckerEntitlementCheckRequested) (event.Subscription, error) {

	logs, sub, err := _EntitlementChecker.contract.WatchLogs(opts, "EntitlementCheckRequested")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementCheckerEntitlementCheckRequested)
				if err := _EntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
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

// ParseEntitlementCheckRequested is a log parse operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_EntitlementChecker *EntitlementCheckerFilterer) ParseEntitlementCheckRequested(log types.Log) (*EntitlementCheckerEntitlementCheckRequested, error) {
	event := new(EntitlementCheckerEntitlementCheckRequested)
	if err := _EntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementCheckerInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the EntitlementChecker contract.
type EntitlementCheckerInitializedIterator struct {
	Event *EntitlementCheckerInitialized // Event containing the contract specifics and raw log

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
func (it *EntitlementCheckerInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementCheckerInitialized)
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
		it.Event = new(EntitlementCheckerInitialized)
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
func (it *EntitlementCheckerInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementCheckerInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementCheckerInitialized represents a Initialized event raised by the EntitlementChecker contract.
type EntitlementCheckerInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_EntitlementChecker *EntitlementCheckerFilterer) FilterInitialized(opts *bind.FilterOpts) (*EntitlementCheckerInitializedIterator, error) {

	logs, sub, err := _EntitlementChecker.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerInitializedIterator{contract: _EntitlementChecker.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_EntitlementChecker *EntitlementCheckerFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *EntitlementCheckerInitialized) (event.Subscription, error) {

	logs, sub, err := _EntitlementChecker.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementCheckerInitialized)
				if err := _EntitlementChecker.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_EntitlementChecker *EntitlementCheckerFilterer) ParseInitialized(log types.Log) (*EntitlementCheckerInitialized, error) {
	event := new(EntitlementCheckerInitialized)
	if err := _EntitlementChecker.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementCheckerInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the EntitlementChecker contract.
type EntitlementCheckerInterfaceAddedIterator struct {
	Event *EntitlementCheckerInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *EntitlementCheckerInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementCheckerInterfaceAdded)
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
		it.Event = new(EntitlementCheckerInterfaceAdded)
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
func (it *EntitlementCheckerInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementCheckerInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementCheckerInterfaceAdded represents a InterfaceAdded event raised by the EntitlementChecker contract.
type EntitlementCheckerInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_EntitlementChecker *EntitlementCheckerFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*EntitlementCheckerInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _EntitlementChecker.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerInterfaceAddedIterator{contract: _EntitlementChecker.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_EntitlementChecker *EntitlementCheckerFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *EntitlementCheckerInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _EntitlementChecker.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementCheckerInterfaceAdded)
				if err := _EntitlementChecker.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_EntitlementChecker *EntitlementCheckerFilterer) ParseInterfaceAdded(log types.Log) (*EntitlementCheckerInterfaceAdded, error) {
	event := new(EntitlementCheckerInterfaceAdded)
	if err := _EntitlementChecker.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementCheckerInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the EntitlementChecker contract.
type EntitlementCheckerInterfaceRemovedIterator struct {
	Event *EntitlementCheckerInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *EntitlementCheckerInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementCheckerInterfaceRemoved)
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
		it.Event = new(EntitlementCheckerInterfaceRemoved)
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
func (it *EntitlementCheckerInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementCheckerInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementCheckerInterfaceRemoved represents a InterfaceRemoved event raised by the EntitlementChecker contract.
type EntitlementCheckerInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_EntitlementChecker *EntitlementCheckerFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*EntitlementCheckerInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _EntitlementChecker.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerInterfaceRemovedIterator{contract: _EntitlementChecker.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_EntitlementChecker *EntitlementCheckerFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *EntitlementCheckerInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _EntitlementChecker.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementCheckerInterfaceRemoved)
				if err := _EntitlementChecker.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_EntitlementChecker *EntitlementCheckerFilterer) ParseInterfaceRemoved(log types.Log) (*EntitlementCheckerInterfaceRemoved, error) {
	event := new(EntitlementCheckerInterfaceRemoved)
	if err := _EntitlementChecker.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementCheckerNodeRegisteredIterator is returned from FilterNodeRegistered and is used to iterate over the raw logs and unpacked data for NodeRegistered events raised by the EntitlementChecker contract.
type EntitlementCheckerNodeRegisteredIterator struct {
	Event *EntitlementCheckerNodeRegistered // Event containing the contract specifics and raw log

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
func (it *EntitlementCheckerNodeRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementCheckerNodeRegistered)
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
		it.Event = new(EntitlementCheckerNodeRegistered)
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
func (it *EntitlementCheckerNodeRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementCheckerNodeRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementCheckerNodeRegistered represents a NodeRegistered event raised by the EntitlementChecker contract.
type EntitlementCheckerNodeRegistered struct {
	NodeAddress common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeRegistered is a free log retrieval operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_EntitlementChecker *EntitlementCheckerFilterer) FilterNodeRegistered(opts *bind.FilterOpts, nodeAddress []common.Address) (*EntitlementCheckerNodeRegisteredIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _EntitlementChecker.contract.FilterLogs(opts, "NodeRegistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerNodeRegisteredIterator{contract: _EntitlementChecker.contract, event: "NodeRegistered", logs: logs, sub: sub}, nil
}

// WatchNodeRegistered is a free log subscription operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_EntitlementChecker *EntitlementCheckerFilterer) WatchNodeRegistered(opts *bind.WatchOpts, sink chan<- *EntitlementCheckerNodeRegistered, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _EntitlementChecker.contract.WatchLogs(opts, "NodeRegistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementCheckerNodeRegistered)
				if err := _EntitlementChecker.contract.UnpackLog(event, "NodeRegistered", log); err != nil {
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

// ParseNodeRegistered is a log parse operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_EntitlementChecker *EntitlementCheckerFilterer) ParseNodeRegistered(log types.Log) (*EntitlementCheckerNodeRegistered, error) {
	event := new(EntitlementCheckerNodeRegistered)
	if err := _EntitlementChecker.contract.UnpackLog(event, "NodeRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// EntitlementCheckerNodeUnregisteredIterator is returned from FilterNodeUnregistered and is used to iterate over the raw logs and unpacked data for NodeUnregistered events raised by the EntitlementChecker contract.
type EntitlementCheckerNodeUnregisteredIterator struct {
	Event *EntitlementCheckerNodeUnregistered // Event containing the contract specifics and raw log

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
func (it *EntitlementCheckerNodeUnregisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementCheckerNodeUnregistered)
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
		it.Event = new(EntitlementCheckerNodeUnregistered)
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
func (it *EntitlementCheckerNodeUnregisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementCheckerNodeUnregisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementCheckerNodeUnregistered represents a NodeUnregistered event raised by the EntitlementChecker contract.
type EntitlementCheckerNodeUnregistered struct {
	NodeAddress common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeUnregistered is a free log retrieval operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_EntitlementChecker *EntitlementCheckerFilterer) FilterNodeUnregistered(opts *bind.FilterOpts, nodeAddress []common.Address) (*EntitlementCheckerNodeUnregisteredIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _EntitlementChecker.contract.FilterLogs(opts, "NodeUnregistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerNodeUnregisteredIterator{contract: _EntitlementChecker.contract, event: "NodeUnregistered", logs: logs, sub: sub}, nil
}

// WatchNodeUnregistered is a free log subscription operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_EntitlementChecker *EntitlementCheckerFilterer) WatchNodeUnregistered(opts *bind.WatchOpts, sink chan<- *EntitlementCheckerNodeUnregistered, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _EntitlementChecker.contract.WatchLogs(opts, "NodeUnregistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementCheckerNodeUnregistered)
				if err := _EntitlementChecker.contract.UnpackLog(event, "NodeUnregistered", log); err != nil {
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

// ParseNodeUnregistered is a log parse operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_EntitlementChecker *EntitlementCheckerFilterer) ParseNodeUnregistered(log types.Log) (*EntitlementCheckerNodeUnregistered, error) {
	event := new(EntitlementCheckerNodeUnregistered)
	if err := _EntitlementChecker.contract.UnpackLog(event, "NodeUnregistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
