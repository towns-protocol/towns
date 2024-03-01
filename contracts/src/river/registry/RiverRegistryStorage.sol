// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRiverRegistryBase} from "contracts/src/river/registry/IRiverRegistry.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library RiverRegistryStorage {
  bytes32 public constant STORAGE_SLOT = keccak256("river.registry.storage");

  struct Layout {
    // Ids of all streams in the system
    EnumerableSet.Bytes32Set streams;
    // Map of streamId to stream struct
    mapping(bytes32 => IRiverRegistryBase.Stream) streamById;
    // Map of streamId to genesis miniblock bytes, only set if stream's miniblock num is 0
    mapping(bytes32 => bytes) genesisMiniblockByStreamId;
    // Mapf of streamId to genesis miniblock hash
    mapping(bytes32 => bytes32) genesisMiniblockHashByStreamId;
    // Set of addresses of all nodes in the system
    EnumerableSet.AddressSet nodes;
    // Map of node address to node struct
    mapping(address => IRiverRegistryBase.Node) nodeByAddress;
    // Set of addresses of all operators in the system
    EnumerableSet.AddressSet operators;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
