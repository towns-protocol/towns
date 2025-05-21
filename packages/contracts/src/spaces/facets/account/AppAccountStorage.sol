// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// types

// libraries

// types

// contracts

library AppAccountStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.account.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x5203018779d8301358307033923a3bd0a3a759f1f58591c01f878744c0f8c200;

    struct TokenAllowance {
        uint256 allowance;
        uint256 lastUpdated;
    }

    struct Layout {
        mapping(bytes32 groupId => mapping(address token => TokenAllowance allowance)) allowances;
    }

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
