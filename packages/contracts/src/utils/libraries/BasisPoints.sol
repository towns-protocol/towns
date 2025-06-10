// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {CustomRevert} from "./CustomRevert.sol";

/// @title Basis Points
/// @notice Library for calculating with basis points
library BasisPoints {
    using CustomRevert for bytes4;

    uint256 public constant MAX_BPS = 10_000;

    error InvalidBasisPoints(uint256 basisPoints);

    /// @notice Calculate the basis points of a given amount
    /// @param amount The amount to be multiplied by the basis points
    /// @param basisPoints The basis points
    /// @return The amount multiplied by the basis points
    function calculate(uint256 amount, uint256 basisPoints) internal pure returns (uint256) {
        if (basisPoints > MAX_BPS) InvalidBasisPoints.selector.revertWith(basisPoints);

        return (amount * basisPoints) / MAX_BPS;
    }
}
