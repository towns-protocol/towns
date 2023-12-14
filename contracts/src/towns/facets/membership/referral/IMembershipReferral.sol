// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IMembershipReferralBase {
  // =============================================================
  //                           ERRORS
  // =============================================================
  error Membership__InvalidReferralCode();
  error Membership__InvalidReferralBps();

  // =============================================================
  //                           EVENTS
  // =============================================================
  event Membership__ReferralCreated(uint256 indexed code, uint16 bps);
  event Membership__ReferralRemoved(uint256 indexed code);
}

interface IMembershipReferral is IMembershipReferralBase {
  /**
   * @notice Create a referral code
   * @param code The referral code
   * @param bps The basis points to be paid to the referrer
   */
  function createReferralCode(uint256 code, uint16 bps) external;

  /**
   * @notice Remove a referral code
   * @param code The referral code
   */
  function removeReferralCode(uint256 code) external;

  /**
   * @notice Get the basis points for a referral code
   * @param code The referral code
   * @return The basis points
   */
  function referralCodeBps(uint256 code) external view returns (uint16);
}
