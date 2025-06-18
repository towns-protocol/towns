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

// IEntitlementDataQueryableBaseEntitlementData is an auto generated low-level Go binding around an user-defined struct.
type IEntitlementDataQueryableBaseEntitlementData struct {
	EntitlementType string
	EntitlementData []byte
}

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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"checker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__EntitlementGated_init\",\"inputs\":[{\"name\":\"entitlementChecker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getCrossChainEntitlementData\",\"inputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIEntitlementDataQueryableBase.EntitlementData\",\"components\":[{\"name\":\"entitlementType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleDataV2\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"joinSpace\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResultV2\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV1RuleDataV1\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV1RuleDataV2\",\"inputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV2RuleDataV1\",\"inputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV2RuleDataV2\",\"inputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidEntitlement\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_OnlyEntitlementChecker\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_RequestIdNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Reentrancy\",\"inputs\":[]}]",
	Bin: "0x608060405234801561000f575f5ffd5b50604051613a96380380613a9683398101604081905261002e9161011c565b610036610076565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0080546001600160a01b0319166001600160a01b03831617905550610149565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156100c2576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101561011957805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b5f6020828403121561012c575f5ffd5b81516001600160a01b0381168114610142575f5ffd5b9392505050565b613940806101565f395ff3fe6080604052600436106100c3575f3560e01c806392c399ff11610071578063caeb80881161004c578063caeb808814610206578063e58690f214610219578063ffbfd74d1461022c575f5ffd5b806392c399ff146101c1578063bef1bee1146101e0578063c1066f18146101f3575f5ffd5b80635bf0fec7116100a15780635bf0fec71461014957806368ab7dd6146101765780637adc9cbe146101a2575f5ffd5b8063069a3ee9146100c75780630fe44a21146100fc5780634739e80514610128575b5f5ffd5b3480156100d2575f5ffd5b506100e66100e1366004611fca565b61024b565b6040516100f391906120e2565b60405180910390f35b348015610107575f5ffd5b5061011b6101163660046121db565b610485565b6040516100f39190612247565b348015610133575f5ffd5b506101476101423660046122a9565b61057f565b005b348015610154575f5ffd5b506101686101633660046122f5565b6105c5565b6040519081526020016100f3565b348015610181575f5ffd5b50610195610190366004611fca565b610644565b6040516100f39190612339565b3480156101ad575f5ffd5b506101476101bc36600461249d565b6108f6565b3480156101cc575f5ffd5b506100e66101db3660046121db565b610965565b6101686101ee366004612500565b610993565b61016861020136600461257c565b610a46565b61016861021436600461257c565b610af7565b6101476102273660046122a9565b610b42565b348015610237575f5ffd5b5061016861024636600461257c565b610bde565b61026f60405180606001604052806060815260200160608152602001606081525090565b5f828152602081815260408083208151815460809481028201850190935260608101838152909491938593919285929185015b8282101561030a575f84815260209020604080518082019091529083018054829060ff1660028111156102d7576102d7611fe1565b60028111156102e8576102e8611fe1565b81529054610100900460ff1660209182015290825260019290920191016102a2565b50505050815260200160018201805480602002602001604051908101604052809291908181526020015f905b828210156103cd575f848152602090206040805160808101909152600484029091018054829060ff16600681111561037057610370611fe1565b600681111561038157610381611fe1565b8152600182810154602080840191909152600284015473ffffffffffffffffffffffffffffffffffffffff16604084015260039093015460609092019190915291835292019101610336565b50505050815260200160028201805480602002602001604051908101604052809291908181526020015f905b82821015610477575f8481526020902060408051606081019091529083018054829060ff16600281111561042f5761042f611fe1565b600281111561044057610440611fe1565b8152905460ff61010082048116602080850191909152620100009092041660409092019190915290825260019290920191016103f9565b505050915250909392505050565b60408051808201909152606080825260208201525f828152602081905260409020541561051e5760408051608081018252600f8183019081527f52756c65456e7469746c656d656e740000000000000000000000000000000000606083015281525f8481526020818152908390209251919281840192610505920161268a565b6040516020818303038152906040528152509050610579565b6040805160808101825260118183019081527f52756c65456e7469746c656d656e745632000000000000000000000000000000606083015281525f8481526001602090815290839020925191928184019261050592016127c7565b92915050565b3068929eee149b4bd21268540361059d5763ab143c065f526004601cfd5b3068929eee149b4bd21268556105b4838383610cda565b3868929eee149b4bd2126855505050565b5f82815260208190526040812082906105de8282612e88565b50506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f9060540160405160208183030381529060405280519060200120905061063d3382308761108d565b9392505050565b61066860405180606001604052806060815260200160608152602001606081525090565b5f8281526001602090815260408083208151815460809481028201850190935260608101838152909491938593919285929185015b82821015610705575f84815260209020604080518082019091529083018054829060ff1660028111156106d2576106d2611fe1565b60028111156106e3576106e3611fe1565b81529054610100900460ff16602091820152908252600192909201910161069d565b50505050815260200160018201805480602002602001604051908101604052809291908181526020015f905b8282101561084c575f848152602090206040805160808101909152600484029091018054829060ff16600681111561076b5761076b611fe1565b600681111561077c5761077c611fe1565b815260018201546020820152600282015473ffffffffffffffffffffffffffffffffffffffff1660408201526003820180546060909201916107bd9061277c565b80601f01602080910402602001604051908101604052809291908181526020018280546107e99061277c565b80156108345780601f1061080b57610100808354040283529160200191610834565b820191905f5260205f20905b81548152906001019060200180831161081757829003601f168201915b50505050508152505081526020019060010190610731565b50505050815260200160028201805480602002602001604051908101604052809291908181526020015f905b82821015610477575f8481526020902060408051606081019091529083018054829060ff1660028111156108ae576108ae611fe1565b60028111156108bf576108bf611fe1565b8152905460ff6101008204811660208085019190915262010000909204166040909201919091529082526001929092019101610878565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610959576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610962816114d5565b50565b61098960405180606001604052806060815260200160608152602001606081525090565b61063d8383611560565b5f5f5b838110156109de578260015f8787858181106109b4576109b4612f52565b9050602002013581526020019081526020015f2081816109d49190613353565b5050600101610996565b506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f90605401604051602081830303815290604052805190602001209050610a3d86338388886116cd565b95945050505050565b5f805b83811015610a9057825f5f878785818110610a6657610a66612f52565b9050602002013581526020019081526020015f208181610a869190612e88565b5050600101610a49565b506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f90605401604051602081830303815290604052805190602001209050610aef33308388886116cd565b949350505050565b5f805b83811015610a90578260015f878785818110610b1857610b18612f52565b9050602002013581526020019081526020015f208181610b389190613353565b5050600101610afa565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e005473ffffffffffffffffffffffffffffffffffffffff163314610ba957610ba97fb2395d7000000000000000000000000000000000000000000000000000000000611743565b3068929eee149b4bd212685403610bc75763ab143c065f526004601cfd5b3068929eee149b4bd21268556105b483838361174b565b5f805b83811015610c29578260015f878785818110610bff57610bff612f52565b9050602002013581526020019081526020015f208181610c1f9190613353565b5050600101610be1565b506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f90605401604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0818403018152919052805160209091012090505f5b84811015610cd157610cc9338330898986818110610cbd57610cbd612f52565b9050602002013561108d565b600101610c9d565b50949350505050565b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e009190610100900473ffffffffffffffffffffffffffffffffffffffff161580610d545750805460ff16155b15610d8b576040517ff5ab487200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f84815260028201602052604090205460ff1615610dd5576040517f7912b73900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f8481526001820160205260408120805482918291825b81811015610f5f575f838281548110610e0757610e07612f52565b5f91825260209091200180549091503373ffffffffffffffffffffffffffffffffffffffff90911603610ef4575f815474010000000000000000000000000000000000000000900460ff166002811115610e6357610e63611fe1565b14610e9a576040517f47592a4d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b80548a9082907fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff1674010000000000000000000000000000000000000000836002811115610eea57610eea611fe1565b0217905550600196505b805474010000000000000000000000000000000000000000900460ff166001816002811115610f2557610f25611fe1565b03610f3557866001019650610f55565b6002816002811115610f4957610f49611fe1565b03610f55578560010195505b5050600101610dec565b5084610f97576040517f8223a7e900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610fa26002826133fa565b841180610fb85750610fb56002826133fa565b83115b15611081575f898152600287016020526040812080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055838511611003576002611006565b60015b90505f6110128c611814565b9050600182600281111561102857611028611fe1565b14806110315750805b1561106f578b7fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633836040516110669190613432565b60405180910390a25b801561107e5761107e8c6118d1565b50505b50505050505050505050565b73ffffffffffffffffffffffffffffffffffffffff84166110d1576110d17f99ef038800000000000000000000000000000000000000000000000000000000611743565b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00919060ff161561119a5760048101545f5b81811015611197578483600401828154811061114f5761114f612f52565b905f5260205f2001540361118f576040517f0d5a9ef800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b600101611131565b50505b815473ffffffffffffffffffffffffffffffffffffffff166111be576111be6119f3565b81546040517f4f845445000000000000000000000000000000000000000000000000000000008152600560048201525f9173ffffffffffffffffffffffffffffffffffffffff1690634f845445906024015f60405180830381865afa158015611229573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016820160405261126e9190810190613526565b825490915060ff166112f657815460038301805473ffffffffffffffffffffffffffffffffffffffff8089167fffffffffffffffffffffffff0000000000000000000000000000000000000000909216919091179091558816610100027fffffffffffffffffffffff0000000000000000000000000000000000000000009091161760011782555b600482018054600181810183555f928352602080842090920187905583518784529085019091526040822090915b828110156114415781604051806040016040528086848151811061134a5761134a612f52565b602002602001015173ffffffffffffffffffffffffffffffffffffffff1681526020015f600281111561137f5761137f611fe1565b905281546001810183555f9283526020928390208251910180547fffffffffffffffffffffffff0000000000000000000000000000000000000000811673ffffffffffffffffffffffffffffffffffffffff909316928317825593830151929390929183917fffffffffffffffffffffff00000000000000000000000000000000000000000016177401000000000000000000000000000000000000000083600281111561142f5761142f611fe1565b02179055505050806001019050611324565b5084546040517f541da4e500000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff9091169063541da4e59061149d908c908c908b9089906004016135bb565b5f604051808303815f87803b1580156114b4575f5ffd5b505af11580156114c6573d5f5f3e3d5ffd5b50505050505050505050505050565b6114fe7fd5fa71fa00000000000000000000000000000000000000000000000000000000611b2e565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff831617905550565b61158460405180606001604052806060815260200160608152602001606081525090565b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00919060ff1661160e576040517ff5ab487200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60038101546040517f069a3ee90000000000000000000000000000000000000000000000000000000081526004810186905273ffffffffffffffffffffffffffffffffffffffff90911690819063069a3ee9906024015f60405180830381865afa15801561167e573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01682016040526116c39190810190613797565b9695505050505050565b5f805b8281101561173a578161170c57611703878787308888878181106116f6576116f6612f52565b9050602002013534611c83565b60019150611732565b6117328787873088888781811061172557611725612f52565b905060200201355f611c83565b6001016116d0565b50505050505050565b805f5260045ffd5b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00919060ff166117cc576117cc7ff5ab487200000000000000000000000000000000000000000000000000000000611743565b847fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633846040516117fc9190613432565b60405180910390a261180d856118d1565b5050505050565b5f8181527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040812060048101547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e009190835b818110156118c157826002015f84600401838154811061188c5761188c612f52565b5f918252602080832090910154835282019290925260400190205460ff166118b957505f95945050505050565b60010161186a565b50600195945050505050565b5050565b5f8181527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040812060048101547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00925b8181101561197057826001015f84600401838154811061194757611947612f52565b905f5260205f20015481526020019081526020015f205f6119689190611f45565b600101611925565b5061197e600483015f611f60565b5f848152600184016020526040812080547fffffffffffffffffffffff0000000000000000000000000000000000000000001681556003810180547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055906119eb6004830182611f60565b505050505050565b5f7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0090505f7fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb600600601546040517f44ab66800000000000000000000000000000000000000000000000000000000081527f53706163654f70657261746f7200000000000000000000000000000000000000600482015273ffffffffffffffffffffffffffffffffffffffff909116906344ab668090602401602060405180830381865afa158015611ac6573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611aea91906138eb565b82547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff919091161790915550565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16611c02577fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b006020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055611c34565b6040517ff2cfeefa00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040517fffffffff000000000000000000000000000000000000000000000000000000008216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b611c8e868483611d73565b5f7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e005f8681526001828101602052604090912080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016909117815560030180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8716179055905080546040805173ffffffffffffffffffffffffffffffffffffffff898116602083015261173a9316918a9189918891889101604051602081830303815290604052611e31565b34811115611da457611da47ff4e95a4100000000000000000000000000000000000000000000000000000000611743565b73ffffffffffffffffffffffffffffffffffffffff8316611de857611de87f99ef038800000000000000000000000000000000000000000000000000000000611743565b73ffffffffffffffffffffffffffffffffffffffff8216611e2c57611e2c7f4bb7c20500000000000000000000000000000000000000000000000000000000611743565b505050565b8115611ec4576040517f21be050a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8716906321be050a908490611e91908990899089908890600401613906565b5f604051808303818588803b158015611ea8575f5ffd5b505af1158015611eba573d5f5f3e3d5ffd5b50505050506119eb565b6040517f21be050a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8716906321be050a90611f1c908890889088908790600401613906565b5f604051808303815f87803b158015611f33575f5ffd5b505af1158015611081573d5f5f3e3d5ffd5b5080545f8255905f5260205f20908101906109629190611f7b565b5080545f8255905f5260205f20908101906109629190611fb6565b5b80821115611fb25780547fffffffffffffffffffffff000000000000000000000000000000000000000000168155600101611f7c565b5090565b5b80821115611fb2575f8155600101611fb7565b5f60208284031215611fda575f5ffd5b5035919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b6003811061096257610962611fe1565b5f8151808452602084019350602083015f5b8281101561206757815180516120458161200e565b875260209081015160ff16818801526040909601959190910190600101612030565b5093949350505050565b6007811061208157612081611fe1565b9052565b5f8151808452602084019350602083015f5b8281101561206757815180516120ac8161200e565b8088525060ff602082015116602088015260ff604082015116604088015250606086019550602082019150600181019050612097565b602081525f8251606060208401526120fd608084018261201e565b6020858101517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0868403016040870152805180845290820193505f92909101905b8083101561219f578351612153838251612071565b6020810151602084015273ffffffffffffffffffffffffffffffffffffffff6040820151166040840152606081015160608401525060808201915060208401935060018301925061213e565b50604086015192507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08582030160608601526116c38184612085565b5f5f604083850312156121ec575f5ffd5b50508035926020909101359150565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b602081525f82516040602084015261226260608401826121fb565b905060208401517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0848303016040850152610a3d82826121fb565b60038110610962575f5ffd5b5f5f5f606084860312156122bb575f5ffd5b833592506020840135915060408401356122d48161229d565b809150509250925092565b5f606082840312156122ef575f5ffd5b50919050565b5f5f60408385031215612306575f5ffd5b82359150602083013567ffffffffffffffff811115612323575f5ffd5b61232f858286016122df565b9150509250929050565b602081525f825160606020840152612354608084018261201e565b6020858101518583037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0016040870152805180845292935081019181840191600582901b8501015f5b82811015612434577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe086830301845284516123d9838251612071565b6020810151602084015273ffffffffffffffffffffffffffffffffffffffff6040820151166040840152606081015190506080606084015261241e60808401826121fb565b602096870196959095019492505060010161239d565b50604088015194507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08782030160608801526124708186612085565b98975050505050505050565b73ffffffffffffffffffffffffffffffffffffffff81168114610962575f5ffd5b5f602082840312156124ad575f5ffd5b813561063d8161247c565b5f5f83601f8401126124c8575f5ffd5b50813567ffffffffffffffff8111156124df575f5ffd5b6020830191508360208260051b85010111156124f9575f5ffd5b9250929050565b5f5f5f5f60608587031215612513575f5ffd5b843561251e8161247c565b9350602085013567ffffffffffffffff811115612539575f5ffd5b612545878288016124b8565b909450925050604085013567ffffffffffffffff811115612564575f5ffd5b612570878288016122df565b91505092959194509250565b5f5f5f6040848603121561258e575f5ffd5b833567ffffffffffffffff8111156125a4575f5ffd5b6125b0868287016124b8565b909450925050602084013567ffffffffffffffff8111156125cf575f5ffd5b6125db868287016122df565b9150509250925092565b5f8154808452602084019350825f5260205f205f5b8281101561206757815460ff81166126118161200e565b875260081c60ff166020870152604090950194600191820191016125fa565b5f8154808452602084019350825f5260205f205f5b8281101561206757815460ff811661265c8161200e565b875260ff600882901c8116602089015260109190911c16604087015260609095019460019182019101612645565b60208152606060208201525f6126a360808301846125e5565b8281037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe00160408401526001840180548083525f91825260208083209301905b80831015612744576126f98260ff865416612071565b6001840154602083015273ffffffffffffffffffffffffffffffffffffffff6002850154166040830152600384015460608301526080820191506004840193506001830192506126e3565b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08582030160608601526116c38160028801612630565b600181811c9082168061279057607f821691505b6020821081036122ef577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b60208152606060208201525f6127e060808301846125e5565b600184017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe084830301604085015281815480845260208401915060208160051b850101835f5260205f2093505f5b82811015612951577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe086830301845261286b8260ff875416612071565b6001850154602083015273ffffffffffffffffffffffffffffffffffffffff600286015416604083015260038501608060608401525f81546128ac8161277c565b806080870152600182165f81146128ca576001811461290457612935565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00831660a088015260a082151560051b8801019350612935565b845f5260205f205f5b8381101561292c57815489820160a0015260019091019060200161290d565b880160a0019450505b505050600496909601956020959095019492505060010161282e565b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08782030160608801526124708160028a01612630565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe18436030181126129bc575f5ffd5b83018035915067ffffffffffffffff8211156129d6575f5ffd5b6020019150600681901b36038213156124f9575f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b600281901b7f3fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82168214612a75577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b919050565b60ff81168114610962575f5ffd5b8135612a938161229d565b612a9c8161200e565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0082541660ff82168117835550506020820135612ad881612a7a565b81547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff16600882901b61ff0016178255505050565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112612b40575f5ffd5b83018035915067ffffffffffffffff821115612b5a575f5ffd5b6020019150600781901b36038213156124f9575f5ffd5b60078110610962575f5ffd5b60078210612b8d57612b8d611fe1565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0081541660ff831681178255505050565b8135612bc981612b71565b612bd38183612b7d565b50602082013560018201556040820135612bec8161247c565b6002820180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff83161790555060609190910135600390910155565b68010000000000000000831115612c5757612c576129ed565b805483825580841015612cae57612c6d81612a1a565b612c7685612a1a565b5f8481526020902091820191015b81811015612cab575f80825560018201819055600282018190556003820155600401612c84565b50505b505f8181526020812083915b858110156119eb57612ccc8383612bbe565b6080929092019160049190910190600101612cba565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112612d15575f5ffd5b83018035915067ffffffffffffffff821115612d2f575f5ffd5b60200191506060810236038213156124f9575f5ffd5b8135612d508161229d565b612d598161200e565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0082541660ff82168117835550506020820135612d9581612a7a565b81547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff16600882901b61ff0016178255506040820135612dd481612a7a565b81547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ffff1660109190911b62ff00001617905550565b68010000000000000000831115612e2257612e226129ed565b805483825580841015612e57575f828152602090208481019082015b80821015612e54575f8255600182019150612e3e565b50505b505f8181526020812083915b858110156119eb57612e758383612d45565b6060929092019160019182019101612e63565b612e928283612989565b68010000000000000000811115612eab57612eab6129ed565b825481845580821015612ee0575f848152602090208281019082015b80821015612edd575f8255600182019150612ec7565b50505b505f838152602090205f5b82811015612f1057612efd8483612a88565b6040939093019260019182019101612eeb565b50505050612f216020830183612b0d565b612f2f818360018601612c3e565b5050612f3e6040830183612ce2565b612f4c818360028601612e09565b50505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112612fb2575f5ffd5b83018035915067ffffffffffffffff821115612fcc575f5ffd5b6020019150600581901b36038213156124f9575f5ffd5b5f82357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81833603018112613015575f5ffd5b9190910192915050565b5b818110156118cd575f8155600101613020565b601f821115611e2c57805f5260205f20601f840160051c810160208510156130585750805b61180d601f850160051c83018261301f565b813561307581612b71565b61307f8183612b7d565b506020820135600182015560408201356130988161247c565b6002820180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff83161790555060608201357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe183360301811261310f575f5ffd5b8201803567ffffffffffffffff811115613127575f5ffd5b60208201915080360382131561313b575f5ffd5b6003830167ffffffffffffffff821115613157576131576129ed565b61316b82613165835461277c565b83613033565b5f601f8311600181146131bb575f84156131855750848201355b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c1916600185901b17835561173a565b5f838152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08616915b8281101561320857878501358255602094850194600190920191016131e8565b5085821015613243577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88760031b161c19848801351681555b505060018460011b01835550505050505050565b68010000000000000000831115613270576132706129ed565b8054838255808410156133165761328681612a1a565b61328f85612a1a565b5f8481526020902091820191015b81811015613313575f81555f60018201555f6002820155600381016132c2815461277c565b801561330957601f8111600181146132dc575f8355613307565b5f838152602090206132f9601f840160051c82016001830161301f565b505f83815260208120818555555b505b505060040161329d565b50505b505f8181526020812083915b858110156119eb5761333d6133378487612fe3565b8361306a565b6020929092019160049190910190600101613322565b61335d8283612989565b68010000000000000000811115613376576133766129ed565b8254818455808210156133ab575f848152602090208281019082015b808210156133a8575f8255600182019150613392565b50505b505f838152602090205f5b828110156133db576133c88483612a88565b60409390930192600191820191016133b6565b505050506133ec6020830183612f7f565b612f2f818360018601613257565b5f8261342d577f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b500490565b6020810161343f8361200e565b91905290565b6040516080810167ffffffffffffffff81118282101715613468576134686129ed565b60405290565b6040516060810167ffffffffffffffff81118282101715613468576134686129ed565b6040805190810167ffffffffffffffff81118282101715613468576134686129ed565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016810167ffffffffffffffff811182821017156134fb576134fb6129ed565b604052919050565b5f67ffffffffffffffff82111561351c5761351c6129ed565b5060051b60200190565b5f60208284031215613536575f5ffd5b815167ffffffffffffffff81111561354c575f5ffd5b8201601f8101841361355c575f5ffd5b805161356f61356a82613503565b6134b4565b8082825260208201915060208360051b850101925086831115613590575f5ffd5b6020840193505b828410156116c35783516135aa8161247c565b825260209384019390910190613597565b5f6080820173ffffffffffffffffffffffffffffffffffffffff871683528560208401528460408401526080606084015280845180835260a0850191506020860192505f5b8181101561363457835173ffffffffffffffffffffffffffffffffffffffff16835260209384019390920191600101613600565b509098975050505050505050565b5f82601f830112613651575f5ffd5b815161365f61356a82613503565b8082825260208201915060208360071b860101925085831115613680575f5ffd5b602085015b838110156136e8576080818803121561369c575f5ffd5b6136a4613445565b81516136af81612b71565b81526020828101519082015260408201516136c98161247c565b6040820152606082810151908201528352602090920191608001613685565b5095945050505050565b5f82601f830112613701575f5ffd5b815161370f61356a82613503565b80828252602082019150602060608402860101925085831115613730575f5ffd5b602085015b838110156136e8576060818803121561374c575f5ffd5b61375461346e565b815161375f8161229d565b8152602082015161376f81612a7a565b6020820152604082015161378281612a7a565b60408201528352602090920191606001613735565b5f602082840312156137a7575f5ffd5b815167ffffffffffffffff8111156137bd575f5ffd5b8201606081850312156137ce575f5ffd5b6137d661346e565b815167ffffffffffffffff8111156137ec575f5ffd5b8201601f810186136137fc575f5ffd5b805161380a61356a82613503565b8082825260208201915060208360061b85010192508883111561382b575f5ffd5b6020840193505b82841015613888576040848a031215613849575f5ffd5b613851613491565b845161385c8161229d565b8152602085015161386c81612a7a565b8060208301525080835250602082019150604084019350613832565b8452505050602082015167ffffffffffffffff8111156138a6575f5ffd5b6138b286828501613642565b602083015250604082015167ffffffffffffffff8111156138d1575f5ffd5b6138dd868285016136f2565b604083015250949350505050565b5f602082840312156138fb575f5ffd5b815161063d8161247c565b73ffffffffffffffffffffffffffffffffffffffff85168152836020820152826040820152608060608201525f6116c360808301846121fb56",
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

// GetCrossChainEntitlementData is a free data retrieval call binding the contract method 0x0fe44a21.
//
// Solidity: function getCrossChainEntitlementData(bytes32 , uint256 roleId) view returns((string,bytes))
func (_MockEntitlementGated *MockEntitlementGatedCaller) GetCrossChainEntitlementData(opts *bind.CallOpts, arg0 [32]byte, roleId *big.Int) (IEntitlementDataQueryableBaseEntitlementData, error) {
	var out []interface{}
	err := _MockEntitlementGated.contract.Call(opts, &out, "getCrossChainEntitlementData", arg0, roleId)

	if err != nil {
		return *new(IEntitlementDataQueryableBaseEntitlementData), err
	}

	out0 := *abi.ConvertType(out[0], new(IEntitlementDataQueryableBaseEntitlementData)).(*IEntitlementDataQueryableBaseEntitlementData)

	return out0, err

}

// GetCrossChainEntitlementData is a free data retrieval call binding the contract method 0x0fe44a21.
//
// Solidity: function getCrossChainEntitlementData(bytes32 , uint256 roleId) view returns((string,bytes))
func (_MockEntitlementGated *MockEntitlementGatedSession) GetCrossChainEntitlementData(arg0 [32]byte, roleId *big.Int) (IEntitlementDataQueryableBaseEntitlementData, error) {
	return _MockEntitlementGated.Contract.GetCrossChainEntitlementData(&_MockEntitlementGated.CallOpts, arg0, roleId)
}

// GetCrossChainEntitlementData is a free data retrieval call binding the contract method 0x0fe44a21.
//
// Solidity: function getCrossChainEntitlementData(bytes32 , uint256 roleId) view returns((string,bytes))
func (_MockEntitlementGated *MockEntitlementGatedCallerSession) GetCrossChainEntitlementData(arg0 [32]byte, roleId *big.Int) (IEntitlementDataQueryableBaseEntitlementData, error) {
	return _MockEntitlementGated.Contract.GetCrossChainEntitlementData(&_MockEntitlementGated.CallOpts, arg0, roleId)
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

// JoinSpace is a paid mutator transaction binding the contract method 0xbef1bee1.
//
// Solidity: function joinSpace(address receiver, uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) JoinSpace(opts *bind.TransactOpts, receiver common.Address, roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "joinSpace", receiver, roleIds, ruleData)
}

// JoinSpace is a paid mutator transaction binding the contract method 0xbef1bee1.
//
// Solidity: function joinSpace(address receiver, uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) JoinSpace(receiver common.Address, roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.JoinSpace(&_MockEntitlementGated.TransactOpts, receiver, roleIds, ruleData)
}

// JoinSpace is a paid mutator transaction binding the contract method 0xbef1bee1.
//
// Solidity: function joinSpace(address receiver, uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) JoinSpace(receiver common.Address, roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.JoinSpace(&_MockEntitlementGated.TransactOpts, receiver, roleIds, ruleData)
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

// PostEntitlementCheckResultV2 is a paid mutator transaction binding the contract method 0xe58690f2.
//
// Solidity: function postEntitlementCheckResultV2(bytes32 transactionId, uint256 roleId, uint8 result) payable returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactor) PostEntitlementCheckResultV2(opts *bind.TransactOpts, transactionId [32]byte, roleId *big.Int, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "postEntitlementCheckResultV2", transactionId, roleId, result)
}

// PostEntitlementCheckResultV2 is a paid mutator transaction binding the contract method 0xe58690f2.
//
// Solidity: function postEntitlementCheckResultV2(bytes32 transactionId, uint256 roleId, uint8 result) payable returns()
func (_MockEntitlementGated *MockEntitlementGatedSession) PostEntitlementCheckResultV2(transactionId [32]byte, roleId *big.Int, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.PostEntitlementCheckResultV2(&_MockEntitlementGated.TransactOpts, transactionId, roleId, result)
}

// PostEntitlementCheckResultV2 is a paid mutator transaction binding the contract method 0xe58690f2.
//
// Solidity: function postEntitlementCheckResultV2(bytes32 transactionId, uint256 roleId, uint8 result) payable returns()
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) PostEntitlementCheckResultV2(transactionId [32]byte, roleId *big.Int, result uint8) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.PostEntitlementCheckResultV2(&_MockEntitlementGated.TransactOpts, transactionId, roleId, result)
}

// RequestEntitlementCheckV1RuleDataV1 is a paid mutator transaction binding the contract method 0x5bf0fec7.
//
// Solidity: function requestEntitlementCheckV1RuleDataV1(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) RequestEntitlementCheckV1RuleDataV1(opts *bind.TransactOpts, roleId *big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "requestEntitlementCheckV1RuleDataV1", roleId, ruleData)
}

// RequestEntitlementCheckV1RuleDataV1 is a paid mutator transaction binding the contract method 0x5bf0fec7.
//
// Solidity: function requestEntitlementCheckV1RuleDataV1(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) RequestEntitlementCheckV1RuleDataV1(roleId *big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV1RuleDataV1(&_MockEntitlementGated.TransactOpts, roleId, ruleData)
}

// RequestEntitlementCheckV1RuleDataV1 is a paid mutator transaction binding the contract method 0x5bf0fec7.
//
// Solidity: function requestEntitlementCheckV1RuleDataV1(uint256 roleId, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) RequestEntitlementCheckV1RuleDataV1(roleId *big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV1RuleDataV1(&_MockEntitlementGated.TransactOpts, roleId, ruleData)
}

// RequestEntitlementCheckV1RuleDataV2 is a paid mutator transaction binding the contract method 0xffbfd74d.
//
// Solidity: function requestEntitlementCheckV1RuleDataV2(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) RequestEntitlementCheckV1RuleDataV2(opts *bind.TransactOpts, roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "requestEntitlementCheckV1RuleDataV2", roleIds, ruleData)
}

// RequestEntitlementCheckV1RuleDataV2 is a paid mutator transaction binding the contract method 0xffbfd74d.
//
// Solidity: function requestEntitlementCheckV1RuleDataV2(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) RequestEntitlementCheckV1RuleDataV2(roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV1RuleDataV2(&_MockEntitlementGated.TransactOpts, roleIds, ruleData)
}

// RequestEntitlementCheckV1RuleDataV2 is a paid mutator transaction binding the contract method 0xffbfd74d.
//
// Solidity: function requestEntitlementCheckV1RuleDataV2(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) RequestEntitlementCheckV1RuleDataV2(roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV1RuleDataV2(&_MockEntitlementGated.TransactOpts, roleIds, ruleData)
}

// RequestEntitlementCheckV2RuleDataV1 is a paid mutator transaction binding the contract method 0xc1066f18.
//
// Solidity: function requestEntitlementCheckV2RuleDataV1(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) RequestEntitlementCheckV2RuleDataV1(opts *bind.TransactOpts, roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "requestEntitlementCheckV2RuleDataV1", roleIds, ruleData)
}

// RequestEntitlementCheckV2RuleDataV1 is a paid mutator transaction binding the contract method 0xc1066f18.
//
// Solidity: function requestEntitlementCheckV2RuleDataV1(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) RequestEntitlementCheckV2RuleDataV1(roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV2RuleDataV1(&_MockEntitlementGated.TransactOpts, roleIds, ruleData)
}

// RequestEntitlementCheckV2RuleDataV1 is a paid mutator transaction binding the contract method 0xc1066f18.
//
// Solidity: function requestEntitlementCheckV2RuleDataV1(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,uint256)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) RequestEntitlementCheckV2RuleDataV1(roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleData) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV2RuleDataV1(&_MockEntitlementGated.TransactOpts, roleIds, ruleData)
}

// RequestEntitlementCheckV2RuleDataV2 is a paid mutator transaction binding the contract method 0xcaeb8088.
//
// Solidity: function requestEntitlementCheckV2RuleDataV2(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactor) RequestEntitlementCheckV2RuleDataV2(opts *bind.TransactOpts, roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.contract.Transact(opts, "requestEntitlementCheckV2RuleDataV2", roleIds, ruleData)
}

// RequestEntitlementCheckV2RuleDataV2 is a paid mutator transaction binding the contract method 0xcaeb8088.
//
// Solidity: function requestEntitlementCheckV2RuleDataV2(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedSession) RequestEntitlementCheckV2RuleDataV2(roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV2RuleDataV2(&_MockEntitlementGated.TransactOpts, roleIds, ruleData)
}

// RequestEntitlementCheckV2RuleDataV2 is a paid mutator transaction binding the contract method 0xcaeb8088.
//
// Solidity: function requestEntitlementCheckV2RuleDataV2(uint256[] roleIds, ((uint8,uint8)[],(uint8,uint256,address,bytes)[],(uint8,uint8,uint8)[]) ruleData) payable returns(bytes32)
func (_MockEntitlementGated *MockEntitlementGatedTransactorSession) RequestEntitlementCheckV2RuleDataV2(roleIds []*big.Int, ruleData IRuleEntitlementBaseRuleDataV2) (*types.Transaction, error) {
	return _MockEntitlementGated.Contract.RequestEntitlementCheckV2RuleDataV2(&_MockEntitlementGated.TransactOpts, roleIds, ruleData)
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
