// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Stream, StreamWithId, SetMiniblock} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries

// contracts
interface IStreamRegistryBase {
  // =============================================================
  //                           Events
  // =============================================================
  event StreamAllocated(
    bytes32 streamId,
    address[] nodes,
    bytes32 genesisMiniblockHash,
    bytes genesisMiniblock
  );

  event StreamCreated(
    bytes32 streamId,
    bytes32 genesisMiniblockHash,
    Stream stream
  );

  event StreamLastMiniblockUpdated(
    bytes32 streamId,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
  );

  event StreamLastMiniblockUpdateFailed(
    bytes32 streamId,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    string reason
  );

  event StreamPlacementUpdated(
    bytes32 streamId,
    address nodeAddress,
    bool isAdded
  );
}

interface IStreamRegistry is IStreamRegistryBase {
  // =============================================================
  //                           Streams
  // =============================================================

  /**
   * @notice Check if a stream exists in the registry
   * @param streamId The ID of the stream to check
   * @return bool True if the stream exists, false otherwise
   */
  function isStream(bytes32 streamId) external view returns (bool);

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
   * @notice Get a stream from the registry
   * @param streamId The ID of the stream to get
   * @return Stream The stream data
   */
  function getStream(bytes32 streamId) external view returns (Stream memory);

  /**
   * @notice Set the last miniblock for multiple streams in a batch operation
   * @param miniblocks Array of SetMiniblock structs containing stream IDs and their last miniblock information
   * @dev Only callable by registered nodes
   * @dev This function allows updating multiple streams' last miniblock data in a single transaction
   */
  function setStreamLastMiniblockBatch(
    SetMiniblock[] calldata miniblocks
  ) external;

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
   * @notice Get the total number of streams in the registry
   * @return uint256 The total number of streams
   */
  function getStreamCount() external view returns (uint256);

  /**
   * @notice Get the number of streams placed on a specific node
   * @param nodeAddress The address of the node to check
   * @return uint256 The number of streams on the node
   */
  function getStreamCountOnNode(
    address nodeAddress
  ) external view returns (uint256);

  /**
   * @notice Get a paginated list of streams from the registry
   * @dev Recommended range is 5000 streams to avoid gas limits
   * @param start The starting index for pagination
   * @param stop The ending index for pagination
   * @return StreamWithId[] Array of streams with their IDs in the requested range
   * @return bool True if this is the last page of results
   */
  function getPaginatedStreams(
    uint256 start,
    uint256 stop
  ) external view returns (StreamWithId[] memory, bool);

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
   * @notice Update the last miniblock information for a stream
   * @dev Only callable by registered nodes
   * @param streamId The ID of the stream to update
   * @param prevMiniblockHash The hash of the previous miniblock (currently unused)
   * @param lastMiniblockHash The hash of the new last miniblock
   * @param lastMiniblockNum The number of the new last miniblock
   * @param isSealed Whether to mark the stream as sealed
   * @custom:deprecated Deprecated in favor of setStreamLastMiniblockBatch
   */
  function setStreamLastMiniblock(
    bytes32 streamId,
    bytes32 prevMiniblockHash,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
  ) external;
}
