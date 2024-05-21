// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {NodeStatus, Node} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries

// contracts
interface INodeRegistryBase {
  // =============================================================
  //                           Events
  // =============================================================
  event NodeAdded(address indexed nodeAddress, string url, NodeStatus status);
  event NodeStatusUpdated(address indexed nodeAddress, NodeStatus status);
  event NodeUrlUpdated(address indexed nodeAddress, string url);
  event NodeRemoved(address indexed nodeAddress);
}

interface INodeRegistry is INodeRegistryBase {
  // =============================================================
  //                           Nodes
  // =============================================================
  function registerNode(
    address nodeAddress,
    string memory url,
    NodeStatus status
  ) external;

  function removeNode(address nodeAddress) external;

  function updateNodeStatus(address nodeAddress, NodeStatus status) external;

  function updateNodeUrl(address nodeAddress, string memory url) external;

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
}
