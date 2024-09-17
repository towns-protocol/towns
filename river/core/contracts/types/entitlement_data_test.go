package types_test

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/contracts/types"
	"github.com/river-build/river/core/contracts/types/test_util"
	"github.com/river-build/river/core/node/base/test"
)

func TestEncodeDecodeThresholdParams(t *testing.T) {
	require := require.New(t)
	thresholdParams := types.ThresholdParams{
		Threshold: big.NewInt(100),
	}

	encoded, err := thresholdParams.AbiEncode()
	require.NoError(err)

	decoded, err := types.DecodeThresholdParams(encoded)
	require.NoError(err)

	require.Equal(thresholdParams.Threshold.Uint64(), decoded.Threshold.Uint64())
}

func TestEncodeDecodeERC1155Params(t *testing.T) {
	require := require.New(t)
	erc1155Params := types.ERC1155Params{
		Threshold: big.NewInt(200),
		TokenId:   big.NewInt(100),
	}

	encoded, err := erc1155Params.AbiEncode()
	require.NoError(err)

	decoded, err := types.DecodeERC1155Params(encoded)
	require.NoError(err)

	require.Equal(erc1155Params.Threshold.Uint64(), decoded.Threshold.Uint64())
	require.Equal(erc1155Params.TokenId.Uint64(), decoded.TokenId.Uint64())
}

var testAddress = common.HexToAddress("0x123456")

func assertRuleDataV2sEqual(r *require.Assertions, a, b base.IRuleEntitlementBaseRuleDataV2) {
	r.Len(a.Operations, len(b.Operations), "Operations length must match")
	r.Len(a.CheckOperations, len(b.CheckOperations), "CheckOperations length must match")
	r.Len(a.LogicalOperations, len(b.LogicalOperations), "LogicalOperations length must match")

	for i := range a.Operations {
		aOp := a.Operations[i]
		bOp := b.Operations[i]
		r.Equal(aOp.OpType, bOp.OpType, "Operation type must match")
		r.Equal(aOp.Index, bOp.Index, "Operation index must match")
	}
	for i := range a.CheckOperations {
		aOp := a.CheckOperations[i]
		bOp := b.CheckOperations[i]
		r.Equal(aOp.OpType, bOp.OpType, "CheckOperation type must match")
		r.Equal(aOp.ChainId, bOp.ChainId, "CheckOperation ChainId must match")
		r.Equal(aOp.ContractAddress, bOp.ContractAddress, "CheckOperation ContractAddress must match")
		r.Equal(aOp.Params, bOp.Params, "CheckOperation Params must match")
	}
	for i := range a.LogicalOperations {
		aOp := a.LogicalOperations[i]
		bOp := b.LogicalOperations[i]
		r.Equal(aOp.LogOpType, bOp.LogOpType, "LogicalOperation type must match")
		r.Equal(aOp.LeftOperationIndex, bOp.LeftOperationIndex, "LogicalOperation LeftOperationIndex must match")
		r.Equal(aOp.RightOperationIndex, bOp.RightOperationIndex, "LogicalOperation RightOperationIndex must match")
	}
}

func encodeThresholdParams(t *testing.T, threshold uint64) []byte {
	params := types.ThresholdParams{
		Threshold: big.NewInt(int64(threshold)),
	}
	encoded, err := params.AbiEncode()
	if err != nil {
		t.Fatal(err)
	}
	return encoded
}

func TestConvertV1RuleDataToV2(t *testing.T) {
	tests := map[string]struct {
		ruleData    base.IRuleEntitlementBaseRuleData
		expected    base.IRuleEntitlementBaseRuleDataV2
		expectedErr error
	}{
		"ERC20": {
			ruleData: test_util.Erc20Check(1, testAddress, 100),
			expected: base.IRuleEntitlementBaseRuleDataV2{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperationV2{
					{
						OpType:          uint8(types.ERC20),
						ChainId:         big.NewInt(1),
						ContractAddress: testAddress,
						Params:          encodeThresholdParams(t, 100),
					},
				},
			},
		},
		"ERC721": {
			ruleData: test_util.Erc721Check(5, testAddress, 500),
			expected: base.IRuleEntitlementBaseRuleDataV2{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperationV2{
					{
						OpType:          uint8(types.ERC721),
						ChainId:         big.NewInt(5),
						ContractAddress: testAddress,
						Params:          encodeThresholdParams(t, 500),
					},
				},
			},
		},
		"EthBalance": {
			ruleData: test_util.EthBalanceCheck(15, 1500),
			expected: base.IRuleEntitlementBaseRuleDataV2{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperationV2{
					{
						OpType:  uint8(types.ETH_BALANCE),
						ChainId: big.NewInt(15),
						Params:  encodeThresholdParams(t, 1500),
					},
				},
			},
		},
		"Mock": {
			ruleData: base.IRuleEntitlementBaseRuleData{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
					{
						OpType:          uint8(types.MOCK),
						ChainId:         big.NewInt(20),
						ContractAddress: testAddress,
						Threshold:       big.NewInt(2000),
					},
				},
			},
			expected: base.IRuleEntitlementBaseRuleDataV2{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperationV2{
					{
						OpType:          uint8(types.MOCK),
						ChainId:         big.NewInt(20),
						ContractAddress: testAddress,
						Params:          encodeThresholdParams(t, 2000),
					},
				},
			},
		},
		"ERC1155": {
			ruleData: base.IRuleEntitlementBaseRuleData{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
					{
						OpType: uint8(types.ERC1155),
					},
				},
			},
			expectedErr: fmt.Errorf("ERC1155 not supported by V1 rule data"),
		},
		"CheckNone": {
			ruleData: base.IRuleEntitlementBaseRuleData{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperation{
					{
						OpType: uint8(types.CheckNONE),
					},
				},
			},

			expected: base.IRuleEntitlementBaseRuleDataV2{
				Operations: []base.IRuleEntitlementBaseOperation{
					{
						OpType: uint8(types.CHECK),
						Index:  0,
					},
				},
				CheckOperations: []base.IRuleEntitlementBaseCheckOperationV2{
					{
						OpType: uint8(types.CheckNONE),
					},
				},
			},
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctx, cancel := test.NewTestContext()
			defer cancel()
			require := require.New(t)
			converted, err := types.ConvertV1RuleDataToV2(ctx, &tc.ruleData)
			if tc.expectedErr != nil {
				require.EqualError(err, tc.expectedErr.Error())
			} else {
				require.NoError(err)
				assertRuleDataV2sEqual(require, *converted, tc.expected)
			}
		})
	}
}
