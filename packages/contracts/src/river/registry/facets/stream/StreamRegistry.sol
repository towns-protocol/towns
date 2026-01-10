// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IStreamRegistry} from "./IStreamRegistry.sol";
import {SetMiniblock, SetStreamReplicationFactor, Stream, StreamWithId} from "src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {RiverRegistryErrors} from "src/river/registry/libraries/RegistryErrors.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts
import {RegistryModifiers} from "src/river/registry/libraries/RegistryStorage.sol";

library StreamFlags {
    uint64 internal constant SEALED = 1;
}

contract StreamRegistry is IStreamRegistry, RegistryModifiers {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for string;

    uint64 internal constant STREAM_REPL_FACTOR_MASK = 0xFF;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STREAMS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IStreamRegistry
    function allocateStream(
        bytes32 streamId,
        address[] calldata nodes,
        bytes32 genesisMiniblockHash,
        bytes calldata genesisMiniblock
    ) external onlyNode(msg.sender) onlyStreamNotExists(streamId) onlyRegisteredNodes(nodes) {
        // Add the stream to the registry
        Stream storage stream = ds.streamById[streamId];
        (stream.lastMiniblockHash, stream.nodes, stream.reserved0) = (
            genesisMiniblockHash,
            nodes,
            _calculateStreamReserved0(stream.reserved0, uint8(nodes.length))
        );

        ds.streams.add(streamId);
        ds.genesisMiniblockByStreamId[streamId] = genesisMiniblock;
        ds.genesisMiniblockHashByStreamId[streamId] = genesisMiniblockHash;

        _addStreamIdToNodes(streamId, nodes);

        _emitStreamUpdated(StreamEventType.Allocate, abi.encode(streamId, stream));
    }

    /// @inheritdoc IStreamRegistry
    function addStream(
        bytes32 streamId,
        bytes32 genesisMiniblockHash,
        Stream calldata stream
    )
        external
        onlyNode(msg.sender)
        onlyStreamNotExists(streamId)
        onlyRegisteredNodes(stream.nodes)
    {
        ds.streams.add(streamId);
        ds.streamById[streamId] = stream;
        ds.genesisMiniblockHashByStreamId[streamId] = genesisMiniblockHash;

        _addStreamIdToNodes(streamId, stream.nodes);

        _emitStreamUpdated(StreamEventType.Create, abi.encode(streamId, stream));
    }

    function setStreamLastMiniblockBatch(
        SetMiniblock[] calldata miniblocks
    ) external onlyNode(msg.sender) {
        uint256 miniblockCount = miniblocks.length;

        if (miniblockCount == 0) RiverRegistryErrors.BAD_ARG.revertWith();

        SetMiniblock[] memory miniblockUpdates = new SetMiniblock[](miniblockCount);
        uint256 streamCount = 0;

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
                stream.lastMiniblockNum + 1 != miniblock.lastMiniblockNum ||
                stream.lastMiniblockHash != miniblock.prevMiniBlockHash
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

            miniblockUpdates[streamCount++] = miniblock;
        }

        // overwrite the length of the array
        assembly ("memory-safe") {
            mstore(miniblockUpdates, streamCount)
        }

        _emitStreamUpdated(StreamEventType.LastMiniblockBatchUpdated, abi.encode(miniblockUpdates));
    }

    /// @inheritdoc IStreamRegistry
    function placeStreamOnNode(
        bytes32 streamId,
        address nodeAddress
    ) external onlyStream(streamId) onlyNode(msg.sender) {
        Stream storage stream = ds.streamById[streamId];
        address[] storage nodes = stream.nodes;

        ds.streamIdsByNode[nodeAddress].add(streamId);

        // validate that the node is not already on the stream
        uint256 nodeCount = nodes.length;

        for (uint256 i; i < nodeCount; ++i) {
            if (nodes[i] == nodeAddress) {
                RiverRegistryErrors.ALREADY_EXISTS.revertWith();
            }
        }

        nodes.push(nodeAddress);
        stream.reserved0 = _calculateStreamReserved0(stream.reserved0, uint8(nodes.length));

        _emitStreamUpdated(StreamEventType.PlacementUpdated, abi.encode(streamId, stream));
    }

    /// @inheritdoc IStreamRegistry
    function removeStreamFromNode(
        bytes32 streamId,
        address nodeAddress
    ) external onlyStream(streamId) onlyNode(msg.sender) {
        Stream storage stream = ds.streamById[streamId];
        address[] storage nodes = stream.nodes;

        ds.streamIdsByNode[nodeAddress].remove(streamId);

        bool found = false;
        uint256 nodeCount = nodes.length;

        for (uint256 i; i < nodeCount; ++i) {
            if (nodes[i] == nodeAddress) {
                nodes[i] = nodes[nodeCount - 1];
                nodes.pop();
                found = true;
                break;
            }
        }

        if (!found) RiverRegistryErrors.NODE_NOT_FOUND.revertWith();

        stream.reserved0 = _calculateStreamReserved0(stream.reserved0, uint8(nodes.length));

        _emitStreamUpdated(StreamEventType.PlacementUpdated, abi.encode(streamId, stream));
    }

    /// @inheritdoc IStreamRegistry
    function syncNodesOnStreams(uint256 start, uint256 stop) external {
        uint256 end;
        unchecked {
            uint256 streamCount = ds.streams.length();
            uint256 maxStreamIndex = FixedPointMathLib.min(stop, streamCount);
            uint256 count = FixedPointMathLib.zeroFloorSub(maxStreamIndex, start);
            end = start + count;
        }

        unchecked {
            for (; start < end; ++start) {
                bytes32 streamId = ds.streams.at(start);
                Stream storage stream = ds.streamById[streamId];
                _addStreamIdToNodes(streamId, stream.nodes);
            }
        }
    }

    /// @inheritdoc IStreamRegistry
    function setStreamReplicationFactor(
        SetStreamReplicationFactor[] calldata requests
    ) external onlyConfigurationManager(msg.sender) {
        uint256 requestsCount = requests.length;

        if (requestsCount == 0) RiverRegistryErrors.BAD_ARG.revertWith();

        for (uint256 i; i < requestsCount; ++i) {
            SetStreamReplicationFactor calldata req = requests[i];

            if (req.replicationFactor == 0 || req.replicationFactor > req.nodes.length) {
                RiverRegistryErrors.BAD_ARG.revertWith();
            }

            _verifyStreamIdExists(req.streamId);
            Stream storage stream = ds.streamById[req.streamId];

            // remove the stream from the existing set of nodes
            _removeStreamIdFromNodes(req.streamId, stream.nodes);

            // place stream on the new set of nodes
            _addStreamIdToNodes(req.streamId, req.nodes);

            (stream.nodes, stream.reserved0) = (
                req.nodes,
                _calculateStreamReserved0(stream.reserved0, req.replicationFactor)
            );

            _emitStreamUpdated(StreamEventType.PlacementUpdated, abi.encode(req.streamId, stream));
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IStreamRegistry
    function isStream(bytes32 streamId) external view returns (bool) {
        return ds.streams.contains(streamId);
    }

    /// @inheritdoc IStreamRegistry
    function getStream(bytes32 streamId) external view returns (Stream memory stream) {
        assembly ("memory-safe") {
            // By default, memory has been implicitly allocated for `stream`.
            // But we don't need this implicitly allocated memory.
            // So we just set the free memory pointer to what it was before `stream` has been
            // allocated.
            mstore(0x40, stream)
        }
        _verifyStreamIdExists(streamId);
        stream = ds.streamById[streamId];
    }

    /// @inheritdoc IStreamRegistry
    function getStreamWithGenesis(
        bytes32 streamId
    ) external view returns (Stream memory stream, bytes32, bytes memory) {
        assembly ("memory-safe") {
            mstore(0x40, stream)
        }
        _verifyStreamIdExists(streamId);

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
    function getStreamCountOnNode(address nodeAddress) external view returns (uint256 count) {
        count = ds.streamIdsByNode[nodeAddress].length();
    }

    /// @inheritdoc IStreamRegistry
    function getPaginatedStreamsOnNode(
        address nodeAddress,
        uint256 start,
        uint256 stop
    ) external view returns (StreamWithId[] memory streams) {
        EnumerableSet.Bytes32Set storage streamIds = ds.streamIdsByNode[nodeAddress];
        uint256 streamCount = streamIds.length();
        uint256 maxStreamIndex = FixedPointMathLib.min(stop, streamCount);
        uint256 count = FixedPointMathLib.zeroFloorSub(maxStreamIndex, start);

        streams = new StreamWithId[](count);
        for (uint256 i; i < count; ++i) {
            StreamWithId memory stream = streams[i];
            unchecked {
                stream.id = streamIds.at(start + i);
            }
            stream.stream = ds.streamById[stream.id];
        }
    }

    /// @inheritdoc IStreamRegistry
    function getPaginatedStreams(
        uint256 start,
        uint256 stop
    ) external view returns (StreamWithId[] memory, bool) {
        uint256 streamCount = ds.streams.length();
        uint256 maxStreamIndex = FixedPointMathLib.min(stop, streamCount);
        uint256 count = FixedPointMathLib.zeroFloorSub(maxStreamIndex, start);

        StreamWithId[] memory streams = new StreamWithId[](count);
        for (uint256 i; i < count; ++i) {
            StreamWithId memory stream = streams[i];
            unchecked {
                stream.id = ds.streams.at(start + i);
            }
            stream.stream = ds.streamById[stream.id];
        }

        return (streams, stop >= streamCount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Adds a stream id to the nodes
    function _addStreamIdToNodes(bytes32 streamId, address[] storage nodes) internal {
        uint256 nodeCount = nodes.length;
        for (uint256 i; i < nodeCount; ++i) {
            ds.streamIdsByNode[nodes[i]].add(streamId);
        }
    }

    /// @dev Adds a stream id to the nodes
    function _addStreamIdToNodes(bytes32 streamId, address[] calldata nodes) internal {
        for (uint256 i; i < nodes.length; ++i) {
            ds.streamIdsByNode[nodes[i]].add(streamId);
        }
    }

    /// @dev Removes a stream id from the nodes
    function _removeStreamIdFromNodes(bytes32 streamId, address[] storage nodes) internal {
        uint256 nodeCount = nodes.length;
        for (uint256 i; i < nodeCount; ++i) {
            ds.streamIdsByNode[nodes[i]].remove(streamId);
        }
    }

    /// @dev Emits the StreamUpdated event without memory expansion
    function _emitStreamUpdated(StreamEventType eventType, bytes memory data) internal {
        bytes32 topic0 = StreamUpdated.selector;
        assembly ("memory-safe") {
            // cache the word before for abi encoding offset
            let offset := sub(data, 0x20)
            let cache := mload(offset)
            // the event arg is encoded as | 0x20 | data length | data
            mstore(offset, 0x20)
            log2(offset, add(mload(data), 0x40), topic0, eventType)
            mstore(offset, cache)
        }
    }

    /// @dev helper function to calculate the reserved0 field for the stream with the given
    /// reserved0
    /// and replication factor
    function _calculateStreamReserved0(
        uint64 reserved0,
        uint8 replFactor
    ) internal pure returns (uint64) {
        return (reserved0 & ~STREAM_REPL_FACTOR_MASK) | uint64(replFactor);
    }
}
