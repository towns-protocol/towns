// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {IRiverRegistry, RiverRegistryErrors, STREAM_FLAG_SEALED} from "./IRiverRegistry.sol";
import {RiverRegistryStorage} from "./RiverRegistryStorage.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

// Deploy: ./scripts/deploy-river-registry.sh
// Generate TS bindings: ./scripts/build-town-types.sh
// Generate go bindings: ./scripts/gen-river-node-bindings.sh
contract RiverRegistry is IRiverRegistry, OwnableBase, Facet {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  // =============================================================
  //                           Modifiers
  // =============================================================

  modifier onlyNode() {
    if (!RiverRegistryStorage.layout().nodes.contains(msg.sender))
      revert(RiverRegistryErrors.BadAuth);
    _;
  }

  modifier onlyOperator() {
    if (!RiverRegistryStorage.layout().operators.contains(msg.sender))
      revert(RiverRegistryErrors.BadAuth);
    _;
  }

  // =============================================================
  //                         Initialization
  // =============================================================

  function __RiverRegistry_init(
    address[] memory approvedOperators
  ) external onlyInitializing {
    __RiverRegistry_init_unchained(approvedOperators);
  }

  function __RiverRegistry_init_unchained(
    address[] memory approvedOperators
  ) internal {
    _addInterface(type(IRiverRegistry).interfaceId);
    _initImpl(approvedOperators);
  }

  // =============================================================
  //                           Operators
  // =============================================================
  function approveOperator(address operator) external onlyOwner {
    // Validate operator address
    if (operator == address(0)) revert(RiverRegistryErrors.BadArg);

    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    if (ds.operators.contains(operator))
      revert(RiverRegistryErrors.AlreadyExists);

    ds.operators.add(operator);

    emit OperatorAdded(operator);
  }

  function isOperator(address operator) external view returns (bool) {
    return RiverRegistryStorage.layout().operators.contains(operator);
  }

  function removeOperator(address operator) external onlyOwner {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    if (!ds.operators.contains(operator))
      revert(RiverRegistryErrors.OperatorNotFound);

    // verify that the operator has no nodes attached
    if (ds.nodesByOperator[operator].length() > 0)
      revert(RiverRegistryErrors.OutOfBounds);

    ds.operators.remove(operator);

    emit OperatorRemoved(operator);
  }

  // =============================================================
  //                           Nodes
  // =============================================================
  function registerNode(
    address nodeAddress,
    string memory url
  ) external onlyOperator {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    // validate that the node is not already in the registry
    if (ds.nodes.contains(nodeAddress))
      revert(RiverRegistryErrors.AlreadyExists);

    Node memory newNode = Node({
      nodeAddress: nodeAddress,
      url: url,
      status: NodeStatus.NotInitialized
    });

    ds.nodesByOperator[msg.sender].add(nodeAddress);
    ds.nodes.add(nodeAddress);
    ds.nodeByAddress[nodeAddress] = newNode;

    emit NodeAdded(nodeAddress, url, NodeStatus.NotInitialized);
  }

  function updateNodeStatus(NodeStatus status) external onlyNode {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();
    ds.nodeByAddress[msg.sender].status = status;
    emit NodeStatusUpdated(msg.sender, status);
  }

  function updateNodeUrl(string memory url) external onlyNode {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();
    ds.nodeByAddress[msg.sender].url = url;
    emit NodeUrlUpdated(msg.sender, url);
  }

  function getNode(address nodeAddress) external view returns (Node memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    // validate that the node is in the registry
    if (!ds.nodes.contains(nodeAddress))
      revert(RiverRegistryErrors.NodeNotFound);

    return ds.nodeByAddress[nodeAddress];
  }

  function getNodeCount() external view returns (uint256) {
    return RiverRegistryStorage.layout().nodes.length();
  }

  function getAllNodeAddresses() external view returns (address[] memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();
    return ds.nodes.values();
  }

  function getAllNodes() external view returns (Node[] memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    Node[] memory nodes = new Node[](ds.nodes.length());

    for (uint256 i = 0; i < ds.nodes.length(); ++i) {
      nodes[i] = ds.nodeByAddress[ds.nodes.at(i)];
    }

    return nodes;
  }

  // =============================================================
  //                           Streams
  // =============================================================

  function allocateStream(
    bytes32 streamId,
    address[] memory nodes,
    bytes32 genesisMiniblockHash,
    bytes memory genesisMiniblock
  ) external onlyNode {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    // verify that the streamId is not already in the registry
    if (ds.streams.contains(streamId))
      revert(RiverRegistryErrors.AlreadyExists);

    // verify that the nodes stream is placed on are in the registry
    for (uint256 i = 0; i < nodes.length; ++i) {
      if (!ds.nodes.contains(nodes[i]))
        revert(RiverRegistryErrors.NodeNotFound);
    }

    // Add the stream to the registry
    Stream memory stream = Stream({
      streamId: streamId,
      genesisMiniblockHash: genesisMiniblockHash,
      lastMiniblockHash: genesisMiniblockHash,
      lastMiniblockNum: 0,
      flags: 0,
      reserved0: 0,
      reserved1: 0,
      nodes: nodes,
      genesisMiniblock: genesisMiniblock
    });

    ds.streams.add(streamId);
    ds.streamById[streamId] = stream;

    emit StreamAllocated(streamId, nodes, genesisMiniblockHash);
  }

  function getStream(bytes32 streamId) external view returns (Stream memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    if (!ds.streams.contains(streamId))
      revert(RiverRegistryErrors.StreamNotFound);

    return ds.streamById[streamId];
  }

  function setStreamLastMiniblock(
    bytes32 streamId,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
  ) external onlyNode {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    // validate that the streamId is in the registry
    if (!ds.streams.contains(streamId))
      revert(RiverRegistryErrors.StreamNotFound);

    Stream storage stream = ds.streamById[streamId];

    if (stream.flags & STREAM_FLAG_SEALED != 0)
      revert(RiverRegistryErrors.StreamSealed);

    // validate that the lastMiniblockNum is the next expected miniblock
    if (stream.lastMiniblockNum + 1 != lastMiniblockNum)
      revert(RiverRegistryErrors.BadArg);

    stream.lastMiniblockHash = lastMiniblockHash;
    stream.lastMiniblockNum = lastMiniblockNum;
    if (isSealed) stream.flags |= STREAM_FLAG_SEALED;

    emit StreamLastMiniblockUpdated(
      stream.streamId,
      lastMiniblockHash,
      lastMiniblockNum,
      isSealed
    );
  }

  function getStreamCount() external view returns (uint256) {
    return RiverRegistryStorage.layout().streams.length();
  }

  function getAllStreamIds() external view returns (bytes32[] memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();
    return ds.streams.values();
  }

  function getAllStreams() external view returns (Stream[] memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    Stream[] memory streams = new Stream[](ds.streams.length());

    for (uint256 i = 0; i < ds.streams.length(); ++i) {
      streams[i] = ds.streamById[ds.streams.at(i)];
    }

    return streams;
  }

  // =============================================================
  //                           Internal
  // =============================================================

  function _initImpl(address[] memory approvedOperators) internal {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();
    for (uint256 i = 0; i < approvedOperators.length; ++i) {
      ds.operators.add(approvedOperators[i]);
    }
  }
}
