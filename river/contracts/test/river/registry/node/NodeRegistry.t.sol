// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {INodeRegistryBase} from "contracts/src/river/registry/facets/node/INodeRegistry.sol";

// structs
import {NodeStatus, Node} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts

// deployments
import {RiverRegistryBaseSetup} from "contracts/test/river/registry/RiverRegistryBaseSetup.t.sol";

contract NodeRegistryTest is RiverRegistryBaseSetup, INodeRegistryBase {
  string url = "https://node.com";

  // =============================================================
  //                           registerNode
  // =============================================================
  function test_registerNode(
    address nodeOperator,
    address node
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    vm.assume(node != address(0));

    vm.prank(nodeOperator);
    vm.expectEmit(diamond);
    emit NodeAdded(node, url, NodeStatus.Operational);
    nodeRegistry.registerNode(node, url, NodeStatus.Operational);

    Node memory registered = nodeRegistry.getNode(node);
    assertEq(registered.url, url);
    assertEq(uint(registered.status), uint(NodeStatus.Operational));
    assertEq(registered.operator, nodeOperator);
  }

  function test_revertWhen_registerNodeOperatorNotApproved(
    address nodeOperator,
    address node
  ) external {
    vm.assume(node != address(0));
    vm.assume(nodeOperator != address(0));
    vm.assume(nodeOperator != node);

    vm.prank(nodeOperator);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));
    nodeRegistry.registerNode(node, url, NodeStatus.Operational);
  }

  function test_revertWhen_registerNodeOperatorNodeAlreadyRegistered(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
  {
    vm.prank(nodeOperator);
    vm.expectRevert(bytes(RiverRegistryErrors.ALREADY_EXISTS));
    nodeRegistry.registerNode(node, url, NodeStatus.Operational);
  }

  // =============================================================
  //                           removeNode
  // =============================================================

  modifier givenNodeStatusIs(
    address nodeOperator,
    address node,
    NodeStatus status
  ) {
    vm.prank(nodeOperator);
    vm.expectEmit(diamond);
    emit NodeStatusUpdated(node, status);
    nodeRegistry.updateNodeStatus(node, status);
    _;
  }

  function test_removeNode(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
    givenNodeStatusIs(nodeOperator, node, NodeStatus.Departing)
    givenNodeStatusIs(nodeOperator, node, NodeStatus.Deleted)
  {
    vm.prank(nodeOperator);
    vm.expectEmit(diamond);
    emit NodeRemoved(node);
    nodeRegistry.removeNode(node);
  }

  function test_revertWhen_removeNodeStateNotAllowed(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
    givenNodeStatusIs(nodeOperator, node, NodeStatus.Departing)
  {
    vm.prank(nodeOperator);
    vm.expectRevert(bytes(RiverRegistryErrors.NODE_STATE_NOT_ALLOWED));
    nodeRegistry.removeNode(node);
  }

  // =============================================================
  //                       updateNodeStatus
  // =============================================================
  function test_updateNodeStatus(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
    givenNodeStatusIs(nodeOperator, node, NodeStatus.RemoteOnly)
  {
    Node memory updated = nodeRegistry.getNode(node);
    assertEq(uint(updated.status), uint(NodeStatus.RemoteOnly));
  }

  function test_revertWhen_updateNodeStatusNodeNotFound(address node) external {
    vm.assume(node != address(0));

    vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
    nodeRegistry.updateNodeStatus(node, NodeStatus.Operational);
  }

  function test_revertWhen_updateNodeStatusInvalidOperator(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
  {
    vm.prank(_randomAddress());
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));
    nodeRegistry.updateNodeStatus(node, NodeStatus.Operational);
  }

  function test_revertWhen_updateNodeStatusInvalidNodeOperator(
    address nodeOperator,
    address node,
    address invalidOperator
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeOperatorIsApproved(invalidOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
  {
    vm.prank(invalidOperator);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));
    nodeRegistry.updateNodeStatus(node, NodeStatus.Operational);
  }

  // =============================================================
  //                         updateNodeUrl
  // =============================================================
  modifier givenNodeUrlIsUpdated(
    address nodeOperator,
    address node,
    string memory newUrl
  ) {
    vm.prank(nodeOperator);
    vm.expectEmit(diamond);
    emit NodeUrlUpdated(node, newUrl);
    nodeRegistry.updateNodeUrl(node, newUrl);
    _;
  }

  function test_updateNodeUrl(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
    givenNodeUrlIsUpdated(nodeOperator, node, "new-url")
  {
    Node memory updated = nodeRegistry.getNode(node);
    assertEq(updated.url, "new-url");
  }

  function test_revertWhen_updateNodeUrlInvalidOperator(address node) external {
    vm.prank(_randomAddress());
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));
    nodeRegistry.updateNodeUrl(node, url);
  }

  function test_revertWhen_updateNodeUrlInvalidNode(
    address nodeOperator,
    address node
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    vm.prank(nodeOperator);
    vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
    nodeRegistry.updateNodeUrl(node, url);
  }

  function test_revertWhen_updateNodeUrlInvalidNodeOperator(
    address nodeOperator,
    address node,
    address invalidOperator,
    string memory newUrl
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeOperatorIsApproved(invalidOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
  {
    vm.prank(invalidOperator);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));
    nodeRegistry.updateNodeUrl(node, newUrl);
  }

  function test_revertWhen_updateNodeUrlSameUrl(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, url)
  {
    vm.prank(nodeOperator);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_ARG));
    nodeRegistry.updateNodeUrl(node, url);
  }
}
