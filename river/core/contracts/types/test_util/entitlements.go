package test_util

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/base"

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

func CustomEntitlementCheck(chainId uint64, contractAddress common.Address) base.IRuleEntitlementBaseRuleData {
	return base.IRuleEntitlementBaseRuleData{
		Operations: []base.IRuleEntitlementBaseOperation{
			{
				OpType: uint8(contract_types.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
			{
				OpType:          uint8(contract_types.ISENTITLED),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: contractAddress,
				Threshold:       new(big.Int).SetUint64(0),
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
				OpType:          uint8(contract_types.NATIVE_COIN_BALANCE),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: common.Address{},
				Threshold:       new(big.Int).SetUint64(threshold),
			},
		},
	}
}
