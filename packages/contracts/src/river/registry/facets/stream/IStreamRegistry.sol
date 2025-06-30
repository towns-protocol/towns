// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {SetMiniblock, SetStreamReplicationFactor, UpdateStream, Stream, StreamWithId} from "src/river/registry/libraries/RegistryStorage.sol";

// libraries

// contracts

interface IStreamRegistryBase {
    /// @notice The type of stream event
    enum StreamEventType {
        Allocate,
        Create,
        PlacementUpdated,
        LastMiniblockBatchUpdated
    }

    /// @notice The event emitted when a stream is updated
    /// @dev One event to rule them all
    /// To decode:
    ///   switch (eventType) {
    ///     case StreamEventType.Allocate:
    ///     case StreamEventType.Create:
    ///     case StreamEventType.PlacementUpdated:
    ///       (bytes32 streamId, Stream memory stream) = abi.decode(data, (bytes32, Stream));
    ///     case StreamEventType.LastMiniblockBatchUpdated:
    ///       (SetMiniblock[] memory miniBlockUpdates) = abi.decode(data, (SetMiniblock[]));
    ///   }
    /// @param eventType The type of stream event
    /// @param data The data of the stream event
    event StreamUpdated(StreamEventType indexed eventType, bytes data);

    event StreamLastMiniblockUpdateFailed(
        bytes32 streamId,
        bytes32 lastMiniblockHash,
        uint64 lastMiniblockNum,
        string reason
    );
}

interface IStreamRegistry is IStreamRegistryBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STREAMS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Allocate a new stream in the registry
     * @param streamId The ID of the stream to allocate
     * @param nodes The list of nodes to place the stream on
     * @param genesisMiniblockHash The hash of the genesis miniblock
     * @param genesisMiniblock The genesis miniblock data
     * @dev Only callable by registered nodes
     */
    function allocateStream(
        bytes32 streamId,
        address[] memory nodes,
        bytes32 genesisMiniblockHash,
        bytes memory genesisMiniblock
    ) external;

    /**
     * @notice Create a new stream in the registry
     * @param stream is the Stream object to be created
     * @dev Only callable by registered nodes
     */
    function addStream(
        bytes32 streamId,
        bytes32 genesisMiniblockHash,
        Stream memory stream
    ) external;

    /**
     * @notice Sync node addresses for streams in a range to `streamIdsByNode` mapping
     * @param start The starting index for pagination
     * @param stop The ending index for pagination, exclusive
     */
    function syncNodesOnStreams(uint256 start, uint256 stop) external;

    /**
     * @notice Set the last miniblock for multiple streams in a batch operation
     * @param miniblocks Array of SetMiniblock structs containing stream IDs and their last
     * miniblock
     * information
     * @dev Only callable by registered nodes
     * @dev This function allows updating multiple streams' last miniblock data in a single
     * transaction
     */
    function setStreamLastMiniblockBatch(SetMiniblock[] calldata miniblocks) external;

    /**
     * @notice Place a stream on a specific node
     * @param streamId The ID of the stream to place
     * @param nodeAddress The address of the node to place the stream on
     */
    function placeStreamOnNode(bytes32 streamId, address nodeAddress) external;

    /**
     * @notice Remove a stream from a specific node
     * @param streamId The ID of the stream to remove
     * @param nodeAddress The address of the node to remove the stream from
     */
    function removeStreamFromNode(bytes32 streamId, address nodeAddress) external;

    /**
     * @notice Set the replication factor for existing streams
     * @param requests list with streams to set replication factor for
     * @dev Only callable by configuration managers
     *
     * @dev This function is to migrate existing non-replicated streams to replicated streams.
     * If the replication factor is less than the number of nodes it indicates that only the first
     * "replicationFactor"
     * nodes participate in reaching quorum. The remaining nodes only sync the stream data.
     */
    function setStreamReplicationFactor(SetStreamReplicationFactor[] calldata requests) external;

    /**
     * @notice Update the stream record.
     * @param requests list with streams to update
     * @dev Only callable by nodes that are participating in the stream.
     */
    function updateStreams(UpdateStream[] calldata requests) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Check if a stream exists in the registry
     * @param streamId The ID of the stream to check
     * @return bool True if the stream exists, false otherwise
     */
    function isStream(bytes32 streamId) external view returns (bool);

    /**
     * @notice Get a stream from the registry
     * @param streamId The ID of the stream to get
     * @return Stream The stream data
     */
    function getStream(bytes32 streamId) external view returns (Stream memory);

    /**
     * @notice Get a stream and its genesis information from the registry
     * @param streamId The ID of the stream to get
     * @return Stream The stream data
     * @return bytes32 The genesis miniblock hash
     * @return bytes The genesis miniblock data
     */
    function getStreamWithGenesis(
        bytes32 streamId
    ) external view returns (Stream memory, bytes32, bytes memory);

    /**
     * @notice Get the total number of streams in the registry
     * @return uint256 The total number of streams
     */
    function getStreamCount() external view returns (uint256);

    /**
     * @notice Get the number of streams placed on a specific node
     * @param nodeAddress The address of the node to check
     * @return uint256 The number of streams on the node
     */
    function getStreamCountOnNode(address nodeAddress) external view returns (uint256);

    /**
     * @notice Get a paginated list of streams on a specific node
     * @param nodeAddress The address of the node
     * @param start The starting index for pagination
     * @param stop The ending index for pagination, exclusive
     * @return streams Array of streams with their IDs in the requested range for the specified node
     */
    function getPaginatedStreamsOnNode(
        address nodeAddress,
        uint256 start,
        uint256 stop
    ) external view returns (StreamWithId[] memory streams);
    /**
     * @notice Get a paginated list of streams from the registry
     * @dev Recommended range is 5000 streams to avoid gas limits
     * @param start The starting index for pagination
     * @param stop The ending index for pagination, exclusive
     * @return StreamWithId[] Array of streams with their IDs in the requested range
     * @return bool True if this is the last page of results
     */
    function getPaginatedStreams(
        uint256 start,
        uint256 stop
    ) external view returns (StreamWithId[] memory, bool);
}
