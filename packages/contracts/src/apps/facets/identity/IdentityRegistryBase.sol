// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

// interfaces
import {IIdentityRegistryBase} from "./IIdentityRegistry.sol";

// libraries
import {IdentityRegistryStorage} from "./IdentityRegistryStorage.sol";

// contracts

abstract contract IdentityRegistryBase is IIdentityRegistryBase {
    /// @notice Sets the URI for an agent's registration file
    /// @dev Internal helper function that updates the agent URI in storage
    /// @param agentId The unique identifier of the agent
    /// @param agentUri The URI pointing to the agent's registration file
    function _setAgentUri(uint256 agentId, string memory agentUri) internal {
        IdentityRegistryStorage.getLayout().agentUri[agentId] = agentUri;
    }

    /// @notice Sets or updates metadata for an agent
    /// @dev Internal helper function that stores metadata and emits MetadataSet event
    /// @param agentId The unique identifier of the agent
    /// @param metadataKey The metadata key identifier
    /// @param value The metadata value stored as bytes
    function _setMetadata(uint256 agentId, string memory metadataKey, bytes memory value) internal {
        IdentityRegistryStorage.getLayout().metadata[agentId][metadataKey] = value;
        emit MetadataSet(agentId, metadataKey, metadataKey, value);
    }

    /// @notice Retrieves the URI for an agent's registration file
    /// @dev Internal helper function that reads the agent URI from storage
    /// @param agentId The unique identifier of the agent
    /// @return The URI pointing to the agent's registration file
    function _getAgentUri(uint256 agentId) internal view returns (string memory) {
        return IdentityRegistryStorage.getLayout().agentUri[agentId];
    }

    /// @notice Retrieves metadata value for a specific agent and metadata key
    /// @dev Internal helper function that reads metadata from storage
    ///      Returns empty bytes if the metadata key does not exist
    /// @param agentId The unique identifier of the agent
    /// @param metadataKey The metadata key to retrieve
    /// @return The metadata value stored as bytes
    function _getMetadata(
        uint256 agentId,
        string memory metadataKey
    ) internal view returns (bytes memory) {
        return IdentityRegistryStorage.getLayout().metadata[agentId][metadataKey];
    }
}
