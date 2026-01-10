// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IIdentityRegistryBase} from "./IIdentityRegistry.sol";

// libraries
import {IdentityRegistryStorage} from "./IdentityRegistryStorage.sol";

// contracts

abstract contract IdentityRegistryBase is IIdentityRegistryBase {
    function _setAgentUri(uint256 agentId, string memory agentUri) internal {
        IdentityRegistryStorage.getLayout().agentUri[agentId] = agentUri;
    }

    function _setMetadata(uint256 agentId, string memory metadataKey, bytes memory value) internal {
        IdentityRegistryStorage.getLayout().metadata[agentId][metadataKey] = value;
        emit MetadataSet(agentId, metadataKey, metadataKey, value);
    }

    function _getAgentUri(uint256 agentId) internal view returns (string memory) {
        return IdentityRegistryStorage.getLayout().agentUri[agentId];
    }

    function _getMetadata(
        uint256 agentId,
        string memory metadataKey
    ) internal view returns (bytes memory) {
        return IdentityRegistryStorage.getLayout().metadata[agentId][metadataKey];
    }
}
