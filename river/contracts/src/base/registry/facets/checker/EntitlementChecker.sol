// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementChecker} from "./IEntitlementChecker.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {EntitlementCheckerStorage} from "./EntitlementCheckerStorage.sol";
import {NodeOperatorStorage, NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract EntitlementChecker is IEntitlementChecker, Facet {
  using EnumerableSet for EnumerableSet.AddressSet;

  // =============================================================
  //                           Initializer
  // =============================================================
  function __EntitlementChecker_init() external onlyInitializing {
    _addInterface(type(IEntitlementChecker).interfaceId);
  }

  // =============================================================
  //                           Modifiers
  // =============================================================
  modifier onlyNodeOperator(address node, address operator) {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();

    if (layout.operatorByNode[node] != operator) {
      revert EntitlementChecker_InvalidNodeOperator();
    }
    _;
  }

  modifier onlyRegisteredApprovedOperator() {
    NodeOperatorStorage.Layout storage nodeOperatorLayout = NodeOperatorStorage
      .layout();

    if (!nodeOperatorLayout.operators.contains(msg.sender))
      revert EntitlementChecker_InvalidOperator();
    _;

    if (
      nodeOperatorLayout.statusByOperator[msg.sender] !=
      NodeOperatorStatus.Approved
    ) {
      revert EntitlementChecker_OperatorNotActive();
    }
  }

  // =============================================================
  //                           External
  // =============================================================

  /**
   * @notice Register a node
   * @param node The address of the node to register
   * @dev Only valid operators can register a node
   */
  function registerNode(address node) external onlyRegisteredApprovedOperator {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();

    if (layout.nodes.contains(node))
      revert EntitlementChecker_NodeAlreadyRegistered();

    layout.nodes.add(node);
    layout.operatorByNode[node] = msg.sender;

    emit NodeRegistered(node);
  }

  /**
   * @notice Unregister a node
   * @param node The address of the node to unregister
   * @dev Only the operator of the node can unregister it
   */
  function unregisterNode(
    address node
  ) external onlyNodeOperator(node, msg.sender) {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();

    if (!layout.nodes.contains(node))
      revert EntitlementChecker_NodeNotRegistered();

    layout.nodes.remove(node);
    delete layout.operatorByNode[node];

    emit NodeUnregistered(node);
  }

  /**
   * @notice Check if a node is registered
   * @param node The address of the node to check
   * @return true if the node is registered, false otherwise
   */
  function isValidNode(address node) external view returns (bool) {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();
    return layout.nodes.contains(node);
  }

  /**
   * @notice Get the number of registered nodes
   * @return The number of registered nodes
   */
  function getNodeCount() external view returns (uint256) {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();
    return layout.nodes.length();
  }

  /**
   * @notice Get the node at a specific index
   * @param index The index of the node to get
   * @dev Reverts if the index is out of bounds
   * @return The address of the node at the specified index
   */
  function getNodeAtIndex(uint256 index) external view returns (address) {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();

    require(index < layout.nodes.length(), "Index out of bounds");
    return layout.nodes.at(index);
  }

  /**
   * @notice Get a random selection of nodes
   * @param count The number of nodes to select
   * @dev Reverts if the requested count exceeds the number of available nodes
   * @return An array of randomly selected node addresses
   */
  function getRandomNodes(
    uint256 count
  ) external view returns (address[] memory) {
    return _getRandomNodes(count);
  }

  /**
   * @notice Emit an EntitlementCheckRequested event
   * @param transactionId The hash of the transaction
   * @param nodes The selected nodes
   */
  function requestEntitlementCheck(
    address callerAddress,
    bytes32 transactionId,
    uint256 roleId,
    address[] memory nodes
  ) external {
    emit EntitlementCheckRequested(
      callerAddress,
      msg.sender,
      transactionId,
      roleId,
      nodes
    );
  }

  /**
   * @notice Get the nodes registered by an operator
   * @param operator The address of the operator
   * @return nodes An array of node addresses
   */
  function getNodesByOperator(
    address operator
  ) external view returns (address[] memory nodes) {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();
    uint256 totalNodeCount = layout.nodes.length();
    nodes = new address[](totalNodeCount);
    uint256 nodeCount;
    for (uint256 i; i < totalNodeCount; ++i) {
      address node = layout.nodes.at(i);
      if (layout.operatorByNode[node] == operator) {
        unchecked {
          nodes[nodeCount++] = node;
        }
      }
    }
    assembly ("memory-safe") {
      mstore(nodes, nodeCount) // Update the length of the array
    }
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _getRandomNodes(
    uint256 count
  ) internal view returns (address[] memory) {
    EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage
      .layout();

    uint256 nodeCount = layout.nodes.length();

    if (count > nodeCount) {
      revert EntitlementChecker_InsufficientNumberOfNodes();
    }

    address[] memory randomNodes = new address[](count);
    uint256[] memory indices = new uint256[](nodeCount);

    for (uint256 i; i < nodeCount; ++i) {
      indices[i] = i;
    }

    unchecked {
      for (uint256 i; i < count; ++i) {
        // Adjust random function to generate within range 0 to n-1
        uint256 rand = _pseudoRandom(i, nodeCount);
        randomNodes[i] = layout.nodes.at(indices[rand]);
        // Move the last element to the used slot and reduce the pool size
        indices[rand] = indices[--nodeCount];
      }
    }
    return randomNodes;
  }

  // Generate a pseudo-random index based on a seed and the node count
  function _pseudoRandom(
    uint256 seed,
    uint256 nodeCount
  ) internal view returns (uint256) {
    return
      uint256(
        keccak256(
          abi.encode(block.prevrandao, block.timestamp, seed, msg.sender)
        )
      ) % nodeCount;
  }
}
