// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Node, NodeStatus} from "src/river/registry/libraries/RegistryStorage.sol";

// libraries

// contracts
interface INodeRegistryBase {
    // =============================================================
    //                           Events
    // =============================================================
    event NodeAdded(
        address indexed nodeAddress,
        address indexed operator,
        string url,
        NodeStatus status
    );
    event NodeStatusUpdated(address indexed nodeAddress, NodeStatus status);
    event NodeUrlUpdated(address indexed nodeAddress, string url);
    event NodeRemoved(address indexed nodeAddress);
    event NodeCometBftPubKeyUpdated(address indexed nodeAddress, bytes32 cometBftPubKey);
}

interface INodeRegistry is INodeRegistryBase {
    // =============================================================
    //                           Nodes
    // =============================================================

    function isNode(address nodeAddress) external view returns (bool);
    function registerNode(address nodeAddress, string memory url, NodeStatus status) external;

    function removeNode(address nodeAddress) external;

    function updateNodeStatus(address nodeAddress, NodeStatus status) external;

    function updateNodeUrl(address nodeAddress, string memory url) external;

    function getNode(address nodeAddress) external view returns (Node memory);

    function getNodeCount() external view returns (uint256);

    /**
     * @notice Return array containing all node addresses
     * @dev WARNING: This operation will copy the entire storage to memory, which can be quite
     * expensive. This is designed
     * to mostly be used by view accessors that are queried without any gas fees. Developers should
     * keep in mind that
     * this function has an unbounded cost, and using it as part of a state-changing function may
     * render the function
     * uncallable if the map grows to a point where copying to memory consumes too much gas to fit
     * in
     * a block.
     */
    function getAllNodeAddresses() external view returns (address[] memory);

    /**
     * @notice Return array containing all nodes
     * @dev WARNING: This operation will copy the entire storage to memory, which can be quite
     * expensive. This is designed
     * to mostly be used by view accessors that are queried without any gas fees. Developers should
     * keep in mind that
     * this function has an unbounded cost, and using it as part of a state-changing function may
     * render the function
     * uncallable if the map grows to a point where copying to memory consumes too much gas to fit
     * in
     * a block.
     */
    function getAllNodes() external view returns (Node[] memory);

    /**
     * @notice Backfill permanent indices for all existing nodes that don't have one assigned.
     * @dev This should be called once after the contract upgrade. It assigns sequential indices
     * starting from 1 to all nodes in their current array order. Subsequent registrations will
     * continue from the last assigned index.
     */
    function backfillPermanentIndices() external;

    /**
     * @notice Set or update the CometBFT public key for a node.
     * @dev Can only be called by the node itself.
     * @param nodeAddress The address of the node to update
     * @param cometBftPubKey The 32-byte CometBFT public key
     */
    function setNodeCometBftPubKey(address nodeAddress, bytes32 cometBftPubKey) external;

    /**
     * @notice Get the last assigned permanent node index.
     * @dev Returns 0 if backfill has not been called yet.
     * @return The last assigned permanent node index
     */
    function getLastNodeIndex() external view returns (uint32);
}
