// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IStreamRegistry} from "./IStreamRegistry.sol";
import {Stream, StreamWithId, SetMiniblock} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts
import {RegistryModifiers} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

library StreamFlags {
  uint64 internal constant SEALED = 1;
}

contract StreamRegistry is IStreamRegistry, RegistryModifiers {
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using EnumerableSet for EnumerableSet.AddressSet;

  /// @inheritdoc IStreamRegistry
  function allocateStream(
    bytes32 streamId,
    address[] calldata nodes,
    bytes32 genesisMiniblockHash,
    bytes calldata genesisMiniblock
  ) external onlyNode(msg.sender) {
    // verify that the streamId is not already in the registry
    if (ds.streams.contains(streamId))
      revert(RiverRegistryErrors.ALREADY_EXISTS);

    // verify that the nodes stream is placed on are in the registry
    uint256 nodeCount = nodes.length;
    for (uint256 i; i < nodeCount; ++i) {
      if (!ds.nodes.contains(nodes[i]))
        revert(RiverRegistryErrors.NODE_NOT_FOUND);
    }

    // Add the stream to the registry
    Stream memory stream = Stream({
      lastMiniblockHash: genesisMiniblockHash,
      lastMiniblockNum: 0,
      flags: 0,
      reserved0: 0,
      nodes: nodes
    });

    ds.streams.add(streamId);
    ds.streamById[streamId] = stream;
    ds.genesisMiniblockByStreamId[streamId] = genesisMiniblock;
    ds.genesisMiniblockHashByStreamId[streamId] = genesisMiniblockHash;

    emit StreamAllocated(
      streamId,
      nodes,
      genesisMiniblockHash,
      genesisMiniblock
    );
  }

  /// @inheritdoc IStreamRegistry
  function addStream(
    bytes32 streamId,
    bytes32 genesisMiniblockHash,
    Stream calldata stream
  ) external onlyNode(msg.sender) {
    // verify that the streamId is not already in the registry
    if (ds.streams.contains(streamId))
      revert(RiverRegistryErrors.ALREADY_EXISTS);

    // verify that the nodes stream is placed on are in the registry
    uint256 nodeCount = stream.nodes.length;
    for (uint256 i; i < nodeCount; ++i) {
      if (!ds.nodes.contains(stream.nodes[i]))
        revert(RiverRegistryErrors.NODE_NOT_FOUND);
    }

    ds.streams.add(streamId);
    ds.streamById[streamId] = stream;
    ds.genesisMiniblockHashByStreamId[streamId] = genesisMiniblockHash;

    emit StreamCreated(streamId, genesisMiniblockHash, stream);
  }

  function setStreamLastMiniblockBatch(
    SetMiniblock[] calldata miniblocks
  ) external onlyNode(msg.sender) {
    uint256 miniblockCount = miniblocks.length;

    if (miniblockCount == 0) revert(RiverRegistryErrors.BAD_ARG);

    for (uint256 i; i < miniblockCount; ++i) {
      SetMiniblock calldata miniblock = miniblocks[i];

      if (!ds.streams.contains(miniblock.streamId)) {
        emit StreamLastMiniblockUpdateFailed(
          miniblock.streamId,
          miniblock.lastMiniblockHash,
          miniblock.lastMiniblockNum,
          RiverRegistryErrors.NOT_FOUND
        );
        continue;
      }

      Stream storage stream = ds.streamById[miniblock.streamId];

      // Check if the stream is already sealed using bitwise AND
      if ((stream.flags & StreamFlags.SEALED) != 0) {
        emit StreamLastMiniblockUpdateFailed(
          miniblock.streamId,
          miniblock.lastMiniblockHash,
          miniblock.lastMiniblockNum,
          RiverRegistryErrors.STREAM_SEALED
        );
        continue;
      }

      // Check if the lastMiniblockNum is the next expected miniblock and
      // the prevMiniblockHash is correct
      if (
        // stream.lastMiniblockNum + 1 != miniblock.lastMiniblockNum ||
        // stream.lastMiniblockHash != miniblock.prevMiniBlockHash
        stream.lastMiniblockNum >= miniblock.lastMiniblockNum
      ) {
        emit StreamLastMiniblockUpdateFailed(
          miniblock.streamId,
          miniblock.lastMiniblockHash,
          miniblock.lastMiniblockNum,
          RiverRegistryErrors.BAD_ARG
        );
        continue;
      }

      // Delete genesis miniblock bytes if the stream is moving beyond genesis
      if (stream.lastMiniblockNum == 0) {
        delete ds.genesisMiniblockByStreamId[miniblock.streamId];
      }

      // Update the stream information
      stream.lastMiniblockHash = miniblock.lastMiniblockHash;
      stream.lastMiniblockNum = miniblock.lastMiniblockNum;

      // Set the sealed flag if requested
      if (miniblock.isSealed) {
        stream.flags |= StreamFlags.SEALED;
      }

      emit StreamLastMiniblockUpdated(
        miniblock.streamId,
        miniblock.lastMiniblockHash,
        miniblock.lastMiniblockNum,
        miniblock.isSealed
      );
    }
  }

  /// @inheritdoc IStreamRegistry
  function setStreamLastMiniblock(
    bytes32 streamId,
    bytes32, // prevMiniblockHash
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
  ) external onlyNode(msg.sender) {
    // Validate that the streamId is in the registry
    if (!ds.streams.contains(streamId)) {
      revert(RiverRegistryErrors.NOT_FOUND);
    }

    Stream storage stream = ds.streamById[streamId];

    // Check if the stream is already sealed using bitwise AND
    if ((stream.flags & StreamFlags.SEALED) != 0) {
      revert(RiverRegistryErrors.STREAM_SEALED);
    }

    // Ensure that the lastMiniblockNum is newer than the current head.
    if (stream.lastMiniblockNum >= lastMiniblockNum) {
      revert(RiverRegistryErrors.BAD_ARG);
    }

    // Delete genesis miniblock
    delete ds.genesisMiniblockByStreamId[streamId];

    // Update the stream information
    stream.lastMiniblockHash = lastMiniblockHash;
    stream.lastMiniblockNum = lastMiniblockNum;

    // Set the sealed flag if requested
    if (isSealed) {
      stream.flags |= StreamFlags.SEALED;
    }

    emit StreamLastMiniblockUpdated(
      streamId,
      lastMiniblockHash,
      lastMiniblockNum,
      isSealed
    );
  }

  /// @inheritdoc IStreamRegistry
  function placeStreamOnNode(
    bytes32 streamId,
    address nodeAddress
  ) external onlyStream(streamId) onlyNode(msg.sender) {
    Stream storage stream = ds.streamById[streamId];

    // validate that the node is not already on the stream
    uint256 nodeCount = stream.nodes.length;

    for (uint256 i; i < nodeCount; ++i) {
      if (stream.nodes[i] == nodeAddress)
        revert(RiverRegistryErrors.ALREADY_EXISTS);
    }

    stream.nodes.push(nodeAddress);

    emit StreamPlacementUpdated(streamId, nodeAddress, true);
  }

  /// @inheritdoc IStreamRegistry
  function removeStreamFromNode(
    bytes32 streamId,
    address nodeAddress
  ) external onlyStream(streamId) onlyNode(msg.sender) {
    Stream storage stream = ds.streamById[streamId];

    bool found = false;
    uint256 nodeCount = stream.nodes.length;

    for (uint256 i; i < nodeCount; ++i) {
      if (stream.nodes[i] == nodeAddress) {
        stream.nodes[i] = stream.nodes[nodeCount - 1];
        stream.nodes.pop();
        found = true;
        break;
      }
    }

    if (!found) revert(RiverRegistryErrors.NODE_NOT_FOUND);

    emit StreamPlacementUpdated(streamId, nodeAddress, false);
  }

  /// @inheritdoc IStreamRegistry
  function getStream(
    bytes32 streamId
  ) external view returns (Stream memory stream) {
    assembly ("memory-safe") {
      // By default, memory has been implicitly allocated for `stream`.
      // But we don't need this implicitly allocated memory.
      // So we just set the free memory pointer to what it was before `stream` has been allocated.
      mstore(0x40, stream)
    }
    if (!ds.streams.contains(streamId)) revert(RiverRegistryErrors.NOT_FOUND);
    stream = ds.streamById[streamId];
  }

  /// @inheritdoc IStreamRegistry
  function isStream(bytes32 streamId) external view returns (bool) {
    return ds.streams.contains(streamId);
  }

  /// @inheritdoc IStreamRegistry
  function getStreamWithGenesis(
    bytes32 streamId
  ) external view returns (Stream memory stream, bytes32, bytes memory) {
    assembly ("memory-safe") {
      mstore(0x40, stream)
    }
    if (!ds.streams.contains(streamId)) revert(RiverRegistryErrors.NOT_FOUND);

    return (
      ds.streamById[streamId],
      ds.genesisMiniblockHashByStreamId[streamId],
      ds.genesisMiniblockByStreamId[streamId]
    );
  }

  /// @inheritdoc IStreamRegistry
  function getStreamCount() external view returns (uint256) {
    return ds.streams.length();
  }

  /// @inheritdoc IStreamRegistry
  function getStreamCountOnNode(
    address nodeAddress
  ) external view returns (uint256 count) {
    uint256 streamLength = ds.streams.length();
    for (uint256 i; i < streamLength; ++i) {
      bytes32 id = ds.streams.at(i);
      Stream storage stream = ds.streamById[id];
      for (uint256 j; j < stream.nodes.length; ++j) {
        if (stream.nodes[j] == nodeAddress) {
          ++count;
          break;
        }
      }
    }
  }

  /// @inheritdoc IStreamRegistry
  function getPaginatedStreams(
    uint256 start,
    uint256 stop
  ) external view returns (StreamWithId[] memory, bool) {
    if (start >= stop) revert(RiverRegistryErrors.BAD_ARG);

    uint256 streamCount = ds.streams.length();
    uint256 maxStreamIndex = stop > streamCount ? streamCount : stop;
    uint256 count = maxStreamIndex > start ? maxStreamIndex - start : 0;

    StreamWithId[] memory streams = new StreamWithId[](count);

    for (uint256 i; i < count; ++i) {
      bytes32 id = ds.streams.at(start + i);
      streams[i] = StreamWithId({id: id, stream: ds.streamById[id]});
    }

    return (streams, stop >= streamCount);
  }
}
