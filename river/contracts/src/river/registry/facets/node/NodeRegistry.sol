// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {INodeRegistry} from "./INodeRegistry.sol";
import {NodeStatus, Node} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts
import {RegistryModifiers} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

contract NodeRegistry is INodeRegistry, RegistryModifiers {
  using EnumerableSet for EnumerableSet.AddressSet;

  function registerNode(
    address nodeAddress,
    string memory url,
    NodeStatus status
  ) external onlyOperator(msg.sender) {
    // validate that the node is not already in the registry
    if (ds.nodeByAddress[nodeAddress].nodeAddress != address(0))
      revert(RiverRegistryErrors.ALREADY_EXISTS);

    Node memory newNode = Node({
      nodeAddress: nodeAddress,
      url: url,
      status: status,
      operator: msg.sender
    });

    ds.nodes.add(nodeAddress); // TODO: remove this line
    ds.nodeByAddress[nodeAddress] = newNode;

    emit NodeAdded(nodeAddress, url, status);
  }

  function removeNode(
    address nodeAddress
  ) external onlyNodeOperator(nodeAddress, msg.sender) {
    if (ds.nodeByAddress[nodeAddress].nodeAddress == address(0)) {
      revert(RiverRegistryErrors.NODE_NOT_FOUND);
    }

    if (ds.nodeByAddress[nodeAddress].status != NodeStatus.Deleted) {
      revert(RiverRegistryErrors.NODE_STATE_NOT_ALLOWED);
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
    Node storage node = ds.nodeByAddress[nodeAddress];

    _checkNodeStatusTransionAllowed(node.status, status);

    node.status = status;
    emit NodeStatusUpdated(node.nodeAddress, status);
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

    if (
      keccak256(abi.encodePacked(node.url)) == keccak256(abi.encodePacked(url))
    ) revert(RiverRegistryErrors.BAD_ARG);

    node.url = url;
    emit NodeUrlUpdated(node.nodeAddress, url);
  }

  function getNode(address nodeAddress) external view returns (Node memory) {
    // validate that the node is in the registry
    if (!ds.nodes.contains(nodeAddress))
      revert(RiverRegistryErrors.NODE_NOT_FOUND);

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

  function _checkNodeStatusTransionAllowed(
    NodeStatus from,
    NodeStatus to
  ) internal pure {
    if (
      from == NodeStatus.NotInitialized ||
      (from == NodeStatus.RemoteOnly &&
        (to == NodeStatus.Failed || to == NodeStatus.Departing)) ||
      (from == NodeStatus.Operational &&
        (to == NodeStatus.Failed || to == NodeStatus.Departing)) ||
      (from == NodeStatus.Departing &&
        (to == NodeStatus.Failed || to == NodeStatus.Deleted)) ||
      (from == NodeStatus.Failed && to == NodeStatus.Deleted)
    ) {
      return;
    }
    revert(RiverRegistryErrors.NODE_STATE_NOT_ALLOWED);
  }
}
