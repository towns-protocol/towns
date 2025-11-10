// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IIdentityRegistryBase} from "./IIdentityRegistry.sol";

// libraries
import {IdentityRegistryStorage} from "./IdentityRegistryStorage.sol";

// contracts

abstract contract IdentityRegistryBase is IIdentityRegistryBase {
    function _setTokenUri(uint256 agentId, string memory tokenUri) internal {
        IdentityRegistryStorage.getLayout().tokenUri[agentId] = tokenUri;
    }

    function _getTokenUri(uint256 agentId) internal view returns (string memory) {
        return IdentityRegistryStorage.getLayout().tokenUri[agentId];
    }

    function _setMetadata(uint256 agentId, string memory key, bytes memory value) internal {
        IdentityRegistryStorage.getLayout().metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }

    function _getMetadata(uint256 agentId, string memory key) internal view returns (bytes memory) {
        return IdentityRegistryStorage.getLayout().metadata[agentId][key];
    }
}
