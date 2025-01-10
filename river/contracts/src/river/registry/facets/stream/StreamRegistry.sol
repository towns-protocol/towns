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
  uint64 constant SEALED = 1;
}

contract StreamRegistry is IStreamRegistry, RegistryModifiers {
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using EnumerableSet for EnumerableSet.AddressSet;

  function allocateStream(
    bytes32 streamId,
    address[] memory nodes,
    bytes32 genesisMiniblockHash,
    bytes memory genesisMiniblock
  ) external onlyNode(msg.sender) {
    // verify that the streamId is not already in the registry
    if (ds.streams.contains(streamId))
      revert(RiverRegistryErrors.ALREADY_EXISTS);

    // verify that the nodes stream is placed on are in the registry
    uint256 nodeCount = nodes.length;
    for (uint256 i = 0; i < nodeCount; ++i) {
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

  function getStream(bytes32 streamId) external view returns (Stream memory) {
    if (!ds.streams.contains(streamId)) revert(RiverRegistryErrors.NOT_FOUND);
    return ds.streamById[streamId];
  }

  function isStream(bytes32 streamId) external view returns (bool) {
    return ds.streams.contains(streamId);
  }

  /// @return stream, genesisMiniblockHash, genesisMiniblock
  function getStreamWithGenesis(
    bytes32 streamId
  ) external view returns (Stream memory, bytes32, bytes memory) {
    if (!ds.streams.contains(streamId)) revert(RiverRegistryErrors.NOT_FOUND);

    return (
      ds.streamById[streamId],
      ds.genesisMiniblockHashByStreamId[streamId],
      ds.genesisMiniblockByStreamId[streamId]
    );
  }

  function setStreamLastMiniblockBatch(
    SetMiniblock[] calldata miniblocks
  ) external onlyNode(msg.sender) {
    uint256 miniblockCount = miniblocks.length;

    if (miniblockCount == 0) revert(RiverRegistryErrors.BAD_ARG);

    for (uint256 i = 0; i < miniblockCount; ++i) {
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

      // TODO: Check is disabled to allow over-writing miniblocks
      // It should be re-enabled when go code is fixed to handle this correctly.
      // Check if the lastMiniblockNum is the next expected miniblock and
      // the prevMiniblockHash is correct
      // if (
      //   // stream.lastMiniblockNum + 1 != miniblock.lastMiniblockNum ||
      //   // stream.lastMiniblockHash != miniblock.prevMiniBlockHash
      //   stream.lastMiniblockNum >= miniblock.lastMiniblockNum
      // ) {
      //   emit StreamLastMiniblockUpdateFailed(
      //     miniblock.streamId,
      //     miniblock.lastMiniblockHash,
      //     miniblock.lastMiniblockNum,
      //     RiverRegistryErrors.BAD_ARG
      //   );
      //   continue;
      // }

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

  function placeStreamOnNode(
    bytes32 streamId,
    address nodeAddress
  ) external onlyStream(streamId) onlyNode(msg.sender) {
    Stream storage stream = ds.streamById[streamId];

    // validate that the node is not already on the stream
    uint256 nodeCount = stream.nodes.length;

    for (uint256 i = 0; i < nodeCount; ++i) {
      if (stream.nodes[i] == nodeAddress)
        revert(RiverRegistryErrors.ALREADY_EXISTS);
    }

    stream.nodes.push(nodeAddress);

    emit StreamPlacementUpdated(streamId, nodeAddress, true);
  }

  function removeStreamFromNode(
    bytes32 streamId,
    address nodeAddress
  ) external onlyStream(streamId) onlyNode(msg.sender) {
    Stream storage stream = ds.streamById[streamId];

    bool found = false;
    uint256 nodeCount = stream.nodes.length;

    for (uint256 i = 0; i < nodeCount; ++i) {
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

  function getStreamCount() external view returns (uint256) {
    return ds.streams.length();
  }

  function getStreamCountOnNode(
    address nodeAddress
  ) external view returns (uint256) {
    uint256 count = 0;
    uint256 streamLength = ds.streams.length();
    for (uint256 i = 0; i < streamLength; ++i) {
      bytes32 id = ds.streams.at(i);
      Stream storage stream = ds.streamById[id];
      for (uint256 j = 0; j < stream.nodes.length; ++j) {
        if (stream.nodes[j] == nodeAddress) {
          count++;
          break;
        }
      }
    }

    return count;
  }

  function getPaginatedStreams(
    uint256 start,
    uint256 stop
  ) external view returns (StreamWithId[] memory, bool) {
    if (start >= stop) revert(RiverRegistryErrors.BAD_ARG);

    uint256 streamCount = ds.streams.length();
    uint256 maxStreamIndex = stop > streamCount ? streamCount : stop;
    uint256 count = maxStreamIndex > start ? maxStreamIndex - start : 0;

    StreamWithId[] memory streams = new StreamWithId[](count);

    for (uint256 i = 0; i < count; ++i) {
      bytes32 id = ds.streams.at(start + i);
      streams[i] = StreamWithId({id: id, stream: ds.streamById[id]});
    }

    return (streams, stop >= streamCount);
  }
}
