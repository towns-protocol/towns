// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {INodeRegistry} from "./INodeRegistry.sol";
import {Node, NodeStatus} from "src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {RiverRegistryErrors} from "src/river/registry/libraries/RegistryErrors.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {RegistryModifiers} from "src/river/registry/libraries/RegistryStorage.sol";

contract NodeRegistry is INodeRegistry, RegistryModifiers, OwnableBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for string;

    function isNode(address nodeAddress) public view returns (bool) {
        return ds.nodeByAddress[nodeAddress].nodeAddress != address(0);
    }

    function registerNode(
        address nodeAddress,
        string memory url,
        NodeStatus status
    ) external onlyOperator(msg.sender) {
        // validate that the node is not already in the registry
        if (ds.nodeByAddress[nodeAddress].nodeAddress != address(0)) {
            RiverRegistryErrors.ALREADY_EXISTS.revertWith();
        }

        // Assign permanent index if backfill has been called (lastNodeIndex > 0)
        uint32 permanentIndex = 0;
        if (ds.lastNodeIndex > 0) {
            permanentIndex = ++ds.lastNodeIndex;
        }

        Node memory newNode = Node({
            nodeAddress: nodeAddress,
            url: url,
            status: status,
            operator: msg.sender,
            permanentIndex: permanentIndex,
            cometBftPubKey: bytes32(0)
        });

        ds.nodes.add(nodeAddress); // TODO: remove this line
        ds.nodeByAddress[nodeAddress] = newNode;

        // TODO: Consider adding permanentIndex to the event
        emit NodeAdded(nodeAddress, msg.sender, url, status);
    }

    function removeNode(address nodeAddress) external onlyNodeOperator(nodeAddress, msg.sender) {
        if (ds.nodeByAddress[nodeAddress].nodeAddress == address(0)) {
            RiverRegistryErrors.NODE_NOT_FOUND.revertWith();
        }

        if (ds.nodeByAddress[nodeAddress].status != NodeStatus.Deleted) {
            RiverRegistryErrors.NODE_STATE_NOT_ALLOWED.revertWith();
        }

        ds.nodes.remove(nodeAddress);
        delete ds.nodeByAddress[nodeAddress];

        emit NodeRemoved(nodeAddress);
    }

    function updateNodeStatus(
        address nodeAddress,
        NodeStatus status
    )
        external
        onlyNode(nodeAddress)
        onlyOperator(msg.sender)
        onlyNodeOperator(nodeAddress, msg.sender)
    {
        _updateNodeStatus(nodeAddress, status);
    }

    function updateNodesStatusConfigManager(
        UpdateNodeStatusConfigManagerRequest[] calldata updates
    ) external onlyConfigurationManager(msg.sender) {
        for (uint256 i = 0; i < updates.length; ++i) {
            _updateNodeStatus(updates[i].nodeAddress, updates[i].nodeStatus);
        }
    }

    function _updateNodeStatus(address nodeAddress, NodeStatus status) internal {
        Node storage node = ds.nodeByAddress[nodeAddress];
        if (node.nodeAddress == address(0)) {
            RiverRegistryErrors.NODE_NOT_FOUND.revertWith();
        }
        _checkNodeStatusTransionAllowed(node.status, status);
        node.status = status;
        emit NodeStatusUpdated(nodeAddress, status);
    }

    function updateNodeUrl(
        address nodeAddress,
        string memory url
    )
        external
        onlyOperator(msg.sender)
        onlyNode(nodeAddress)
        onlyNodeOperator(nodeAddress, msg.sender)
    {
        Node storage node = ds.nodeByAddress[nodeAddress];

        if (keccak256(abi.encodePacked(node.url)) == keccak256(abi.encodePacked(url))) {
            RiverRegistryErrors.BAD_ARG.revertWith();
        }

        node.url = url;
        emit NodeUrlUpdated(node.nodeAddress, url);
    }

    function getNode(address nodeAddress) external view returns (Node memory) {
        // validate that the node is in the registry
        if (!ds.nodes.contains(nodeAddress)) {
            RiverRegistryErrors.NODE_NOT_FOUND.revertWith();
        }

        return ds.nodeByAddress[nodeAddress];
    }

    function getNodeCount() external view returns (uint256) {
        return ds.nodes.length();
    }

    function getAllNodeAddresses() external view returns (address[] memory) {
        return ds.nodes.values();
    }

    function getAllNodes() external view returns (Node[] memory) {
        Node[] memory nodes = new Node[](ds.nodes.length());

        for (uint256 i = 0; i < ds.nodes.length(); ++i) {
            nodes[i] = ds.nodeByAddress[ds.nodes.at(i)];
        }

        return nodes;
    }

    function backfillPermanentIndices() external onlyOwner {
        // Can only be called once - after execution, lastNodeIndex > 0
        if (ds.lastNodeIndex > 0) {
            RiverRegistryErrors.ALREADY_EXISTS.revertWith();
        }

        address[] memory nodeAddresses = ds.nodes.values();
        uint32 currentIndex;

        for (uint256 i; i < nodeAddresses.length; ++i) {
            Node storage node = ds.nodeByAddress[nodeAddresses[i]];

            if (node.permanentIndex != 0) {
                RiverRegistryErrors.BAD_ARG.revertWith();
            }

            node.permanentIndex = ++currentIndex;
        }

        ds.lastNodeIndex = currentIndex;
    }

    function setNodeCometBftPubKey(
        address nodeAddress,
        bytes32 cometBftPubKey
    ) external onlyNode(nodeAddress) {
        // Only the node itself can set its CometBFT public key
        if (msg.sender != nodeAddress) {
            RiverRegistryErrors.BAD_AUTH.revertWith();
        }

        Node storage node = ds.nodeByAddress[nodeAddress];
        node.cometBftPubKey = cometBftPubKey;

        emit NodeCometBftPubKeyUpdated(nodeAddress, cometBftPubKey);
    }

    function getLastNodeIndex() external view returns (uint32) {
        return ds.lastNodeIndex;
    }

    function _checkNodeStatusTransionAllowed(NodeStatus from, NodeStatus to) internal pure {
        if (
            from == NodeStatus.NotInitialized ||
            (from == NodeStatus.RemoteOnly &&
                (to == NodeStatus.Failed ||
                    to == NodeStatus.Departing ||
                    to == NodeStatus.Operational)) ||
            (from == NodeStatus.Operational &&
                (to == NodeStatus.Failed || to == NodeStatus.Departing)) ||
            (from == NodeStatus.Departing &&
                (to == NodeStatus.Failed || to == NodeStatus.Deleted)) ||
            (from == NodeStatus.Failed && to == NodeStatus.Deleted)
        ) {
            return;
        }
        RiverRegistryErrors.NODE_STATE_NOT_ALLOWED.revertWith();
    }
}
