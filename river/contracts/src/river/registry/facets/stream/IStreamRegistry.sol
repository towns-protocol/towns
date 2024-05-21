// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Stream, StreamWithId, SetMiniblock} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries

// contracts

interface IStreamRegistry {
  // =============================================================
  //                           Events
  // =============================================================
  event StreamAllocated(
    bytes32 streamId,
    address[] nodes,
    bytes32 genesisMiniblockHash,
    bytes genesisMiniblock
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

  // =============================================================
  //                           Streams
  // =============================================================

  function allocateStream(
    bytes32 streamId,
    address[] memory nodes,
    bytes32 genesisMiniblockHash,
    bytes memory genesisMiniblock
  ) external;

  function getStream(bytes32 streamId) external view returns (Stream memory);

  function getStreamByIndex(
    uint256 i
  ) external view returns (StreamWithId memory);

  /// @return stream, genesisMiniblockHash, genesisMiniblock
  function getStreamWithGenesis(
    bytes32 streamId
  ) external view returns (Stream memory, bytes32, bytes memory);

  function setStreamLastMiniblock(
    bytes32 streamId,
    bytes32 prevMiniBlockHash,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
  ) external;

  function setStreamLastMiniblockBatch(
    SetMiniblock[] calldata miniblocks
  ) external;

  function placeStreamOnNode(bytes32 streamId, address nodeAddress) external;

  function removeStreamFromNode(bytes32 streamId, address nodeAddress) external;

  function getStreamCount() external view returns (uint256);

  /**
   * @notice Return array containing all stream ids
   * @dev WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
   * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
   * this function has an unbounded cost, and using it as part of a state-changing function may render the function
   * uncallable if the map grows to a point where copying to memory consumes too much gas to fit in a block.
   */
  function getAllStreamIds() external view returns (bytes32[] memory);

  /**
   * @notice Return array containing all streams
   * @dev WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
   * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
   * this function has an unbounded cost, and using it as part of a state-changing function may render the function
   * uncallable if the map grows to a point where copying to memory consumes too much gas to fit in a block.
   */
  function getAllStreams() external view returns (StreamWithId[] memory);

  /**
   * @dev Recommended range is 5000 streams, returns true if on the last page.
   */
  function getPaginatedStreams(
    uint256 start,
    uint256 stop
  ) external view returns (StreamWithId[] memory, bool);

  function getStreamsOnNode(
    address nodeAddress
  ) external view returns (StreamWithId[] memory);
}
