// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {INodeRegistry} from "contracts/src/river/registry/facets/node/INodeRegistry.sol";
import {IOperatorRegistry} from "contracts/src/river/registry/facets/operator/IOperatorRegistry.sol";
import {IStreamRegistry} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";

// structs
import {NodeStatus, Node} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

// deployments
import {DeployRiverRegistry} from "contracts/scripts/deployments/DeployRiverRegistry.s.sol";

contract RiverRegistryTest is TestUtils, IOwnableBase {
  DeployRiverRegistry internal deployRiverRegistry = new DeployRiverRegistry();

  address deployer;
  address diamond;

  INodeRegistry internal nodeRegistry;
  IStreamRegistry internal streamRegistry;
  IOperatorRegistry internal operatorRegistry;

  function setUp() public virtual {
    deployer = getDeployer();
    diamond = deployRiverRegistry.deploy();

    nodeRegistry = INodeRegistry(diamond);
    streamRegistry = IStreamRegistry(diamond);
    operatorRegistry = IOperatorRegistry(diamond);
  }

  modifier givenNodeOperatorIsApproved(address nodeOperator) {
    vm.assume(nodeOperator != address(0));
    vm.assume(operatorRegistry.isOperator(nodeOperator) == false);

    vm.prank(deployer);
    vm.expectEmit();
    emit IOperatorRegistry.OperatorAdded(nodeOperator);
    operatorRegistry.approveOperator(nodeOperator);
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
    emit INodeRegistry.NodeAdded(node, url, NodeStatus.NotInitialized);
    nodeRegistry.registerNode(node, url, NodeStatus.NotInitialized);
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
    Node memory previous = nodeRegistry.getNode(node);
    assertEq(previous.url, "old");

    vm.prank(nodeOperator);
    vm.expectEmit();
    emit INodeRegistry.NodeUrlUpdated(node, "new");
    nodeRegistry.updateNodeUrl(node, "new");

    Node memory updated = nodeRegistry.getNode(node);
    assertEq(updated.url, "new");
  }

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
}
