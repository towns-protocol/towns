// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IVersionableResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IVersionableResolver.sol";

/// @title VersionRecordMod
/// @notice Manages record versioning for ENS resolver records, enabling atomic invalidation of all records for a node
/// @dev Incrementing a node's version effectively clears all its records since resolvers key records by (version, node)
library VersionRecordMod {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Storage layout mapping each node to its current record version number
    struct Layout {
        mapping(bytes32 => uint64) recordVersions;
    }

    // keccak256(abi.encode(uint256(keccak256("ens.domains.version.record.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0xf22205753714587a1da0c0ad29dc01aa3237bb3fbfb1b984b23c0773da3cb700;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Clears all records for a node by incrementing its version number
    /// @dev Records are keyed by (version, node), so incrementing version makes old records inaccessible
    function clearRecords(bytes32 node) internal {
        Layout storage $ = getStorage();
        uint64 version = $.recordVersions[node]++;
        emit IVersionableResolver.VersionChanged(node, version);
    }

    /// @notice Returns the storage layout for this module
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
