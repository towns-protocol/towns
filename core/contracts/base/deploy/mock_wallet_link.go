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

// IWalletLinkBaseLinkRequest is an auto generated low-level Go binding around an user-defined struct.
type IWalletLinkBaseLinkRequest struct {
	Addr		common.Address
	Signature	[]byte
	Message		string
}

// MockWalletLinkMetaData contains all meta data concerning the MockWalletLink contract.
var MockWalletLinkMetaData = &bind.MetaData{
	ABI:	"[{\"type\":\"function\",\"name\":\"checkIfLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestNonceForRootKey\",\"inputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"pure\"},{\"type\":\"function\",\"name\":\"getRootKeyForWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKeyWithDelegations\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"linkCallerToRootKey\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkRequest\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkRequest\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkRequest\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"LinkNonEVMWalletToRootWallet\",\"inputs\":[{\"name\":\"walletHash\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"LinkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"secondWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveNonEVMWalletLink\",\"inputs\":[{\"name\":\"walletHash\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SetDefaultWallet\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"defaultWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"WalletLink__AddressMismatch\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToRootWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveDefaultWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveRootWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__DefaultWalletAlreadySet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidMessage\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidNonEVMAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidVMSpecificData\",\"inputs\":[{\"name\":\"key\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkAlreadyExists\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkedToAnotherRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__MaxLinkedWalletsReached\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__NonEVMWalletAlreadyLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NonEVMWalletNotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__RootKeyMismatch\",\"inputs\":[{\"name\":\"callerRootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__UnsupportedVMType\",\"inputs\":[]}]",
	Bin:	"0x608060405234801561001057600080fd5b50610589806100206000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c80632f4614531161005b5780632f461453146100e25780633d005eab14610082578063912b9758146100f5578063f82103981461015457600080fd5b806302345b981461008257806320a00ac8146100ab578063243a7134146100cd575b600080fd5b610095610090366004610424565b6101b7565b6040516100a2919061043f565b60405180910390f35b6100bf6100b9366004610424565b50600090565b6040519081526020016100a2565b6100e06100db3660046104a4565b610200565b005b6100e06100f0366004610511565b6102b8565b610144610103366004610556565b6001600160a01b0390811660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb016020526040902054811691161490565b60405190151581526020016100a2565b61019f610162366004610424565b6001600160a01b0390811660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0160205260409020541690565b6040516001600160a01b0390911681526020016100a2565b6001600160a01b03811660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb00602052604090206060906101fa90610334565b92915050565b7f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb006102606102316020860186610424565b8260006102416020880188610424565b6001600160a01b03168152602081019190915260400160002090610348565b5061026e6020840184610424565b6001820160006102816020880188610424565b6001600160a01b039081168252602082019290925260400160002080546001600160a01b0319169290911691909117905550505050565b7f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb00336102ee818360006102416020890189610424565b506102fc6020850185610424565b6001600160a01b039182166000908152600193909301602052604090922080546001600160a01b031916929091169190911790555050565b606060006103418361035d565b9392505050565b6000610341836001600160a01b0384166103b9565b6060816000018054806020026020016040519081016040528092919081815260200182805480156103ad57602002820191906000526020600020905b815481526020019060010190808311610399575b50505050509050919050565b6000818152600183016020526040812054610400575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556101fa565b5060006101fa565b80356001600160a01b038116811461041f57600080fd5b919050565b60006020828403121561043657600080fd5b61034182610408565b6020808252825182820181905260009190848201906040850190845b818110156104805783516001600160a01b03168352928401929184019160010161045b565b50909695505050505050565b60006060828403121561049e57600080fd5b50919050565b6000806000606084860312156104b957600080fd5b833567ffffffffffffffff808211156104d157600080fd5b6104dd8783880161048c565b945060208601359150808211156104f357600080fd5b506105008682870161048c565b925050604084013590509250925092565b6000806040838503121561052457600080fd5b823567ffffffffffffffff81111561053b57600080fd5b6105478582860161048c565b95602094909401359450505050565b6000806040838503121561056957600080fd5b61057283610408565b915061058060208401610408565b9050925092905056",
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

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCaller) GetWalletsByRootKeyWithDelegations(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getWalletsByRootKeyWithDelegations", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_MockWalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCallerSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_MockWalletLink.CallOpts, rootKey)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) LinkCallerToRootKey(opts *bind.TransactOpts, rootWallet IWalletLinkBaseLinkRequest, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "linkCallerToRootKey", rootWallet, arg1)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkRequest, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkCallerToRootKey(&_MockWalletLink.TransactOpts, rootWallet, arg1)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkRequest, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkCallerToRootKey(&_MockWalletLink.TransactOpts, rootWallet, arg1)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) LinkWalletToRootKey(opts *bind.TransactOpts, wallet IWalletLinkBaseLinkRequest, rootWallet IWalletLinkBaseLinkRequest, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "linkWalletToRootKey", wallet, rootWallet, arg2)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkRequest, rootWallet IWalletLinkBaseLinkRequest, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, rootWallet, arg2)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkRequest, rootWallet IWalletLinkBaseLinkRequest, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, rootWallet, arg2)
}

// MockWalletLinkLinkNonEVMWalletToRootWalletIterator is returned from FilterLinkNonEVMWalletToRootWallet and is used to iterate over the raw logs and unpacked data for LinkNonEVMWalletToRootWallet events raised by the MockWalletLink contract.
type MockWalletLinkLinkNonEVMWalletToRootWalletIterator struct {
	Event	*MockWalletLinkLinkNonEVMWalletToRootWallet	// Event containing the contract specifics and raw log

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
func (it *MockWalletLinkLinkNonEVMWalletToRootWalletIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkLinkNonEVMWalletToRootWallet)
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
		it.Event = new(MockWalletLinkLinkNonEVMWalletToRootWallet)
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
func (it *MockWalletLinkLinkNonEVMWalletToRootWalletIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkLinkNonEVMWalletToRootWalletIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkLinkNonEVMWalletToRootWallet represents a LinkNonEVMWalletToRootWallet event raised by the MockWalletLink contract.
type MockWalletLinkLinkNonEVMWalletToRootWallet struct {
	WalletHash	[32]byte
	RootKey		common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterLinkNonEVMWalletToRootWallet is a free log retrieval operation binding the contract event 0xeb317a93636ebc39c613bf403c3fb4147a957dbf439fb47b4c9cc5c2b372f6bc.
//
// Solidity: event LinkNonEVMWalletToRootWallet(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) FilterLinkNonEVMWalletToRootWallet(opts *bind.FilterOpts, walletHash [][32]byte, rootKey []common.Address) (*MockWalletLinkLinkNonEVMWalletToRootWalletIterator, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "LinkNonEVMWalletToRootWallet", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkLinkNonEVMWalletToRootWalletIterator{contract: _MockWalletLink.contract, event: "LinkNonEVMWalletToRootWallet", logs: logs, sub: sub}, nil
}

// WatchLinkNonEVMWalletToRootWallet is a free log subscription operation binding the contract event 0xeb317a93636ebc39c613bf403c3fb4147a957dbf439fb47b4c9cc5c2b372f6bc.
//
// Solidity: event LinkNonEVMWalletToRootWallet(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) WatchLinkNonEVMWalletToRootWallet(opts *bind.WatchOpts, sink chan<- *MockWalletLinkLinkNonEVMWalletToRootWallet, walletHash [][32]byte, rootKey []common.Address) (event.Subscription, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "LinkNonEVMWalletToRootWallet", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkLinkNonEVMWalletToRootWallet)
				if err := _MockWalletLink.contract.UnpackLog(event, "LinkNonEVMWalletToRootWallet", log); err != nil {
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

// ParseLinkNonEVMWalletToRootWallet is a log parse operation binding the contract event 0xeb317a93636ebc39c613bf403c3fb4147a957dbf439fb47b4c9cc5c2b372f6bc.
//
// Solidity: event LinkNonEVMWalletToRootWallet(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) ParseLinkNonEVMWalletToRootWallet(log types.Log) (*MockWalletLinkLinkNonEVMWalletToRootWallet, error) {
	event := new(MockWalletLinkLinkNonEVMWalletToRootWallet)
	if err := _MockWalletLink.contract.UnpackLog(event, "LinkNonEVMWalletToRootWallet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
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

// MockWalletLinkRemoveNonEVMWalletLinkIterator is returned from FilterRemoveNonEVMWalletLink and is used to iterate over the raw logs and unpacked data for RemoveNonEVMWalletLink events raised by the MockWalletLink contract.
type MockWalletLinkRemoveNonEVMWalletLinkIterator struct {
	Event	*MockWalletLinkRemoveNonEVMWalletLink	// Event containing the contract specifics and raw log

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
func (it *MockWalletLinkRemoveNonEVMWalletLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkRemoveNonEVMWalletLink)
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
		it.Event = new(MockWalletLinkRemoveNonEVMWalletLink)
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
func (it *MockWalletLinkRemoveNonEVMWalletLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkRemoveNonEVMWalletLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkRemoveNonEVMWalletLink represents a RemoveNonEVMWalletLink event raised by the MockWalletLink contract.
type MockWalletLinkRemoveNonEVMWalletLink struct {
	WalletHash	[32]byte
	RootKey		common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterRemoveNonEVMWalletLink is a free log retrieval operation binding the contract event 0xbd9633f1d49d3b0a615e7eba9e46218c1bfc459278b5764c2aeee591b1b1230a.
//
// Solidity: event RemoveNonEVMWalletLink(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) FilterRemoveNonEVMWalletLink(opts *bind.FilterOpts, walletHash [][32]byte, rootKey []common.Address) (*MockWalletLinkRemoveNonEVMWalletLinkIterator, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "RemoveNonEVMWalletLink", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkRemoveNonEVMWalletLinkIterator{contract: _MockWalletLink.contract, event: "RemoveNonEVMWalletLink", logs: logs, sub: sub}, nil
}

// WatchRemoveNonEVMWalletLink is a free log subscription operation binding the contract event 0xbd9633f1d49d3b0a615e7eba9e46218c1bfc459278b5764c2aeee591b1b1230a.
//
// Solidity: event RemoveNonEVMWalletLink(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) WatchRemoveNonEVMWalletLink(opts *bind.WatchOpts, sink chan<- *MockWalletLinkRemoveNonEVMWalletLink, walletHash [][32]byte, rootKey []common.Address) (event.Subscription, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "RemoveNonEVMWalletLink", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkRemoveNonEVMWalletLink)
				if err := _MockWalletLink.contract.UnpackLog(event, "RemoveNonEVMWalletLink", log); err != nil {
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

// ParseRemoveNonEVMWalletLink is a log parse operation binding the contract event 0xbd9633f1d49d3b0a615e7eba9e46218c1bfc459278b5764c2aeee591b1b1230a.
//
// Solidity: event RemoveNonEVMWalletLink(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) ParseRemoveNonEVMWalletLink(log types.Log) (*MockWalletLinkRemoveNonEVMWalletLink, error) {
	event := new(MockWalletLinkRemoveNonEVMWalletLink)
	if err := _MockWalletLink.contract.UnpackLog(event, "RemoveNonEVMWalletLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockWalletLinkSetDefaultWalletIterator is returned from FilterSetDefaultWallet and is used to iterate over the raw logs and unpacked data for SetDefaultWallet events raised by the MockWalletLink contract.
type MockWalletLinkSetDefaultWalletIterator struct {
	Event	*MockWalletLinkSetDefaultWallet	// Event containing the contract specifics and raw log

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
func (it *MockWalletLinkSetDefaultWalletIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkSetDefaultWallet)
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
		it.Event = new(MockWalletLinkSetDefaultWallet)
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
func (it *MockWalletLinkSetDefaultWalletIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkSetDefaultWalletIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkSetDefaultWallet represents a SetDefaultWallet event raised by the MockWalletLink contract.
type MockWalletLinkSetDefaultWallet struct {
	RootKey		common.Address
	DefaultWallet	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterSetDefaultWallet is a free log retrieval operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_MockWalletLink *MockWalletLinkFilterer) FilterSetDefaultWallet(opts *bind.FilterOpts, rootKey []common.Address, defaultWallet []common.Address) (*MockWalletLinkSetDefaultWalletIterator, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkSetDefaultWalletIterator{contract: _MockWalletLink.contract, event: "SetDefaultWallet", logs: logs, sub: sub}, nil
}

// WatchSetDefaultWallet is a free log subscription operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_MockWalletLink *MockWalletLinkFilterer) WatchSetDefaultWallet(opts *bind.WatchOpts, sink chan<- *MockWalletLinkSetDefaultWallet, rootKey []common.Address, defaultWallet []common.Address) (event.Subscription, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkSetDefaultWallet)
				if err := _MockWalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
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

// ParseSetDefaultWallet is a log parse operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_MockWalletLink *MockWalletLinkFilterer) ParseSetDefaultWallet(log types.Log) (*MockWalletLinkSetDefaultWallet, error) {
	event := new(MockWalletLinkSetDefaultWallet)
	if err := _MockWalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
