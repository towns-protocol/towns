// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IContentHashResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IContentHashResolver.sol";

// libraries
import {ContentHashResolverMod} from "./modules/ContentHashResolverMod.sol";
import {L2RegistryMod} from "./modules/L2RegistryMod.sol";
import {VersionRecordMod} from "./modules/VersionRecordMod.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title ContentHashResolverFacet
/// @notice ENS content hash resolver facet for storing IPFS/IPNS/Swarm hashes on L2
/// @dev Implements IContentHashResolver with versioned records
contract ContentHashResolverFacet is IContentHashResolver, Facet {
    using ContentHashResolverMod for ContentHashResolverMod.Layout;
    using VersionRecordMod for VersionRecordMod.Layout;

    /// @notice Initializes the facet by registering resolver interface
    function __ContentHashResolverFacet_init() external onlyInitializing {
        _addInterface(type(IContentHashResolver).interfaceId);
    }

    /// @notice Sets the content hash for a node
    /// @param node The ENS node to update
    /// @param hash The content hash bytes (IPFS, IPNS, Swarm, etc.)
    function setContenthash(bytes32 node, bytes calldata hash) external {
        L2RegistryMod.onlyAuthorized(node);
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        ContentHashResolverMod.getStorage().setContenthash(version, node, hash);
    }

    /// @inheritdoc IContentHashResolver
    function contenthash(bytes32 node) external view returns (bytes memory) {
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        return ContentHashResolverMod.getStorage().contenthash(version, node);
    }
}

