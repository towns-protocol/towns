// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

struct Stream {
  bytes32 lastMiniblockHash; // 32 bytes, slot 0
  uint64 lastMiniblockNum; // 8 bytes, part of slot 1
  uint64 reserved0; // 8 bytes, part of slot 1
  uint64 flags; // 8 bytes, part of slot 1
  address[] nodes; // Dynamic array, starts at a new slot
}

struct StreamWithId {
  bytes32 id; // 32 bytes, slot 0
  Stream stream;
}

enum NodeStatus {
  NotInitialized, // Initial entry, node is not contacted in any way
  RemoteOnly, // Node proxies data, does not store any data
  Operational, // Node servers existing data, accepts stream creation
  Failed, // Node crash-exited, can be set by DAO
  Departing // Node continues to serve traffic, new streams are not allocated, data needs to be moved out to other nodes before grace period.
}

struct Node {
  NodeStatus status; // 1 byte (but will be padded to fit into 32 bytes if stored directly)
  string url; // dynamically sized, points to a separate location
  address nodeAddress; // 20 bytes
  address operator; // 20 bytes
}

struct AppStorage {
  // Ids of all streams in the system
  EnumerableSet.Bytes32Set streams;
  // Map of streamId to stream struct
  mapping(bytes32 => Stream) streamById;
  // Map of streamId to genesis miniblock bytes, only set if stream's miniblock num is 0
  mapping(bytes32 => bytes) genesisMiniblockByStreamId;
  // Mapf of streamId to genesis miniblock hash
  mapping(bytes32 => bytes32) genesisMiniblockHashByStreamId;
  // Set of addresses of all nodes in the system
  EnumerableSet.AddressSet nodes;
  // Map of node address to node struct
  mapping(address => Node) nodeByAddress;
  // Set of addresses of all operators in the system
  EnumerableSet.AddressSet operators;
}

library RiverRegistryStorage {
  function layout() internal pure returns (AppStorage storage s) {
    assembly {
      s.slot := 0
    }
  }
}

abstract contract RegistryModifiers {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  AppStorage internal ds;

  modifier onlyNode(address node) {
    if (!ds.nodes.contains(node)) revert(RiverRegistryErrors.BAD_AUTH);
    _;
  }

  modifier onlyOperator(address operator) {
    if (!ds.operators.contains(operator)) revert(RiverRegistryErrors.BAD_AUTH);
    _;
  }

  modifier onlyStream(bytes32 streamId) {
    if (!ds.streams.contains(streamId)) revert(RiverRegistryErrors.NOT_FOUND);
    _;
  }

  modifier onlyNodeOperator(address node, address operator) {
    if (ds.nodeByAddress[node].operator != operator)
      revert(RiverRegistryErrors.BAD_AUTH);
    _;
  }
}
