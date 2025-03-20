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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"checker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__EntitlementGated_init\",\"inputs\":[{\"name\":\"entitlementChecker\",\"type\":\"address\",\"internalType\":\"contractIEntitlementChecker\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getCrossChainEntitlementData\",\"inputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIEntitlementDataQueryableBase.EntitlementData\",\"components\":[{\"name\":\"entitlementType\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"entitlementData\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleData\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRuleDataV2\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResult\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"postEntitlementCheckResultV2\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"result\",\"type\":\"uint8\",\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV1RuleDataV1\",\"inputs\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV1RuleDataV2\",\"inputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV2RuleDataV1\",\"inputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleData\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"threshold\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheckV2RuleDataV2\",\"inputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"ruleData\",\"type\":\"tuple\",\"internalType\":\"structIRuleEntitlementBase.RuleDataV2\",\"components\":[{\"name\":\"operations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.Operation[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CombinedOperationType\"},{\"name\":\"index\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]},{\"name\":\"checkOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.CheckOperationV2[]\",\"components\":[{\"name\":\"opType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.CheckOperationType\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"params\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"name\":\"logicalOperations\",\"type\":\"tuple[]\",\"internalType\":\"structIRuleEntitlementBase.LogicalOperation[]\",\"components\":[{\"name\":\"logOpType\",\"type\":\"uint8\",\"internalType\":\"enumIRuleEntitlementBase.LogicalOperationType\"},{\"name\":\"leftOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"rightOperationIndex\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"payable\"},{\"type\":\"event\",\"name\":\"EntitlementCheckResultPosted\",\"inputs\":[{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"result\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIEntitlementGatedBase.NodeVoteStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_InvalidEntitlement\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeAlreadyVoted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_NodeNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_OnlyEntitlementChecker\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_RequestIdNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyCompleted\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionCheckAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementGated_TransactionNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Reentrancy\",\"inputs\":[]}]",
	Bin: "0x608060405234801561000f575f5ffd5b506040516138fa3803806138fa83398101604081905261002e9161011c565b610036610076565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0080546001600160a01b0319166001600160a01b03831617905550610149565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156100c2576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101561011957805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b5f6020828403121561012c575f5ffd5b81516001600160a01b0381168114610142575f5ffd5b9392505050565b6137a4806101565f395ff3fe6080604052600436106100b8575f3560e01c80637adc9cbe11610071578063caeb80881161004c578063caeb8088146101e8578063e58690f2146101fb578063ffbfd74d1461020e575f5ffd5b80637adc9cbe1461019757806392c399ff146101b6578063c1066f18146101d5575f5ffd5b80634739e805116100a15780634739e8051461011d5780635bf0fec71461013e57806368ab7dd61461016b575f5ffd5b8063069a3ee9146100bc5780630fe44a21146100f1575b5f5ffd5b3480156100c7575f5ffd5b506100db6100d6366004611e9b565b61022d565b6040516100e89190611fb3565b60405180910390f35b3480156100fc575f5ffd5b5061011061010b3660046120ac565b610467565b6040516100e89190612118565b348015610128575f5ffd5b5061013c610137366004612183565b610561565b005b348015610149575f5ffd5b5061015d6101583660046121cf565b6105a7565b6040519081526020016100e8565b348015610176575f5ffd5b5061018a610185366004611e9b565b610626565b6040516100e89190612213565b3480156101a2575f5ffd5b5061013c6101b1366004612377565b6108d8565b3480156101c1575f5ffd5b506100db6101d03660046120ac565b610947565b61015d6101e33660046123da565b610975565b61015d6101f63660046123da565b610a71565b61013c610209366004612183565b610b59565b348015610219575f5ffd5b5061015d6102283660046123da565b610bf5565b61025160405180606001604052806060815260200160608152602001606081525090565b5f828152602081815260408083208151815460809481028201850190935260608101838152909491938593919285929185015b828210156102ec575f84815260209020604080518082019091529083018054829060ff1660028111156102b9576102b9611eb2565b60028111156102ca576102ca611eb2565b81529054610100900460ff166020918201529082526001929092019101610284565b50505050815260200160018201805480602002602001604051908101604052809291908181526020015f905b828210156103af575f848152602090206040805160808101909152600484029091018054829060ff16600681111561035257610352611eb2565b600681111561036357610363611eb2565b8152600182810154602080840191909152600284015473ffffffffffffffffffffffffffffffffffffffff16604084015260039093015460609092019190915291835292019101610318565b50505050815260200160028201805480602002602001604051908101604052809291908181526020015f905b82821015610459575f8481526020902060408051606081019091529083018054829060ff16600281111561041157610411611eb2565b600281111561042257610422611eb2565b8152905460ff61010082048116602080850191909152620100009092041660409092019190915290825260019290920191016103db565b505050915250909392505050565b60408051808201909152606080825260208201525f82815260208190526040902054156105005760408051608081018252600f8183019081527f52756c65456e7469746c656d656e740000000000000000000000000000000000606083015281525f84815260208181529083902092519192818401926104e792016124e8565b604051602081830303815290604052815250905061055b565b6040805160808101825260118183019081527f52756c65456e7469746c656d656e745632000000000000000000000000000000606083015281525f848152600160209081529083902092519192818401926104e79201612625565b92915050565b3068929eee149b4bd21268540361057f5763ab143c065f526004601cfd5b3068929eee149b4bd2126855610596838383610ce8565b3868929eee149b4bd2126855505050565b5f82815260208190526040812082906105c08282612ceb565b50506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f9060540160405160208183030381529060405280519060200120905061061f3382308761109b565b9392505050565b61064a60405180606001604052806060815260200160608152602001606081525090565b5f8281526001602090815260408083208151815460809481028201850190935260608101838152909491938593919285929185015b828210156106e7575f84815260209020604080518082019091529083018054829060ff1660028111156106b4576106b4611eb2565b60028111156106c5576106c5611eb2565b81529054610100900460ff16602091820152908252600192909201910161067f565b50505050815260200160018201805480602002602001604051908101604052809291908181526020015f905b8282101561082e575f848152602090206040805160808101909152600484029091018054829060ff16600681111561074d5761074d611eb2565b600681111561075e5761075e611eb2565b815260018201546020820152600282015473ffffffffffffffffffffffffffffffffffffffff16604082015260038201805460609092019161079f906125da565b80601f01602080910402602001604051908101604052809291908181526020018280546107cb906125da565b80156108165780601f106107ed57610100808354040283529160200191610816565b820191905f5260205f20905b8154815290600101906020018083116107f957829003601f168201915b50505050508152505081526020019060010190610713565b50505050815260200160028201805480602002602001604051908101604052809291908181526020015f905b82821015610459575f8481526020902060408051606081019091529083018054829060ff16600281111561089057610890611eb2565b60028111156108a1576108a1611eb2565b8152905460ff610100820481166020808501919091526201000090920416604090920191909152908252600192909201910161085a565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661093b576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610944816114e3565b50565b61096b60405180606001604052806060815260200160608152602001606081525090565b61061f838361156e565b5f805b838110156109bf57825f5f87878581811061099557610995612db5565b9050602002013581526020019081526020015f2081816109b59190612ceb565b5050600101610978565b506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f90605401604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0818403018152919052805160209091012090505f5b84811015610a6857610a60333084308a8a87818110610a5457610a54612db5565b905060200201356116db565b600101610a33565b50949350505050565b5f805b83811015610abc578260015f878785818110610a9257610a92612db5565b9050602002013581526020019081526020015f208181610ab291906131b7565b5050600101610a74565b506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f90605401604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0818403018152919052805160209091012090505f5b84811015610a6857610b51333084308a8a87818110610a5457610a54612db5565b600101610b30565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e005473ffffffffffffffffffffffffffffffffffffffff163314610bc057610bc07fb2395d70000000000000000000000000000000000000000000000000000000006118d6565b3068929eee149b4bd212685403610bde5763ab143c065f526004601cfd5b3068929eee149b4bd21268556105968383836118de565b5f805b83811015610c40578260015f878785818110610c1657610c16612db5565b9050602002013581526020019081526020015f208181610c3691906131b7565b5050600101610bf8565b506040517fffffffffffffffffffffffffffffffffffffffff0000000000000000000000003260601b1660208201524360348201525f90605401604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0818403018152919052805160209091012090505f5b84811015610a6857610ce0338330898986818110610cd457610cd4612db5565b9050602002013561109b565b600101610cb4565b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e009190610100900473ffffffffffffffffffffffffffffffffffffffff161580610d625750805460ff16155b15610d99576040517ff5ab487200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f84815260028201602052604090205460ff1615610de3576040517f7912b73900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f8481526001820160205260408120805482918291825b81811015610f6d575f838281548110610e1557610e15612db5565b5f91825260209091200180549091503373ffffffffffffffffffffffffffffffffffffffff90911603610f02575f815474010000000000000000000000000000000000000000900460ff166002811115610e7157610e71611eb2565b14610ea8576040517f47592a4d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b80548a9082907fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff1674010000000000000000000000000000000000000000836002811115610ef857610ef8611eb2565b0217905550600196505b805474010000000000000000000000000000000000000000900460ff166001816002811115610f3357610f33611eb2565b03610f4357866001019650610f63565b6002816002811115610f5757610f57611eb2565b03610f63578560010195505b5050600101610dfa565b5084610fa5576040517f8223a7e900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610fb060028261325e565b841180610fc65750610fc360028261325e565b83115b1561108f575f898152600287016020526040812080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055838511611011576002611014565b60015b90505f6110208c6119a7565b9050600182600281111561103657611036611eb2565b148061103f5750805b1561107d578b7fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633836040516110749190613296565b60405180910390a25b801561108c5761108c8c611a64565b50505b50505050505050505050565b73ffffffffffffffffffffffffffffffffffffffff84166110df576110df7f99ef0388000000000000000000000000000000000000000000000000000000006118d6565b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00919060ff16156111a85760048101545f5b818110156111a5578483600401828154811061115d5761115d612db5565b905f5260205f2001540361119d576040517f0d5a9ef800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60010161113f565b50505b815473ffffffffffffffffffffffffffffffffffffffff166111cc576111cc611b86565b81546040517f4f845445000000000000000000000000000000000000000000000000000000008152600560048201525f9173ffffffffffffffffffffffffffffffffffffffff1690634f845445906024015f60405180830381865afa158015611237573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016820160405261127c919081019061338a565b825490915060ff1661130457815460038301805473ffffffffffffffffffffffffffffffffffffffff8089167fffffffffffffffffffffffff0000000000000000000000000000000000000000909216919091179091558816610100027fffffffffffffffffffffff0000000000000000000000000000000000000000009091161760011782555b600482018054600181810183555f928352602080842090920187905583518784529085019091526040822090915b8281101561144f5781604051806040016040528086848151811061135857611358612db5565b602002602001015173ffffffffffffffffffffffffffffffffffffffff1681526020015f600281111561138d5761138d611eb2565b905281546001810183555f9283526020928390208251910180547fffffffffffffffffffffffff0000000000000000000000000000000000000000811673ffffffffffffffffffffffffffffffffffffffff909316928317825593830151929390929183917fffffffffffffffffffffff00000000000000000000000000000000000000000016177401000000000000000000000000000000000000000083600281111561143d5761143d611eb2565b02179055505050806001019050611332565b5084546040517f541da4e500000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff9091169063541da4e5906114ab908c908c908b90899060040161341f565b5f604051808303815f87803b1580156114c2575f5ffd5b505af11580156114d4573d5f5f3e3d5ffd5b50505050505050505050505050565b61150c7fd5fa71fa00000000000000000000000000000000000000000000000000000000611cc1565b7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff831617905550565b61159260405180606001604052806060815260200160608152602001606081525090565b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00919060ff1661161c576040517ff5ab487200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60038101546040517f069a3ee90000000000000000000000000000000000000000000000000000000081526004810186905273ffffffffffffffffffffffffffffffffffffffff90911690819063069a3ee9906024015f60405180830381865afa15801561168c573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01682016040526116d191908101906135fb565b9695505050505050565b73ffffffffffffffffffffffffffffffffffffffff851661171f5761171f7f99ef0388000000000000000000000000000000000000000000000000000000006118d6565b73ffffffffffffffffffffffffffffffffffffffff8216611763576117637f4bb7c205000000000000000000000000000000000000000000000000000000006118d6565b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020908152604080832080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660011781556003810180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff888116919091179091558251908916938101939093527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00939092909101604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529082905284547f21be050a00000000000000000000000000000000000000000000000000000000835290925073ffffffffffffffffffffffffffffffffffffffff16906321be050a9034906118bf908c908b908a90889060040161374f565b5f604051808303818588803b1580156114c2575f5ffd5b805f5260045ffd5b5f8381527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040902080547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00919060ff1661195f5761195f7ff5ab4872000000000000000000000000000000000000000000000000000000006118d6565b847fb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c6338460405161198f9190613296565b60405180910390a26119a085611a64565b5050505050565b5f8181527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040812060048101547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e009190835b81811015611a5457826002015f846004018381548110611a1f57611a1f612db5565b5f918252602080832090910154835282019290925260400190205460ff16611a4c57505f95945050505050565b6001016119fd565b50600195945050505050565b5050565b5f8181527f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e016020526040812060048101547f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e00925b81811015611b0357826001015f846004018381548110611ada57611ada612db5565b905f5260205f20015481526020019081526020015f205f611afb9190611e16565b600101611ab8565b50611b11600483015f611e31565b5f848152600184016020526040812080547fffffffffffffffffffffff0000000000000000000000000000000000000000001681556003810180547fffffffffffffffffffffffff000000000000000000000000000000000000000016905590611b7e6004830182611e31565b505050505050565b5f7f9075c515a635ba70c9696f31149324218d75cf00afe836c482e6473f38b19e0090505f7fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb600600601546040517f44ab66800000000000000000000000000000000000000000000000000000000081527f53706163654f70657261746f7200000000000000000000000000000000000000600482015273ffffffffffffffffffffffffffffffffffffffff909116906344ab668090602401602060405180830381865afa158015611c59573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611c7d9190613789565b82547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff919091161790915550565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16611d95577fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b006020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055611dc7565b6040517ff2cfeefa00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040517fffffffff000000000000000000000000000000000000000000000000000000008216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b5080545f8255905f5260205f20908101906109449190611e4c565b5080545f8255905f5260205f20908101906109449190611e87565b5b80821115611e835780547fffffffffffffffffffffff000000000000000000000000000000000000000000168155600101611e4d565b5090565b5b80821115611e83575f8155600101611e88565b5f60208284031215611eab575f5ffd5b5035919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b6003811061094457610944611eb2565b5f8151808452602084019350602083015f5b82811015611f385781518051611f1681611edf565b875260209081015160ff16818801526040909601959190910190600101611f01565b5093949350505050565b60078110611f5257611f52611eb2565b9052565b5f8151808452602084019350602083015f5b82811015611f385781518051611f7d81611edf565b8088525060ff602082015116602088015260ff604082015116604088015250606086019550602082019150600181019050611f68565b602081525f825160606020840152611fce6080840182611eef565b6020858101517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0868403016040870152805180845290820193505f92909101905b80831015612070578351612024838251611f42565b6020810151602084015273ffffffffffffffffffffffffffffffffffffffff6040820151166040840152606081015160608401525060808201915060208401935060018301925061200f565b50604086015192507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08582030160608601526116d18184611f56565b5f5f604083850312156120bd575f5ffd5b50508035926020909101359150565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b602081525f82516040602084015261213360608401826120cc565b905060208401517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe084830301604085015261216e82826120cc565b95945050505050565b60038110610944575f5ffd5b5f5f5f60608486031215612195575f5ffd5b833592506020840135915060408401356121ae81612177565b809150509250925092565b5f606082840312156121c9575f5ffd5b50919050565b5f5f604083850312156121e0575f5ffd5b82359150602083013567ffffffffffffffff8111156121fd575f5ffd5b612209858286016121b9565b9150509250929050565b602081525f82516060602084015261222e6080840182611eef565b6020858101518583037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0016040870152805180845292935081019181840191600582901b8501015f5b8281101561230e577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe086830301845284516122b3838251611f42565b6020810151602084015273ffffffffffffffffffffffffffffffffffffffff604082015116604084015260608101519050608060608401526122f860808401826120cc565b6020968701969590950194925050600101612277565b50604088015194507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe087820301606088015261234a8186611f56565b98975050505050505050565b73ffffffffffffffffffffffffffffffffffffffff81168114610944575f5ffd5b5f60208284031215612387575f5ffd5b813561061f81612356565b5f5f83601f8401126123a2575f5ffd5b50813567ffffffffffffffff8111156123b9575f5ffd5b6020830191508360208260051b85010111156123d3575f5ffd5b9250929050565b5f5f5f604084860312156123ec575f5ffd5b833567ffffffffffffffff811115612402575f5ffd5b61240e86828701612392565b909450925050602084013567ffffffffffffffff81111561242d575f5ffd5b612439868287016121b9565b9150509250925092565b5f8154808452602084019350825f5260205f205f5b82811015611f3857815460ff811661246f81611edf565b875260081c60ff16602087015260409095019460019182019101612458565b5f8154808452602084019350825f5260205f205f5b82811015611f3857815460ff81166124ba81611edf565b875260ff600882901c8116602089015260109190911c166040870152606090950194600191820191016124a3565b60208152606060208201525f6125016080830184612443565b8281037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe00160408401526001840180548083525f91825260208083209301905b808310156125a2576125578260ff865416611f42565b6001840154602083015273ffffffffffffffffffffffffffffffffffffffff600285015416604083015260038401546060830152608082019150600484019350600183019250612541565b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08582030160608601526116d1816002880161248e565b600181811c908216806125ee57607f821691505b6020821081036121c9577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b60208152606060208201525f61263e6080830184612443565b600184017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe084830301604085015281815480845260208401915060208160051b850101835f5260205f2093505f5b828110156127af577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08683030184526126c98260ff875416611f42565b6001850154602083015273ffffffffffffffffffffffffffffffffffffffff600286015416604083015260038501608060608401525f815461270a816125da565b806080870152600182165f8114612728576001811461276257612793565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00831660a088015260a082151560051b8801019350612793565b845f5260205f205f5b8381101561278a57815489820160a0015260019091019060200161276b565b880160a0019450505b505050600496909601956020959095019492505060010161268c565b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe087820301606088015261234a8160028a0161248e565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe184360301811261281a575f5ffd5b83018035915067ffffffffffffffff821115612834575f5ffd5b6020019150600681901b36038213156123d3575f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b600281901b7f3fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff821682146128d3577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b919050565b60ff81168114610944575f5ffd5b81356128f181612177565b6128fa81611edf565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0082541660ff82168117835550506020820135612936816128d8565b81547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff16600882901b61ff0016178255505050565b505050565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe18436030181126129a3575f5ffd5b83018035915067ffffffffffffffff8211156129bd575f5ffd5b6020019150600781901b36038213156123d3575f5ffd5b60078110610944575f5ffd5b600782106129f0576129f0611eb2565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0081541660ff831681178255505050565b8135612a2c816129d4565b612a3681836129e0565b50602082013560018201556040820135612a4f81612356565b6002820180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff83161790555060609190910135600390910155565b68010000000000000000831115612aba57612aba61284b565b805483825580841015612b1157612ad081612878565b612ad985612878565b5f8481526020902091820191015b81811015612b0e575f80825560018201819055600282018190556003820155600401612ae7565b50505b505f8181526020812083915b85811015611b7e57612b2f8383612a21565b6080929092019160049190910190600101612b1d565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112612b78575f5ffd5b83018035915067ffffffffffffffff821115612b92575f5ffd5b60200191506060810236038213156123d3575f5ffd5b8135612bb381612177565b612bbc81611edf565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0082541660ff82168117835550506020820135612bf8816128d8565b81547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff16600882901b61ff0016178255506040820135612c37816128d8565b81547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ffff1660109190911b62ff00001617905550565b68010000000000000000831115612c8557612c8561284b565b805483825580841015612cba575f828152602090208481019082015b80821015612cb7575f8255600182019150612ca1565b50505b505f8181526020812083915b85811015611b7e57612cd88383612ba8565b6060929092019160019182019101612cc6565b612cf582836127e7565b68010000000000000000811115612d0e57612d0e61284b565b825481845580821015612d43575f848152602090208281019082015b80821015612d40575f8255600182019150612d2a565b50505b505f838152602090205f5b82811015612d7357612d6084836128e6565b6040939093019260019182019101612d4e565b50505050612d846020830183612970565b612d92818360018601612aa1565b5050612da16040830183612b45565b612daf818360028601612c6c565b50505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112612e15575f5ffd5b83018035915067ffffffffffffffff821115612e2f575f5ffd5b6020019150600581901b36038213156123d3575f5ffd5b5f82357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81833603018112612e78575f5ffd5b9190910192915050565b5b81811015611a60575f8155600101612e83565b601f82111561296b57805f5260205f20601f840160051c81016020851015612ebb5750805b6119a0601f850160051c830182612e82565b8135612ed8816129d4565b612ee281836129e0565b50602082013560018201556040820135612efb81612356565b6002820180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff83161790555060608201357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1833603018112612f72575f5ffd5b8201803567ffffffffffffffff811115612f8a575f5ffd5b602082019150803603821315612f9e575f5ffd5b6003830167ffffffffffffffff821115612fba57612fba61284b565b612fce82612fc883546125da565b83612e96565b5f601f83116001811461301e575f8415612fe85750848201355b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c1916600185901b1783556130b2565b5f838152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08616915b8281101561306b578785013582556020948501946001909201910161304b565b50858210156130a6577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88760031b161c19848801351681555b505060018460011b0183555b50505050505050565b680100000000000000008311156130d4576130d461284b565b80548382558084101561317a576130ea81612878565b6130f385612878565b5f8481526020902091820191015b81811015613177575f81555f60018201555f60028201556003810161312681546125da565b801561316d57601f811160018114613140575f835561316b565b5f8381526020902061315d601f840160051c820160018301612e82565b505f83815260208120818555555b505b5050600401613101565b50505b505f8181526020812083915b85811015611b7e576131a161319b8487612e46565b83612ecd565b6020929092019160049190910190600101613186565b6131c182836127e7565b680100000000000000008111156131da576131da61284b565b82548184558082101561320f575f848152602090208281019082015b8082101561320c575f82556001820191506131f6565b50505b505f838152602090205f5b8281101561323f5761322c84836128e6565b604093909301926001918201910161321a565b505050506132506020830183612de2565b612d928183600186016130bb565b5f82613291577f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b500490565b602081016132a383611edf565b91905290565b6040516080810167ffffffffffffffff811182821017156132cc576132cc61284b565b60405290565b6040516060810167ffffffffffffffff811182821017156132cc576132cc61284b565b6040805190810167ffffffffffffffff811182821017156132cc576132cc61284b565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016810167ffffffffffffffff8111828210171561335f5761335f61284b565b604052919050565b5f67ffffffffffffffff8211156133805761338061284b565b5060051b60200190565b5f6020828403121561339a575f5ffd5b815167ffffffffffffffff8111156133b0575f5ffd5b8201601f810184136133c0575f5ffd5b80516133d36133ce82613367565b613318565b8082825260208201915060208360051b8501019250868311156133f4575f5ffd5b6020840193505b828410156116d157835161340e81612356565b8252602093840193909101906133fb565b5f6080820173ffffffffffffffffffffffffffffffffffffffff871683528560208401528460408401526080606084015280845180835260a0850191506020860192505f5b8181101561349857835173ffffffffffffffffffffffffffffffffffffffff16835260209384019390920191600101613464565b509098975050505050505050565b5f82601f8301126134b5575f5ffd5b81516134c36133ce82613367565b8082825260208201915060208360071b8601019250858311156134e4575f5ffd5b602085015b8381101561354c5760808188031215613500575f5ffd5b6135086132a9565b8151613513816129d4565b815260208281015190820152604082015161352d81612356565b60408201526060828101519082015283526020909201916080016134e9565b5095945050505050565b5f82601f830112613565575f5ffd5b81516135736133ce82613367565b80828252602082019150602060608402860101925085831115613594575f5ffd5b602085015b8381101561354c57606081880312156135b0575f5ffd5b6135b86132d2565b81516135c381612177565b815260208201516135d3816128d8565b602082015260408201516135e6816128d8565b60408201528352602090920191606001613599565b5f6020828403121561360b575f5ffd5b815167ffffffffffffffff811115613621575f5ffd5b820160608185031215613632575f5ffd5b61363a6132d2565b815167ffffffffffffffff811115613650575f5ffd5b8201601f81018613613660575f5ffd5b805161366e6133ce82613367565b8082825260208201915060208360061b85010192508883111561368f575f5ffd5b6020840193505b828410156136ec576040848a0312156136ad575f5ffd5b6136b56132f5565b84516136c081612177565b815260208501516136d0816128d8565b8060208301525080835250602082019150604084019350613696565b8452505050602082015167ffffffffffffffff81111561370a575f5ffd5b613716868285016134a6565b602083015250604082015167ffffffffffffffff811115613735575f5ffd5b61374186828501613556565b604083015250949350505050565b73ffffffffffffffffffffffffffffffffffffffff85168152836020820152826040820152608060608201525f6116d160808301846120cc565b5f60208284031215613799575f5ffd5b815161061f8161235656",
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
