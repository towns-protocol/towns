// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title SwapFacetStorage
/// @notice Storage layout for the SwapFacet contract
library SwapFacetStorage {
    struct Layout {
        /// @notice Poster fee in basis points (space-specific)
        uint16 posterFeeBps;
        /// @notice Whether to forward the poster fee to the poster (default: false, fees go to space)
        bool forwardPosterFee;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.swap.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xf363e6f383c163fac4382e7bd60c54a795a129059b7601463644e52990dfaf00;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
