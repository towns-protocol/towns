// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {INodeRegistry} from "contracts/src/river/registry/facets/node/INodeRegistry.sol";
import {IOperatorRegistry} from "contracts/src/river/registry/facets/operator/IOperatorRegistry.sol";
import {IRiverConfig} from "contracts/src/river/registry/facets/config/IRiverConfig.sol";

// structs
import {NodeStatus, Node, Setting} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts

// deployments
import {RiverRegistryBaseSetup} from "contracts/test/river/registry/RiverRegistryBaseSetup.t.sol";

contract OperatorRegistryTest is RiverRegistryBaseSetup, IOwnableBase {
  // =============================================================
  //                           approveOperator
  // =============================================================

  function test_approveOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    assertTrue(operatorRegistry.isOperator(nodeOperator));
  }

  function test_revertWhen_approveOperatorWithZeroAddress() external {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_ARG));
    operatorRegistry.approveOperator(address(0));
  }

  function test_revertWhen_approveOperatorWithAlreadyApprovedOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.ALREADY_EXISTS));
    operatorRegistry.approveOperator(nodeOperator);
  }

  function test_revertWhen_approveOperatorWithNonOwner(
    address nonOwner,
    address nodeOperator
  ) external {
    vm.assume(nonOwner != address(0));
    vm.assume(nodeOperator != address(0));
    vm.assume(nonOwner != deployer);
    vm.assume(nonOwner != nodeOperator);

    vm.prank(nonOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, nonOwner)
    );
    operatorRegistry.approveOperator(nodeOperator);
  }

  // =============================================================
  //                           removeOperator
  // =============================================================
  function test_removeOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    assertTrue(operatorRegistry.isOperator(nodeOperator));

    vm.prank(deployer);
    vm.expectEmit();
    emit IOperatorRegistry.OperatorRemoved(nodeOperator);
    operatorRegistry.removeOperator(nodeOperator);

    assertFalse(operatorRegistry.isOperator(nodeOperator));
  }

  function test_revertWhen_removeOperatorWhenOperatorNotFound(
    address nodeOperator
  ) external {
    vm.assume(operatorRegistry.isOperator(nodeOperator) == false);
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.OPERATOR_NOT_FOUND));
    operatorRegistry.removeOperator(nodeOperator);
  }

  // =============================================================
  //                            getAllOperators
  // =============================================================

  function test_getAllOperators() external {
    address[] memory operators = operatorRegistry.getAllOperators();
    // initially, we have 1 operator
    assertEq(operators.length, 1);

    vm.prank(deployer);
    address nodeOperator1 = address(0x1);
    operatorRegistry.approveOperator(nodeOperator1);

    operators = operatorRegistry.getAllOperators();
    assertEq(operators.length, 2);

    vm.prank(deployer);
    address nodeOperator2 = address(0x2);
    operatorRegistry.approveOperator(nodeOperator2);

    operators = operatorRegistry.getAllOperators();
    assertEq(operators.length, 3);

    vm.prank(deployer);
    operatorRegistry.removeOperator(nodeOperator1);

    operators = operatorRegistry.getAllOperators();
    assertEq(operators.length, 2);
  }
}
