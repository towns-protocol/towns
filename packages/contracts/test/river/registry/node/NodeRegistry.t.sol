// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {INodeRegistryBase} from "src/river/registry/facets/node/INodeRegistry.sol";

// structs
import {Node, NodeStatus} from "src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {RiverRegistryErrors} from "src/river/registry/libraries/RegistryErrors.sol";

// contracts

// deployments
import {RiverRegistryBaseSetup} from "test/river/registry/RiverRegistryBaseSetup.t.sol";

contract NodeRegistryTest is RiverRegistryBaseSetup, INodeRegistryBase, IOwnableBase {
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
        emit NodeAdded(node, nodeOperator, url, NodeStatus.Operational);
        nodeRegistry.registerNode(node, url, NodeStatus.Operational);

        Node memory registered = nodeRegistry.getNode(node);
        assertEq(registered.url, url);
        assertEq(uint256(registered.status), uint256(NodeStatus.Operational));
        assertEq(registered.operator, nodeOperator);
    }

    function test_revertWhen_registerNodeOperatorNotApproved(
        address nodeOperator,
        address node
    ) external {
        vm.assume(node != address(0));
        vm.assume(nodeOperator != address(0));
        vm.assume(nodeOperator != node);
        vm.assume(operatorRegistry.isOperator(nodeOperator) == false);

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

    modifier givenNodeStatusIs(address nodeOperator, address node, NodeStatus status) {
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
        assertEq(uint256(updated.status), uint256(NodeStatus.RemoteOnly));
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
    modifier givenNodeUrlIsUpdated(address nodeOperator, address node, string memory newUrl) {
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

    // =============================================================
    //                   backfillPermanentIndices
    // =============================================================

    function test_backfillPermanentIndices(
        address nodeOperator,
        address node1,
        address node2
    )
        external
        givenNodeOperatorIsApproved(nodeOperator)
        givenNodeIsRegistered(nodeOperator, node1, url)
    {
        vm.assume(node2 != address(0));
        vm.assume(node1 != node2);

        // Register second node
        vm.prank(nodeOperator);
        nodeRegistry.registerNode(node2, "https://node2.com", NodeStatus.NotInitialized);
        // Before backfill, lastNodeIndex should be 0
        assertEq(nodeRegistry.getLastNodeIndex(), 0);

        // Nodes should have permanentIndex = 0 before backfill
        Node memory nodeBefore1 = nodeRegistry.getNode(node1);
        Node memory nodeBefore2 = nodeRegistry.getNode(node2);
        assertEq(nodeBefore1.permanentIndex, 0);
        assertEq(nodeBefore2.permanentIndex, 0);

        // Call backfill (only owner can call)
        vm.prank(deployer);
        nodeRegistry.backfillPermanentIndices();

        // After backfill, lastNodeIndex should be 2
        assertEq(nodeRegistry.getLastNodeIndex(), 2);

        // Nodes should have sequential permanent indices
        Node memory nodeAfter1 = nodeRegistry.getNode(node1);
        Node memory nodeAfter2 = nodeRegistry.getNode(node2);
        assertEq(nodeAfter1.permanentIndex, 1);
        assertEq(nodeAfter2.permanentIndex, 2);
    }

    function test_revertWhen_backfillPermanentIndicesCalledTwice(
        address nodeOperator,
        address node
    )
        external
        givenNodeOperatorIsApproved(nodeOperator)
        givenNodeIsRegistered(nodeOperator, node, url)
    {
        // Call backfill first time - should succeed (only owner can call)
        vm.prank(deployer);
        nodeRegistry.backfillPermanentIndices();

        // Call backfill second time - should revert
        vm.prank(deployer);
        vm.expectRevert(bytes(RiverRegistryErrors.ALREADY_EXISTS));
        nodeRegistry.backfillPermanentIndices();
    }

    function test_revertWhen_backfillPermanentIndicesNotOwner(
        address nodeOperator,
        address node,
        address notOwner
    )
        external
        givenNodeOperatorIsApproved(nodeOperator)
        givenNodeIsRegistered(nodeOperator, node, url)
    {
        vm.assume(notOwner != deployer);
        vm.assume(notOwner != address(0));

        // Non-owner cannot call backfill
        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner));
        nodeRegistry.backfillPermanentIndices();
    }

    function test_registerNodeAfterBackfill(
        address nodeOperator,
        address node1,
        address node2
    )
        external
        givenNodeOperatorIsApproved(nodeOperator)
        givenNodeIsRegistered(nodeOperator, node1, url)
    {
        vm.assume(node2 != address(0));
        vm.assume(node1 != node2);

        // Call backfill (only owner can call)
        vm.prank(deployer);
        nodeRegistry.backfillPermanentIndices();

        // Register a new node after backfill
        vm.prank(nodeOperator);
        nodeRegistry.registerNode(node2, "https://node2.com", NodeStatus.Operational);

        // New node should have permanent index = 2
        Node memory nodeData = nodeRegistry.getNode(node2);
        assertEq(nodeData.permanentIndex, 2);

        // lastNodeIndex should be updated
        assertEq(nodeRegistry.getLastNodeIndex(), 2);
    }

    function test_registerNodeBeforeBackfill(
        address nodeOperator,
        address node
    ) external givenNodeOperatorIsApproved(nodeOperator) {
        vm.assume(node != address(0));

        // Register a node before backfill
        vm.prank(nodeOperator);
        nodeRegistry.registerNode(node, url, NodeStatus.Operational);

        // Node should have permanentIndex = 0 (not assigned yet)
        Node memory nodeData = nodeRegistry.getNode(node);
        assertEq(nodeData.permanentIndex, 0);
    }

    // =============================================================
    //                     setNodeCometBftPubKey
    // =============================================================

    function test_setNodeCometBftPubKey(
        address nodeOperator,
        address node,
        bytes32 pubKey
    )
        external
        givenNodeOperatorIsApproved(nodeOperator)
        givenNodeIsRegistered(nodeOperator, node, url)
    {
        // Set CometBFT public key (must be called by the node itself)
        vm.prank(node);
        vm.expectEmit(diamond);
        emit NodeCometBftPubKeyUpdated(node, pubKey);
        nodeRegistry.setNodeCometBftPubKey(node, pubKey);

        // Verify the key was set
        Node memory nodeData = nodeRegistry.getNode(node);
        assertEq(nodeData.cometBftPubKey, pubKey);
    }

    function test_setNodeCometBftPubKey_update(
        address nodeOperator,
        address node,
        bytes32 pubKey1,
        bytes32 pubKey2
    )
        external
        givenNodeOperatorIsApproved(nodeOperator)
        givenNodeIsRegistered(nodeOperator, node, url)
    {
        // Set initial key
        vm.prank(node);
        nodeRegistry.setNodeCometBftPubKey(node, pubKey1);

        // Update to a new key
        vm.prank(node);
        nodeRegistry.setNodeCometBftPubKey(node, pubKey2);

        // Verify the key was updated
        Node memory nodeData = nodeRegistry.getNode(node);
        assertEq(nodeData.cometBftPubKey, pubKey2);
    }

    function test_revertWhen_setNodeCometBftPubKeyNotNode(
        address nodeOperator,
        address node,
        address notNode,
        bytes32 pubKey
    )
        external
        givenNodeOperatorIsApproved(nodeOperator)
        givenNodeIsRegistered(nodeOperator, node, url)
    {
        vm.assume(notNode != node);
        vm.assume(notNode != address(0));

        vm.prank(notNode);
        vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));
        nodeRegistry.setNodeCometBftPubKey(node, pubKey);
    }

    function test_revertWhen_setNodeCometBftPubKeyNodeNotFound(
        address node,
        bytes32 pubKey
    ) external {
        vm.assume(node != address(0));

        vm.prank(node);
        vm.expectRevert(bytes(RiverRegistryErrors.NODE_NOT_FOUND));
        nodeRegistry.setNodeCometBftPubKey(node, pubKey);
    }
}
