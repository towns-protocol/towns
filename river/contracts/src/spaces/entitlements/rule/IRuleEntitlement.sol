// SPDX-License-Identifier: MIT

/**
 * @title EntitlementRule
 * @dev This contract manages entitlement rules based on blockchain operations.
 * The contract maintains a tree-like data structure to combine various types of operations.
 * The tree is implemented as a dynamic array of 'Operation' structs, and is built in post-order fashion.
 *
 * Post-order Tree Structure:
 * In a post-order binary tree, children nodes must be added before their respective parent nodes.
 * The 'LogicalOperation' nodes refer to their child nodes via indices in the 'operations' array.
 * As new LogicalOperation nodes are added, they can only reference existing nodes in the 'operations' array,
 * ensuring a valid post-order tree structure.
 */
pragma solidity ^0.8.24;

import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

interface IRuleEntitlement is IEntitlement {
  enum CheckOperationType {
    NONE,
    MOCK,
    ERC20,
    ERC721,
    ERC1155,
    ISENTITLED
  }

  struct CheckOperation {
    CheckOperationType opType;
    uint256 chainId;
    address contractAddress;
    uint256 threshold;
  }

  // Enum for Operation oneof operation_clause
  enum LogicalOperationType {
    NONE,
    AND,
    OR
  }

  struct LogicalOperation {
    LogicalOperationType logOpType;
    uint8 leftOperationIndex;
    uint8 rightOperationIndex;
  }

  // Redefined Operation struct
  enum CombinedOperationType {
    NONE,
    CHECK,
    LOGICAL
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

  function encodeRuleData(
    RuleData memory data
  ) external pure returns (bytes memory);

  function getRuleData(
    uint256 roleId
  ) external view returns (RuleData memory data);

  function getOperations(
    uint256 roleId
  ) external view returns (Operation[] memory);

  function getLogicalOperations(
    uint256 roleId
  ) external view returns (LogicalOperation[] memory);

  function getCheckOperations(
    uint256 roleId
  ) external view returns (CheckOperation[] memory);

  error CheckOperationsLimitReaced(uint256 limit);
  error OperationsLimitReached(uint256 limit);
  error LogicalOperationLimitReached(uint256 limit);
  error InvalidCheckOperationIndex(
    uint8 operationIndex,
    uint8 checkOperationsLength
  );
  error InvalidLogicalOperationIndex(
    uint8 operationIndex,
    uint8 logicalOperationsLength
  );
  error InvalidOperationType(IRuleEntitlement.CombinedOperationType opType);
  error InvalidLeftOperationIndex(
    uint8 leftOperationIndex,
    uint8 currentOperationIndex
  );
  error InvalidRightOperationIndex(
    uint8 rightOperationIndex,
    uint8 currentOperationIndex
  );
}
