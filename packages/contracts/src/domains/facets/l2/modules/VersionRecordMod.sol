// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IVersionableResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IVersionableResolver.sol";

library VersionRecordMod {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("ens.domains.version.record.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0xf22205753714587a1da0c0ad29dc01aa3237bb3fbfb1b984b23c0773da3cb700;

    struct Layout {
        mapping(bytes32 => uint64) recordVersions;
    }

    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function clearRecords(bytes32 node) internal {
        Layout storage $ = getStorage();
        uint64 version = $.recordVersions[node]++;
        emit IVersionableResolver.VersionChanged(node, version);
    }
}
