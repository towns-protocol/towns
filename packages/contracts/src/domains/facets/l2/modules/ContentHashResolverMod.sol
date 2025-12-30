// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IContentHashResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IContentHashResolver.sol";

/// @title ContentHashResolverMod
/// @notice Stores and retrieves IPFS/IPNS/Swarm content hashes for ENS nodes
/// @dev Implements ENS IContentHashResolver storage; hashes keyed by (version, node)
library ContentHashResolverMod {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// keccak256(abi.encode(uint256(keccak256("ens.domains.content.hash.resolver.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x792df8302c84f9da0a791677027c0f820525b2020abeead574958d9624420c00;

    /// @notice Storage layout with versioned content hashes: version => node => hash bytes
    struct Layout {
        mapping(uint64 => mapping(bytes32 => bytes)) versionable_hashes;
    }

    /// @notice Returns the storage layout for this module
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets the content hash for an ENS node
    /// @param version The record version
    /// @param node The ENS node to update
    /// @param hash The content hash bytes (IPFS, IPNS, Swarm, etc.)
    function setContenthash(
        Layout storage $,
        uint64 version,
        bytes32 node,
        bytes calldata hash
    ) internal {
        $.versionable_hashes[version][node] = hash;
        emit IContentHashResolver.ContenthashChanged(node, hash);
    }

    /// @notice Returns the content hash for an ENS node
    /// @param version The record version
    /// @param node The ENS node to query
    /// @return The content hash bytes, or empty if not set
    function contenthash(
        Layout storage $,
        uint64 version,
        bytes32 node
    ) internal view returns (bytes memory) {
        return $.versionable_hashes[version][node];
    }
}
