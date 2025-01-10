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

  function isStream(bytes32 streamId) external view returns (bool);

  function allocateStream(
    bytes32 streamId,
    address[] memory nodes,
    bytes32 genesisMiniblockHash,
    bytes memory genesisMiniblock
  ) external;

  function getStream(bytes32 streamId) external view returns (Stream memory);

  /// @return stream, genesisMiniblockHash, genesisMiniblock
  function getStreamWithGenesis(
    bytes32 streamId
  ) external view returns (Stream memory, bytes32, bytes memory);

  function setStreamLastMiniblockBatch(
    SetMiniblock[] calldata miniblocks
  ) external;

  function placeStreamOnNode(bytes32 streamId, address nodeAddress) external;

  function removeStreamFromNode(bytes32 streamId, address nodeAddress) external;

  function getStreamCount() external view returns (uint256);

  function getStreamCountOnNode(
    address nodeAddress
  ) external view returns (uint256);

  /**
   * @dev Recommended range is 5000 streams, returns true if on the last page.
   */
  function getPaginatedStreams(
    uint256 start,
    uint256 stop
  ) external view returns (StreamWithId[] memory, bool);
}
