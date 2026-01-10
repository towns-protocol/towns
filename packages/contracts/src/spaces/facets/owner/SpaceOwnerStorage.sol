// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library SpaceOwnerStorage {
    struct Space {
        string name;
        string uri;
        uint256 tokenId;
        uint256 createdAt;
    }

    struct SpaceMetadata {
        string shortDescription;
        string longDescription;
    }

    struct Layout {
        address factory;
        mapping(uint256 => address) spaceByTokenId;
        mapping(address => Space) spaceByAddress;
        mapping(address => SpaceMetadata) spaceMetadata;
        string defaultUri;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.owner.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x7fc24c9500f4388b797f8975c0991ad4ffd0338c2cbf5335b2bf5b7fe5747700;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
