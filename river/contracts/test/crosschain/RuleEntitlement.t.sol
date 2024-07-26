// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlementBase} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RuleEntitlementTest is
  TestUtils,
  IEntitlementBase,
  IRuleEntitlementBase
{
  RuleEntitlement internal implementation;
  RuleEntitlement internal ruleEntitlement;

  address internal entitlement;
  address internal deployer;
  address internal space;
  uint256 internal roleId = 0;

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
    vm.stopPrank();

    ruleEntitlement = RuleEntitlement(entitlement);
  }

  modifier givenRuleEntitlementIsSet() {
    uint256 chainId = block.chainid;
    address erc20Contract = _randomAddress();
    address erc721Contract = _randomAddress();
    uint256 threshold = 100;

    // we have 3 operations total
    Operation[] memory operations = new Operation[](3);

    // we have 2 check operations
    CheckOperation[] memory checkOperations = new CheckOperation[](2);

    // and 1 logical operation
    LogicalOperation[] memory logicalOperations = new LogicalOperation[](1);

    // for the first check operation, we are checking ERC20 balance of 100 on chain 31337
    checkOperations[0] = CheckOperation(
      CheckOperationType.ERC20,
      chainId,
      erc20Contract,
      threshold
    );

    // for the second check operation, we are checking ERC721 balance of 100 on chain 31337
    checkOperations[1] = CheckOperation(
      CheckOperationType.ERC721,
      chainId,
      erc721Contract,
      threshold
    );

    // we are combining the two check operations with an AND operation so both must pass
    logicalOperations[0] = LogicalOperation(LogicalOperationType.AND, 0, 1);

    // the first operation is a check operation
    operations[0] = Operation(CombinedOperationType.CHECK, 0);

    // the second operation is a check operation
    operations[1] = Operation(CombinedOperationType.CHECK, 1);

    // the third operation is a logical operation
    operations[2] = Operation(CombinedOperationType.LOGICAL, 0);

    // we are combining all the operations into a rule data struct
    RuleData memory ruleData = RuleData(
      operations,
      checkOperations,
      logicalOperations
    );

    bytes memory encodedData = abi.encode(ruleData);

    vm.prank(space);
    ruleEntitlement.setEntitlement(roleId, encodedData);
    _;
  }

  function test_setRuleEntitlement() external givenRuleEntitlementIsSet {
    Operation[] memory ruleOperations = ruleEntitlement
      .getRuleData(roleId)
      .operations;
    assertEq(ruleOperations.length, 3);
  }

  function test_removeRuleEntitlement() external givenRuleEntitlementIsSet {
    vm.prank(space);
    ruleEntitlement.removeEntitlement(roleId);

    RuleData memory ruleData = ruleEntitlement.getRuleData(roleId);

    assertEq(ruleData.operations.length, 0);
  }

  function test_revertWhenNotAllowedToRemove()
    external
    givenRuleEntitlementIsSet
  {
    vm.expectRevert(Entitlement__NotAllowed.selector);
    vm.prank(_randomAddress());
    ruleEntitlement.removeEntitlement(roleId);
  }

  // =============================================================
  //                  Request Entitlement Check
  // =============================================================
  function test_revertOnDirectionFailureEntitlementRule() external {
    Operation[] memory operations = new Operation[](4);
    CheckOperation[] memory checkOperations = new CheckOperation[](2);
    LogicalOperation[] memory logicalOperations = new LogicalOperation[](2);
    checkOperations[0] = CheckOperation(
      CheckOperationType.ERC20,
      31337,
      address(0x12),
      100
    );
    checkOperations[1] = CheckOperation(
      CheckOperationType.ERC721,
      31337,
      address(0x21),
      100
    );
    // This operation is referring to a parent so will revert
    logicalOperations[0] = LogicalOperation(LogicalOperationType.AND, 0, 3);
    logicalOperations[1] = LogicalOperation(LogicalOperationType.AND, 0, 1);
    operations[0] = Operation(CombinedOperationType.CHECK, 0);
    operations[1] = Operation(CombinedOperationType.CHECK, 1);
    operations[2] = Operation(CombinedOperationType.LOGICAL, 0);
    operations[3] = Operation(CombinedOperationType.LOGICAL, 1);

    RuleData memory ruleData = RuleData(
      operations,
      checkOperations,
      logicalOperations
    );

    bytes memory encodedData = abi.encode(ruleData);

    vm.expectRevert(
      abi.encodeWithSelector(InvalidRightOperationIndex.selector, 3, 2)
    );

    vm.prank(space);
    ruleEntitlement.setEntitlement(0, encodedData);

    Operation[] memory ruleOperations = ruleEntitlement
      .getRuleData(uint256(0))
      .operations;
    assertEq(ruleOperations.length, 0);
  }
}
