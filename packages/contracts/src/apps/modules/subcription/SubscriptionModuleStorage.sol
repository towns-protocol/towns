// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// structs
struct Subscription {
    address space; // slot 0: 20 bytes
    uint32 entityId; // slot 0: 4 bytes
    uint64 nextRenewalTime; // slot 0: 8 bytes (32 bytes total - packed!)
    uint256 renewalPrice; // slot 1: 16 bytes
    uint256 spent; // slot 1: 16 bytes (32 bytes total - packed!)
    uint256 tokenId; // slot 2: 32 bytes
    uint64 lastRenewalTime; // slot 3: 8 bytes
    bool active; // slot 3: 1 byte (9 bytes used, 23 bytes free)
}

library SubscriptionModuleStorage {
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;

    /// @custom:storage-location erc7201:towns.subscription.validation.module.storage
    struct Layout {
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
