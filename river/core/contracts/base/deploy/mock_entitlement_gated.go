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

// IRuleEntitlementBaseCheckOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseCheckOperation struct {
	OpType          uint8
	ChainId         *big.Int
	ContractAddress common.Address
	Threshold       *big.Int
}

// IRuleEntitlementBaseCheckOperationV2 is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseCheckOperationV2 struct {
	OpType          uint8
	ChainId         *big.Int
	ContractAddress common.Address
	Params          []byte
}

// IRuleEntitlementBaseLogicalOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseLogicalOperation struct {
	LogOpType           uint8
	LeftOperationIndex  uint8
	RightOperationIndex uint8
}

// IRuleEntitlementBaseOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseOperation struct {
	OpType uint8
	Index  uint8
}

// IRuleEntitlementBaseRuleData is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseRuleData struct {
	Operations        []IRuleEntitlementBaseOperation
	CheckOperations   []IRuleEntitlementBaseCheckOperation
	LogicalOperations []IRuleEntitlementBaseLogicalOperation
}

// IRuleEntitlementBaseRuleDataV2 is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementBaseRuleDataV2 struct {
	Operations        []IRuleEntitlementBaseOperation
	CheckOperations   []IRuleEntitlementBaseCheckOperationV2
	LogicalOperations []IRuleEntitlementBaseLogicalOperation
}

// MockEntitlementGatedMetaData contains all meta data concerning the MockEntitlementGated contract.
var MockEntitlementGatedMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"checker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__EntitlementGated_init\",\"inputs\":[{\"name\":\"entitlementChecker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleDataV2\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheck\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV2\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ReentrancyGuard__ReentrantCall\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b506040516200239938038062002399833981016040819052620000349162000127565b6200003e6200007f565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0080546001600160a01b0319166001600160a01b0383161790555062000159565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff1615620000cc576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156200012457805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6000602082840312156200013a57600080fd5b81516001600160a01b03811681146200015257600080fd5b9392505050565b61223080620001696000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c806368ab7dd61161005b57806368ab7dd6146100e15780637adc9cbe1461010157806392c399ff14610114578063ea7aafb71461012757600080fd5b8063069a3ee9146100825780634739e805146100ab57806357e70027146100c0575b600080fd5b610095610090366004611121565b61013a565b6040516100a2919061121d565b60405180910390f35b6100be6100b93660046112e7565b61036d565b005b6100d36100ce366004611338565b610411565b6040519081526020016100a2565b6100f46100ef366004611121565b61047e565b6040516100a2919061137e565b6100be61010f36600461149f565b61072b565b6100956101223660046114bc565b610781565b6100d3610135366004611338565b6107af565b61015e60405180606001604052806060815260200160608152602001606081525090565b6000828152602081815260408083208151815460809481028201850190935260608101838152909491938593919285929185015b828210156101fb57600084815260209020604080518082019091529083018054829060ff1660028111156101c8576101c861113a565b60028111156101d9576101d961113a565b81529054610100900460ff166020918201529082526001929092019101610192565b50505050815260200160018201805480602002602001604051908101604052809291908181526020016000905b828210156102b3576000848152602090206040805160808101909152600484029091018054829060ff1660068111156102635761026361113a565b60068111156102745761027461113a565b815260018281015460208084019190915260028401546001600160a01b0316604084015260039093015460609092019190915291835292019101610228565b50505050815260200160028201805480602002602001604051908101604052809291908181526020016000905b8282101561035f5760008481526020902060408051606081019091529083018054829060ff1660028111156103175761031761113a565b60028111156103285761032861113a565b8152905460ff61010082048116602080850191909152620100009092041660409092019190915290825260019290920191016102e0565b505050915250909392505050565b60027f54f22f54f370bd020e00ee80e1a5099a71652e2ccbcf6a75281e4c70a3e11a0054036103af57604051635db5c7cd60e11b815260040160405180910390fd5b6103d860027f54f22f54f370bd020e00ee80e1a5099a71652e2ccbcf6a75281e4c70a3e11a0055565b6103e38383836107c9565b61040c60017f54f22f54f370bd020e00ee80e1a5099a71652e2ccbcf6a75281e4c70a3e11a0055565b505050565b6000828152602081905260408120829061042b8282611889565b50506040516bffffffffffffffffffffffff193260601b166020820152436034820152600090605401604051602081830303815290604052805190602001209050610477813086610a3f565b9392505050565b6104a260405180606001604052806060815260200160608152602001606081525090565b60008281526001602090815260408083208151815460809481028201850190935260608101838152909491938593919285929185015b8282101561054157600084815260209020604080518082019091529083018054829060ff16600281111561050e5761050e61113a565b600281111561051f5761051f61113a565b81529054610100900460ff1660209182015290825260019290920191016104d8565b50505050815260200160018201805480602002602001604051908101604052809291908181526020016000905b8282101561067f576000848152602090206040805160808101909152600484029091018054829060ff1660068111156105a9576105a961113a565b60068111156105ba576105ba61113a565b81526001820154602082015260028201546001600160a01b031660408201526003820180546060909201916105ee90611952565b80601f016020809104026020016040519081016040528092919081815260200182805461061a90611952565b80156106675780601f1061063c57610100808354040283529160200191610667565b820191906000526020600020905b81548152906001019060200180831161064a57829003601f168201915b5050505050815250508152602001906001019061056e565b50505050815260200160028201805480602002602001604051908101604052809291908181526020016000905b8282101561035f5760008481526020902060408051606081019091529083018054829060ff1660028111156106e3576106e361113a565b60028111156106f4576106f461113a565b8152905460ff61010082048116602080850191909152620100009092041660409092019190915290825260019290920191016106ac565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661077557604051630ef4733760e31b815260040160405180910390fd5b61077e81610cfd565b50565b6107a560405180606001604052806060815260200160608152602001606081525090565b6104778383610d38565b6000828152600160205260408120829061042b8282611c7c565b60008381526000805160206122108339815191526020526040902080546000805160206121f0833981519152919061010090046001600160a01b031615806108135750805460ff16155b1561083157604051637ad5a43960e11b815260040160405180910390fd5b600084815260028201602052604090205460ff161561086357604051637912b73960e01b815260040160405180910390fd5b60008481526001820160205260408120805482918291825b8181101561097d57600083828154811061089757610897611d22565b60009182526020909120018054909150336001600160a01b03909116036109235760008154600160a01b900460ff1660028111156108d7576108d761113a565b146108f5576040516347592a4d60e01b815260040160405180910390fd5b80548a90829060ff60a01b1916600160a01b8360028111156109195761091961113a565b0217905550600196505b8054600160a01b900460ff1660018160028111156109435761094361113a565b0361095357866001019650610973565b60028160028111156109675761096761113a565b03610973578560010195505b505060010161087b565b508461099c57604051638223a7e960e01b815260040160405180910390fd5b6109a7600282611d38565b8411806109bd57506109ba600282611d38565b83115b15610a335760008981526002870160205260408120805460ff191660011790558385116109eb5760026109ee565b60015b90508a7fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c63382604051610a209190611d5a565b60405180910390a2610a318b610e2d565b505b50505050505050505050565b60008381526000805160206122108339815191526020526040902080546000805160206121f0833981519152919060ff1615610acf57600481015460005b81811015610acc5784836004018281548110610a9b57610a9b611d22565b906000526020600020015403610ac4576040516301ab53df60e31b815260040160405180910390fd5b600101610a7d565b50505b81546001600160a01b0316610ae657610ae6610f03565b8154604051634f84544560e01b8152600560048201526000916001600160a01b031690634f84544590602401600060405180830381865afa158015610b2f573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052610b579190810190611e2c565b825490915060ff16610b985781546003830180546001600160a01b0319166001600160a01b0388161790556001600160a81b03191661010033021760011782555b600482018054600181810183556000928352602080842090920187905583518784529085019091526040822090915b82811015610c8b57816040518060400160405280868481518110610bed57610bed611d22565b60200260200101516001600160a01b0316815260200160006002811115610c1657610c1661113a565b9052815460018101835560009283526020928390208251910180546001600160a01b031981166001600160a01b03909316928317825593830151929390929183916001600160a81b03191617600160a01b836002811115610c7957610c7961113a565b02179055505050806001019050610bc7565b50845460405163541da4e560e01b81526001600160a01b039091169063541da4e590610cc19033908c908b908990600401611eca565b600060405180830381600087803b158015610cdb57600080fd5b505af1158015610cef573d6000803e3d6000fd5b505050505050505050505050565b610d0d636afd38fd60e11b610fd4565b6000805160206121f083398151915280546001600160a01b0319166001600160a01b03831617905550565b610d5c60405180606001604052806060815260200160608152602001606081525090565b60008381526000805160206122108339815191526020526040902080546000805160206121f0833981519152919060ff16610daa57604051637ad5a43960e11b815260040160405180910390fd5b600381015460405163069a3ee960e01b8152600481018690526001600160a01b0390911690819063069a3ee990602401600060405180830381865afa158015610df7573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052610e1f9190810190612093565b9695505050505050565b5050565b60008181526000805160206122108339815191526020526040812060048101546000805160206121f0833981519152925b81811015610eae57826001016000846004018381548110610e8157610e81611d22565b906000526020600020015481526020019081526020016000206000610ea691906110ad565b600101610e5e565b50610ebd6004830160006110cb565b6000848152600184016020526040812080546001600160a81b03191681556003810180546001600160a01b031916905590610efb60048301826110cb565b505050505050565b60006000805160206121f0833981519152905060007fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb60060060154604051628956cd60e71b81526c29b830b1b2a7b832b930ba37b960991b60048201526001600160a01b03909116906344ab668090602401602060405180830381865afa158015610f91573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610fb591906121d2565b82546001600160a01b0319166001600160a01b03919091161790915550565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff1661105c576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055611075565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b508054600082559060005260206000209081019061077e91906110e9565b508054600082559060005260206000209081019061077e919061110c565b5b808211156111085780546001600160a81b03191681556001016110ea565b5090565b5b80821115611108576000815560010161110d565b60006020828403121561113357600080fd5b5035919050565b634e487b7160e01b600052602160045260246000fd5b6003811061077e5761077e61113a565b60008151808452602080850194506020840160005b838110156111a8578151805161118a81611150565b885283015160ff168388015260409096019590820190600101611175565b509495945050505050565b600781106111c3576111c361113a565b9052565b60008151808452602080850194506020840160005b838110156111a857815180516111f181611150565b88528084015160ff908116858a01526040918201511690880152606090960195908201906001016111dc565b60006020808352608084516060808487015261123c6080870183611160565b915083870151601f196040818986030160408a015284835180875288870191508885019650600094505b808510156112af57865161127b8382516111b3565b808a0151838b0152838101516001600160a01b03168484015286015186830152958801956001949094019390870190611266565b5060408b01519750828a82030160608b01526112cb81896111c7565b9b9a5050505050505050505050565b6003811061077e57600080fd5b6000806000606084860312156112fc57600080fd5b83359250602084013591506040840135611315816112da565b809150509250925092565b60006060828403121561133257600080fd5b50919050565b6000806040838503121561134b57600080fd5b8235915060208301356001600160401b0381111561136857600080fd5b61137485828601611320565b9150509250929050565b60006020808352608084516060808487015261139d6080870183611160565b915083870151601f196040818986030160408a01528483518087528887019150888160051b88010189860195506000805b8381101561145c57868a840301855287516113ea8482516111b3565b808d0151848e0152868101516001600160a01b0316878501528901518984018c905280518c8501819052835b81811015611432578281018f015186820160a001528e01611416565b5060a08186018101859052998e0199968e0196601f909101891690940190930192506001016113ce565b505060408d01519950848c82030160608d0152611479818b6111c7565b9d9c50505050505050505050505050565b6001600160a01b038116811461077e57600080fd5b6000602082840312156114b157600080fd5b81356104778161148a565b600080604083850312156114cf57600080fd5b50508035926020909101359150565b6000808335601e198436030181126114f557600080fd5b8301803591506001600160401b0382111561150f57600080fd5b6020019150600681901b360382131561152757600080fd5b9250929050565b634e487b7160e01b600052604160045260246000fd5b600281901b6001600160fe1b038216821461156f57634e487b7160e01b600052601160045260246000fd5b919050565b60ff8116811461077e57600080fd5b813561158e816112da565b61159781611150565b60ff1982541660ff821681178355505060208201356115b581611574565b815461ff001916600882901b61ff0016178255505050565b6000808335601e198436030181126115e457600080fd5b8301803591506001600160401b038211156115fe57600080fd5b6020019150600781901b360382131561152757600080fd5b6007811061077e57600080fd5b600782106116335761163361113a565b60ff1981541660ff831681178255505050565b80546001600160a01b0319166001600160a01b0392909216919091179055565b813561167181611616565b61167b8183611623565b506020820135600182015560408201356116948161148a565b6116a18160028401611646565b50606082013560038201555050565b600160401b8311156116c4576116c461152e565b805483825580841015611722576116da81611544565b6116e385611544565b6000848152602081209283019291909101905b8282101561171e578082558060018301558060028301558060038301556004820191506116f6565b5050505b5060008181526020812083915b85811015610efb576117418383611666565b608092909201916004919091019060010161172f565b6000808335601e1984360301811261176e57600080fd5b8301803591506001600160401b0382111561178857600080fd5b602001915060608102360382131561152757600080fd5b81356117aa816112da565b6117b381611150565b60ff1982541660ff821681178355505060208201356117d181611574565b815461ff001916600882901b61ff00161782555060408201356117f381611574565b815462ff0000191660109190911b62ff00001617905550565b600160401b8311156118205761182061152e565b805483825580841015611857576000828152602081208581019083015b808210156118535782825560018201915061183d565b5050505b5060008181526020812083915b85811015610efb57611876838361179f565b6060929092019160019182019101611864565b61189382836114de565b600160401b8111156118a7576118a761152e565b8254818455808210156118de576000848152602081208381019083015b808210156118da578282556001820191506118c4565b5050505b5060008381526020902060005b82811015611910576118fd8483611583565b60409390930192600191820191016118eb565b5050505061192160208301836115cd565b61192f8183600186016116b0565b505061193e6040830183611757565b61194c81836002860161180c565b50505050565b600181811c9082168061196657607f821691505b60208210810361133257634e487b7160e01b600052602260045260246000fd5b6000808335601e1984360301811261199d57600080fd5b8301803591506001600160401b038211156119b757600080fd5b6020019150600581901b360382131561152757600080fd5b60008235607e198336030181126119e557600080fd5b9190910192915050565b5b81811015610e2957600081556001016119f0565b601f82111561040c57806000526020600020601f840160051c81016020851015611a2b5750805b611a3d601f850160051c8301826119ef565b5050505050565b8135611a4f81611616565b611a598183611623565b50600160208084013560018401556040840135611a758161148a565b611a828160028601611646565b50600383016060850135601e19863603018112611a9e57600080fd5b850180356001600160401b03811115611ab657600080fd5b8036038483011315611ac757600080fd5b611adb81611ad58554611952565b85611a04565b6000601f821160018114611b115760008315611af957508382018601355b600019600385901b1c1916600184901b178555611b6c565b600085815260209020601f19841690835b82811015611b4157868501890135825593880193908901908801611b22565b5084821015611b605760001960f88660031b161c198885880101351681555b505060018360011b0185555b505050505050505050565b600160401b831115611b8b57611b8b61152e565b805483825580841015611c3e57611ba181611544565b611baa85611544565b6000848152602081209283019291909101905b82821015611c3a578082556001818184015581600284015560038301611be38154611952565b8015611c2c57601f80821160018114611bfe57858455611c29565b600084815260209020611c1a83850160051c82018783016119ef565b50600084815260208120818655555b50505b505050600482019150611bbd565b5050505b5060008181526020812083915b85811015610efb57611c66611c6084876119cf565b83611a44565b6020929092019160049190910190600101611c4b565b611c8682836114de565b600160401b811115611c9a57611c9a61152e565b825481845580821015611cd1576000848152602081208381019083015b80821015611ccd57828255600182019150611cb7565b5050505b5060008381526020902060005b82811015611d0357611cf08483611583565b6040939093019260019182019101611cde565b50505050611d146020830183611986565b61192f818360018601611b77565b634e487b7160e01b600052603260045260246000fd5b600082611d5557634e487b7160e01b600052601260045260246000fd5b500490565b60208101611d6783611150565b91905290565b604051608081016001600160401b0381118282101715611d8f57611d8f61152e565b60405290565b604051606081016001600160401b0381118282101715611d8f57611d8f61152e565b604080519081016001600160401b0381118282101715611d8f57611d8f61152e565b604051601f8201601f191681016001600160401b0381118282101715611e0157611e0161152e565b604052919050565b60006001600160401b03821115611e2257611e2261152e565b5060051b60200190565b60006020808385031215611e3f57600080fd5b82516001600160401b03811115611e5557600080fd5b8301601f81018513611e6657600080fd5b8051611e79611e7482611e09565b611dd9565b81815260059190911b82018301908381019087831115611e9857600080fd5b928401925b82841015611ebf578351611eb08161148a565b82529284019290840190611e9d565b979650505050505050565b60006080820160018060a01b03808816845260208760208601528660408601526080606086015282865180855260a08701915060208801945060005b81811015611f24578551851683529483019491830191600101611f06565b50909a9950505050505050505050565b600082601f830112611f4557600080fd5b81516020611f55611e7483611e09565b82815260079290921b84018101918181019086841115611f7457600080fd5b8286015b84811015611fd95760808189031215611f915760008081fd5b611f99611d6d565b8151611fa481611616565b81528185015185820152604080830151611fbd8161148a565b9082015260608281015190820152835291830191608001611f78565b509695505050505050565b600082601f830112611ff557600080fd5b81516020612005611e7483611e09565b8281526060928302850182019282820191908785111561202457600080fd5b8387015b858110156120865781818a0312156120405760008081fd5b612048611d95565b8151612053816112da565b81528186015161206281611574565b8187015260408281015161207581611574565b908201528452928401928101612028565b5090979650505050505050565b600060208083850312156120a657600080fd5b82516001600160401b03808211156120bd57600080fd5b90840190606082870312156120d157600080fd5b6120d9611d95565b8251828111156120e857600080fd5b8301601f810188136120f957600080fd5b8051612107611e7482611e09565b81815260069190911b8201860190868101908a83111561212657600080fd5b928701925b8284101561217c576040848c0312156121445760008081fd5b61214c611db7565b8451612157816112da565b81528489015161216681611574565b818a01528252604093909301929087019061212b565b8452505050828401518281111561219257600080fd5b61219e88828601611f34565b858301525060408301519350818411156121b757600080fd5b6121c387858501611fe4565b60408201529695505050505050565b6000602082840312156121e457600080fd5b81516104778161148a56fe9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e009075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e01",
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
	MockEntitlementGatedCaller     // Read-only binding to the contract
	MockEntitlementGatedTransactor // Write-only binding to the contract
	MockEntitlementGatedFilterer   // Log filterer for contract events
}

// MockEntitlementGatedCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockEntitlementGatedCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockEntitlementGatedTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockEntitlementGatedTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockEntitlementGatedFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockEntitlementGatedFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockEntitlementGatedSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockEntitlementGatedSession struct {
	Contract     *MockEntitlementGated // Generic contract binding to set the session for
	CallOpts     bind.CallOpts         // Call options to use throughout this session
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// MockEntitlementGatedCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockEntitlementGatedCallerSession struct {
	Contract *MockEntitlementGatedCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts               // Call options to use throughout this session
}

// MockEntitlementGatedTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockEntitlementGatedTransactorSession struct {
	Contract     *MockEntitlementGatedTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts               // Transaction auth options to use throughout this session
}

// MockEntitlementGatedRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockEntitlementGatedRaw struct {
	Contract *MockEntitlementGated // Generic contract binding to access the raw methods on
}

// MockEntitlementGatedCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockEntitlementGatedCallerRaw struct {
	Contract *MockEntitlementGatedCaller // Generic read-only contract binding to access the raw methods on
}

// MockEntitlementGatedTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockEntitlementGatedTransactorRaw struct {
	Contract *MockEntitlementGatedTransactor // Generic write-only contract binding to access the raw methods on
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

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCaller) GetRuleData(opts *bind.CallOpts, roleId *big.Int) (IRuleEntitlementBaseRuleData, error) {
	var out []interface{}
	err := _MockEntitlementGated.contract.Call(opts, &out, "getRuleData", roleId)

	if err != nil {
		return *new(IRuleEntitlementBaseRuleData), err
	}

	out0 := *abi.ConvertType(out[0], new(IRuleEntitlementBaseRuleData)).(*IRuleEntitlementBaseRuleData)

	return out0, err

}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedSession) GetRuleData(roleId *big.Int) (IRuleEntitlementBaseRuleData, error) {
	return _MockEntitlementGated.Contract.GetRuleData(&_MockEntitlementGated.CallOpts, roleId)
}

// GetRuleData is a free data retrieval call binding the contract method 0x069a3ee9.
//
// Solidity: function getRuleData(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCallerSession) GetRuleData(roleId *big.Int) (IRuleEntitlementBaseRuleData, error) {
	return _MockEntitlementGated.Contract.GetRuleData(&_MockEntitlementGated.CallOpts, roleId)
}

// GetRuleData0 is a free data retrieval call binding the contract method 0x92c399ff.
//
// Solidity: function getRuleData(bytes32 transactionId, uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCaller) GetRuleData0(opts *bind.CallOpts, transactionId [32]byte, roleId *big.Int) (IRuleEntitlementBaseRuleData, error) {
	var out []interface{}
	err := _MockEntitlementGated.contract.Call(opts, &out, "getRuleData0", transactionId, roleId)

	if err != nil {
		return *new(IRuleEntitlementBaseRuleData), err
	}

	out0 := *abi.ConvertType(out[0], new(IRuleEntitlementBaseRuleData)).(*IRuleEntitlementBaseRuleData)

	return out0, err

}

// GetRuleData0 is a free data retrieval call binding the contract method 0x92c399ff.
//
// Solidity: function getRuleData(bytes32 transactionId, uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedSession) GetRuleData0(transactionId [32]byte, roleId *big.Int) (IRuleEntitlementBaseRuleData, error) {
	return _MockEntitlementGated.Contract.GetRuleData0(&_MockEntitlementGated.CallOpts, transactionId, roleId)
}

// GetRuleData0 is a free data retrieval call binding the contract method 0x92c399ff.
//
// Solidity: function getRuleData(bytes32 transactionId, uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCallerSession) GetRuleData0(transactionId [32]byte, roleId *big.Int) (IRuleEntitlementBaseRuleData, error) {
	return _MockEntitlementGated.Contract.GetRuleData0(&_MockEntitlementGated.CallOpts, transactionId, roleId)
}

// GetRuleDataV2 is a free data retrieval call binding the contract method 0x68ab7dd6.
//
// Solidity: function getRuleDataV2(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCaller) GetRuleDataV2(opts *bind.CallOpts, roleId *big.Int) (IRuleEntitlementBaseRuleDataV2, error) {
	var out []interface{}
	err := _MockEntitlementGated.contract.Call(opts, &out, "getRuleDataV2", roleId)

	if err != nil {
		return *new(IRuleEntitlementBaseRuleDataV2), err
	}

	out0 := *abi.ConvertType(out[0], new(IRuleEntitlementBaseRuleDataV2)).(*IRuleEntitlementBaseRuleDataV2)

	return out0, err

}

// GetRuleDataV2 is a free data retrieval call binding the contract method 0x68ab7dd6.
//
// Solidity: function getRuleDataV2(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedSession) GetRuleDataV2(roleId *big.Int) (IRuleEntitlementBaseRuleDataV2, error) {
	return _MockEntitlementGated.Contract.GetRuleDataV2(&_MockEntitlementGated.CallOpts, roleId)
}

// GetRuleDataV2 is a free data retrieval call binding the contract method 0x68ab7dd6.
//
// Solidity: function getRuleDataV2(uint256 roleId) view returns(((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]))
func (_MockEntitlementGated *MockEntitlementGatedCallerSession) GetRuleDataV2(roleId *big.Int) (IRuleEntitlementBaseRuleDataV2, error) {
	return _MockEntitlementGated.Contract.GetRuleDataV2(&_MockEntitlementGated.CallOpts, roleId)
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

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0x4739e805.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint256 roleId, uint8 result) returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactor) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, roleId *big.Int, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "postEntitlementCheckResult", transactionId, roleId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0x4739e805.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint256 roleId, uint8 result) returns()
func (_MockEntitlementGated *MockEntitlementGatedSession) PostEntitlementCheckResult(transactionId [32]byte, roleId *big.Int, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.PostEntitlementCheckResult(&_MockEntitlementGated.TransactOpts, transactionId, roleId, result)
}

// PostEntitlementCheckResult is a paid mutator transaction binding the contract method 0x4739e805.
//
// Solidity: function postEntitlementCheckResult(bytes32 transactionId, uint256 roleId, uint8 result) returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) PostEntitlementCheckResult(transactionId [32]byte, roleId *big.Int, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.PostEntitlementCheckResult(&_MockEntitlementGated.TransactOpts, transactionId, roleId, result)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x57e70027.
//
// Solidity: function requestEntitlementCheck(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) RequestEntitlementCheck(opts *bind.TransactOpts, roleId *big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "requestEntitlementCheck", roleId, ruleData)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x57e70027.
//
// Solidity: function requestEntitlementCheck(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) RequestEntitlementCheck(roleId *big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheck(&_MockEntitlementGated.TransactOpts, roleId, ruleData)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x57e70027.
//
// Solidity: function requestEntitlementCheck(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) RequestEntitlementCheck(roleId *big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheck(&_MockEntitlementGated.TransactOpts, roleId, ruleData)
}

// RequestEntitlementCheckV2 is a paid mutator transaction binding the contract method 0xea7aafb7.
//
// Solidity: function requestEntitlementCheckV2(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) RequestEntitlementCheckV2(opts *bind.TransactOpts, roleId *big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "requestEntitlementCheckV2", roleId, ruleData)
}

// RequestEntitlementCheckV2 is a paid mutator transaction binding the contract method 0xea7aafb7.
//
// Solidity: function requestEntitlementCheckV2(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) RequestEntitlementCheckV2(roleId *big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV2(&_MockEntitlementGated.TransactOpts, roleId, ruleData)
}

// RequestEntitlementCheckV2 is a paid mutator transaction binding the contract method 0xea7aafb7.
//
// Solidity: function requestEntitlementCheckV2(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) RequestEntitlementCheckV2(roleId *big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV2(&_MockEntitlementGated.TransactOpts, roleId, ruleData)
}

// MockEntitlementGatedEntitlementCheckResultPostedIterator is returned from FilterEntitlementCheckResultPosted and is used to iterate over the raw logs and unpacked data for EntitlementCheckResultPosted events raised by the MockEntitlementGated contract.
type MockEntitlementGatedEntitlementCheckResultPostedIterator struct {
	Event *MockEntitlementGatedEntitlementCheckResultPosted // Event containing the contract specifics and raw log

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
	TransactionId [32]byte
	Result        uint8
	Raw           types.Log // Blockchain specific contextual infos
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
	Event *MockEntitlementGatedInitialized // Event containing the contract specifics and raw log

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
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
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
	Event *MockEntitlementGatedInterfaceAdded // Event containing the contract specifics and raw log

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
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
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
	Event *MockEntitlementGatedInterfaceRemoved // Event containing the contract specifics and raw log

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
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
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
