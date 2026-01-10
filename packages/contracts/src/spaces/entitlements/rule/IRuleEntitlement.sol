// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IEntitlement} from "src/spaces/entitlements/IEntitlement.sol";

/**
 * @title RuleEntitlement
 * @dev This contract manages entitlement rules based on blockchain operations.
 * The contract maintains a tree-like data structure to combine various types of operations.
 * The tree is implemented as a dynamic array of 'Operation' structs, and is built in post-order
 * fashion.
 *
 * Post-order Tree Structure:
 * In a post-order binary tree, children nodes must be added before their respective parent nodes.
 * The 'LogicalOperation' nodes refer to their child nodes via indices in the 'operations' array.
 * As new LogicalOperation nodes are added, they can only reference existing nodes in the
 * 'operations' array,
 * ensuring a valid post-order tree structure.
 */
interface IRuleEntitlementBase {
    // =============================================================
    //                           Enums
    // =============================================================
    enum CheckOperationType {
        NONE,
        MOCK,
        ERC20,
        ERC721,
        ERC1155,
        ISENTITLED,
        ETH_BALANCE
    }

    // Enum for Operation oneof operation_clause
    enum LogicalOperationType {
        NONE,
        AND,
        OR
    }

    // Redefined Operation struct
    enum CombinedOperationType {
        NONE,
        CHECK,
        LOGICAL
    }

    // =============================================================
    //                           Structs
    // =============================================================
    struct CheckOperation {
        CheckOperationType opType;
        uint256 chainId;
        address contractAddress;
        uint256 threshold;
    }

    struct CheckOperationV2 {
        CheckOperationType opType;
        uint256 chainId;
        address contractAddress;
        bytes params;
    }

    struct LogicalOperation {
        LogicalOperationType logOpType;
        uint8 leftOperationIndex;
        uint8 rightOperationIndex;
    }

    struct Operation {
        CombinedOperationType opType;
        uint8 index; // Index in either checkOperations or logicalOperations arrays
    }

    struct RuleData {
        Operation[] operations;
        CheckOperation[] checkOperations;
        LogicalOperation[] logicalOperations;
    }

    struct RuleDataV2 {
        Operation[] operations;
        CheckOperationV2[] checkOperations;
        LogicalOperation[] logicalOperations;
    }

    struct Entitlement {
        address grantedBy;
        uint256 grantedTime;
        RuleData data;
    }

    struct EntitlementV2 {
        address grantedBy;
        uint256 grantedTime;
        bytes data;
    }

    // Parameters are not used in contracts but are defined here for documentation purposes.
    struct MockParams {
        uint256 threshold; // used for testing
    }

    struct ERC20Params {
        uint256 threshold;
    }

    struct ERC721Params {
        uint256 threshold;
    }

    struct ERC1155Params {
        uint256 threshold;
        uint256 tokenId;
    }

    struct NativeCoinBalanceParams {
        uint256 threshold;
    }

    // =============================================================
    //                           Errors
    // =============================================================
    error CheckOperationsLimitReaced(uint256 limit);
    error OperationsLimitReached(uint256 limit);
    error LogicalOperationLimitReached(uint256 limit);
    error InvalidCheckOperationIndex(uint8 operationIndex, uint8 checkOperationsLength);
    error InvalidLogicalOperationIndex(uint8 operationIndex, uint8 logicalOperationsLength);
    error InvalidOperationType(CombinedOperationType opType);
    error InvalidLeftOperationIndex(uint8 leftOperationIndex, uint8 currentOperationIndex);
    error InvalidRightOperationIndex(uint8 rightOperationIndex, uint8 currentOperationIndex);
}

interface IRuleEntitlementV2 is IRuleEntitlementBase, IEntitlement {
    // =============================================================
    //                           Functions
    // =============================================================

    /**
     * @notice Encodes the RuleData struct into bytes
     * @param data RuleData struct to encode
     * @return Encoded bytes of the RuleData struct
     */
    function encodeRuleData(RuleDataV2 memory data) external pure returns (bytes memory);

    /**
     * @notice Decodes the RuleDataV2 struct from bytes
     * @param roleId Role ID
     * @return data RuleDataV2 struct
     */
    function getRuleDataV2(uint256 roleId) external view returns (RuleDataV2 memory data);
}

interface IRuleEntitlement is IRuleEntitlementBase, IEntitlement {
    // =============================================================
    //                           Functions
    // =============================================================

    /**
     * @notice Encodes the RuleData struct into bytes
     * @param data RuleData struct to encode
     * @return Encoded bytes of the RuleData struct
     */
    function encodeRuleData(RuleData memory data) external pure returns (bytes memory);

    /**
     * @notice Decodes the RuleData struct from bytes
     * @param roleId Role ID
     * @return data RuleData struct
     */
    function getRuleData(uint256 roleId) external view returns (RuleData memory data);
}
