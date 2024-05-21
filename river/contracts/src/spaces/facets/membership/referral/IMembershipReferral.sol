// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IMembershipReferralBase {
  // =============================================================
  //                           ERRORS
  // =============================================================
  error Membership__InvalidReferralCode();
  error Membership__InvalidReferralBps();
  error Membership__InvalidReferralTime();

  // =============================================================
  //                           EVENTS
  // =============================================================
  event Membership__ReferralTimeCreated(
    uint256 indexed code,
    uint16 bps,
    uint256 startTime,
    uint256 endTime
  );
  event Membership__ReferralCreated(uint256 indexed code, uint16 bps);
  event Membership__ReferralRemoved(uint256 indexed code);

  // =============================================================
  //                           STRUCTS
  // =============================================================
  struct TimeData {
    uint256 startTime;
    uint256 endTime;
  }
}

interface IMembershipReferral is IMembershipReferralBase {
  /**
   * @notice Create a referral code
   * @param code The referral code
   * @param bps The basis points to be paid to the referrer
   */
  function createReferralCode(uint256 code, uint16 bps) external;

  /**
   * @notice Create a referral code with a time limit
   * @param code The referral code
   * @param bps The basis points to be paid to the referrer
   * @param startTime The start time
   * @param endTime The end time
   */
  function createReferralCodeWithTime(
    uint256 code,
    uint16 bps,
    uint256 startTime,
    uint256 endTime
  ) external;

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

  /**
   * @notice Get the time data for a referral code
   * @param code The referral code
   * @return The time data
   */
  function referralCodeTime(
    uint256 code
  ) external view returns (TimeData memory);

  /**
   * @notice Calculate the referral amount
   * @param membershipPrice The price of the membership
   * @param referralCode The referral code
   * @return The referral amount
   */
  function calculateReferralAmount(
    uint256 membershipPrice,
    uint256 referralCode
  ) external view returns (uint256);
}
