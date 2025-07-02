// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library SimpleAppStorage {
    // keccak256(abi.encode(uint256(keccak256("simple.app.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x83d7ef17df984d8e84ee79017942cb0329f48e2d537ef8c418bc299c6878be00;

    struct Layout {
        string name;
        bytes32[] permissions;
        uint256 installPrice;
        uint48 accessDuration;
    }

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
