// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library BasisPoints {
  uint256 public constant MAX_BPS = 10_000;

  /*
   * @notice Calculate the basis points of a given amount
   * @param amount The amount to calculate basis points from
   * @param basisPoints The basis points to calculate
   * @return The basis points of the given amount
   */
  function calculate(
    uint256 amount,
    uint256 basisPoints
  ) internal pure returns (uint256) {
    require(basisPoints <= MAX_BPS, "Basis points cannot exceed 10_000");
    return (amount * basisPoints) / MAX_BPS;
  }
}
