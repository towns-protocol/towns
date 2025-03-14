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
	ABI:	"[{\"type\":\"function\",\"name\":\"checkIfLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestNonceForRootKey\",\"inputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"pure\"},{\"type\":\"function\",\"name\":\"getRootKeyForWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKeyWithDelegations\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"linkCallerToRootKey\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"LinkNonEVMWalletToRootWallet\",\"inputs\":[{\"name\":\"walletHash\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"LinkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"secondWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveNonEVMWalletLink\",\"inputs\":[{\"name\":\"walletHash\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SetDefaultWallet\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"defaultWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"WalletLink__AddressMismatch\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToRootWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveDefaultWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveRootWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__DefaultWalletAlreadySet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidMessage\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidNonEVMAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidVMSpecificData\",\"inputs\":[{\"name\":\"key\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkAlreadyExists\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkedToAnotherRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__MaxLinkedWalletsReached\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__NonEVMWalletAlreadyLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NonEVMWalletNotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__RootKeyMismatch\",\"inputs\":[{\"name\":\"callerRootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__UnsupportedVMType\",\"inputs\":[]}]",
	Bin:	"0x6080604052348015600e575f5ffd5b506107788061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061007a575f3560e01c80632f461453116100585780632f461453146100dd5780633d005eab1461007e578063912b9758146100f0578063f82103981461015b575f5ffd5b806302345b981461007e57806320a00ac8146100a7578063243a7134146100c8575b5f5ffd5b61009161008c366004610494565b6101d7565b60405161009e91906104ad565b60405180910390f35b6100ba6100b5366004610494565b505f90565b60405190815260200161009e565b6100db6100d6366004610697565b61022c565b005b6100db6100eb366004610705565b6102e1565b61014b6100fe366004610747565b73ffffffffffffffffffffffffffffffffffffffff9081165f9081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb016020526040902054811691161490565b604051901515815260200161009e565b6101b2610169366004610494565b73ffffffffffffffffffffffffffffffffffffffff9081165f9081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0160205260409020541690565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200161009e565b73ffffffffffffffffffffffffffffffffffffffff81165f9081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb006020526040902060609061022690610393565b92915050565b8251825173ffffffffffffffffffffffffffffffffffffffff165f9081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0060208190526040909120909161028191906103a6565b509151925173ffffffffffffffffffffffffffffffffffffffff9081165f9081526001909301602052604090922080547fffffffffffffffffffffffff000000000000000000000000000000000000000016929093169190911790915550565b815173ffffffffffffffffffffffffffffffffffffffff165f9081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0060208190526040909120339061033490826103a6565b50925173ffffffffffffffffffffffffffffffffffffffff9384165f908152600192909201602052604090912080547fffffffffffffffffffffffff000000000000000000000000000000000000000016939091169290921790915550565b60605f61039f836103c7565b9392505050565b5f61039f8373ffffffffffffffffffffffffffffffffffffffff8416610420565b6060815f0180548060200260200160405190810160405280929190818152602001828054801561041457602002820191905f5260205f20905b815481526020019060010190808311610400575b50505050509050919050565b5f81815260018301602052604081205461046557508154600181810184555f848152602080822090930184905584548482528286019093526040902091909155610226565b505f610226565b803573ffffffffffffffffffffffffffffffffffffffff8116811461048f575f5ffd5b919050565b5f602082840312156104a4575f5ffd5b61039f8261046c565b602080825282518282018190525f918401906040840190835b818110156104fa57835173ffffffffffffffffffffffffffffffffffffffff168352602093840193909201916001016104c6565b509095945050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6040516060810167ffffffffffffffff8111828210171561055557610555610505565b60405290565b5f5f67ffffffffffffffff84111561057557610575610505565b506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f85018116603f0116810181811067ffffffffffffffff821117156105c2576105c2610505565b6040528381529050808284018510156105d9575f5ffd5b838360208301375f60208583010152509392505050565b5f60608284031215610600575f5ffd5b610608610532565b90506106138261046c565b8152602082013567ffffffffffffffff81111561062e575f5ffd5b8201601f8101841361063e575f5ffd5b61064d8482356020840161055b565b602083015250604082013567ffffffffffffffff81111561066c575f5ffd5b8201601f8101841361067c575f5ffd5b61068b8482356020840161055b565b60408301525092915050565b5f5f5f606084860312156106a9575f5ffd5b833567ffffffffffffffff8111156106bf575f5ffd5b6106cb868287016105f0565b935050602084013567ffffffffffffffff8111156106e7575f5ffd5b6106f3868287016105f0565b93969395505050506040919091013590565b5f5f60408385031215610716575f5ffd5b823567ffffffffffffffff81111561072c575f5ffd5b610738858286016105f0565b95602094909401359450505050565b5f5f60408385031215610758575f5ffd5b6107618361046c565b915061076f6020840161046c565b9050925092905056",
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
