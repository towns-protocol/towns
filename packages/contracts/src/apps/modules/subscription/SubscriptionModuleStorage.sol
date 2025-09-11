// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

struct Subscription {
    uint256 tokenId; // 32 bytes
    uint256 spent; // 32 bytes
    address space; // 20 bytes
    uint40 lastRenewalTime; // 5 bytes
    uint40 nextRenewalTime; // 5 bytes
    bool active; // 1 byte
}

library SubscriptionModuleStorage {
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    /// @custom:storage-location erc7201:towns.subscription.validation.module.storage
    struct Layout {
        EnumerableSetLib.AddressSet operators;
        mapping(address account => mapping(uint32 entityId => Subscription)) subscriptions;
        mapping(address account => EnumerableSetLib.Uint256Set entityIds) entityIds;
    }

    // keccak256(abi.encode(uint256(keccak256("towns.subscription.validation.module.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0xd241b3ceee256b40f80fe7a66fe789234ac389ed1408c472c4ee1cbb1deb8600;

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
