// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IPrepayBase {
  // =============================================================
  //                           ERRORS
  // =============================================================
  error PrepayBase__InvalidAmount();
  error PrepayBase__InvalidAddress();
  error PrepayBase__InvalidMembership();

  // =============================================================
  //                           EVENTS
  // =============================================================

  event PrepayBase__Prepaid(address indexed membership, uint256 supply);
}

interface IPrepay is IPrepayBase {
  /**
   * @notice Prepay a membership
   * @param membership The membership contract address
   * @param supply The amount of memberships to prepay
   */
  function prepayMembership(
    address membership,
    uint256 supply
  ) external payable;

  /**
   * @notice Get the prepaid supply for an account
   * @param account The account to get the prepaid supply for
   * @return The prepaid supply
   */
  function prepaidMembershipSupply(
    address account
  ) external view returns (uint256);

  /**
   * @notice Calculate the prepay fee for a given supply
   * @param supply The supply to calculate the fee for
   * @return The fee
   */
  function calculateMembershipPrepayFee(
    uint256 supply
  ) external view returns (uint256);
}
