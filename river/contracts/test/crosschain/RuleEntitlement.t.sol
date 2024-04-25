// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract EntitlementGatedTest is TestUtils {
  RuleEntitlement internal implementation;
  RuleEntitlement internal ruleEntitlement;

  address internal entitlement;
  address internal deployer;
  address internal space;

  function setUp() public {
    deployer = _randomAddress();
    space = _randomAddress();

    vm.startPrank(deployer);
    implementation = new RuleEntitlement();
    entitlement = address(
      new ERC1967Proxy(
        address(implementation),
        abi.encodeCall(RuleEntitlement.initialize, (space))
      )
    );

    ruleEntitlement = RuleEntitlement(entitlement);
    vm.stopPrank();
  }

  // =============================================================
  //                  Request Entitlement Check
  // =============================================================
  function test_makeBasicEntitlementRule() external {
    IRuleEntitlement.Operation[]
      memory operations = new IRuleEntitlement.Operation[](3);
    IRuleEntitlement.CheckOperation[]
      memory checkOperations = new IRuleEntitlement.CheckOperation[](2);
    IRuleEntitlement.LogicalOperation[]
      memory logicalOperations = new IRuleEntitlement.LogicalOperation[](1);
    checkOperations[0] = IRuleEntitlement.CheckOperation(
      IRuleEntitlement.CheckOperationType.ERC20,
      1,
      address(0x12),
      100
    );
    checkOperations[1] = IRuleEntitlement.CheckOperation(
      IRuleEntitlement.CheckOperationType.ERC721,
      1,
      address(0x23),
      100
    );
    logicalOperations[0] = IRuleEntitlement.LogicalOperation(
      IRuleEntitlement.LogicalOperationType.AND,
      0,
      1
    );
    operations[0] = IRuleEntitlement.Operation(
      IRuleEntitlement.CombinedOperationType.CHECK,
      0
    );
    operations[1] = IRuleEntitlement.Operation(
      IRuleEntitlement.CombinedOperationType.CHECK,
      1
    );
    operations[2] = IRuleEntitlement.Operation(
      IRuleEntitlement.CombinedOperationType.LOGICAL,
      0
    );

    IRuleEntitlement.RuleData memory ruleData = IRuleEntitlement.RuleData(
      operations,
      checkOperations,
      logicalOperations
    );

    bytes memory encodedData = abi.encode(ruleData);

    vm.prank(space);

    ruleEntitlement.setEntitlement(0, encodedData);
    IRuleEntitlement.Operation[] memory ruleOperations = ruleEntitlement
      .getOperations(0);
    assertEq(ruleOperations.length, 3);
    vm.stopPrank();
  }

  // =============================================================
  //                  Request Entitlement Check
  // =============================================================
  function test_revertOnDirectionFailureEntitlementRule() external {
    IRuleEntitlement.Operation[]
      memory operations = new IRuleEntitlement.Operation[](4);
    IRuleEntitlement.CheckOperation[]
      memory checkOperations = new IRuleEntitlement.CheckOperation[](2);
    IRuleEntitlement.LogicalOperation[]
      memory logicalOperations = new IRuleEntitlement.LogicalOperation[](2);
    checkOperations[0] = IRuleEntitlement.CheckOperation(
      IRuleEntitlement.CheckOperationType.ERC20,
      1,
      address(0x12),
      100
    );
    checkOperations[1] = IRuleEntitlement.CheckOperation(
      IRuleEntitlement.CheckOperationType.ERC721,
      1,
      address(0x21),
      100
    );
    // This operation is referring to a parent so will revert
    logicalOperations[0] = IRuleEntitlement.LogicalOperation(
      IRuleEntitlement.LogicalOperationType.AND,
      0,
      3
    );
    logicalOperations[1] = IRuleEntitlement.LogicalOperation(
      IRuleEntitlement.LogicalOperationType.AND,
      0,
      1
    );
    operations[0] = IRuleEntitlement.Operation(
      IRuleEntitlement.CombinedOperationType.CHECK,
      0
    );
    operations[1] = IRuleEntitlement.Operation(
      IRuleEntitlement.CombinedOperationType.CHECK,
      1
    );
    operations[2] = IRuleEntitlement.Operation(
      IRuleEntitlement.CombinedOperationType.LOGICAL,
      0
    );
    operations[3] = IRuleEntitlement.Operation(
      IRuleEntitlement.CombinedOperationType.LOGICAL,
      1
    );

    IRuleEntitlement.RuleData memory ruleData = IRuleEntitlement.RuleData(
      operations,
      checkOperations,
      logicalOperations
    );

    bytes memory encodedData = abi.encode(ruleData);

    vm.expectRevert(
      abi.encodeWithSelector(
        IRuleEntitlement.InvalidRightOperationIndex.selector,
        3,
        2
      )
    );
    //rule.initialize();
    vm.prank(space);
    ruleEntitlement.setEntitlement(0, encodedData);

    IRuleEntitlement.Operation[] memory ruleOperations = ruleEntitlement
      .getOperations(uint256(0));
    assertEq(ruleOperations.length, 0);
  }
}
