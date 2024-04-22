// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package dev

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

// MockEntitlementGatedMetaData contains all meta data concerning the MockEntitlementGated contract.
var MockEntitlementGatedMetaData = &bind.MetaData{
	ABI:	"[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"checker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheck\",\"inputs\":[{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]}]",
	Bin:	"0x608060405234801561001057600080fd5b506040516115b13803806115b183398101604081905261002f916100a6565b6100388161003e565b506100d6565b6001600160a01b0381166100655760405163133de07160e31b815260040160405180910390fd5b7f133f5e83927ae0f4eccaf443b57ee2634efab46c5ecb3a58ec4bb3201dd55ef680546001600160a01b0319166001600160a01b0392909216919091179055565b6000602082840312156100b857600080fd5b81516001600160a01b03811681146100cf57600080fd5b9392505050565b6114cc806100e56000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80638a59b1b414610046578063efa8db231461006f578063f4efb0bb14610090575b600080fd5b610059610054366004610963565b6100a5565b6040516100669190610a78565b60405180910390f35b61008261007d366004610b1b565b6100d8565b604051908152602001610066565b6100a361009e366004610b63565b61010d565b005b6100c960405180606001604052806060815260200160608152602001606081525090565b6100d28261011b565b92915050565b600080826040516020016100ec9190610d8c565b60405160208183030381529060405290506101068161024c565b9392505050565b61011782826104bf565b5050565b61013f60405180606001604052806060815260200160608152602001606081525090565b60008281527f133f5e83927ae0f4eccaf443b57ee2634efab46c5ecb3a58ec4bb3201dd55ef76020526040812080546000805160206114ac8339815191529260ff909116151590036101a457604051637ad5a43960e11b815260040160405180910390fd5b8060020180546101b390610e3b565b80601f01602080910402602001604051908101604052809291908181526020018280546101df90610e3b565b801561022c5780601f106102015761010080835404028352916020019161022c565b820191906000526020600020905b81548152906001019060200180831161020f57829003601f168201915b505050505080602001905181019061024491906110b3565b949350505050565b6040516bffffffffffffffffffffffff193260601b166020820152436034820152600090819060540160405160208183030381529060405280519060200120905060006102a46000805160206114ac83398151915290565b60008381526001808301602052604090912080549293509160ff16151590036102e05760405163bf2a062560e01b815260040160405180910390fd5b8154604051631079b6d760e11b8152600560048201523060248201526000916001600160a01b0316906320f36dae90604401600060405180830381865afa15801561032f573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f1916820160405261035791908101906111f3565b825433610100026001600160a81b03199091161760011761ffff60a81b1916835590506002820161038887826112de565b5060005b8151811015610451578260010160405180604001604052808484815181106103b6576103b661139e565b60200260200101516001600160a01b03168152602001600060028111156103df576103df61097c565b9052815460018101835560009283526020928390208251910180546001600160a01b031981166001600160a01b03909316928317825593830151929390929183916001600160a81b03191617600160a01b8360028111156104425761044261097c565b0217905550505060010161038c565b508254604051637917c69760e11b81526001600160a01b039091169063f22f8d2e9061048390879085906004016113b4565b600060405180830381600087803b15801561049d57600080fd5b505af11580156104b1573d6000803e3d6000fd5b509598975050505050505050565b60008281527f133f5e83927ae0f4eccaf443b57ee2634efab46c5ecb3a58ec4bb3201dd55ef76020526040812080546000805160206114ac8339815191529260ff9091161515900361052457604051637ad5a43960e11b815260040160405180910390fd5b6000805b60018301548110156105e557600083600101828154811061054b5761054b61139e565b60009182526020909120018054909150336001600160a01b03909116036105dc5760008154600160a01b900460ff16600281111561058b5761058b61097c565b146105a9576040516347592a4d60e01b815260040160405180910390fd5b8054600193508690829060ff60a01b1916600160a01b8360028111156105d1576105d161097c565b0217905550506105e5565b50600101610528565b5080151560000361060957604051638223a7e960e01b815260040160405180910390fd5b60008060005b60018501548110156106b05760008560010182815481106106325761063261139e565b6000918252602090912001905060018154600160a01b900460ff16600281111561065e5761065e61097c565b03610675578361066d81611400565b9450506106a7565b60028154600160a01b900460ff1660028111156106945761069461097c565b036106a757826106a381611400565b9350505b5060010161060f565b508354600160b01b900460ff166107b55760018401546106d290600290611427565b82111561073e57835461ffff60a81b191661010160a81b1784556106f78760016107be565b867fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c63360016040516107289190611449565b60405180910390a2610739876107fc565b6107b5565b600184015461074f90600290611427565b8111156107b557835461ffff60a81b1916608160a91b1784556107738760026107be565b867fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c63360026040516107a49190611449565b60405180910390a26107b5876107fc565b50505050505050565b6101176040518060400160405280601e81526020017f6f6e456e7469746c656d656e74436865636b526573756c74506f737465640000815250610868565b60008181527f133f5e83927ae0f4eccaf443b57ee2634efab46c5ecb3a58ec4bb3201dd55ef76020526040812080546001600160b81b03191681556000805160206114ac8339815191529161085460018301826108d3565b6108626002830160006108f1565b50505050565b6108ab8160405160240161087c919061145c565b60408051601f198184030181529190526020810180516001600160e01b031663104c13eb60e21b1790526108ae565b50565b6108ab8180516a636f6e736f6c652e6c6f67602083016000808483855afa5050505050565b50805460008255906000526020600020908101906108ab919061092b565b5080546108fd90610e3b565b6000825580601f1061090d575050565b601f0160209004906000526020600020908101906108ab919061094e565b5b8082111561094a5780546001600160a81b031916815560010161092c565b5090565b5b8082111561094a576000815560010161094f565b60006020828403121561097557600080fd5b5035919050565b634e487b7160e01b600052602160045260246000fd5b600381106108ab576108ab61097c565b600681106109b2576109b261097c565b9052565b60008151808452602080850194506020840160005b83811015610a175781516109e08882516109a2565b80840151888501526040808201516001600160a01b03169089015260609081015190880152608090960195908201906001016109cb565b509495945050505050565b60008151808452602080850194506020840160005b83811015610a175781518051610a4c81610992565b88528084015160ff908116858a0152604091820151169088015260609096019590820190600101610a37565b6020808252825160608383015280516080840181905260009291820190839060a08601905b80831015610ad45783518051610ab281610992565b835285015160ff16858301529284019260019290920191604090910190610a9d565b50838701519350601f19925082868203016040870152610af481856109b6565b93505050604085015181858403016060860152610b118382610a22565b9695505050505050565b600060208284031215610b2d57600080fd5b813567ffffffffffffffff811115610b4457600080fd5b82016060818503121561010657600080fd5b600381106108ab57600080fd5b60008060408385031215610b7657600080fd5b823591506020830135610b8881610b56565b809150509250929050565b60ff811681146108ab57600080fd5b8183526000602080850194508260005b85811015610a17578135610bc581610b56565b610bce81610992565b875281830135610bdd81610b93565b60ff16878401526040968701969190910190600101610bb2565b6000808335601e19843603018112610c0e57600080fd5b830160208101925035905067ffffffffffffffff811115610c2e57600080fd5b8060071b3603821315610c4057600080fd5b9250929050565b600681106108ab57600080fd5b6001600160a01b03811681146108ab57600080fd5b8183526000602080850194508260005b85811015610a17578135610c8c81610c47565b610c9688826109a2565b508282013583880152604080830135610cae81610c54565b6001600160a01b0316908801526060828101359088015260809687019690910190600101610c79565b6000808335601e19843603018112610cee57600080fd5b830160208101925035905067ffffffffffffffff811115610d0e57600080fd5b606081023603821315610c4057600080fd5b8183526000602080850194508260005b85811015610a17578135610d4381610b56565b610d4c81610992565b875281830135610d5b81610b93565b60ff9081168885015260409083820135610d7481610b93565b16908801526060968701969190910190600101610d30565b6020815260008235601e19843603018112610da657600080fd5b830160208101903567ffffffffffffffff811115610dc357600080fd5b8060061b3603821315610dd557600080fd5b60606020850152610dea608085018284610ba2565b915050610dfa6020850185610bf7565b601f1980868503016040870152610e12848385610c69565b9350610e216040880188610cd7565b935091508086850301606087015250610b11838383610d20565b600181811c90821680610e4f57607f821691505b602082108103610e6f57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b6040516080810167ffffffffffffffff81118282101715610eae57610eae610e75565b60405290565b6040516060810167ffffffffffffffff81118282101715610eae57610eae610e75565b6040805190810167ffffffffffffffff81118282101715610eae57610eae610e75565b604051601f8201601f1916810167ffffffffffffffff81118282101715610f2357610f23610e75565b604052919050565b600067ffffffffffffffff821115610f4557610f45610e75565b5060051b60200190565b600082601f830112610f6057600080fd5b81516020610f75610f7083610f2b565b610efa565b82815260079290921b84018101918181019086841115610f9457600080fd5b8286015b84811015610ff95760808189031215610fb15760008081fd5b610fb9610e8b565b8151610fc481610c47565b81528185015185820152604080830151610fdd81610c54565b9082015260608281015190820152835291830191608001610f98565b509695505050505050565b600082601f83011261101557600080fd5b81516020611025610f7083610f2b565b8281526060928302850182019282820191908785111561104457600080fd5b8387015b858110156110a65781818a0312156110605760008081fd5b611068610eb4565b815161107381610b56565b81528186015161108281610b93565b8187015260408281015161109581610b93565b908201528452928401928101611048565b5090979650505050505050565b600060208083850312156110c657600080fd5b825167ffffffffffffffff808211156110de57600080fd5b90840190606082870312156110f257600080fd5b6110fa610eb4565b82518281111561110957600080fd5b8301601f8101881361111a57600080fd5b8051611128610f7082610f2b565b81815260069190911b8201860190868101908a83111561114757600080fd5b928701925b8284101561119d576040848c0312156111655760008081fd5b61116d610ed7565b845161117881610b56565b81528489015161118781610b93565b818a01528252604093909301929087019061114c565b845250505082840151828111156111b357600080fd5b6111bf88828601610f4f565b858301525060408301519350818411156111d857600080fd5b6111e487858501611004565b60408201529695505050505050565b6000602080838503121561120657600080fd5b825167ffffffffffffffff81111561121d57600080fd5b8301601f8101851361122e57600080fd5b805161123c610f7082610f2b565b81815260059190911b8201830190838101908783111561125b57600080fd5b928401925b8284101561128257835161127381610c54565b82529284019290840190611260565b979650505050505050565b601f8211156112d9576000816000526020600020601f850160051c810160208610156112b65750805b601f850160051c820191505b818110156112d5578281556001016112c2565b5050505b505050565b815167ffffffffffffffff8111156112f8576112f8610e75565b61130c816113068454610e3b565b8461128d565b602080601f83116001811461134157600084156113295750858301515b600019600386901b1c1916600185901b1785556112d5565b600085815260208120601f198616915b8281101561137057888601518255948401946001909101908401611351565b508582101561138e5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052603260045260246000fd5b60006040820184835260206040602085015281855180845260608601915060208701935060005b818110156110a65784516001600160a01b0316835293830193918301916001016113db565b60006001820161142057634e487b7160e01b600052601160045260246000fd5b5060010190565b60008261144457634e487b7160e01b600052601260045260246000fd5b500490565b6020810161145683610992565b91905290565b60006020808352835180602085015260005b8181101561148a5785810183015185820160400152820161146e565b506000604082860101526040601f19601f830116850101925050509291505056fe133f5e83927ae0f4eccaf443b57ee2634efab46c5ecb3a58ec4bb3201dd55ef6",
}

// MockEntitlementGatedABI is the input ABI used to generate the binding from.
// Deprecated: Use MockEntitlementGatedMetaData.ABI instead.
var MockEntitlementGatedABI = MockEntitlementGatedMetaData.ABI

// MockEntitlementGatedBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockEntitlementGatedMetaData.Bin instead.
var MockEntitlementGatedBin = MockEntitlementGatedMetaData.Bin

// DeployMockEntitlementGated deploys a new Ethereum contract, binding an instance of MockEntitlementGated to it.
func DeployMockEntitlementGated(auth *bind.TransactOpts, backend bind.ContractBackend, checker common.Address) (common.Address, *types.Transaction, *MockEntitlementGated, error) {
	parsed, err := MockEntitlementGatedMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockEntitlementGatedBin), backend, checker)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockEntitlementGated{MockEntitlementGatedCaller: MockEntitlementGatedCaller{contract: contract}, MockEntitlementGatedTransactor: MockEntitlementGatedTransactor{contract: contract}, MockEntitlementGatedFilterer: MockEntitlementGatedFilterer{contract: contract}}, nil
}

// MockEntitlementGated is an auto generated Go binding around an Ethereum contract.
type MockEntitlementGated struct {
	MockEntitlementGatedCaller	// Read-only binding to the contract
	MockEntitlementGatedTransactor	// Write-only binding to the contract
	MockEntitlementGatedFilterer	// Log filterer for contract events
}

// MockEntitlementGatedCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockEntitlementGatedCaller struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockEntitlementGatedTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockEntitlementGatedTransactor struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockEntitlementGatedFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockEntitlementGatedFilterer struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockEntitlementGatedSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockEntitlementGatedSession struct {
	Contract	*MockEntitlementGated	// Generic contract binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// MockEntitlementGatedCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockEntitlementGatedCallerSession struct {
	Contract	*MockEntitlementGatedCaller	// Generic contract caller binding to set the session for
	CallOpts	bind.CallOpts			// Call options to use throughout this session
}

// MockEntitlementGatedTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockEntitlementGatedTransactorSession struct {
	Contract	*MockEntitlementGatedTransactor	// Generic contract transactor binding to set the session for
	TransactOpts	bind.TransactOpts		// Transaction auth options to use throughout this session
}

// MockEntitlementGatedRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockEntitlementGatedRaw struct {
	Contract *MockEntitlementGated	// Generic contract binding to access the raw methods on
}

// MockEntitlementGatedCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockEntitlementGatedCallerRaw struct {
	Contract *MockEntitlementGatedCaller	// Generic read-only contract binding to access the raw methods on
}

// MockEntitlementGatedTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockEntitlementGatedTransactorRaw struct {
	Contract *MockEntitlementGatedTransactor	// Generic write-only contract binding to access the raw methods on
}

// NewMockEntitlementGated creates a new instance of MockEntitlementGated, bound to a specific deployed contract.
func NewMockEntitlementGated(address common.Address, backend bind.ContractBackend) (*MockEntitlementGated, error) {
	contract, err := bindMockEntitlementGated(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGated{MockEntitlementGatedCaller: MockEntitlementGatedCaller{contract: contract}, MockEntitlementGatedTransactor: MockEntitlementGatedTransactor{contract: contract}, MockEntitlementGatedFilterer: MockEntitlementGatedFilterer{contract: contract}}, nil
}

// NewMockEntitlementGatedCaller creates a new read-only instance of MockEntitlementGated, bound to a specific deployed contract.
func NewMockEntitlementGatedCaller(address common.Address, caller bind.ContractCaller) (*MockEntitlementGatedCaller, error) {
	contract, err := bindMockEntitlementGated(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGatedCaller{contract: contract}, nil
}

// NewMockEntitlementGatedTransactor creates a new write-only instance of MockEntitlementGated, bound to a specific deployed contract.
func NewMockEntitlementGatedTransactor(address common.Address, transactor bind.ContractTransactor) (*MockEntitlementGatedTransactor, error) {
	contract, err := bindMockEntitlementGated(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGatedTransactor{contract: contract}, nil
}

// NewMockEntitlementGatedFilterer creates a new log filterer instance of MockEntitlementGated, bound to a specific deployed contract.
func NewMockEntitlementGatedFilterer(address common.Address, filterer bind.ContractFilterer) (*MockEntitlementGatedFilterer, error) {
	contract, err := bindMockEntitlementGated(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGatedFilterer{contract: contract}, nil
}

// bindMockEntitlementGated binds a generic wrapper to an already deployed contract.
func bindMockEntitlementGated(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockEntitlementGatedMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockEntitlementGated *MockEntitlementGatedRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockEntitlementGated.Contract.MockEntitlementGatedCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockEntitlementGated *MockEntitlementGatedRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.MockEntitlementGatedTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockEntitlementGated *MockEntitlementGatedRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.MockEntitlementGatedTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockEntitlementGated *MockEntitlementGatedCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockEntitlementGated.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockEntitlementGated *MockEntitlementGatedTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockEntitlementGated *MockEntitlementGatedTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.contract.Transact(opts, method, params...)
}

// GetRuleData is a free data retrieval call binding the contract method 0x8a59b1b4.
//
// Solidity: function getRuleData(bytes32 transactionId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCaller) GetRuleData(opts *bind.CallOpts, transactionId [32]byte) (IRuleEntitlementRuleData, error) {
	var out []interface{}
	err := _MockEntitlementGated.contract.Call(opts, &out, "getRuleData", transactionId)

	if err != nil {
		return *new(IRuleEntitlementRuleData), err
	}

	out0 := *abi.ConvertType(out[0], new(IRuleEntitlementRuleData)).(*IRuleEntitlementRuleData)

	return out0, err

}

// GetRuleData is a free data retrieval call binding the contract method 0x8a59b1b4.
//
// Solidity: function getRuleData(bytes32 transactionId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedSession) GetRuleData(transactionId [32]byte) (IRuleEntitlementRuleData, error) {
	return _MockEntitlementGated.Contract.GetRuleData(&_MockEntitlementGated.CallOpts, transactionId)
}

// GetRuleData is a free data retrieval call binding the contract method 0x8a59b1b4.
//
// Solidity: function getRuleData(bytes32 transactionId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCallerSession) GetRuleData(transactionId [32]byte) (IRuleEntitlementRuleData, error) {
	return _MockEntitlementGated.Contract.GetRuleData(&_MockEntitlementGated.CallOpts, transactionId)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactor) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "postEntitlementCheckResult", transactionId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns()
func (_MockEntitlementGated *MockEntitlementGatedSession) PostEntitlementCheckResult(transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.PostEntitlementCheckResult(&_MockEntitlementGated.TransactOpts, transactionId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0xf4efb0bb.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint8 result) returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) PostEntitlementCheckResult(transactionId [32]byte, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.PostEntitlementCheckResult(&_MockEntitlementGated.TransactOpts, transactionId, result)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xefa8db23.
//
// Solidity: function requestEntitlementCheck(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) RequestEntitlementCheck(opts *bind.TransactOpts, ruleData IRuleEntitlementRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "requestEntitlementCheck", ruleData)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xefa8db23.
//
// Solidity: function requestEntitlementCheck(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) RequestEntitlementCheck(ruleData IRuleEntitlementRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheck(&_MockEntitlementGated.TransactOpts, ruleData)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0xefa8db23.
//
// Solidity: function requestEntitlementCheck(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) RequestEntitlementCheck(ruleData IRuleEntitlementRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheck(&_MockEntitlementGated.TransactOpts, ruleData)
}

// MockEntitlementGatedEntitlementCheckResultPostedIterator is returned from FilterEntitlementCheckResultPosted and is used to iterate over the raw logs and unpacked data for EntitlementCheckResultPosted events raised by the MockEntitlementGated contract.
type MockEntitlementGatedEntitlementCheckResultPostedIterator struct {
	Event	*MockEntitlementGatedEntitlementCheckResultPosted	// Event containing the contract specifics and raw log

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
func (it *MockEntitlementGatedEntitlementCheckResultPostedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementGatedEntitlementCheckResultPosted)
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
		it.Event = new(MockEntitlementGatedEntitlementCheckResultPosted)
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
func (it *MockEntitlementGatedEntitlementCheckResultPostedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementGatedEntitlementCheckResultPostedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementGatedEntitlementCheckResultPosted represents a EntitlementCheckResultPosted event raised by the MockEntitlementGated contract.
type MockEntitlementGatedEntitlementCheckResultPosted struct {
	TransactionId	[32]byte
	Result		uint8
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterEntitlementCheckResultPosted is a free log retrieval operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) FilterEntitlementCheckResultPosted(opts *bind.FilterOpts, transactionId [][32]byte) (*MockEntitlementGatedEntitlementCheckResultPostedIterator, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _MockEntitlementGated.contract.FilterLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGatedEntitlementCheckResultPostedIterator{contract: _MockEntitlementGated.contract, event: "EntitlementCheckResultPosted", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckResultPosted is a free log subscription operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *MockEntitlementGatedEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _MockEntitlementGated.contract.WatchLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementGatedEntitlementCheckResultPosted)
				if err := _MockEntitlementGated.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
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
func (_MockEntitlementGated *MockEntitlementGatedFilterer) ParseEntitlementCheckResultPosted(log types.Log) (*MockEntitlementGatedEntitlementCheckResultPosted, error) {
	event := new(MockEntitlementGatedEntitlementCheckResultPosted)
	if err := _MockEntitlementGated.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
