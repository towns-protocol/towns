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
	_	= errors.New
	_	= big.NewInt
	_	= strings.NewReader
	_	= ethereum.NotFound
	_	= bind.Bind
	_	= common.Big1
	_	= types.BloomLookup
	_	= event.NewSubscription
	_	= abi.ConvertType
)

// MockWalletLinkMetaData contains all meta data concerning the MockWalletLink contract.
var MockWalletLinkMetaData = &bind.MetaData{
	ABI:	"[{\"type\":\"function\",\"name\":\"checkIfLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestNonceForRootKey\",\"inputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"pure\"},{\"type\":\"function\",\"name\":\"getRootKeyForWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"linkCallerToRootKey\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"LinkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"secondWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToRootWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveRootWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__LinkAlreadyExists\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkedToAnotherRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]}]",
	Bin:	"0x608060405234801561001057600080fd5b50610689806100206000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806302345b981461006757806320a00ac814610090578063243a7134146100b25780632f461453146100c7578063912b9758146100da578063f821039814610139575b600080fd5b61007a6100753660046103dc565b61019c565b60405161008791906103f7565b60405180910390f35b6100a461009e3660046103dc565b50600090565b604051908152602001610087565b6100c56100c03660046105a4565b6101e5565b005b6100c56100d5366004610611565b61026a565b6101296100e8366004610656565b6001600160a01b0390811660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb016020526040902054811691161490565b6040519015158152602001610087565b6101846101473660046103dc565b6001600160a01b0390811660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0160205260409020541690565b6040516001600160a01b039091168152602001610087565b6001600160a01b03811660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb00602052604090206060906101df906102ec565b92915050565b825182516001600160a01b031660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0060208190526040909120909161022e9190610300565b50915192516001600160a01b0390811660009081526001909301602052604090922080546001600160a01b031916929093169190911790915550565b81516001600160a01b031660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb006020819052604090912033906102b19082610300565b5092516001600160a01b039384166000908152600192909201602052604090912080546001600160a01b031916939091169290921790915550565b606060006102f983610315565b9392505050565b60006102f9836001600160a01b038416610371565b60608160000180548060200260200160405190810160405280929190818152602001828054801561036557602002820191906000526020600020905b815481526020019060010190808311610351575b50505050509050919050565b60008181526001830160205260408120546103b8575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556101df565b5060006101df565b80356001600160a01b03811681146103d757600080fd5b919050565b6000602082840312156103ee57600080fd5b6102f9826103c0565b6020808252825182820181905260009190848201906040850190845b818110156104385783516001600160a01b031683529284019291840191600101610413565b50909695505050505050565b634e487b7160e01b600052604160045260246000fd5b6040516060810167ffffffffffffffff8111828210171561047d5761047d610444565b60405290565b600067ffffffffffffffff8084111561049e5761049e610444565b604051601f8501601f19908116603f011681019082821181831017156104c6576104c6610444565b816040528093508581528686860111156104df57600080fd5b858560208301376000602087830101525050509392505050565b60006060828403121561050b57600080fd5b61051361045a565b905061051e826103c0565b8152602082013567ffffffffffffffff8082111561053b57600080fd5b818401915084601f83011261054f57600080fd5b61055e85833560208501610483565b6020840152604084013591508082111561057757600080fd5b508201601f8101841361058957600080fd5b61059884823560208401610483565b60408301525092915050565b6000806000606084860312156105b957600080fd5b833567ffffffffffffffff808211156105d157600080fd5b6105dd878388016104f9565b945060208601359150808211156105f357600080fd5b50610600868287016104f9565b925050604084013590509250925092565b6000806040838503121561062457600080fd5b823567ffffffffffffffff81111561063b57600080fd5b610647858286016104f9565b95602094909401359450505050565b6000806040838503121561066957600080fd5b610672836103c0565b9150610680602084016103c0565b9050925092905056",
}

// MockWalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use MockWalletLinkMetaData.ABI instead.
var MockWalletLinkABI = MockWalletLinkMetaData.ABI

// MockWalletLinkBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockWalletLinkMetaData.Bin instead.
var MockWalletLinkBin = MockWalletLinkMetaData.Bin

// DeployMockWalletLink deploys a new Ethereum contract, binding an instance of MockWalletLink to it.
func DeployMockWalletLink(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *MockWalletLink, error) {
	parsed, err := MockWalletLinkMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockWalletLinkBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockWalletLink{MockWalletLinkCaller: MockWalletLinkCaller{contract: contract}, MockWalletLinkTransactor: MockWalletLinkTransactor{contract: contract}, MockWalletLinkFilterer: MockWalletLinkFilterer{contract: contract}}, nil
}

// MockWalletLink is an auto generated Go binding around an Ethereum contract.
type MockWalletLink struct {
	MockWalletLinkCaller		// Read-only binding to the contract
	MockWalletLinkTransactor	// Write-only binding to the contract
	MockWalletLinkFilterer		// Log filterer for contract events
}

// MockWalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockWalletLinkCaller struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockWalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockWalletLinkTransactor struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockWalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockWalletLinkFilterer struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockWalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockWalletLinkSession struct {
	Contract	*MockWalletLink		// Generic contract binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// MockWalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockWalletLinkCallerSession struct {
	Contract	*MockWalletLinkCaller	// Generic contract caller binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
}

// MockWalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockWalletLinkTransactorSession struct {
	Contract	*MockWalletLinkTransactor	// Generic contract transactor binding to set the session for
	TransactOpts	bind.TransactOpts		// Transaction auth options to use throughout this session
}

// MockWalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockWalletLinkRaw struct {
	Contract *MockWalletLink	// Generic contract binding to access the raw methods on
}

// MockWalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockWalletLinkCallerRaw struct {
	Contract *MockWalletLinkCaller	// Generic read-only contract binding to access the raw methods on
}

// MockWalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockWalletLinkTransactorRaw struct {
	Contract *MockWalletLinkTransactor	// Generic write-only contract binding to access the raw methods on
}

// NewMockWalletLink creates a new instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLink(address common.Address, backend bind.ContractBackend) (*MockWalletLink, error) {
	contract, err := bindMockWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockWalletLink{MockWalletLinkCaller: MockWalletLinkCaller{contract: contract}, MockWalletLinkTransactor: MockWalletLinkTransactor{contract: contract}, MockWalletLinkFilterer: MockWalletLinkFilterer{contract: contract}}, nil
}

// NewMockWalletLinkCaller creates a new read-only instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*MockWalletLinkCaller, error) {
	contract, err := bindMockWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkCaller{contract: contract}, nil
}

// NewMockWalletLinkTransactor creates a new write-only instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*MockWalletLinkTransactor, error) {
	contract, err := bindMockWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkTransactor{contract: contract}, nil
}

// NewMockWalletLinkFilterer creates a new log filterer instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*MockWalletLinkFilterer, error) {
	contract, err := bindMockWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkFilterer{contract: contract}, nil
}

// bindMockWalletLink binds a generic wrapper to an already deployed contract.
func bindMockWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockWalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockWalletLink *MockWalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockWalletLink.Contract.MockWalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockWalletLink *MockWalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockWalletLink.Contract.MockWalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockWalletLink *MockWalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockWalletLink.Contract.MockWalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockWalletLink *MockWalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockWalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockWalletLink *MockWalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockWalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockWalletLink *MockWalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockWalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_MockWalletLink *MockWalletLinkCaller) CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "checkIfLinked", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_MockWalletLink *MockWalletLinkSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _MockWalletLink.Contract.CheckIfLinked(&_MockWalletLink.CallOpts, rootKey, wallet)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_MockWalletLink *MockWalletLinkCallerSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _MockWalletLink.Contract.CheckIfLinked(&_MockWalletLink.CallOpts, rootKey, wallet)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address ) pure returns(uint256)
func (_MockWalletLink *MockWalletLinkCaller) GetLatestNonceForRootKey(opts *bind.CallOpts, arg0 common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getLatestNonceForRootKey", arg0)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address ) pure returns(uint256)
func (_MockWalletLink *MockWalletLinkSession) GetLatestNonceForRootKey(arg0 common.Address) (*big.Int, error) {
	return _MockWalletLink.Contract.GetLatestNonceForRootKey(&_MockWalletLink.CallOpts, arg0)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address ) pure returns(uint256)
func (_MockWalletLink *MockWalletLinkCallerSession) GetLatestNonceForRootKey(arg0 common.Address) (*big.Int, error) {
	return _MockWalletLink.Contract.GetLatestNonceForRootKey(&_MockWalletLink.CallOpts, arg0)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_MockWalletLink *MockWalletLinkCaller) GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getRootKeyForWallet", wallet)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_MockWalletLink *MockWalletLinkSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _MockWalletLink.Contract.GetRootKeyForWallet(&_MockWalletLink.CallOpts, wallet)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_MockWalletLink *MockWalletLinkCallerSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _MockWalletLink.Contract.GetRootKeyForWallet(&_MockWalletLink.CallOpts, wallet)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCaller) GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getWalletsByRootKey", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKey(&_MockWalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCallerSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKey(&_MockWalletLink.CallOpts, rootKey)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) LinkCallerToRootKey(opts *bind.TransactOpts, rootWallet IWalletLinkBaseLinkedWallet, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "linkCallerToRootKey", rootWallet, arg1)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWallet, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkCallerToRootKey(&_MockWalletLink.TransactOpts, rootWallet, arg1)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWallet, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkCallerToRootKey(&_MockWalletLink.TransactOpts, rootWallet, arg1)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) LinkWalletToRootKey(opts *bind.TransactOpts, wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "linkWalletToRootKey", wallet, rootWallet, arg2)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, rootWallet, arg2)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, rootWallet, arg2)
}

// MockWalletLinkLinkWalletToRootKeyIterator is returned from FilterLinkWalletToRootKey and is used to iterate over the raw logs and unpacked data for LinkWalletToRootKey events raised by the MockWalletLink contract.
type MockWalletLinkLinkWalletToRootKeyIterator struct {
	Event	*MockWalletLinkLinkWalletToRootKey	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockWalletLinkLinkWalletToRootKeyIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkLinkWalletToRootKey)
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
		it.Event = new(MockWalletLinkLinkWalletToRootKey)
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
func (it *MockWalletLinkLinkWalletToRootKeyIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkLinkWalletToRootKeyIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkLinkWalletToRootKey represents a LinkWalletToRootKey event raised by the MockWalletLink contract.
type MockWalletLinkLinkWalletToRootKey struct {
	Wallet	common.Address
	RootKey	common.Address
	Raw	types.Log	// Blockchain specific contextual infos
}

// FilterLinkWalletToRootKey is a free log retrieval operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) FilterLinkWalletToRootKey(opts *bind.FilterOpts, wallet []common.Address, rootKey []common.Address) (*MockWalletLinkLinkWalletToRootKeyIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkLinkWalletToRootKeyIterator{contract: _MockWalletLink.contract, event: "LinkWalletToRootKey", logs: logs, sub: sub}, nil
}

// WatchLinkWalletToRootKey is a free log subscription operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) WatchLinkWalletToRootKey(opts *bind.WatchOpts, sink chan<- *MockWalletLinkLinkWalletToRootKey, wallet []common.Address, rootKey []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkLinkWalletToRootKey)
				if err := _MockWalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
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

// ParseLinkWalletToRootKey is a log parse operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) ParseLinkWalletToRootKey(log types.Log) (*MockWalletLinkLinkWalletToRootKey, error) {
	event := new(MockWalletLinkLinkWalletToRootKey)
	if err := _MockWalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockWalletLinkRemoveLinkIterator is returned from FilterRemoveLink and is used to iterate over the raw logs and unpacked data for RemoveLink events raised by the MockWalletLink contract.
type MockWalletLinkRemoveLinkIterator struct {
	Event	*MockWalletLinkRemoveLink	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockWalletLinkRemoveLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkRemoveLink)
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
		it.Event = new(MockWalletLinkRemoveLink)
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
func (it *MockWalletLinkRemoveLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkRemoveLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkRemoveLink represents a RemoveLink event raised by the MockWalletLink contract.
type MockWalletLinkRemoveLink struct {
	Wallet		common.Address
	SecondWallet	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterRemoveLink is a free log retrieval operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_MockWalletLink *MockWalletLinkFilterer) FilterRemoveLink(opts *bind.FilterOpts, wallet []common.Address, secondWallet []common.Address) (*MockWalletLinkRemoveLinkIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkRemoveLinkIterator{contract: _MockWalletLink.contract, event: "RemoveLink", logs: logs, sub: sub}, nil
}

// WatchRemoveLink is a free log subscription operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_MockWalletLink *MockWalletLinkFilterer) WatchRemoveLink(opts *bind.WatchOpts, sink chan<- *MockWalletLinkRemoveLink, wallet []common.Address, secondWallet []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkRemoveLink)
				if err := _MockWalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
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

// ParseRemoveLink is a log parse operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_MockWalletLink *MockWalletLinkFilterer) ParseRemoveLink(log types.Log) (*MockWalletLinkRemoveLink, error) {
	event := new(MockWalletLinkRemoveLink)
	if err := _MockWalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
