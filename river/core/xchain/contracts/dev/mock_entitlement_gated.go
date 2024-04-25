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
	ABI:	"[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"checker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__EntitlementGated_init\",\"inputs\":[{\"name\":\"entitlementChecker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheck\",\"inputs\":[{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlement.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlement.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlement.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]}]",
	Bin:	"0x608060405234801561001057600080fd5b50604051620017c8380380620017c88339810160408190526100319161011f565b610039610079565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0080546001600160a01b0319166001600160a01b0383161790555061014f565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156100c5576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101561011c57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b60006020828403121561013157600080fd5b81516001600160a01b038116811461014857600080fd5b9392505050565b611669806200015f6000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80637adc9cbe146100515780638a59b1b414610066578063efa8db231461008f578063f4efb0bb146100b0575b600080fd5b61006461005f366004610af3565b6100c3565b005b610079610074366004610b10565b610119565b6040516100869190610c25565b60405180910390f35b6100a261009d366004610cc8565b61014c565b604051908152602001610086565b6100646100be366004610d10565b6101c0565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661010d57604051630ef4733760e31b815260040160405180910390fd5b610116816101ce565b50565b61013d60405180606001604052806060815260200160608152602001606081525090565b61014682610209565b92915050565b600080826040516020016101609190610f24565b60408051601f19818403018152908290526bffffffffffffffffffffffff193260601b16602083015243603483015291506000906054016040516020818303038152906040528051906020012090506101b98183610328565b9392505050565b6101ca828261056a565b5050565b6101de632447b68b60e21b610845565b60008051602061162983398151915280546001600160a01b0319166001600160a01b03831617905550565b61022d60405180606001604052806060815260200160608152602001606081525090565b60008281526000805160206116498339815191526020526040812080546000805160206116298339815191529260ff9091161515900361028057604051637ad5a43960e11b815260040160405180910390fd5b80600201805461028f90610fd3565b80601f01602080910402602001604051908101604052809291908181526020018280546102bb90610fd3565b80156103085780601f106102dd57610100808354040283529160200191610308565b820191906000526020600020905b8154815290600101906020018083116102eb57829003601f168201915b5050505050806020019051810190610320919061124b565b949350505050565b6000828152600080516020611649833981519152602052604090208054600080516020611629833981519152919060ff16151560010361037b5760405163bf2a062560e01b815260040160405180910390fd5b81546001600160a01b031661039257610392610923565b8154604051634f84544560e01b8152600560048201526000916001600160a01b031690634f84544590602401600060405180830381865afa1580156103db573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052610403919081019061138b565b825433610100026001600160a81b03199091161760011761ffff60a81b191683559050600282016104348582611476565b5060005b81518110156104fd5782600101604051806040016040528084848151811061046257610462611536565b60200260200101516001600160a01b031681526020016000600281111561048b5761048b610b29565b9052815460018101835560009283526020928390208251910180546001600160a01b031981166001600160a01b03909316928317825593830151929390929183916001600160a81b03191617600160a01b8360028111156104ee576104ee610b29565b02179055505050600101610438565b508254604051636ef10e6960e11b81526001600160a01b039091169063dde21cd2906105319033908990869060040161154c565b600060405180830381600087803b15801561054b57600080fd5b505af115801561055f573d6000803e3d6000fd5b505050505050505050565b60008281526000805160206116498339815191526020526040812080546000805160206116298339815191529260ff909116151590036105bd57604051637ad5a43960e11b815260040160405180910390fd5b6000805b600183015481101561067e5760008360010182815481106105e4576105e4611536565b60009182526020909120018054909150336001600160a01b03909116036106755760008154600160a01b900460ff16600281111561062457610624610b29565b14610642576040516347592a4d60e01b815260040160405180910390fd5b8054600193508690829060ff60a01b1916600160a01b83600281111561066a5761066a610b29565b02179055505061067e565b506001016105c1565b508015156000036106a257604051638223a7e960e01b815260040160405180910390fd5b60008060005b60018501548110156107495760008560010182815481106106cb576106cb611536565b6000918252602090912001905060018154600160a01b900460ff1660028111156106f7576106f7610b29565b0361070e5783610706816115af565b945050610740565b60028154600160a01b900460ff16600281111561072d5761072d610b29565b03610740578261073c816115af565b9350505b506001016106a8565b508354600160b01b900460ff1661083c57600184015461076b906002906115d6565b8211156107ce57835461ffff60a81b191661010160a81b17845560405187907fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633906107b8906001906115f8565b60405180910390a26107c9876109f4565b61083c565b60018401546107df906002906115d6565b81111561083c57835461ffff60a81b1916608160a91b17845560405187907fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c6339061082b906002906115f8565b60405180910390a261083c876109f4565b50505050505050565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff1615156001146108d2576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff191660011790556108eb565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b6000600080516020611629833981519152905060007fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb60060060154604051628956cd60e71b81526c29b830b1b2a7b832b930ba37b960991b60048201526001600160a01b03909116906344ab668090602401602060405180830381865afa1580156109b1573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109d5919061160b565b82546001600160a01b0319166001600160a01b03919091161790915550565b60008181526000805160206116498339815191526020526040812080546001600160b81b031916815560008051602061162983398151915291610a3a6001830182610a4e565b610a48600283016000610a6c565b50505050565b50805460008255906000526020600020908101906101169190610aa6565b508054610a7890610fd3565b6000825580601f10610a88575050565b601f0160209004906000526020600020908101906101169190610ac9565b5b80821115610ac55780546001600160a81b0319168155600101610aa7565b5090565b5b80821115610ac55760008155600101610aca565b6001600160a01b038116811461011657600080fd5b600060208284031215610b0557600080fd5b81356101b981610ade565b600060208284031215610b2257600080fd5b5035919050565b634e487b7160e01b600052602160045260246000fd5b6003811061011657610116610b29565b60068110610b5f57610b5f610b29565b9052565b60008151808452602080850194506020840160005b83811015610bc4578151610b8d888251610b4f565b80840151888501526040808201516001600160a01b0316908901526060908101519088015260809096019590820190600101610b78565b509495945050505050565b60008151808452602080850194506020840160005b83811015610bc45781518051610bf981610b3f565b88528084015160ff908116858a0152604091820151169088015260609096019590820190600101610be4565b6020808252825160608383015280516080840181905260009291820190839060a08601905b80831015610c815783518051610c5f81610b3f565b835285015160ff16858301529284019260019290920191604090910190610c4a565b50838701519350601f19925082868203016040870152610ca18185610b63565b93505050604085015181858403016060860152610cbe8382610bcf565b9695505050505050565b600060208284031215610cda57600080fd5b813567ffffffffffffffff811115610cf157600080fd5b8201606081850312156101b957600080fd5b6003811061011657600080fd5b60008060408385031215610d2357600080fd5b823591506020830135610d3581610d03565b809150509250929050565b60ff8116811461011657600080fd5b8183526000602080850194508260005b85811015610bc4578135610d7281610d03565b610d7b81610b3f565b875281830135610d8a81610d40565b60ff16878401526040968701969190910190600101610d5f565b6000808335601e19843603018112610dbb57600080fd5b830160208101925035905067ffffffffffffffff811115610ddb57600080fd5b8060071b3603821315610ded57600080fd5b9250929050565b6006811061011657600080fd5b8183526000602080850194508260005b85811015610bc4578135610e2481610df4565b610e2e8882610b4f565b508282013583880152604080830135610e4681610ade565b6001600160a01b0316908801526060828101359088015260809687019690910190600101610e11565b6000808335601e19843603018112610e8657600080fd5b830160208101925035905067ffffffffffffffff811115610ea657600080fd5b606081023603821315610ded57600080fd5b8183526000602080850194508260005b85811015610bc4578135610edb81610d03565b610ee481610b3f565b875281830135610ef381610d40565b60ff9081168885015260409083820135610f0c81610d40565b16908801526060968701969190910190600101610ec8565b6020815260008235601e19843603018112610f3e57600080fd5b830160208101903567ffffffffffffffff811115610f5b57600080fd5b8060061b3603821315610f6d57600080fd5b60606020850152610f82608085018284610d4f565b915050610f926020850185610da4565b601f1980868503016040870152610faa848385610e01565b9350610fb96040880188610e6f565b935091508086850301606087015250610cbe838383610eb8565b600181811c90821680610fe757607f821691505b60208210810361100757634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b6040516080810167ffffffffffffffff811182821017156110465761104661100d565b60405290565b6040516060810167ffffffffffffffff811182821017156110465761104661100d565b6040805190810167ffffffffffffffff811182821017156110465761104661100d565b604051601f8201601f1916810167ffffffffffffffff811182821017156110bb576110bb61100d565b604052919050565b600067ffffffffffffffff8211156110dd576110dd61100d565b5060051b60200190565b600082601f8301126110f857600080fd5b8151602061110d611108836110c3565b611092565b82815260079290921b8401810191818101908684111561112c57600080fd5b8286015b8481101561119157608081890312156111495760008081fd5b611151611023565b815161115c81610df4565b8152818501518582015260408083015161117581610ade565b9082015260608281015190820152835291830191608001611130565b509695505050505050565b600082601f8301126111ad57600080fd5b815160206111bd611108836110c3565b828152606092830285018201928282019190878511156111dc57600080fd5b8387015b8581101561123e5781818a0312156111f85760008081fd5b61120061104c565b815161120b81610d03565b81528186015161121a81610d40565b8187015260408281015161122d81610d40565b9082015284529284019281016111e0565b5090979650505050505050565b6000602080838503121561125e57600080fd5b825167ffffffffffffffff8082111561127657600080fd5b908401906060828703121561128a57600080fd5b61129261104c565b8251828111156112a157600080fd5b8301601f810188136112b257600080fd5b80516112c0611108826110c3565b81815260069190911b8201860190868101908a8311156112df57600080fd5b928701925b82841015611335576040848c0312156112fd5760008081fd5b61130561106f565b845161131081610d03565b81528489015161131f81610d40565b818a0152825260409390930192908701906112e4565b8452505050828401518281111561134b57600080fd5b611357888286016110e7565b8583015250604083015193508184111561137057600080fd5b61137c8785850161119c565b60408201529695505050505050565b6000602080838503121561139e57600080fd5b825167ffffffffffffffff8111156113b557600080fd5b8301601f810185136113c657600080fd5b80516113d4611108826110c3565b81815260059190911b820183019083810190878311156113f357600080fd5b928401925b8284101561141a57835161140b81610ade565b825292840192908401906113f8565b979650505050505050565b601f821115611471576000816000526020600020601f850160051c8101602086101561144e5750805b601f850160051c820191505b8181101561146d5782815560010161145a565b5050505b505050565b815167ffffffffffffffff8111156114905761149061100d565b6114a48161149e8454610fd3565b84611425565b602080601f8311600181146114d957600084156114c15750858301515b600019600386901b1c1916600185901b17855561146d565b600085815260208120601f198616915b82811015611508578886015182559484019460019091019084016114e9565b50858210156115265787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052603260045260246000fd5b6001600160a01b038481168252602080830185905260606040840181905284519084018190526000928583019290916080860190855b818110156115a0578551851683529483019491830191600101611582565b50909998505050505050505050565b6000600182016115cf57634e487b7160e01b600052601160045260246000fd5b5060010190565b6000826115f357634e487b7160e01b600052601260045260246000fd5b500490565b6020810161160583610b3f565b91905290565b60006020828403121561161d57600080fd5b81516101b981610ade56fe9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e009075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e01",
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

// EntitlementGatedInit is a paid mutator transaction binding the contract method 0x7adc9cbe.
//
// Solidity: function __EntitlementGated_init(address entitlementChecker) returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactor) EntitlementGatedInit(opts *bind.TransactOpts, entitlementChecker common.Address) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "__EntitlementGated_init", entitlementChecker)
}

// EntitlementGatedInit is a paid mutator transaction binding the contract method 0x7adc9cbe.
//
// Solidity: function __EntitlementGated_init(address entitlementChecker) returns()
func (_MockEntitlementGated *MockEntitlementGatedSession) EntitlementGatedInit(entitlementChecker common.Address) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.EntitlementGatedInit(&_MockEntitlementGated.TransactOpts, entitlementChecker)
}

// EntitlementGatedInit is a paid mutator transaction binding the contract method 0x7adc9cbe.
//
// Solidity: function __EntitlementGated_init(address entitlementChecker) returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) EntitlementGatedInit(entitlementChecker common.Address) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.EntitlementGatedInit(&_MockEntitlementGated.TransactOpts, entitlementChecker)
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

// MockEntitlementGatedInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the MockEntitlementGated contract.
type MockEntitlementGatedInitializedIterator struct {
	Event	*MockEntitlementGatedInitialized	// Event containing the contract specifics and raw log

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
func (it *MockEntitlementGatedInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementGatedInitialized)
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
		it.Event = new(MockEntitlementGatedInitialized)
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
func (it *MockEntitlementGatedInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementGatedInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementGatedInitialized represents a Initialized event raised by the MockEntitlementGated contract.
type MockEntitlementGatedInitialized struct {
	Version	uint32
	Raw	types.Log	// Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) FilterInitialized(opts *bind.FilterOpts) (*MockEntitlementGatedInitializedIterator, error) {

	logs, sub, err := _MockEntitlementGated.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGatedInitializedIterator{contract: _MockEntitlementGated.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *MockEntitlementGatedInitialized) (event.Subscription, error) {

	logs, sub, err := _MockEntitlementGated.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementGatedInitialized)
				if err := _MockEntitlementGated.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_MockEntitlementGated *MockEntitlementGatedFilterer) ParseInitialized(log types.Log) (*MockEntitlementGatedInitialized, error) {
	event := new(MockEntitlementGatedInitialized)
	if err := _MockEntitlementGated.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementGatedInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the MockEntitlementGated contract.
type MockEntitlementGatedInterfaceAddedIterator struct {
	Event	*MockEntitlementGatedInterfaceAdded	// Event containing the contract specifics and raw log

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
func (it *MockEntitlementGatedInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementGatedInterfaceAdded)
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
		it.Event = new(MockEntitlementGatedInterfaceAdded)
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
func (it *MockEntitlementGatedInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementGatedInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementGatedInterfaceAdded represents a InterfaceAdded event raised by the MockEntitlementGated contract.
type MockEntitlementGatedInterfaceAdded struct {
	InterfaceId	[4]byte
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockEntitlementGatedInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementGated.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGatedInterfaceAddedIterator{contract: _MockEntitlementGated.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *MockEntitlementGatedInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementGated.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementGatedInterfaceAdded)
				if err := _MockEntitlementGated.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_MockEntitlementGated *MockEntitlementGatedFilterer) ParseInterfaceAdded(log types.Log) (*MockEntitlementGatedInterfaceAdded, error) {
	event := new(MockEntitlementGatedInterfaceAdded)
	if err := _MockEntitlementGated.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementGatedInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the MockEntitlementGated contract.
type MockEntitlementGatedInterfaceRemovedIterator struct {
	Event	*MockEntitlementGatedInterfaceRemoved	// Event containing the contract specifics and raw log

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
func (it *MockEntitlementGatedInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementGatedInterfaceRemoved)
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
		it.Event = new(MockEntitlementGatedInterfaceRemoved)
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
func (it *MockEntitlementGatedInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementGatedInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementGatedInterfaceRemoved represents a InterfaceRemoved event raised by the MockEntitlementGated contract.
type MockEntitlementGatedInterfaceRemoved struct {
	InterfaceId	[4]byte
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockEntitlementGatedInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementGated.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementGatedInterfaceRemovedIterator{contract: _MockEntitlementGated.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockEntitlementGated *MockEntitlementGatedFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *MockEntitlementGatedInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementGated.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementGatedInterfaceRemoved)
				if err := _MockEntitlementGated.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_MockEntitlementGated *MockEntitlementGatedFilterer) ParseInterfaceRemoved(log types.Log) (*MockEntitlementGatedInterfaceRemoved, error) {
	event := new(MockEntitlementGatedInterfaceRemoved)
	if err := _MockEntitlementGated.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
