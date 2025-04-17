// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library SwapFacetStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("towns.facets.swap");

    struct Layout {
        address swapRouter;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
