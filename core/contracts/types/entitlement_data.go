package types

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/logging"
)

type Entitlement struct {
	EntitlementType   string
	RuleEntitlement   *base.IRuleEntitlementBaseRuleData
	RuleEntitlementV2 *base.IRuleEntitlementBaseRuleDataV2
	UserEntitlement   []common.Address
}

const (
	ModuleTypeRuleEntitlement   = "RuleEntitlement"
	ModuleTypeRuleEntitlementV2 = "RuleEntitlementV2"
	ModuleTypeUserEntitlement   = "UserEntitlement"
)

func MarshalEntitlement(
	ctx context.Context,
	rawEntitlement base.IEntitlementDataQueryableBaseEntitlementData,
) (Entitlement, error) {
	log := logging.FromCtx(ctx)
	log.Debugw(
		"Marshalling entitlement data",
		"entitlement_data", rawEntitlement.EntitlementData,
		"entitlement_type", rawEntitlement.EntitlementType,
	)
	if rawEntitlement.EntitlementType == ModuleTypeRuleEntitlement {
		// Parse the ABI definition
		parsedABI, err := base.RuleEntitlementMetaData.GetAbi()
		if err != nil {
			log.Errorw("Failed to parse ABI", "error", err)
			return Entitlement{}, err
		}

		var ruleData base.IRuleEntitlementBaseRuleData

		unpackedData, err := parsedABI.Unpack("getRuleData", rawEntitlement.EntitlementData)
		if err != nil {
			log.Warnw(
				"Failed to unpack rule data",
				"error",
				err,
				"entitlement",
				rawEntitlement,
				"entitlement_data",
				rawEntitlement.EntitlementData,
				"len(entitlement.EntitlementData)",
				len(rawEntitlement.EntitlementData),
			)
		}

		if len(unpackedData) > 0 {
			// Marshal into JSON, because for some UnpackIntoInterface doesn't work when unpacking directly into a
			// struct
			jsonData, err := json.Marshal(unpackedData[0])
			if err != nil {
				log.Warnw("Failed to marshal data to JSON", "error", err, "unpackedData", unpackedData)
			}

			err = json.Unmarshal(jsonData, &ruleData)
			if err != nil {
				log.Warnw(
					"Failed to unmarshal JSON to struct",
					"error",
					err,
					"jsonData",
					jsonData,
					"ruleData",
					ruleData,
				)
			}
		} else {
			log.Warnw("No data unpacked", "unpackedData", unpackedData)
		}

		return Entitlement{
			EntitlementType: rawEntitlement.EntitlementType,
			RuleEntitlement: &ruleData,
		}, nil
	} else if rawEntitlement.EntitlementType == ModuleTypeRuleEntitlementV2 {
		// Parse the ABI definition
		parsedABI, err := base.RuleEntitlementV2MetaData.GetAbi()
		if err != nil {
			log.Errorw("Failed to parse ABI", "error", err)
			return Entitlement{}, err
		}

		var ruleData base.IRuleEntitlementBaseRuleDataV2

		unpackedData, err := parsedABI.Unpack("getRuleDataV2", rawEntitlement.EntitlementData)
		if err != nil {
			log.Warnw(
				"Failed to unpack rule data",
				"error",
				err,
				"entitlement",
				rawEntitlement,
				"entitlement_data",
				rawEntitlement.EntitlementData,
				"len(entitlement.EntitlementData)",
				len(rawEntitlement.EntitlementData),
			)
		}

		if len(unpackedData) > 0 {
			// Marshal into JSON, because for some UnpackIntoInterface doesn't work when unpacking directly into a
			// struct
			jsonData, err := json.Marshal(unpackedData[0])
			if err != nil {
				log.Warnw("Failed to marshal data to JSON", "error", err, "unpackedData", unpackedData)
			}

			err = json.Unmarshal(jsonData, &ruleData)
			if err != nil {
				log.Warnw(
					"Failed to unmarshal JSON to struct",
					"error",
					err,
					"jsonData",
					jsonData,
					"ruleData",
					ruleData,
				)
			}
		} else {
			log.Warnw("No data unpacked", "unpackedData", unpackedData)
		}

		return Entitlement{
			EntitlementType:   rawEntitlement.EntitlementType,
			RuleEntitlementV2: &ruleData,
		}, nil
	} else if rawEntitlement.EntitlementType == ModuleTypeUserEntitlement {
		abiDef := `[{"name":"getAddresses","outputs":[{"type":"address[]","name":"out"}],"constant":true,"payable":false,"type":"function"}]`

		// Parse the ABI definition
		parsedABI, err := abi.JSON(strings.NewReader(abiDef))
		if err != nil {
			return Entitlement{}, err
		}
		var addresses []common.Address
		// Unpack the data
		err = parsedABI.UnpackIntoInterface(&addresses, "getAddresses", rawEntitlement.EntitlementData)
		if err != nil {
			return Entitlement{}, err
		}
		return Entitlement{
			EntitlementType: rawEntitlement.EntitlementType,
			UserEntitlement: addresses,
		}, nil
	}

	return Entitlement{}, fmt.Errorf("invalid entitlement type '%s'", rawEntitlement.EntitlementType)
}

type ThresholdParams struct {
	Threshold *big.Int
}

var thresholdParamsType, _ = abi.NewType("tuple", "ThresholdParams", []abi.ArgumentMarshaling{
	{Name: "threshold", Type: "uint256"},
})

func (t *ThresholdParams) AbiEncode() ([]byte, error) {
	value := abi.Arguments{{Type: thresholdParamsType}}
	return value.Pack(t)
}

func DecodeThresholdParams(data []byte) (*ThresholdParams, error) {
	value := abi.Arguments{{Type: thresholdParamsType}}
	unpacked, err := value.Unpack(data)
	if err != nil {
		return nil, err
	}

	params := ThresholdParams{}
	abi.ConvertType(unpacked[0], &params)
	return &params, nil
}

type ERC1155Params struct {
	Threshold *big.Int `json:"threshold"`
	TokenId   *big.Int `json:"tokenId"`
}

var erc1155ParamsType, _ = abi.NewType("tuple", "ERC1155Params", []abi.ArgumentMarshaling{
	{Name: "threshold", Type: "uint256"},
	{Name: "tokenId", Type: "uint256"},
})

func (t *ERC1155Params) AbiEncode() ([]byte, error) {
	value := abi.Arguments{{Type: erc1155ParamsType}}
	return value.Pack(t)
}

func DecodeERC1155Params(data []byte) (*ERC1155Params, error) {
	value := abi.Arguments{{Type: erc1155ParamsType, Name: "params"}}
	unpacked, err := value.Unpack(data)
	if err != nil {
		return nil, err
	}
	params := ERC1155Params{}
	abi.ConvertType(unpacked[0], &params)
	return &params, nil
}

func ConvertV1RuleDataToV2(
	ctx context.Context,
	ruleData *base.IRuleEntitlementBaseRuleData,
) (*base.IRuleEntitlementBaseRuleDataV2, error) {
	var ruleDataV2 base.IRuleEntitlementBaseRuleDataV2

	// Straight copy of base operations and logical operations
	ruleDataV2.Operations = make([]base.IRuleEntitlementBaseOperation, len(ruleData.Operations))
	copy(ruleDataV2.Operations, ruleData.Operations)

	ruleDataV2.LogicalOperations = make([]base.IRuleEntitlementBaseLogicalOperation, len(ruleData.LogicalOperations))
	copy(ruleDataV2.LogicalOperations, ruleData.LogicalOperations)

	// Convert checkops
	ruleDataV2.CheckOperations = make([]base.IRuleEntitlementBaseCheckOperationV2, len(ruleData.CheckOperations))
	for i, checkOp := range ruleData.CheckOperations {
		ruleDataV2.CheckOperations[i] = base.IRuleEntitlementBaseCheckOperationV2{
			OpType:          checkOp.OpType,
			ChainId:         checkOp.ChainId,
			ContractAddress: checkOp.ContractAddress,
		}

		switch CheckOperationType(checkOp.OpType) {
		// All of the following check operations require a threshold
		case MOCK:
			fallthrough
		case ERC20:
			fallthrough
		case ERC721:
			fallthrough
		case ETH_BALANCE:
			params, err := (&ThresholdParams{
				Threshold: checkOp.Threshold,
			}).AbiEncode()
			if err != nil {
				return nil, err
			}
			ruleDataV2.CheckOperations[i].Params = params

		// ERC1155 requires a threshold and a tokenId
		case ERC1155:
			return nil, fmt.Errorf("ERC1155 not supported by V1 rule data")

		// ISENTITLED, CheckNone do not require params
		case ISENTITLED:
			fallthrough
		case CheckNONE:
			continue

		default:
			return nil, fmt.Errorf("unknown operation %v", checkOp.OpType)
		}
	}
	return &ruleDataV2, nil
}
