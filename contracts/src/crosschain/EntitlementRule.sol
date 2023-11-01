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
pragma solidity ^0.8.0;

// interfaces
import {IEntitlementRule} from "./IEntitlementRule.sol";
import "forge-std/console.sol";

contract EntitlementRule is IEntitlementRule {
  // Separate storage arrays for CheckOperation and LogicalOperation
  CheckOperation[] private checkOperations;
  LogicalOperation[] private logicalOperations;

  // New struct to manage the operations

  // Dynamic array to store Operation instances
  Operation[] private operations;

  function setEntitilement(
    Operation[] memory _operations,
    CheckOperation[] memory _checkOperations,
    LogicalOperation[] memory _logicalOperations
  ) public {
    // Step 1: Validate Operation against CheckOperation and LogicalOperation
    for (uint i = 0; i < _operations.length; i++) {
      if (_operations[i].opType == CombinedOperationType.CHECK) {
        if (_operations[i].index >= _checkOperations.length) {
          revert InvalidCheckOperationIndex(
            _operations[i].index,
            uint8(_checkOperations.length)
          );
        }
      } else if (_operations[i].opType == CombinedOperationType.LOGICAL) {
        // Use custom error in revert statement
        if (_operations[i].index >= _logicalOperations.length) {
          revert InvalidLogicalOperationIndex(
            _operations[i].index,
            uint8(_logicalOperations.length)
          );
        }
        // Verify the logical operations make a DAG
        uint8 leftOperationIndex = _logicalOperations[_operations[i].index]
          .leftOperationIndex;
        uint8 rightOperationIndex = _logicalOperations[_operations[i].index]
          .rightOperationIndex;

        // Use custom errors in revert statements
        if (leftOperationIndex >= i) {
          revert InvalidLeftOperationIndex(leftOperationIndex, uint8(i));
        }
        if (rightOperationIndex >= i) {
          console.log(
            "InvalidRightOperationIndex",
            rightOperationIndex,
            uint8(i)
          );
          revert InvalidRightOperationIndex(rightOperationIndex, uint8(i));
        }
      } else {
        revert InvalidOperationType(_operations[i].opType);
      }
    }

    // All checks passed; initialize state variables
    // Manually copy _checkOperations to checkOperations
    for (uint i = 0; i < _checkOperations.length; i++) {
      checkOperations.push(_checkOperations[i]);
    }

    // Manually copy _logicalOperations to logicalOperations
    for (uint i = 0; i < _logicalOperations.length; i++) {
      logicalOperations.push(_logicalOperations[i]);
    }

    // Manually copy _operations to operations
    for (uint i = 0; i < _operations.length; i++) {
      operations.push(_operations[i]);
    }
  }

  function getOperations() external view returns (Operation[] memory) {
    return operations;
  }

  function getLogicalOperations()
    external
    view
    returns (LogicalOperation[] memory)
  {
    return logicalOperations;
  }

  function getCheckOperations()
    external
    view
    returns (CheckOperation[] memory)
  {
    return checkOperations;
  }
}
