// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";
import {RuleEntitlementV2} from "contracts/src/spaces/entitlements/rule/RuleEntitlementV2.sol";

import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement, IRuleEntitlementV2, IRuleEntitlementBase} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract RuleEntitlementV2Test is
  TestUtils,
  IEntitlementBase,
  IRuleEntitlementBase
{
  RuleEntitlement internal implementation;
  RuleEntitlement internal ruleEntitlement;

  RuleEntitlementV2 internal implementationV2;
  RuleEntitlementV2 internal ruleEntitlementV2;

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

  modifier givenRuleV1EntitlementIsSet() {
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

  function test_upgradeToRuleV2() external givenRuleV1EntitlementIsSet {
    // Validate Rule V1 exists
    ruleEntitlement.getRuleData(roleId);

    assertFalse(
      ruleEntitlement.supportsInterface(type(IRuleEntitlementV2).interfaceId)
    );

    // Upgrade to Rule V2
    vm.startPrank(deployer);
    implementationV2 = new RuleEntitlementV2();
    vm.stopPrank();

    vm.prank(space);
    UUPSUpgradeable(entitlement).upgradeToAndCall(
      address(implementationV2),
      ""
    );

    ruleEntitlementV2 = RuleEntitlementV2(entitlement);

    assertTrue(
      ruleEntitlementV2.supportsInterface(type(IRuleEntitlementV2).interfaceId)
    );

    RuleData memory ruleData = ruleEntitlementV2.getRuleData(roleId);
    assertTrue(ruleData.operations.length > 0);

    RuleDataV2 memory ruleDataV2 = ruleEntitlementV2.getRuleDataV2(roleId);
    assertTrue(ruleDataV2.operations.length == 0);

    // Set Rule V2
    vm.prank(space);
    ruleEntitlementV2.setEntitlement(roleId, abi.encode(_createRuleDataV2()));

    // Validate Rule V2 exists and Rule V1 does not
    ruleDataV2 = ruleEntitlementV2.getRuleDataV2(roleId);
    assertTrue(ruleDataV2.operations.length > 0);

    ruleData = ruleEntitlementV2.getRuleData(roleId);
    assertTrue(ruleData.operations.length == 0);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _createRuleDataV2()
    internal
    view
    returns (RuleDataV2 memory ruleData)
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
    ruleData = RuleDataV2(operations, checkOperations, logicalOperations);
  }
}
