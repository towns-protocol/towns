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

// EntitlementCheckerMetaData contains all meta data concerning the EntitlementChecker contract.
var EntitlementCheckerMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"__EntitlementChecker_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getNodeAtIndex\",\"inputs\":[{\"name\":\"index\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodesByOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRandomNodes\",\"inputs\":[{\"name\":\"count\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isValidNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheck\",\"inputs\":[{\"name\":\"walletAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV2\",\"inputs\":[{\"name\":\"walletAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"requestId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"extraData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"unregisterNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckRequested\",\"inputs\":[{\"name\":\"callerAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementCheckRequestedV2\",\"inputs\":[{\"name\":\"walletAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"spaceAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"resolverAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRegistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUnregistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientFunds\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientNumberOfNodes\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidNodeOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NoPendingRequests\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NoRefundsAvailable\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_OperatorNotActive\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]}]",
	Bin: "0x6080604052348015600e575f5ffd5b5060156019565b60bd565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156064576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101560ba57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6115f0806100ca5f395ff3fe6080604052600436106100ad575f3560e01c80634f84544511610066578063672d7a0d1161004c578063672d7a0d146101af5780639ebd11ef146101ce578063c5e41cf6146101fd575f5ffd5b80634f84544514610171578063541da4e514610190575f5ffd5b806339dc5b3e1161009657806339dc5b3e146100ed5780633c59f1261461010157806343024ac914610145575f5ffd5b806321be050a146100b157806339bf397e146100c6575b5f5ffd5b6100c46100bf3660046111bb565b61021c565b005b3480156100d1575f5ffd5b506100da610553565b6040519081526020015b60405180910390f35b3480156100f8575f5ffd5b506100c4610584565b34801561010c575f5ffd5b5061012061011b366004611292565b610612565b60405173ffffffffffffffffffffffffffffffffffffffff90911681526020016100e4565b348015610150575f5ffd5b5061016461015f3660046112a9565b6106ba565b6040516100e49190611314565b34801561017c575f5ffd5b5061016461018b366004611292565b6107e1565b34801561019b575f5ffd5b506100c46101aa366004611326565b6107f2565b3480156101ba575f5ffd5b506100c46101c93660046112a9565b610837565b3480156101d9575f5ffd5b506101ed6101e83660046112a9565b6109dc565b60405190151581526020016100e4565b348015610208575f5ffd5b506100c46102173660046112a9565b610a08565b5f3390505f8280602001905181019061023591906113ff565b73ffffffffffffffffffffffffffffffffffffffff81165f9081527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc01602052604090209091507ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc00906102a79087610b91565b506040805160808101825234815243602080830191825273ffffffffffffffffffffffffffffffffffffffff8088168486019081525f606086018181528d82526002808a019095529681209551865593516001860155519390910180549451151574010000000000000000000000000000000000000000027fffffffffffffffffffffff000000000000000000000000000000000000000000909516939091169290921792909217905561035b6005610b9c565b5f8881527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc03602052604090209091506103948188610b91565b505f5b8251811015610506576103de8382815181106103b5576103b561141a565b6020026020010151836002015f8b81526020019081526020015f20610da590919063ffffffff16565b50816003015f8981526020019081526020015f20604051806040016040528085848151811061040f5761040f61141a565b602002602001015173ffffffffffffffffffffffffffffffffffffffff1681526020015f600281111561044457610444611447565b905281546001810183555f9283526020928390208251910180547fffffffffffffffffffffffff0000000000000000000000000000000000000000811673ffffffffffffffffffffffffffffffffffffffff909316928317825593830151929390929183917fffffffffffffffffffffff0000000000000000000000000000000000000000001617740100000000000000000000000000000000000000008360028111156104f4576104f4611447565b02179055505050806001019050610397565b507ff116223a7f59f1061fd42fcd9ff757b06a05709a822d38873fbbc5b5fda148bf8986308b8b8760405161054096959493929190611474565b60405180910390a1505050505050505050565b5f7f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f60260061057e81610dc6565b91505090565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166105e7576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6106107f40b7002f00000000000000000000000000000000000000000000000000000000610dcf565b565b5f7f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f60260061063d81610dc6565b83106106a9576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f496e646578206f7574206f6620626f756e647300000000000000000000000000604482015260640160405180910390fd5b6106b38184610f24565b9392505050565b60607f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f6026005f6106e782610dc6565b90508067ffffffffffffffff8111156107025761070261113f565b60405190808252806020026020018201604052801561072b578160200160208202803683370190505b5092505f5f5b828110156107d6575f6107448583610f24565b73ffffffffffffffffffffffffffffffffffffffff8082165f9081526002880160205260409020549192508089169116036107cd57808684806001019550815181106107925761079261141a565b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff16815250505b50600101610731565b508352509092915050565b60606107ec82610b9c565b92915050565b7f4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f384338585856040516108299594939291906114f2565b60405180910390a150505050565b7f988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf55006108628133610f2f565b610898576040517fc931a1fb00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f6026006108c38184610f2f565b156108fa576040517fd1922fc100000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6109048184610da5565b5073ffffffffffffffffffffffffffffffffffffffff83165f81815260028301602052604080822080547fffffffffffffffffffffffff00000000000000000000000000000000000000001633179055517f564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf69190a2506002335f90815260028301602052604090205460ff1660038111156109a1576109a1611447565b146109d8576040517f7164de9100000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5050565b5f7f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f6026006106b38184610f2f565b73ffffffffffffffffffffffffffffffffffffffff8082165f9081527f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f6026026020526040902054829133917f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f60260091168214610aac576040517ffd2dc62f00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f602600610ad78186610f2f565b610b0d576040517f17e3e0b900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610b178186610f5d565b5073ffffffffffffffffffffffffffffffffffffffff85165f81815260028301602052604080822080547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055517fb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a9190a25050505050565b5f6106b38383610f7e565b60607f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f6026005f610bc982610dc6565b905080841115610c05576040517f1762997d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f8467ffffffffffffffff811115610c1f57610c1f61113f565b604051908082528060200260200182016040528015610c48578160200160208202803683370190505b5090505f8267ffffffffffffffff811115610c6557610c6561113f565b604051908082528060200260200182016040528015610c8e578160200160208202803683370190505b5090505f5b83811015610cc15780828281518110610cae57610cae61141a565b6020908102919091010152600101610c93565b505f5b86811015610d9a575f610cd78286610fca565b9050610d07838281518110610cee57610cee61141a565b6020026020010151875f01610f2490919063ffffffff16565b848381518110610d1957610d1961141a565b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff168152505082856001900395508581518110610d6c57610d6c61141a565b6020026020010151838281518110610d8657610d8661141a565b602090810291909101015250600101610cc4565b509095945050505050565b5f6106b38373ffffffffffffffffffffffffffffffffffffffff8416610f7e565b5f6107ec825490565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16610ea3577fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b006020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055610ed5565b6040517ff2cfeefa00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040517fffffffff000000000000000000000000000000000000000000000000000000008216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b5f6106b38383611012565b73ffffffffffffffffffffffffffffffffffffffff81165f90815260018301602052604081205415156106b3565b5f6106b38373ffffffffffffffffffffffffffffffffffffffff8416611038565b5f818152600183016020526040812054610fc357508154600181810184555f8481526020808220909301849055845484825282860190935260409020919091556107ec565b505f6107ec565b604080514460208201524291810191909152606081018390523360808201525f90829060a001604051602081830303815290604052805190602001205f1c6106b39190611553565b5f825f0182815481106110275761102761141a565b905f5260205f200154905092915050565b5f8181526001830160205260408120548015611112575f61105a60018361158b565b85549091505f9061106d9060019061158b565b90508082146110cc575f865f01828154811061108b5761108b61141a565b905f5260205f200154905080875f0184815481106110ab576110ab61141a565b5f918252602080832090910192909255918252600188019052604090208390555b85548690806110dd576110dd6115c3565b600190038181905f5260205f20015f90559055856001015f8681526020019081526020015f205f9055600193505050506107ec565b5f9150506107ec565b73ffffffffffffffffffffffffffffffffffffffff8116811461113c575f5ffd5b50565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016810167ffffffffffffffff811182821017156111b3576111b361113f565b604052919050565b5f5f5f5f608085870312156111ce575f5ffd5b84356111d98161111b565b93506020850135925060408501359150606085013567ffffffffffffffff811115611202575f5ffd5b8501601f81018713611212575f5ffd5b803567ffffffffffffffff81111561122c5761122c61113f565b61125d60207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8401160161116c565b818152886020838501011115611271575f5ffd5b816020840160208301375f6020838301015280935050505092959194509250565b5f602082840312156112a2575f5ffd5b5035919050565b5f602082840312156112b9575f5ffd5b81356106b38161111b565b5f8151808452602084019350602083015f5b8281101561130a57815173ffffffffffffffffffffffffffffffffffffffff168652602095860195909101906001016112d6565b5093949350505050565b602081525f6106b360208301846112c4565b5f5f5f5f60808587031215611339575f5ffd5b84356113448161111b565b93506020850135925060408501359150606085013567ffffffffffffffff81111561136d575f5ffd5b8501601f8101871361137d575f5ffd5b803567ffffffffffffffff8111156113975761139761113f565b8060051b6113a76020820161116c565b9182526020818401810192908101908a8411156113c2575f5ffd5b6020850194505b838510156113f057843592506113de8361111b565b828252602094850194909101906113c9565b979a9699509497505050505050565b5f6020828403121561140f575f5ffd5b81516106b38161111b565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b73ffffffffffffffffffffffffffffffffffffffff8716815273ffffffffffffffffffffffffffffffffffffffff8616602082015273ffffffffffffffffffffffffffffffffffffffff8516604082015283606082015282608082015260c060a08201525f6114e660c08301846112c4565b98975050505050505050565b73ffffffffffffffffffffffffffffffffffffffff8616815273ffffffffffffffffffffffffffffffffffffffff8516602082015283604082015282606082015260a060808201525f61154860a08301846112c4565b979650505050505050565b5f82611586577f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b500690565b818103818111156107ec577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603160045260245ffd",
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

// GetNodesByOperator is a free data retrieval call binding the contract method 0x43024ac9.
//
// Solidity: function getNodesByOperator(address operator) view returns(address[] nodes)
func (_EntitlementChecker *EntitlementCheckerCaller) GetNodesByOperator(opts *bind.CallOpts, operator common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _EntitlementChecker.contract.Call(opts, &out, "getNodesByOperator", operator)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetNodesByOperator is a free data retrieval call binding the contract method 0x43024ac9.
//
// Solidity: function getNodesByOperator(address operator) view returns(address[] nodes)
func (_EntitlementChecker *EntitlementCheckerSession) GetNodesByOperator(operator common.Address) ([]common.Address, error) {
	return _EntitlementChecker.Contract.GetNodesByOperator(&_EntitlementChecker.CallOpts, operator)
}

// GetNodesByOperator is a free data retrieval call binding the contract method 0x43024ac9.
//
// Solidity: function getNodesByOperator(address operator) view returns(address[] nodes)
func (_EntitlementChecker *EntitlementCheckerCallerSession) GetNodesByOperator(operator common.Address) ([]common.Address, error) {
	return _EntitlementChecker.Contract.GetNodesByOperator(&_EntitlementChecker.CallOpts, operator)
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
// Solidity: function requestEntitlementCheck(address walletAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_EntitlementChecker *EntitlementCheckerTransactor) RequestEntitlementCheck(opts *bind.TransactOpts, walletAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.contract.Transact(opts, "requestEntitlementCheck", walletAddress, transactionId, roleId, nodes)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address walletAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_EntitlementChecker *EntitlementCheckerSession) RequestEntitlementCheck(walletAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RequestEntitlementCheck(&_EntitlementChecker.TransactOpts, walletAddress, transactionId, roleId, nodes)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address walletAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_EntitlementChecker *EntitlementCheckerTransactorSession) RequestEntitlementCheck(walletAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RequestEntitlementCheck(&_EntitlementChecker.TransactOpts, walletAddress, transactionId, roleId, nodes)
}

// RequestEntitlementCheckV2 is a paid mutator transaction binding the contract method 0x21be050a.
//
// Solidity: function requestEntitlementCheckV2(address walletAddress, bytes32 transactionId, uint256 requestId, bytes extraData) payable returns()
func (_EntitlementChecker *EntitlementCheckerTransactor) RequestEntitlementCheckV2(opts *bind.TransactOpts, walletAddress common.Address, transactionId [32]byte, requestId *big.Int, extraData []byte) (*types.Transaction, error) {
	return _EntitlementChecker.contract.Transact(opts, "requestEntitlementCheckV2", walletAddress, transactionId, requestId, extraData)
}

// RequestEntitlementCheckV2 is a paid mutator transaction binding the contract method 0x21be050a.
//
// Solidity: function requestEntitlementCheckV2(address walletAddress, bytes32 transactionId, uint256 requestId, bytes extraData) payable returns()
func (_EntitlementChecker *EntitlementCheckerSession) RequestEntitlementCheckV2(walletAddress common.Address, transactionId [32]byte, requestId *big.Int, extraData []byte) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RequestEntitlementCheckV2(&_EntitlementChecker.TransactOpts, walletAddress, transactionId, requestId, extraData)
}

// RequestEntitlementCheckV2 is a paid mutator transaction binding the contract method 0x21be050a.
//
// Solidity: function requestEntitlementCheckV2(address walletAddress, bytes32 transactionId, uint256 requestId, bytes extraData) payable returns()
func (_EntitlementChecker *EntitlementCheckerTransactorSession) RequestEntitlementCheckV2(walletAddress common.Address, transactionId [32]byte, requestId *big.Int, extraData []byte) (*types.Transaction, error) {
	return _EntitlementChecker.Contract.RequestEntitlementCheckV2(&_EntitlementChecker.TransactOpts, walletAddress, transactionId, requestId, extraData)
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

// EntitlementCheckerEntitlementCheckRequestedV2Iterator is returned from FilterEntitlementCheckRequestedV2 and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequestedV2 events raised by the EntitlementChecker contract.
type EntitlementCheckerEntitlementCheckRequestedV2Iterator struct {
	Event *EntitlementCheckerEntitlementCheckRequestedV2 // Event containing the contract specifics and raw log

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
func (it *EntitlementCheckerEntitlementCheckRequestedV2Iterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(EntitlementCheckerEntitlementCheckRequestedV2)
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
		it.Event = new(EntitlementCheckerEntitlementCheckRequestedV2)
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
func (it *EntitlementCheckerEntitlementCheckRequestedV2Iterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *EntitlementCheckerEntitlementCheckRequestedV2Iterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// EntitlementCheckerEntitlementCheckRequestedV2 represents a EntitlementCheckRequestedV2 event raised by the EntitlementChecker contract.
type EntitlementCheckerEntitlementCheckRequestedV2 struct {
	WalletAddress   common.Address
	SpaceAddress    common.Address
	ResolverAddress common.Address
	TransactionId   [32]byte
	RoleId          *big.Int
	SelectedNodes   []common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckRequestedV2 is a free log retrieval operation binding the contract event 0xf116223a7f59f1061fd42fcd9ff757b06a05709a822d38873fbbc5b5fda148bf.
//
// Solidity: event EntitlementCheckRequestedV2(address walletAddress, address spaceAddress, address resolverAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_EntitlementChecker *EntitlementCheckerFilterer) FilterEntitlementCheckRequestedV2(opts *bind.FilterOpts) (*EntitlementCheckerEntitlementCheckRequestedV2Iterator, error) {

	logs, sub, err := _EntitlementChecker.contract.FilterLogs(opts, "EntitlementCheckRequestedV2")
	if err != nil {
		return nil, err
	}
	return &EntitlementCheckerEntitlementCheckRequestedV2Iterator{contract: _EntitlementChecker.contract, event: "EntitlementCheckRequestedV2", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequestedV2 is a free log subscription operation binding the contract event 0xf116223a7f59f1061fd42fcd9ff757b06a05709a822d38873fbbc5b5fda148bf.
//
// Solidity: event EntitlementCheckRequestedV2(address walletAddress, address spaceAddress, address resolverAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_EntitlementChecker *EntitlementCheckerFilterer) WatchEntitlementCheckRequestedV2(opts *bind.WatchOpts, sink chan<- *EntitlementCheckerEntitlementCheckRequestedV2) (event.Subscription, error) {

	logs, sub, err := _EntitlementChecker.contract.WatchLogs(opts, "EntitlementCheckRequestedV2")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(EntitlementCheckerEntitlementCheckRequestedV2)
				if err := _EntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequestedV2", log); err != nil {
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
func (_EntitlementChecker *EntitlementCheckerFilterer) ParseEntitlementCheckRequestedV2(log types.Log) (*EntitlementCheckerEntitlementCheckRequestedV2, error) {
	event := new(EntitlementCheckerEntitlementCheckRequestedV2)
	if err := _EntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequestedV2", log); err != nil {
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
