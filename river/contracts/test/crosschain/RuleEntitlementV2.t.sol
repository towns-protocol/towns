// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RuleEntitlementV2} from "contracts/src/spaces/entitlements/rule/RuleEntitlementV2.sol";
import {IRuleEntitlementV2} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {RuleEntitlementTest} from "./RuleEntitlement.t.sol";

contract RuleEntitlementV2Test is RuleEntitlementTest {
  uint256 internal constant ENTITLEMENT_V2_SLOT =
    0xa7ba26993e5aed586ba0b4d511980a49b23ea33e13d5f0920b7e42ae1a27cc00;

  RuleEntitlementV2 internal ruleEntitlementV2;

  function setUp() public override {
    super.setUp();
    ruleEntitlementV2 = RuleEntitlementV2(entitlement);
  }

  function test_upgradeToRuleV2() public {
    setRuleEntitlement();

    // Validate Rule V1 exists
    RuleData memory ruleData = ruleEntitlement.getRuleData(roleId);
    assertTrue(ruleData.operations.length > 0);

    assertFalse(
      ruleEntitlement.supportsInterface(type(IRuleEntitlementV2).interfaceId)
    );

    // Upgrade to Rule V2
    vm.prank(deployer);
    RuleEntitlementV2 implementationV2 = new RuleEntitlementV2();

    vm.prank(space);
    UUPSUpgradeable(entitlement).upgradeToAndCall(
      address(implementationV2),
      ""
    );

    // Rule V1 persists after upgrade
    assertEq(
      abi.encode(ruleEntitlementV2.getRuleData(roleId)),
      abi.encode(ruleData)
    );

    assertTrue(
      ruleEntitlementV2.supportsInterface(type(IRuleEntitlementV2).interfaceId)
    );
  }

  function test_setRuleEntitlement() public override {
    test_upgradeToRuleV2();

    RuleDataV2 memory ruleDataV2 = ruleEntitlementV2.getRuleDataV2(roleId);
    assertTrue(ruleDataV2.operations.length == 0);

    // Set Rule V2
    bytes memory encodedData = _createRuleDataV2();
    vm.prank(space);
    ruleEntitlementV2.setEntitlement(roleId, encodedData);

    // Validate Rule V2 exists and Rule V1 does not
    assertEq(ruleEntitlementV2.getEntitlementDataByRoleId(roleId), encodedData);

    RuleData memory ruleData = ruleEntitlementV2.getRuleData(roleId);
    assertTrue(ruleData.operations.length == 0);

    bytes32 slot = getMappingValueSlot(roleId, ENTITLEMENTS_SLOT);
    bytes32 grantedBy = vm.load(entitlement, slot);
    assertEq(grantedBy, bytes32(0));
    bytes32 grantedTime = vm.load(entitlement, bytes32(uint256(slot) + 1));
    assertEq(grantedTime, bytes32(0));
    assertEq(vm.getMappingLength(entitlement, bytes32(ENTITLEMENTS_SLOT)), 0);
  }

  function test_setRuleEntitlement_revertOnEmptyRuleData() public {
    test_upgradeToRuleV2();

    vm.expectRevert(Entitlement__InvalidValue.selector);

    vm.prank(space);

    ruleEntitlementV2.setEntitlement(roleId, "");
  }

  function test_setRuleEntitlement_revertOnZeroLengthRuleData() public {
    test_upgradeToRuleV2();

    vm.expectRevert(Entitlement__InvalidValue.selector);

    vm.prank(space);

    RuleDataV2 memory ruleDataV2;
    ruleEntitlementV2.setEntitlement(roleId, abi.encode(ruleDataV2));
  }

  function test_removeRuleEntitlement() external override {
    test_setRuleEntitlement();

    vm.prank(space);
    ruleEntitlementV2.removeEntitlement(roleId);

    RuleDataV2 memory emptyRuleData = RuleDataV2(
      new Operation[](0),
      new CheckOperationV2[](0),
      new LogicalOperation[](0)
    );
    RuleDataV2 memory ruleData = ruleEntitlementV2.getRuleDataV2(roleId);
    assertEq(abi.encode(ruleData), abi.encode(emptyRuleData));

    assertEq(ruleEntitlementV2.getEntitlementDataByRoleId(roleId).length, 0);

    bytes32 slot = getMappingValueSlot(roleId, ENTITLEMENT_V2_SLOT);
    bytes32 grantedBy = vm.load(entitlement, slot);
    assertEq(grantedBy, bytes32(0));
    bytes32 grantedTime = vm.load(entitlement, bytes32(uint256(slot) + 1));
    assertEq(grantedTime, bytes32(0));
    assertEq(vm.getMappingLength(entitlement, bytes32(ENTITLEMENT_V2_SLOT)), 0);
  }

  function test_fuzz_revertWhenNotAllowedToRemove(
    address caller
  ) external override {
    test_upgradeToRuleV2();

    vm.assume(caller != space);
    vm.expectRevert(Entitlement__NotAllowed.selector);
    vm.prank(caller);
    ruleEntitlementV2.removeEntitlement(roleId);
  }

  function test_revertOnDirectionFailureEntitlementRule() external override {
    test_upgradeToRuleV2();

    Operation[] memory operations = new Operation[](4);
    CheckOperationV2[] memory checkOperations = new CheckOperationV2[](2);
    LogicalOperation[] memory logicalOperations = new LogicalOperation[](2);
    checkOperations[0] = CheckOperationV2(
      CheckOperationType.ERC20,
      31337,
      address(0x12),
      abi.encode(uint256(100))
    );
    checkOperations[1] = CheckOperationV2(
      CheckOperationType.ERC721,
      31337,
      address(0x21),
      abi.encode(uint256(100))
    );
    // This operation is referring to a parent so will revert
    logicalOperations[0] = LogicalOperation(LogicalOperationType.AND, 0, 3);
    logicalOperations[1] = LogicalOperation(LogicalOperationType.AND, 0, 1);
    operations[0] = Operation(CombinedOperationType.CHECK, 0);
    operations[1] = Operation(CombinedOperationType.CHECK, 1);
    operations[2] = Operation(CombinedOperationType.LOGICAL, 0);
    operations[3] = Operation(CombinedOperationType.LOGICAL, 1);

    RuleDataV2 memory ruleData = RuleDataV2(
      operations,
      checkOperations,
      logicalOperations
    );

    bytes memory encodedData = abi.encode(ruleData);

    vm.expectRevert(
      abi.encodeWithSelector(InvalidRightOperationIndex.selector, 3, 2)
    );

    vm.prank(space);
    ruleEntitlementV2.setEntitlement(0, encodedData);

    Operation[] memory ruleOperations = ruleEntitlementV2
      .getRuleDataV2(0)
      .operations;
    assertEq(ruleOperations.length, 0);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _createRuleDataV2()
    internal
    view
    returns (bytes memory encodedData)
  {
    uint256 chainId = block.chainid;
    address erc20Contract = _randomAddress();
    address erc721Contract = _randomAddress();
    bytes memory params = "";

    // we have 3 operations total
    Operation[] memory operations = new Operation[](3);

    // we have 2 check operations
    CheckOperationV2[] memory checkOperations = new CheckOperationV2[](2);

    // and 1 logical operation
    LogicalOperation[] memory logicalOperations = new LogicalOperation[](1);

    // for the first check operation, we are checking ERC20 balance of 100 on chain 31337
    checkOperations[0] = CheckOperationV2(
      CheckOperationType.ERC20,
      chainId,
      erc20Contract,
      params
    );

    // for the second check operation, we are checking ERC721 balance of 100 on chain 31337
    checkOperations[1] = CheckOperationV2(
      CheckOperationType.ERC721,
      chainId,
      erc721Contract,
      params
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
    RuleDataV2 memory ruleData = RuleDataV2(
      operations,
      checkOperations,
      logicalOperations
    );

    encodedData = abi.encode(ruleData);
  }
}
