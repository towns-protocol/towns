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
	ABI:	"[{\"type\":\"function\",\"name\":\"__XChain_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isCheckCompleted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"requestId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"requestId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"provideXChainRefund\",\"inputs\":[{\"name\":\"senderAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckRequested\",\"inputs\":[{\"name\":\"callerAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementCheckRequestedV2\",\"inputs\":[{\"name\":\"walletAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"spaceAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"resolverAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRegistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUnregistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientFunds\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientNumberOfNodes\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidNodeOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NoPendingRequests\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NoRefundsAvailable\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_OperatorNotActive\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidEntitlement\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_OnlyEntitlementChecker\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_RequestIdNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Reentrancy\",\"inputs\":[]}]",
	Bin:	"0x6080604052348015600e575f5ffd5b5060156019565b60bd565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156064576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101560ba57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6111d4806100ca5f395ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c80634739e8051461004e5780636d777f3614610063578063ac7474f014610076578063bbbcb94b1461009d575b5f5ffd5b61006161005c366004610ff1565b6100a5565b005b61006161007136600461102a565b61017e565b61008961008436600461106c565b61042d565b604051901515815260200160405180910390f35b610061610472565b3068929eee149b4bd2126854036100c35763ab143c065f526004601cfd5b3068929eee149b4bd21268555f8381527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc02602090815260408083207ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc039092528220909161013282848888610500565b905061013f828686610683565b5f61014a83876107ea565b90506101558161091e565b15610169576101698287836060015161094e565b505050503868929eee149b4bd2126855505050565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff1633146101f4576040517f65f4906500000000000000000000000000000000000000000000000000000000815233600482015260240160405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff82165f9081527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc016020526040902061024190826109c2565b61026e5761026e7f7912b739000000000000000000000000000000000000000000000000000000006109cd565b5f8181527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc0260205260409020600281015474010000000000000000000000000000000000000000900460ff16156102e8576102e87f7912b739000000000000000000000000000000000000000000000000000000006109cd565b80545f03610319576103197ff4e95a41000000000000000000000000000000000000000000000000000000006109cd565b6002810180547fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff16740100000000000000000000000000000000000000001790555f6103827ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc0090565b5f84815260039190910160205260408120915061039e826109d5565b90508015610403575f5b81811015610401575f6103bb84836109de565b5f908152600485016020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660019081179091559190910190506103a8565b505b61042673eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3087865f01546109e9565b5050505050565b5f8281527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc036020908152604080832084845260040190915290205460ff165b92915050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166104d5576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6104fe7fd5fa71fa00000000000000000000000000000000000000000000000000000000610a41565b565b604080516080810182525f808252602082018190529181018290526060810191909152600284015474010000000000000000000000000000000000000000900460ff1615610571576105717f7912b739000000000000000000000000000000000000000000000000000000006109cd565b61057b8583610b96565b6105a8576105a87f82970230000000000000000000000000000000000000000000000000000000006109cd565b5f82815260028601602052604090206105c19033610bad565b6105ee576105ee7f8223a7e9000000000000000000000000000000000000000000000000000000006109cd565b5f82815260048601602052604090205460ff161561062f5761062f7f7912b739000000000000000000000000000000000000000000000000000000006109cd565b91825250600282015473ffffffffffffffffffffffffffffffffffffffff81166020830152915460408201527401000000000000000000000000000000000000000090910460ff1615156060820152919050565b5f828152600284016020526040812061069b906109d5565b90505f805b828110156107bb575f85815260038701602052604081208054839081106106c9576106c961108c565b5f91825260209091200180549091503373ffffffffffffffffffffffffffffffffffffffff909116036107b2575f815474010000000000000000000000000000000000000000900460ff166002811115610725576107256110b9565b14610753576107537f47592a4d000000000000000000000000000000000000000000000000000000006109cd565b8054859082907fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff16740100000000000000000000000000000000000000008360028111156107a3576107a36110b9565b021790555060019250506107bb565b506001016106a0565b5080610426576104267f8223a7e9000000000000000000000000000000000000000000000000000000006109cd565b6107f2610fbd565b5f828152600284016020526040902061080a906109d5565b60408201525f5b81604001518110156108d5575f838152600385016020526040812080548390811061083e5761083e61108c565b5f91825260209091200190506001815474010000000000000000000000000000000000000000900460ff16600281111561087a5761087a6110b9565b0361088b57825160010183526108cc565b6002815474010000000000000000000000000000000000000000900460ff1660028111156108bb576108bb6110b9565b036108cc5760208301805160010190525b50600101610811565b5060208101518151116108e95760026108ec565b60015b81606001906002811115610902576109026110b9565b90816002811115610915576109156110b9565b90525092915050565b5f5f6002836040015161093191906110e6565b905080835f015111806109475750808360200151115b9392505050565b82515f9081527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc0360209081526040808320858452600401909152902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660011790556109bd8382610bdb565b505050565b5f6109478383610d2e565b805f5260045ffd5b5f61046c825490565b5f6109478383610e11565b8015610a3b5773ffffffffffffffffffffffffffffffffffffffff841673eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee14610a3157610a2c84848484610e37565b610a3b565b610a3b8282610ecb565b50505050565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16610b15577fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b006020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055610b47565b6040517ff2cfeefa00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040517fffffffff000000000000000000000000000000000000000000000000000000008216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b5f8181526001830160205260408120541515610947565b73ffffffffffffffffffffffffffffffffffffffff81165f9081526001830160205260408120541515610947565b81515f9081527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc026020908152604080832060020180547fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff167401000000000000000000000000000000000000000017905584518286015173ffffffffffffffffffffffffffffffffffffffff1684527ff501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc01909252909120610c9a916109c2565b506020820151604080840151845191517fe58690f200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff9093169263e58690f292610cfc915f90879060040161111e565b5f604051808303818588803b158015610d13575f5ffd5b505af1158015610d25573d5f5f3e3d5ffd5b50505050505050565b5f8181526001830160205260408120548015610e08575f610d5060018361116f565b85549091505f90610d639060019061116f565b9050808214610dc2575f865f018281548110610d8157610d8161108c565b905f5260205f200154905080875f018481548110610da157610da161108c565b5f918252602080832090910192909255918252600188019052604090208390555b8554869080610dd357610dd36111a7565b600190038181905f5260205f20015f90559055856001015f8681526020019081526020015f205f90556001935050505061046c565b5f91505061046c565b5f825f018281548110610e2657610e2661108c565b905f5260205f200154905092915050565b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160315610a3b5773ffffffffffffffffffffffffffffffffffffffff83163014610eaa57610a2c73ffffffffffffffffffffffffffffffffffffffff8516848484610eef565b610a3b73ffffffffffffffffffffffffffffffffffffffff85168383610f51565b610eeb73ffffffffffffffffffffffffffffffffffffffff831682610fa4565b5050565b60405181606052826040528360601b602c526f23b872dd000000000000000000000000600c5260205f6064601c5f895af18060015f511416610f4357803d873b151710610f4357637939f4245f526004601cfd5b505f60605260405250505050565b81601452806034526fa9059cbb0000000000000000000000005f5260205f604460105f875af18060015f511416610f9a57803d853b151710610f9a576390b8ec185f526004601cfd5b505f603452505050565b5f385f3884865af1610eeb5763b12d13eb5f526004601cfd5b60405180608001604052805f81526020015f81526020015f81526020015f6002811115610fec57610fec6110b9565b905290565b5f5f5f60608486031215611003575f5ffd5b833592506020840135915060408401356003811061101f575f5ffd5b809150509250925092565b5f5f6040838503121561103b575f5ffd5b823573ffffffffffffffffffffffffffffffffffffffff8116811461105e575f5ffd5b946020939093013593505050565b5f5f6040838503121561107d575f5ffd5b50508035926020909101359150565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b5f82611119577f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b500490565b838152602081018390526060810160038310611161577f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b826040830152949350505050565b8181038181111561046c577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603160045260245ffd",
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

// ProvideXChainRefund is a paid mutator transaction binding the contract method 0x6d777f36.
//
// Solidity: function provideXChainRefund(address senderAddress, bytes32 transactionId) returns()
func (_Xchain *XchainTransactor) ProvideXChainRefund(opts *bind.TransactOpts, senderAddress common.Address, transactionId [32]byte) (*types.Transaction, error) {
	return _Xchain.contract.Transact(opts, "provideXChainRefund", senderAddress, transactionId)
}

// ProvideXChainRefund is a paid mutator transaction binding the contract method 0x6d777f36.
//
// Solidity: function provideXChainRefund(address senderAddress, bytes32 transactionId) returns()
func (_Xchain *XchainSession) ProvideXChainRefund(senderAddress common.Address, transactionId [32]byte) (*types.Transaction, error) {
	return _Xchain.Contract.ProvideXChainRefund(&_Xchain.TransactOpts, senderAddress, transactionId)
}

// ProvideXChainRefund is a paid mutator transaction binding the contract method 0x6d777f36.
//
// Solidity: function provideXChainRefund(address senderAddress, bytes32 transactionId) returns()
func (_Xchain *XchainTransactorSession) ProvideXChainRefund(senderAddress common.Address, transactionId [32]byte) (*types.Transaction, error) {
	return _Xchain.Contract.ProvideXChainRefund(&_Xchain.TransactOpts, senderAddress, transactionId)
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

// XchainOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the Xchain contract.
type XchainOwnershipTransferredIterator struct {
	Event	*XchainOwnershipTransferred	// Event containing the contract specifics and raw log

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
func (it *XchainOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(XchainOwnershipTransferred)
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
		it.Event = new(XchainOwnershipTransferred)
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
func (it *XchainOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *XchainOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// XchainOwnershipTransferred represents a OwnershipTransferred event raised by the Xchain contract.
type XchainOwnershipTransferred struct {
	PreviousOwner	common.Address
	NewOwner	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Xchain *XchainFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*XchainOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _Xchain.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &XchainOwnershipTransferredIterator{contract: _Xchain.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Xchain *XchainFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *XchainOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _Xchain.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(XchainOwnershipTransferred)
				if err := _Xchain.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_Xchain *XchainFilterer) ParseOwnershipTransferred(log types.Log) (*XchainOwnershipTransferred, error) {
	event := new(XchainOwnershipTransferred)
	if err := _Xchain.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
