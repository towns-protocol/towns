// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITextResolver} from "@ensdomains/ens-contracts/resolvers/profiles/ITextResolver.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

// libraries
import {TextResolverMod} from "./modules/TextResolverMod.sol";
import {L2RegistryMod} from "./modules/L2RegistryMod.sol";
import {VersionRecordMod} from "./modules/VersionRecordMod.sol";

// contracts

/// @title TextResolverFacet
/// @notice ENS text record resolver facet for storing and retrieving key-value text records on L2
/// @dev Implements ITextResolver with versioned records; only node owners/approved operators can set records
contract TextResolverFacet is ITextResolver, Facet {
    using TextResolverMod for TextResolverMod.Layout;

    /// @notice Initializes the facet by registering the ITextResolver interface
    function __TextResolverFacet_init() external onlyInitializing {
        _addInterface(type(ITextResolver).interfaceId);
    }

    /// @notice Sets a text record for an ENS node
    /// @param node The ENS node to update
    /// @param key The key to set (e.g., "url", "email", "avatar")
    /// @param value The text value to store
    function setText(bytes32 node, string calldata key, string calldata value) external {
        L2RegistryMod.onlyAuthorized(node);
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        TextResolverMod.getStorage().setText(version, node, key, value);
    }

    /// @inheritdoc ITextResolver
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        return TextResolverMod.getStorage().text(version, node, key);
    }
}
