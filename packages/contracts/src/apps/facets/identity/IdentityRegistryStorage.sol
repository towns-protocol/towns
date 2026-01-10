// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library IdentityRegistryStorage {
    struct Layout {
        // agentId => key => value
        mapping(uint256 => mapping(string => bytes)) metadata;
        // agent uri
        mapping(uint256 => string) agentUri;
    }

    // keccak256(abi.encode(uint256(keccak256("apps.facets.identity.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x66991193de0d3d5cfb03e1f2f26d7b691100aae98b32c0c50fcb3839feebe100;

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
