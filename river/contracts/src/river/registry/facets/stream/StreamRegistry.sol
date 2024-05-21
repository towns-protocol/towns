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
    for (uint256 i = 0; i < nodes.length; ++i) {
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

  function getStreamByIndex(
    uint256 i
  ) external view returns (StreamWithId memory) {
    if (i >= ds.streams.length()) {
      revert(RiverRegistryErrors.NOT_FOUND);
    }
    bytes32 streamId = ds.streams.at(i);
    return StreamWithId({id: streamId, stream: ds.streamById[streamId]});
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

  function setStreamLastMiniblock(
    bytes32 streamId,
    bytes32 /*prevMiniBlockHash*/,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
  ) external onlyNode(msg.sender) {
    // Validate that the streamId is in the registry
    if (!ds.streams.contains(streamId)) {
      revert(RiverRegistryErrors.NOT_FOUND);
    }

    Stream storage stream = ds.streamById[streamId];

    // TODO: this check is relaxed until storing of candidate miniblocks is
    // implemented on river node side. Currently, if there is a failure
    // to commit during mb production, contract and local storage
    // get out of sync.
    // This relaxation allows to get back in sync again.
    // // Check if the stream is already sealed using bitwise AND
    // if ((stream.flags & StreamFlags.SEALED) != 0) {
    //   revert(RiverRegistryErrors.STREAM_SEALED);
    // }

    // // Validate that the lastMiniblockNum is the next expected miniblock
    // if (
    //   stream.lastMiniblockNum + 1 != lastMiniblockNum ||
    //   stream.lastMiniblockHash != prevMiniBlockHash
    // ) {
    //   revert(RiverRegistryErrors.BAD_ARG);
    // }

    // Update the stream information
    stream.lastMiniblockHash = lastMiniblockHash;
    stream.lastMiniblockNum = lastMiniblockNum;

    // Set the sealed flag if requested
    if (isSealed) {
      stream.flags |= StreamFlags.SEALED;
    }

    // Delete genesis miniblock bytes if the stream is moving beyond genesis
    if (lastMiniblockNum == 1) {
      delete ds.genesisMiniblockByStreamId[streamId];
    }

    emit StreamLastMiniblockUpdated(
      streamId,
      lastMiniblockHash,
      lastMiniblockNum,
      isSealed
    );
  }

  function setStreamLastMiniblockBatch(
    SetMiniblock[] calldata miniblocks
  ) external onlyNode(msg.sender) {
    for (uint256 i = 0; i < miniblocks.length; ++i) {
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

      // TODO: this check is relaxed until storing of candidate miniblocks is
      // implemented on river node side. Currently, if there is a failure
      // to commit during mb production, contract and local storage
      // get out of sync.
      // This relaxation allows to get back in sync again.
      // // Check if the stream is already sealed using bitwise AND
      // if ((stream.flags & StreamFlags.SEALED) != 0)
      //   emit StreamLastMiniblockUpdateFailed(
      //     miniblock.streamId,
      //     miniblock.lastMiniblockHash,
      //     miniblock.lastMiniblockNum,
      //     miniblock.isSealed,
      //     RiverRegistryErrors.STREAM_SEALED);
      //   continue
      // }

      // // Validate that the lastMiniblockNum is the next expected miniblock
      // if (
      //   stream.lastMiniblockNum + 1 != lastMiniblockNum ||
      //   stream.lastMiniblockHash != prevMiniBlockHash
      // ) {
      //   emit StreamLastMiniblockUpdateFailed(
      //     miniblock.streamId,
      //     miniblock.lastMiniblockHash,
      //     miniblock.lastMiniblockNum,
      //     miniblock.isSealed,
      //     RiverRegistryErrors.BAD_ARG);
      //   continue;
      // }

      // Update the stream information
      stream.lastMiniblockHash = miniblock.lastMiniblockHash;
      stream.lastMiniblockNum = miniblock.lastMiniblockNum;

      // Set the sealed flag if requested
      if (miniblock.isSealed) {
        stream.flags |= StreamFlags.SEALED;
      }

      // Delete genesis miniblock bytes if the stream is moving beyond genesis
      if (miniblock.lastMiniblockNum == 1) {
        delete ds.genesisMiniblockByStreamId[miniblock.streamId];
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
  ) external onlyStream(streamId) onlyNode(nodeAddress) {
    Stream storage stream = ds.streamById[streamId];

    // validate that the node is not already on the stream
    for (uint256 i = 0; i < stream.nodes.length; ++i) {
      if (stream.nodes[i] == nodeAddress)
        revert(RiverRegistryErrors.ALREADY_EXISTS);
    }

    stream.nodes.push(nodeAddress);

    emit StreamPlacementUpdated(streamId, nodeAddress, true);
  }

  function removeStreamFromNode(
    bytes32 streamId,
    address nodeAddress
  ) external onlyStream(streamId) onlyNode(nodeAddress) {
    Stream storage stream = ds.streamById[streamId];

    bool found = false;
    for (uint256 i = 0; i < stream.nodes.length; ++i) {
      if (stream.nodes[i] == nodeAddress) {
        stream.nodes[i] = stream.nodes[stream.nodes.length - 1];
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

  function getAllStreamIds() external view returns (bytes32[] memory) {
    return ds.streams.values();
  }

  function getAllStreams() external view returns (StreamWithId[] memory) {
    StreamWithId[] memory streams = new StreamWithId[](ds.streams.length());

    for (uint256 i = 0; i < ds.streams.length(); ++i) {
      bytes32 id = ds.streams.at(i);
      streams[i] = StreamWithId({id: id, stream: ds.streamById[id]});
    }

    return streams;
  }

  function getPaginatedStreams(
    uint256 start,
    uint256 stop
  ) external view returns (StreamWithId[] memory, bool) {
    require(start < stop, RiverRegistryErrors.BAD_ARG);

    StreamWithId[] memory streams = new StreamWithId[](stop - start);

    for (
      uint256 i = 0;
      ((start + i) < ds.streams.length()) && ((start + i) < stop);
      ++i
    ) {
      bytes32 id = ds.streams.at(start + i);
      streams[i] = StreamWithId({id: id, stream: ds.streamById[id]});
    }

    return (streams, stop >= ds.streams.length());
  }

  function getStreamsOnNode(
    address nodeAddress
  ) external view returns (StreamWithId[] memory) {
    // TODO: very naive implementation, can be optimized
    bytes32[] memory allStreamIds = new bytes32[](ds.streams.length());
    uint32 streamCount;
    for (uint256 i = 0; i < ds.streams.length(); ++i) {
      bytes32 id = ds.streams.at(i);
      Stream storage stream = ds.streamById[id];
      for (uint256 j = 0; j < stream.nodes.length; ++j) {
        if (stream.nodes[j] == nodeAddress) {
          allStreamIds[streamCount++] = id;
          break;
        }
      }
    }

    StreamWithId[] memory streams = new StreamWithId[](streamCount);
    for (uint256 i = 0; i < streamCount; ++i) {
      streams[i] = StreamWithId({
        id: allStreamIds[i],
        stream: ds.streamById[allStreamIds[i]]
      });
    }

    return streams;
  }
}
