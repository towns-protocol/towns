// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

import {EntitlementRule} from "contracts/src/crosschain/EntitlementRule.sol";
import {IEntitlementRule} from "contracts/src/crosschain/IEntitlementRule.sol";

contract EntitlementGatedTest is TestUtils {
  // =============================================================
  //                  Request Entitlement Check
  // =============================================================
  function test_makeBasicEntitlementRule() external {
    IEntitlementRule.Operation[]
      memory operations = new IEntitlementRule.Operation[](3);
    IEntitlementRule.CheckOperation[]
      memory checkOperations = new IEntitlementRule.CheckOperation[](2);
    IEntitlementRule.LogicalOperation[]
      memory logicalOperations = new IEntitlementRule.LogicalOperation[](1);
    checkOperations[0] = IEntitlementRule.CheckOperation(
      IEntitlementRule.CheckOperationType.ERC20,
      1,
      address(0x12),
      100
    );
    checkOperations[1] = IEntitlementRule.CheckOperation(
      IEntitlementRule.CheckOperationType.ERC721,
      1,
      address(0x23),
      100
    );
    logicalOperations[0] = IEntitlementRule.LogicalOperation(
      IEntitlementRule.LogicalOperationType.AND,
      0,
      1
    );
    operations[0] = IEntitlementRule.Operation(
      IEntitlementRule.CombinedOperationType.CHECK,
      0
    );
    operations[1] = IEntitlementRule.Operation(
      IEntitlementRule.CombinedOperationType.CHECK,
      1
    );
    operations[2] = IEntitlementRule.Operation(
      IEntitlementRule.CombinedOperationType.LOGICAL,
      0
    );
    EntitlementRule rule = new EntitlementRule();
    rule.setEntitilement(operations, checkOperations, logicalOperations);
    IEntitlementRule.Operation[] memory ruleOperations = rule.getOperations();
    assertEq(ruleOperations.length, 3);
  }

  // =============================================================
  //                  Request Entitlement Check
  // =============================================================
  function test_revertOnDirectionFailureEntitlementRule() external {
    IEntitlementRule.Operation[]
      memory operations = new IEntitlementRule.Operation[](4);
    IEntitlementRule.CheckOperation[]
      memory checkOperations = new IEntitlementRule.CheckOperation[](2);
    IEntitlementRule.LogicalOperation[]
      memory logicalOperations = new IEntitlementRule.LogicalOperation[](2);
    checkOperations[0] = IEntitlementRule.CheckOperation(
      IEntitlementRule.CheckOperationType.ERC20,
      1,
      address(0x12),
      100
    );
    checkOperations[1] = IEntitlementRule.CheckOperation(
      IEntitlementRule.CheckOperationType.ERC721,
      1,
      address(0x21),
      100
    );
    // This operation is referring to a parent so will revert
    logicalOperations[0] = IEntitlementRule.LogicalOperation(
      IEntitlementRule.LogicalOperationType.AND,
      0,
      3
    );
    logicalOperations[1] = IEntitlementRule.LogicalOperation(
      IEntitlementRule.LogicalOperationType.AND,
      0,
      1
    );
    operations[0] = IEntitlementRule.Operation(
      IEntitlementRule.CombinedOperationType.CHECK,
      0
    );
    operations[1] = IEntitlementRule.Operation(
      IEntitlementRule.CombinedOperationType.CHECK,
      1
    );
    operations[2] = IEntitlementRule.Operation(
      IEntitlementRule.CombinedOperationType.LOGICAL,
      0
    );
    operations[3] = IEntitlementRule.Operation(
      IEntitlementRule.CombinedOperationType.LOGICAL,
      1
    );

    EntitlementRule rule = new EntitlementRule();
    vm.expectRevert(
      abi.encodeWithSelector(
        IEntitlementRule.InvalidRightOperationIndex.selector,
        3,
        2
      )
    );
    rule.setEntitilement(operations, checkOperations, logicalOperations);
    IEntitlementRule.Operation[] memory ruleOperations = rule.getOperations();
    assertEq(ruleOperations.length, 0);
  }
}
