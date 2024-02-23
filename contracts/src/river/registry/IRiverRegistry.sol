// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

interface IRiverRegistryBase {
  struct Stream {
    bytes32 lastMiniblockHash;
    uint64 lastMiniblockNum; // | Packed into single storage slot
    uint64 flags; //            |
    uint64 reserved0; //        |
    uint64 reserved1; //        |
    address[] nodes;
  }

  struct StreamWithId {
    bytes32 id;
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
    address nodeAddress;
    string url;
    NodeStatus status;
  }

  // =============================================================
  //                           Events
  // =============================================================

  // Operator events
  event OperatorAdded(address indexed operatorAddress);

  event OperatorRemoved(address indexed operatorAddress);

  // Node events
  event NodeAdded(address indexed nodeAddress, string url, NodeStatus status);

  event NodeStatusUpdated(address indexed nodeAddress, NodeStatus status);

  event NodeUrlUpdated(address indexed nodeAddress, string url);

  // Stream events
  event StreamAllocated(
    bytes32 streamId,
    address[] nodes,
    bytes32 genesisMiniblockHash
  );

  event StreamLastMiniblockUpdated(
    bytes32 streamId,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
  );

  event StreamPlacementUpdated(
    bytes32 streamId,
    address nodeAddress,
    bool isAdded
  );
}

// TODO: toplevel or library?
uint64 constant STREAM_FLAG_SEALED = 1;

library RiverRegistryErrors {
  // =============================================================
  //                         Errors
  // =============================================================
  // TODO: common convention for const names IS_DIFFERENT_CASE?
  string public constant AlreadyExists = "ALREADY_EXISTS";
  string public constant OperatorNotFound = "OPERATOR_NOT_FOUND";
  string public constant NodeNotFound = "NODE_NOT_FOUND";
  string public constant StreamNotFound = "NOT_FOUND";
  string public constant OutOfBounds = "OUT_OF_BOUNDS";
  string public constant BadArg = "BAD_ARG";
  string public constant BadAuth = "BAD_AUTH";
  string public constant InvalidStreamId = "INVALID_STREAM_ID";
  string public constant StreamSealed = "STREAM_SEALED";
}

interface IRiverRegistry is IRiverRegistryBase {
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

  /// @return stream, genesisMiniblockHash, genesisMiniblock
  function getStreamWithGenesis(
    bytes32 streamId
  ) external view returns (Stream memory, bytes32, bytes memory);

  function setStreamLastMiniblock(
    bytes32 streamId,
    bytes32 lastMiniblockHash,
    uint64 lastMiniblockNum,
    bool isSealed
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

  // =============================================================
  //                           Nodes
  // =============================================================
  function registerNode(address nodeAddress, string memory url) external;

  function getNode(address nodeAddress) external view returns (Node memory);

  function getNodeCount() external view returns (uint256);

  /**
   * @notice Return array containing all node addresses
   * @dev WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
   * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
   * this function has an unbounded cost, and using it as part of a state-changing function may render the function
   * uncallable if the map grows to a point where copying to memory consumes too much gas to fit in a block.
   */
  function getAllNodeAddresses() external view returns (address[] memory);

  /**
   * @notice Return array containing all nodes
   * @dev WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
   * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
   * this function has an unbounded cost, and using it as part of a state-changing function may render the function
   * uncallable if the map grows to a point where copying to memory consumes too much gas to fit in a block.
   */
  function getAllNodes() external view returns (Node[] memory);

  // =============================================================
  //                           Operators
  // =============================================================
  function approveOperator(address operator) external;

  function isOperator(address operator) external view returns (bool);

  function removeOperator(address operator) external;
}
