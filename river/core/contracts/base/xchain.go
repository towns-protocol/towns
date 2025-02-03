// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base

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

// XchainMetaData contains all meta data concerning the Xchain contract.
var XchainMetaData = &bind.MetaData{
	ABI:	"[{\"type\":\"function\",\"name\":\"__XChain_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isCheckCompleted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"requestId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"requestId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestRefund\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckRequested\",\"inputs\":[{\"name\":\"callerAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementCheckRequestedV2\",\"inputs\":[{\"name\":\"walletAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"spaceAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"resolverAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRegistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUnregistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientFunds\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientNumberOfNodes\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidNodeOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NoPendingRequests\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NoRefundsAvailable\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_OperatorNotActive\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidEntitlement\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_OnlyEntitlementChecker\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_RequestIdNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Reentrancy\",\"inputs\":[]}]",
	Bin:	"0x608060405234801561001057600080fd5b5061001961001e565b6100c4565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff161561006a576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156100c157805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b610ca3806100d36000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80634739e80514610051578063ac7474f014610066578063bbbcb94b1461008d578063d5cef13314610095575b600080fd5b61006461005f366004610b85565b61009d565b005b610079610074366004610bc2565b610491565b604051901515815260200160405180910390f35b6100646104d7565b610064610533565b3068929eee149b4bd2126854036100bc5763ab143c066000526004601cfd5b3068929eee149b4bd212685560008381527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc02602052604090206002810154600160a01b900460ff161561012257604051637912b73960e01b815260040160405180910390fd5b60008481527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc036020526040902061015981856106b9565b61016d5761016d630829702360e41b6106d4565b6000848152600282016020526040902061018790336106de565b61019b5761019b638223a7e960e01b6106d4565b600084815260048201602052604090205460ff16156101c4576101c4637912b73960e01b6106d4565b600084815260028201602052604081208190819081906101e390610700565b905060005b81811015610301576000898152600387016020526040812080548390811061021257610212610be4565b60009182526020909120018054909150336001600160a01b039091160361029e5760008154600160a01b900460ff16600281111561025257610252610bfa565b14610270576040516347592a4d60e01b815260040160405180910390fd5b80548990829060ff60a01b1916600160a01b83600281111561029457610294610bfa565b0217905550600195505b60018154600160a01b900460ff1660028111156102bd576102bd610bfa565b036102cd578460010194506102f8565b60028154600160a01b900460ff1660028111156102ec576102ec610bfa565b036102f8578360010193505b506001016101e8565b508361032057604051638223a7e960e01b815260040160405180910390fd5b61032b600282610c10565b831180610341575061033e600282610c10565b82115b1561047a5760008881526004860160205260408120805460ff1916600117905582841161036f576002610372565b60015b9050600061037f8b61070a565b9050600182600281111561039557610395610bfa565b148061039e5750805b156104775760028801805460ff60a01b1916600160a01b1790556104098b6103e37ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc0090565b60028b01546001600160a01b031660009081526001919091016020526040902090610794565b50600288015488546040516372c3487960e11b81526001600160a01b039092169163e58690f29190610444908f906000908890600401610c32565b6000604051808303818588803b15801561045d57600080fd5b505af1158015610471573d6000803e3d6000fd5b50505050505b50505b5050505050503868929eee149b4bd2126855505050565b60008281527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc036020908152604080832084845260040190915290205460ff165b92915050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661052157604051630ef4733760e31b815260040160405180910390fd5b610531636afd38fd60e11b6107a0565b565b3360009081527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc01602052604081207ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc009161058c82610879565b905080516000036105b05760405163099238f360e31b815260040160405180910390fd5b6000805b82518110156106505760008382815181106105d1576105d1610be4565b602090810291909101810151600081815260028981019093526040902091820154909250600160a01b900460ff168061061257506103848160010154430311155b1561061e575050610648565b805460028201805460ff60a01b1916600160a01b17905593909301926106448683610794565b5050505b6001016105b4565b508060000361067257604051631387679f60e11b815260040160405180910390fd5b80471015610693576040516353d3638d60e01b815260040160405180910390fd5b6106b373eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee303384610886565b50505050565b600081815260018301602052604081205415155b9392505050565b8060005260046000fd5b6001600160a01b038116600090815260018301602052604081205415156106cd565b60006104d1825490565b60008181527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc03602052604081208161074182610700565b905060005b818110156107895760048301600061075e85846108cc565b815260208101919091526040016000205460ff1661078157506000949350505050565b600101610746565b506001949350505050565b60006106cd83836108d8565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16610828576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610841565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b606060006106cd836109cb565b80156106b35773eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeed196001600160a01b038516016108c0576108bb8282610a27565b6106b3565b6106b384848484610a3e565b60006106cd8383610a91565b600081815260018301602052604081205480156109c15760006108fc600183610c6c565b855490915060009061091090600190610c6c565b905080821461097557600086600001828154811061093057610930610be4565b906000526020600020015490508087600001848154811061095357610953610be4565b6000918252602080832090910192909255918252600188019052604090208390555b855486908061098657610986610c8d565b6001900381819060005260206000200160009055905585600101600086815260200190815260200160002060009055600193505050506104d1565b60009150506104d1565b606081600001805480602002602001604051908101604052809291908181526020018280548015610a1b57602002820191906000526020600020905b815481526020019060010190808311610a07575b50505050509050919050565b610a3a6001600160a01b03831682610abb565b5050565b816001600160a01b0316836001600160a01b031603156106b357306001600160a01b03841603610a7c576108bb6001600160a01b0385168383610ad7565b6106b36001600160a01b038516848484610b27565b6000826000018281548110610aa857610aa8610be4565b9060005260206000200154905092915050565b60003860003884865af1610a3a5763b12d13eb6000526004601cfd5b816014528060345263a9059cbb60601b60005260206000604460106000875af18060016000511416610b1c57803d853b151710610b1c576390b8ec186000526004601cfd5b506000603452505050565b60405181606052826040528360601b602c526323b872dd60601b600c52602060006064601c6000895af18060016000511416610b7657803d873b151710610b7657637939f4246000526004601cfd5b50600060605260405250505050565b600080600060608486031215610b9a57600080fd5b8335925060208401359150604084013560038110610bb757600080fd5b809150509250925092565b60008060408385031215610bd557600080fd5b50508035926020909101359150565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052602160045260246000fd5b600082610c2d57634e487b7160e01b600052601260045260246000fd5b500490565b838152602081018390526060810160038310610c5e57634e487b7160e01b600052602160045260246000fd5b826040830152949350505050565b818103818111156104d157634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052603160045260246000fd",
}

// XchainABI is the input ABI used to generate the binding from.
// Deprecated: Use XchainMetaData.ABI instead.
var XchainABI = XchainMetaData.ABI

// XchainBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use XchainMetaData.Bin instead.
var XchainBin = XchainMetaData.Bin

// DeployXchain deploys a new Ethereum contract, binding an instance of Xchain to it.
func DeployXchain(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *Xchain, error) {
	parsed, err := XchainMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(XchainBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &Xchain{XchainCaller: XchainCaller{contract: contract}, XchainTransactor: XchainTransactor{contract: contract}, XchainFilterer: XchainFilterer{contract: contract}}, nil
}

// Xchain is an auto generated Go binding around an Ethereum contract.
type Xchain struct {
	XchainCaller		// Read-only binding to the contract
	XchainTransactor	// Write-only binding to the contract
	XchainFilterer		// Log filterer for contract events
}

// XchainCaller is an auto generated read-only Go binding around an Ethereum contract.
type XchainCaller struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// XchainTransactor is an auto generated write-only Go binding around an Ethereum contract.
type XchainTransactor struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// XchainFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type XchainFilterer struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// XchainSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type XchainSession struct {
	Contract	*Xchain			// Generic contract binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// XchainCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type XchainCallerSession struct {
	Contract	*XchainCaller	// Generic contract caller binding to set the session for
	CallOpts	bind.CallOpts	// Call options to use throughout this session
}

// XchainTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type XchainTransactorSession struct {
	Contract	*XchainTransactor	// Generic contract transactor binding to set the session for
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// XchainRaw is an auto generated low-level Go binding around an Ethereum contract.
type XchainRaw struct {
	Contract *Xchain	// Generic contract binding to access the raw methods on
}

// XchainCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type XchainCallerRaw struct {
	Contract *XchainCaller	// Generic read-only contract binding to access the raw methods on
}

// XchainTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type XchainTransactorRaw struct {
	Contract *XchainTransactor	// Generic write-only contract binding to access the raw methods on
}

// NewXchain creates a new instance of Xchain, bound to a specific deployed contract.
func NewXchain(address common.Address, backend bind.ContractBackend) (*Xchain, error) {
	contract, err := bindXchain(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Xchain{XchainCaller: XchainCaller{contract: contract}, XchainTransactor: XchainTransactor{contract: contract}, XchainFilterer: XchainFilterer{contract: contract}}, nil
}

// NewXchainCaller creates a new read-only instance of Xchain, bound to a specific deployed contract.
func NewXchainCaller(address common.Address, caller bind.ContractCaller) (*XchainCaller, error) {
	contract, err := bindXchain(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &XchainCaller{contract: contract}, nil
}

// NewXchainTransactor creates a new write-only instance of Xchain, bound to a specific deployed contract.
func NewXchainTransactor(address common.Address, transactor bind.ContractTransactor) (*XchainTransactor, error) {
	contract, err := bindXchain(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &XchainTransactor{contract: contract}, nil
}

// NewXchainFilterer creates a new log filterer instance of Xchain, bound to a specific deployed contract.
func NewXchainFilterer(address common.Address, filterer bind.ContractFilterer) (*XchainFilterer, error) {
	contract, err := bindXchain(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &XchainFilterer{contract: contract}, nil
}

// bindXchain binds a generic wrapper to an already deployed contract.
func bindXchain(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := XchainMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Xchain *XchainRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Xchain.Contract.XchainCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Xchain *XchainRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Xchain.Contract.XchainTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Xchain *XchainRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Xchain.Contract.XchainTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Xchain *XchainCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Xchain.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Xchain *XchainTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Xchain.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Xchain *XchainTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Xchain.Contract.contract.Transact(opts, method, params...)
}

// IsCheckCompleted is a free data retrieval call binding the contract method 0xac7474f0.
//
// Solidity: function isCheckCompleted(bytes32 transactionId, uint256 requestId) view returns(bool)
func (_Xchain *XchainCaller) IsCheckCompleted(opts *bind.CallOpts, transactionId [32]byte, requestId *big.Int) (bool, error) {
	var out []interface{}
	err := _Xchain.contract.Call(opts, &out, "isCheckCompleted", transactionId, requestId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsCheckCompleted is a free data retrieval call binding the contract method 0xac7474f0.
//
// Solidity: function isCheckCompleted(bytes32 transactionId, uint256 requestId) view returns(bool)
func (_Xchain *XchainSession) IsCheckCompleted(transactionId [32]byte, requestId *big.Int) (bool, error) {
	return _Xchain.Contract.IsCheckCompleted(&_Xchain.CallOpts, transactionId, requestId)
}

// IsCheckCompleted is a free data retrieval call binding the contract method 0xac7474f0.
//
// Solidity: function isCheckCompleted(bytes32 transactionId, uint256 requestId) view returns(bool)
func (_Xchain *XchainCallerSession) IsCheckCompleted(transactionId [32]byte, requestId *big.Int) (bool, error) {
	return _Xchain.Contract.IsCheckCompleted(&_Xchain.CallOpts, transactionId, requestId)
}

// XChainInit is a paid mutator transaction binding the contract method 0xbbbcb94b.
//
// Solidity: function __XChain_init() returns()
func (_Xchain *XchainTransactor) XChainInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Xchain.contract.Transact(opts, "__XChain_init")
}

// XChainInit is a paid mutator transaction binding the contract method 0xbbbcb94b.
//
// Solidity: function __XChain_init() returns()
func (_Xchain *XchainSession) XChainInit() (*types.Transaction, error) {
	return _Xchain.Contract.XChainInit(&_Xchain.TransactOpts)
}

// XChainInit is a paid mutator transaction binding the contract method 0xbbbcb94b.
//
// Solidity: function __XChain_init() returns()
func (_Xchain *XchainTransactorSession) XChainInit() (*types.Transaction, error) {
	return _Xchain.Contract.XChainInit(&_Xchain.TransactOpts)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0x4739e805.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint256 requestId, uint8 result) returns()
func (_Xchain *XchainTransactor) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, requestId *big.Int, result uint8) (*types.Transaction, error) {
	return _Xchain.contract.Transact(opts, "postEntitlementCheckResult", transactionId, requestId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0x4739e805.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint256 requestId, uint8 result) returns()
func (_Xchain *XchainSession) PostEntitlementCheckResult(transactionId [32]byte, requestId *big.Int, result uint8) (*types.Transaction, error) {
	return _Xchain.Contract.PostEntitlementCheckResult(&_Xchain.TransactOpts, transactionId, requestId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0x4739e805.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint256 requestId, uint8 result) returns()
func (_Xchain *XchainTransactorSession) PostEntitlementCheckResult(transactionId [32]byte, requestId *big.Int, result uint8) (*types.Transaction, error) {
	return _Xchain.Contract.PostEntitlementCheckResult(&_Xchain.TransactOpts, transactionId, requestId, result)
}

// RequestRefund is a paid mutator transaction binding the contract method 0xd5cef133.
//
// Solidity: function requestRefund() returns()
func (_Xchain *XchainTransactor) RequestRefund(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Xchain.contract.Transact(opts, "requestRefund")
}

// RequestRefund is a paid mutator transaction binding the contract method 0xd5cef133.
//
// Solidity: function requestRefund() returns()
func (_Xchain *XchainSession) RequestRefund() (*types.Transaction, error) {
	return _Xchain.Contract.RequestRefund(&_Xchain.TransactOpts)
}

// RequestRefund is a paid mutator transaction binding the contract method 0xd5cef133.
//
// Solidity: function requestRefund() returns()
func (_Xchain *XchainTransactorSession) RequestRefund() (*types.Transaction, error) {
	return _Xchain.Contract.RequestRefund(&_Xchain.TransactOpts)
}

// XchainEntitlementCheckRequestedIterator is returned from FilterEntitlementCheckRequested and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequested events raised by the Xchain contract.
type XchainEntitlementCheckRequestedIterator struct {
	Event	*XchainEntitlementCheckRequested	// Event containing the contract specifics and raw log

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
func (it *XchainEntitlementCheckRequestedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainEntitlementCheckRequested)
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
		it.Event = new(XchainEntitlementCheckRequested)
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
func (it *XchainEntitlementCheckRequestedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainEntitlementCheckRequestedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainEntitlementCheckRequested represents a EntitlementCheckRequested event raised by the Xchain contract.
type XchainEntitlementCheckRequested struct {
	CallerAddress	common.Address
	ContractAddress	common.Address
	TransactionId	[32]byte
	RoleId		*big.Int
	SelectedNodes	[]common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterEntitlementCheckRequested is a free log retrieval operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_Xchain *XchainFilterer) FilterEntitlementCheckRequested(opts *bind.FilterOpts) (*XchainEntitlementCheckRequestedIterator, error) {

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "EntitlementCheckRequested")
	if err != nil {
		return nil, err
	}
	return &XchainEntitlementCheckRequestedIterator{contract: _Xchain.contract, event: "EntitlementCheckRequested", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequested is a free log subscription operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_Xchain *XchainFilterer) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *XchainEntitlementCheckRequested) (event.Subscription, error) {

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "EntitlementCheckRequested")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainEntitlementCheckRequested)
				if err := _Xchain.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
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
func (_Xchain *XchainFilterer) ParseEntitlementCheckRequested(log types.Log) (*XchainEntitlementCheckRequested, error) {
	event := new(XchainEntitlementCheckRequested)
	if err := _Xchain.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// XchainEntitlementCheckRequestedV2Iterator is returned from FilterEntitlementCheckRequestedV2 and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequestedV2 events raised by the Xchain contract.
type XchainEntitlementCheckRequestedV2Iterator struct {
	Event	*XchainEntitlementCheckRequestedV2	// Event containing the contract specifics and raw log

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
func (it *XchainEntitlementCheckRequestedV2Iterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainEntitlementCheckRequestedV2)
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
		it.Event = new(XchainEntitlementCheckRequestedV2)
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
func (it *XchainEntitlementCheckRequestedV2Iterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainEntitlementCheckRequestedV2Iterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainEntitlementCheckRequestedV2 represents a EntitlementCheckRequestedV2 event raised by the Xchain contract.
type XchainEntitlementCheckRequestedV2 struct {
	WalletAddress	common.Address
	SpaceAddress	common.Address
	ResolverAddress	common.Address
	TransactionId	[32]byte
	RoleId		*big.Int
	SelectedNodes	[]common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterEntitlementCheckRequestedV2 is a free log retrieval operation binding the contract event 0xf116223a7f59f1061fd42fcd9ff757b06a05709a822d38873fbbc5b5fda148bf.
//
// Solidity: event EntitlementCheckRequestedV2(address walletAddress, address spaceAddress, address resolverAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_Xchain *XchainFilterer) FilterEntitlementCheckRequestedV2(opts *bind.FilterOpts) (*XchainEntitlementCheckRequestedV2Iterator, error) {

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "EntitlementCheckRequestedV2")
	if err != nil {
		return nil, err
	}
	return &XchainEntitlementCheckRequestedV2Iterator{contract: _Xchain.contract, event: "EntitlementCheckRequestedV2", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequestedV2 is a free log subscription operation binding the contract event 0xf116223a7f59f1061fd42fcd9ff757b06a05709a822d38873fbbc5b5fda148bf.
//
// Solidity: event EntitlementCheckRequestedV2(address walletAddress, address spaceAddress, address resolverAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_Xchain *XchainFilterer) WatchEntitlementCheckRequestedV2(opts *bind.WatchOpts, sink chan<- *XchainEntitlementCheckRequestedV2) (event.Subscription, error) {

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "EntitlementCheckRequestedV2")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainEntitlementCheckRequestedV2)
				if err := _Xchain.contract.UnpackLog(event, "EntitlementCheckRequestedV2", log); err != nil {
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

// ParseEntitlementCheckRequestedV2 is a log parse operation binding the contract event 0xf116223a7f59f1061fd42fcd9ff757b06a05709a822d38873fbbc5b5fda148bf.
//
// Solidity: event EntitlementCheckRequestedV2(address walletAddress, address spaceAddress, address resolverAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_Xchain *XchainFilterer) ParseEntitlementCheckRequestedV2(log types.Log) (*XchainEntitlementCheckRequestedV2, error) {
	event := new(XchainEntitlementCheckRequestedV2)
	if err := _Xchain.contract.UnpackLog(event, "EntitlementCheckRequestedV2", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// XchainEntitlementCheckResultPostedIterator is returned from FilterEntitlementCheckResultPosted and is used to iterate over the raw logs and unpacked data for EntitlementCheckResultPosted events raised by the Xchain contract.
type XchainEntitlementCheckResultPostedIterator struct {
	Event	*XchainEntitlementCheckResultPosted	// Event containing the contract specifics and raw log

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
func (it *XchainEntitlementCheckResultPostedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainEntitlementCheckResultPosted)
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
		it.Event = new(XchainEntitlementCheckResultPosted)
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
func (it *XchainEntitlementCheckResultPostedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainEntitlementCheckResultPostedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainEntitlementCheckResultPosted represents a EntitlementCheckResultPosted event raised by the Xchain contract.
type XchainEntitlementCheckResultPosted struct {
	TransactionId	[32]byte
	Result		uint8
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterEntitlementCheckResultPosted is a free log retrieval operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_Xchain *XchainFilterer) FilterEntitlementCheckResultPosted(opts *bind.FilterOpts, transactionId [][32]byte) (*XchainEntitlementCheckResultPostedIterator, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return &XchainEntitlementCheckResultPostedIterator{contract: _Xchain.contract, event: "EntitlementCheckResultPosted", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckResultPosted is a free log subscription operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_Xchain *XchainFilterer) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *XchainEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainEntitlementCheckResultPosted)
				if err := _Xchain.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
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

// ParseEntitlementCheckResultPosted is a log parse operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_Xchain *XchainFilterer) ParseEntitlementCheckResultPosted(log types.Log) (*XchainEntitlementCheckResultPosted, error) {
	event := new(XchainEntitlementCheckResultPosted)
	if err := _Xchain.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// XchainInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the Xchain contract.
type XchainInitializedIterator struct {
	Event	*XchainInitialized	// Event containing the contract specifics and raw log

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
func (it *XchainInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainInitialized)
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
		it.Event = new(XchainInitialized)
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
func (it *XchainInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainInitialized represents a Initialized event raised by the Xchain contract.
type XchainInitialized struct {
	Version	uint32
	Raw	types.Log	// Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_Xchain *XchainFilterer) FilterInitialized(opts *bind.FilterOpts) (*XchainInitializedIterator, error) {

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &XchainInitializedIterator{contract: _Xchain.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_Xchain *XchainFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *XchainInitialized) (event.Subscription, error) {

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainInitialized)
				if err := _Xchain.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_Xchain *XchainFilterer) ParseInitialized(log types.Log) (*XchainInitialized, error) {
	event := new(XchainInitialized)
	if err := _Xchain.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// XchainInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the Xchain contract.
type XchainInterfaceAddedIterator struct {
	Event	*XchainInterfaceAdded	// Event containing the contract specifics and raw log

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
func (it *XchainInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainInterfaceAdded)
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
		it.Event = new(XchainInterfaceAdded)
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
func (it *XchainInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainInterfaceAdded represents a InterfaceAdded event raised by the Xchain contract.
type XchainInterfaceAdded struct {
	InterfaceId	[4]byte
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_Xchain *XchainFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*XchainInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &XchainInterfaceAddedIterator{contract: _Xchain.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_Xchain *XchainFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *XchainInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainInterfaceAdded)
				if err := _Xchain.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_Xchain *XchainFilterer) ParseInterfaceAdded(log types.Log) (*XchainInterfaceAdded, error) {
	event := new(XchainInterfaceAdded)
	if err := _Xchain.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// XchainInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the Xchain contract.
type XchainInterfaceRemovedIterator struct {
	Event	*XchainInterfaceRemoved	// Event containing the contract specifics and raw log

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
func (it *XchainInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainInterfaceRemoved)
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
		it.Event = new(XchainInterfaceRemoved)
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
func (it *XchainInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainInterfaceRemoved represents a InterfaceRemoved event raised by the Xchain contract.
type XchainInterfaceRemoved struct {
	InterfaceId	[4]byte
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_Xchain *XchainFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*XchainInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &XchainInterfaceRemovedIterator{contract: _Xchain.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_Xchain *XchainFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *XchainInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainInterfaceRemoved)
				if err := _Xchain.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_Xchain *XchainFilterer) ParseInterfaceRemoved(log types.Log) (*XchainInterfaceRemoved, error) {
	event := new(XchainInterfaceRemoved)
	if err := _Xchain.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// XchainNodeRegisteredIterator is returned from FilterNodeRegistered and is used to iterate over the raw logs and unpacked data for NodeRegistered events raised by the Xchain contract.
type XchainNodeRegisteredIterator struct {
	Event	*XchainNodeRegistered	// Event containing the contract specifics and raw log

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
func (it *XchainNodeRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainNodeRegistered)
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
		it.Event = new(XchainNodeRegistered)
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
func (it *XchainNodeRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainNodeRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainNodeRegistered represents a NodeRegistered event raised by the Xchain contract.
type XchainNodeRegistered struct {
	NodeAddress	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterNodeRegistered is a free log retrieval operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_Xchain *XchainFilterer) FilterNodeRegistered(opts *bind.FilterOpts, nodeAddress []common.Address) (*XchainNodeRegisteredIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "NodeRegistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &XchainNodeRegisteredIterator{contract: _Xchain.contract, event: "NodeRegistered", logs: logs, sub: sub}, nil
}

// WatchNodeRegistered is a free log subscription operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_Xchain *XchainFilterer) WatchNodeRegistered(opts *bind.WatchOpts, sink chan<- *XchainNodeRegistered, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "NodeRegistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainNodeRegistered)
				if err := _Xchain.contract.UnpackLog(event, "NodeRegistered", log); err != nil {
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
func (_Xchain *XchainFilterer) ParseNodeRegistered(log types.Log) (*XchainNodeRegistered, error) {
	event := new(XchainNodeRegistered)
	if err := _Xchain.contract.UnpackLog(event, "NodeRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// XchainNodeUnregisteredIterator is returned from FilterNodeUnregistered and is used to iterate over the raw logs and unpacked data for NodeUnregistered events raised by the Xchain contract.
type XchainNodeUnregisteredIterator struct {
	Event	*XchainNodeUnregistered	// Event containing the contract specifics and raw log

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
func (it *XchainNodeUnregisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainNodeUnregistered)
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
		it.Event = new(XchainNodeUnregistered)
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
func (it *XchainNodeUnregisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainNodeUnregisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainNodeUnregistered represents a NodeUnregistered event raised by the Xchain contract.
type XchainNodeUnregistered struct {
	NodeAddress	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterNodeUnregistered is a free log retrieval operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_Xchain *XchainFilterer) FilterNodeUnregistered(opts *bind.FilterOpts, nodeAddress []common.Address) (*XchainNodeUnregisteredIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "NodeUnregistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &XchainNodeUnregisteredIterator{contract: _Xchain.contract, event: "NodeUnregistered", logs: logs, sub: sub}, nil
}

// WatchNodeUnregistered is a free log subscription operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_Xchain *XchainFilterer) WatchNodeUnregistered(opts *bind.WatchOpts, sink chan<- *XchainNodeUnregistered, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "NodeUnregistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainNodeUnregistered)
				if err := _Xchain.contract.UnpackLog(event, "NodeUnregistered", log); err != nil {
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
func (_Xchain *XchainFilterer) ParseNodeUnregistered(log types.Log) (*XchainNodeUnregistered, error) {
	event := new(XchainNodeUnregistered)
	if err := _Xchain.contract.UnpackLog(event, "NodeUnregistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
