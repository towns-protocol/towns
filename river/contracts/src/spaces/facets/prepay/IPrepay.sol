// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IPrepayBase {
  // =============================================================
  //                           ERRORS
  // =============================================================
  error Prepay__InvalidSupplyAmount();
  error Prepay__InvalidAmount();
  error Prepay__InvalidAddress();
  error Prepay__InvalidMembership();

  // =============================================================
  //                           EVENTS
  // =============================================================
  event Prepay__Prepaid(uint256 supply);
}

interface IPrepay is IPrepayBase {
  /**
   * @notice Prepay a membership
   * @param supply The amount of memberships to prepay
   */
  function prepayMembership(uint256 supply) external payable;

  /**
   * @notice Get the prepaid supply
   * @return The remaining prepaid supply
   */
  function prepaidMembershipSupply() external view returns (uint256);

  /**
   * @notice Calculate the prepay fee for a given supply
   * @param supply The supply to calculate the fee for
   * @return The fee
   */
  function calculateMembershipPrepayFee(
    uint256 supply
  ) external view returns (uint256);
}
