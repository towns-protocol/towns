// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

library ReviewStorage {
    struct Content {
        string comment;
        uint8 rating;
        uint40 createdAt;
        uint40 updatedAt;
    }

    struct Layout {
        mapping(address user => Content) reviewByUser;
        EnumerableSetLib.AddressSet usersReviewed;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.review.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x575a00558d547e4e5b6480e3f9afffa169c969028d92350b23fc834c93401100;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
