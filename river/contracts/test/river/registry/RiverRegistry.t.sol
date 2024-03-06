// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRiverRegistryBase, RiverRegistryErrors} from "contracts/src/river/registry/IRiverRegistry.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {RiverRegistry} from "contracts/src/river/registry/RiverRegistry.sol";

// deployments
import {DeployRiverRegistry} from "contracts/scripts/deployments/DeployRiverRegistry.s.sol";

contract RiverRegistryTest is TestUtils, IRiverRegistryBase, IOwnableBase {
  DeployRiverRegistry internal deployRiverRegistry = new DeployRiverRegistry();

  address deployer;
  address diamond;

  RiverRegistry internal riverRegistry;

  function setUp() public virtual {
    deployer = getDeployer();
    diamond = deployRiverRegistry.deploy();

    riverRegistry = RiverRegistry(diamond);
  }

  modifier givenNodeOperatorIsApproved(address nodeOperator) {
    vm.assume(nodeOperator != address(0));
    vm.assume(riverRegistry.isOperator(nodeOperator) == false);

    vm.prank(deployer);
    vm.expectEmit();
    emit OperatorAdded(nodeOperator);
    riverRegistry.approveOperator(nodeOperator);
    _;
  }

  modifier givenNodeIsRegistered(
    address nodeOperator,
    address node,
    string memory url
  ) {
    vm.assume(nodeOperator != address(0));
    vm.assume(node != address(0));

    vm.prank(nodeOperator);
    vm.expectEmit();
    emit NodeAdded(node, url, NodeStatus.NotInitialized);
    riverRegistry.registerNode(node, url, NodeStatus.NotInitialized);
    _;
  }

  // =============================================================
  //                     updateNodeUrl
  // =============================================================
  function test_updateNodeUrl(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, "old")
  {
    Node memory previous = riverRegistry.getNode(node);
    assertEq(previous.url, "old");

    vm.prank(nodeOperator);
    vm.expectEmit();
    emit NodeUrlUpdated(node, "new");
    riverRegistry.updateNodeUrl(node, "new");

    Node memory updated = riverRegistry.getNode(node);
    assertEq(updated.url, "new");
  }

  // =============================================================
  //                           approveOperator
  // =============================================================

  function test_approveOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    assertTrue(riverRegistry.isOperator(nodeOperator));
  }

  function test_revertWhen_approveOperatorWithZeroAddress() external {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.BadArg));
    riverRegistry.approveOperator(address(0));
  }

  function test_revertWhen_approveOperatorWithAlreadyApprovedOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.AlreadyExists));
    riverRegistry.approveOperator(nodeOperator);
  }

  function test_revertWhen_approveOperatorWithNonOwner(
    address nonOwner,
    address nodeOperator
  ) external {
    vm.assume(nonOwner != deployer);

    vm.prank(nonOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, nonOwner)
    );
    riverRegistry.approveOperator(nodeOperator);
  }

  // =============================================================
  //                           removeOperator
  // =============================================================
  function test_removeOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    assertTrue(riverRegistry.isOperator(nodeOperator));

    vm.prank(deployer);
    vm.expectEmit();
    emit OperatorRemoved(nodeOperator);
    riverRegistry.removeOperator(nodeOperator);

    assertFalse(riverRegistry.isOperator(nodeOperator));
  }

  function test_revertWhen_removeOperatorWhenOperatorNotFound(
    address nodeOperator
  ) external {
    vm.assume(riverRegistry.isOperator(nodeOperator) == false);
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.OperatorNotFound));
    riverRegistry.removeOperator(nodeOperator);
  }
}
