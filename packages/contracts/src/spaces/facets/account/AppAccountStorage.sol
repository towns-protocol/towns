// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

library AppAccountStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.account.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x5203018779d8301358307033923a3bd0a3a759f1f58591c01f878744c0f8c200;

    struct Layout {
        EnumerableSetLib.AddressSet installedApps;
        mapping(address app => bytes32 appId) appIdByApp;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
