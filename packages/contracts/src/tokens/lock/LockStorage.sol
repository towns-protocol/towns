// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library LockStorage {
    struct Layout {
        uint256 defaultCooldown;
        mapping(address => bool) enabledByAddress;
        mapping(address => uint256) expirationByAddress;
    }

    // keccak256("river.tokens.lock.storage")
    bytes32 internal constant STORAGE_SLOT =
        0xfd180fd2eec04a0893e9c9ad4329d2f65f17d7fd0b4133b91663887d04d247c1;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
