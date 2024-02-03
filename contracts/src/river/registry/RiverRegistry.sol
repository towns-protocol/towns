// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {IRiverRegistry, RiverRegistryErrors} from "./IRiverRegistry.sol";
import {RiverRegistryStorage} from "./RiverRegistryStorage.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";

// Deploy: ./scripts/deploy-river-registry.sh
// Generate TS bindings: ./scripts/build-town-types.sh
// Generate go bindings: ./scripts/gen-river-node-bindings.sh
contract RiverRegistry is IRiverRegistry, OwnableFacet {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  constructor() {
    __Ownable_init_unchained(msg.sender);
  }

  // =============================================================
  //                           Streams
  // =============================================================

  function allocateStream(
    string memory streamId,
    address[] memory nodes,
    bytes32 genesisMiniblockHash,
    bytes memory genesisMiniblock
  ) external {
    if (bytes(streamId).length == 0)
      revert(RiverRegistryErrors.InvalidStreamId);

    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    // verify caller is a node in the registry
    if (!ds.nodes.contains(msg.sender)) revert(RiverRegistryErrors.BadAuth);

    bytes32 streamIdHash = keccak256(bytes(streamId));

    // verify that the streamId is not already in the registry
    if (ds.streams.contains(streamIdHash))
      revert(RiverRegistryErrors.AlreadyExists);

    // verify that the nodes stream is placed on are in the registry
    for (uint256 i = 0; i < nodes.length; ) {
      if (!ds.nodes.contains(nodes[i]))
        revert(RiverRegistryErrors.NodeNotFound);

      unchecked {
        i++;
      }
    }

    // Add the stream to the registry
    Stream memory stream = Stream({
      streamId: streamId,
      nodes: nodes,
      genesisMiniblockHash: genesisMiniblockHash,
      genesisMiniblock: genesisMiniblock,
      lastMiniblockHash: genesisMiniblockHash,
      lastMiniblockNum: 0
    });

    ds.streams.add(streamIdHash);
    ds.streamById[streamIdHash] = stream;

    emit StreamAllocated(streamId, nodes, genesisMiniblockHash);
  }

  function getStream(
    bytes32 streamIdHash
  ) external view returns (Stream memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    if (!ds.streams.contains(streamIdHash))
      revert(RiverRegistryErrors.StreamNotFound);

    return ds.streamById[streamIdHash];
  }

  function setStreamLastMiniblock(
    bytes32 streamIdHash,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum
  ) external {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    // validate caller is a node in the registry
    if (!ds.nodes.contains(msg.sender)) revert(RiverRegistryErrors.BadAuth);

    // validate that the streamId is in the registry
    if (!ds.streams.contains(streamIdHash))
      revert(RiverRegistryErrors.StreamNotFound);

    Stream storage stream = ds.streamById[streamIdHash];

    // validate that the lastMiniblockNum is the next expected miniblock
    if (stream.lastMiniblockNum + 1 != lastMiniblockNum)
      revert(RiverRegistryErrors.BadArg);

    stream.lastMiniblockHash = lastMiniblockHash;
    stream.lastMiniblockNum = lastMiniblockNum;

    emit StreamLastMiniblockUpdated(
      stream.streamId,
      lastMiniblockHash,
      lastMiniblockNum
    );
  }

  function getStreamCount() external view returns (uint256) {
    return RiverRegistryStorage.layout().streams.length();
  }

  function getAllStreamIds() external view returns (string[] memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    string[] memory streamIds = new string[](ds.streams.length());

    for (uint256 i = 0; i < ds.streams.length(); ) {
      streamIds[i] = ds.streamById[ds.streams.at(i)].streamId;

      unchecked {
        i++;
      }
    }

    return streamIds;
  }

  function getAllStreams() external view returns (Stream[] memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    Stream[] memory streams = new Stream[](ds.streams.length());

    for (uint256 i = 0; i < ds.streams.length(); ) {
      streams[i] = ds.streamById[ds.streams.at(i)];

      unchecked {
        i++;
      }
    }

    return streams;
  }

  // =============================================================
  //                           Nodes
  // =============================================================

  function addNode(address nodeAddress, string memory url) external onlyOwner {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    // validate that the node is not already in the registry
    if (ds.nodes.contains(nodeAddress))
      revert(RiverRegistryErrors.AlreadyExists);

    Node memory newNode = Node({nodeAddress: nodeAddress, url: url});

    ds.nodes.add(nodeAddress);
    ds.nodeByAddress[nodeAddress] = newNode;

    emit NodeAdded(nodeAddress, url);
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

    address[] memory nodeAddresses = new address[](ds.nodes.length());

    for (uint256 i = 0; i < ds.nodes.length(); ) {
      nodeAddresses[i] = ds.nodes.at(i);

      unchecked {
        i++;
      }
    }

    return nodeAddresses;
  }

  function getAllNodes() external view returns (Node[] memory) {
    RiverRegistryStorage.Layout storage ds = RiverRegistryStorage.layout();

    Node[] memory nodes = new Node[](ds.nodes.length());

    for (uint256 i = 0; i < ds.nodes.length(); ) {
      nodes[i] = ds.nodeByAddress[ds.nodes.at(i)];

      unchecked {
        i++;
      }
    }

    return nodes;
  }
}
