package test_util

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/node/crypto"

	contract_types "github.com/river-build/river/core/contracts/types"
)

func Erc721Check(chainId uint64, contractAddress common.Address, threshold uint64) base.IRuleEntitlementBaseRuleData {
	return base.IRuleEntitlementBaseRuleData{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
			{
				OpType:          uint8(contract_types.ERC721),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: contractAddress,
				Threshold:       new(big.Int).SetUint64(threshold),
			},
		},
	}
}

func Erc1155Check(
	chainId uint64,
	contractAddress common.Address,
	threshold uint64,
	tokenId uint64,
) base.IRuleEntitlementBaseRuleDataV2 {
	params := contract_types.ERC1155Params{
		Threshold: new(big.Int).SetUint64(threshold),
		TokenId:   new(big.Int).SetUint64(tokenId),
	}
	encodedParams, err := params.AbiEncode()
	if err != nil {
		panic(err)
	}
	return base.IRuleEntitlementBaseRuleDataV2{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperationV2{
			{
				OpType:          uint8(contract_types.ERC1155),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: contractAddress,
				Params:          encodedParams,
			},
		},
	}
}

func Erc20Check(chainId uint64, contractAddress common.Address, threshold uint64) base.IRuleEntitlementBaseRuleData {
	return base.IRuleEntitlementBaseRuleData{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
			{
				OpType:  uint8(contract_types.ERC20),
				ChainId: new(big.Int).SetUint64(chainId),
				// Chainlink is a good ERC 20 token to use for testing because it's easy to get from faucets.
				ContractAddress: contractAddress,
				Threshold:       new(big.Int).SetUint64(threshold),
			},
		},
	}
}

func MockCrossChainEntitlementCheck(
	chainId uint64,
	contractAddress common.Address,
	id *big.Int,
) base.IRuleEntitlementBaseRuleDataV2 {
	params := crypto.ABIEncodeUint256(id)
	return CrossChainEntitlementCheck(
		chainId,
		contractAddress,
		params,
	)
}

func CrossChainEntitlementCheck(
	chainId uint64,
	contractAddress common.Address,
	params []byte,
) base.IRuleEntitlementBaseRuleDataV2 {
	return base.IRuleEntitlementBaseRuleDataV2{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperationV2{
			{
				OpType:          uint8(contract_types.ISENTITLED),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: contractAddress,
				Params:          params,
			},
		},
	}
}

func EthBalanceCheck(chainId uint64, threshold uint64) base.IRuleEntitlementBaseRuleData {
	return base.IRuleEntitlementBaseRuleData{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
			{
				OpType:          uint8(contract_types.ETH_BALANCE),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: common.Address{},
				Threshold:       new(big.Int).SetUint64(threshold),
			},
		},
	}
}
