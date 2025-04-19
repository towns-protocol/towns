// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title SwapFacetStorage
/// @notice Storage layout for the SwapFacet contract
library SwapFacetStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.swap")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xad84b31e75fbcadf87a699496a2c74e01f727aee253da216fcb125910b108000;

    struct Layout {
        /// @notice Poster fee in basis points (space-specific)
        uint16 posterFeeBps;
        /// @notice Whether to collect the poster fee to the space instead of the poster
        bool collectPosterFeeToSpace;
    }

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
