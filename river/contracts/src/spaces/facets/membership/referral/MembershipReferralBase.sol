// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipReferralBase} from "./IMembershipReferral.sol";

// libraries
import {MembershipReferralStorage} from "./MembershipReferralStorage.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

// contracts

abstract contract MembershipReferralBase is IMembershipReferralBase {
  function __MembershipReferralBase_init() internal {
    // create default referral code for client side developers
    _createReferralCode(123, 1000); // 10%
  }

  /**
   * @notice Create a referral code
   * @param code The referral code
   * @param bps The basis points to be paid to the referrer
   */
  function _createReferralCode(uint256 code, uint16 bps) internal {
    if (code == 0) revert Membership__InvalidReferralCode();
    if (bps > BasisPoints.MAX_BPS) revert Membership__InvalidReferralBps();

    MembershipReferralStorage.Layout storage ds = MembershipReferralStorage
      .layout();
    uint16 referralCode = ds.referralCodes[code];

    if (referralCode != 0) revert Membership__InvalidReferralCode();

    ds.referralCodes[code] = bps;

    emit Membership__ReferralCreated(code, bps);
  }

  function _createReferralCodeWithTime(
    uint256 code,
    uint16 bps,
    uint256 startTime,
    uint256 endTime
  ) internal {
    if (code == 0) revert Membership__InvalidReferralCode();
    if (startTime < block.timestamp) revert Membership__InvalidReferralTime();
    if (endTime <= startTime) revert Membership__InvalidReferralTime();
    if (bps > BasisPoints.MAX_BPS) revert Membership__InvalidReferralBps();

    MembershipReferralStorage.Layout storage ds = MembershipReferralStorage
      .layout();
    uint16 referralCode = ds.referralCodes[code];

    if (referralCode != 0) revert Membership__InvalidReferralCode();

    ds.referralCodes[code] = bps;
    ds.referralCodeTimes[code] = TimeData({
      startTime: startTime,
      endTime: endTime
    });

    emit Membership__ReferralTimeCreated(code, bps, startTime, endTime);
  }

  function _removeReferralCode(uint256 code) internal {
    MembershipReferralStorage.Layout storage ds = MembershipReferralStorage
      .layout();

    uint16 referralCode = ds.referralCodes[code];

    if (referralCode == 0) revert Membership__InvalidReferralCode();

    delete ds.referralCodes[code];
    delete ds.referralCodeTimes[code];

    emit Membership__ReferralRemoved(code);
  }

  function _referralCodeBps(uint256 code) internal view returns (uint16) {
    return MembershipReferralStorage.layout().referralCodes[code];
  }

  function _referralCodeTime(
    uint256 code
  ) internal view returns (TimeData memory) {
    return MembershipReferralStorage.layout().referralCodeTimes[code];
  }

  function _calculateReferralAmount(
    uint256 membershipPrice,
    uint256 referralCode
  ) internal view returns (uint256) {
    MembershipReferralStorage.Layout storage ds = MembershipReferralStorage
      .layout();

    uint16 referralBps = ds.referralCodes[referralCode];

    if (referralBps == 0) return 0;

    TimeData memory timeData = ds.referralCodeTimes[referralCode];

    if (
      timeData.startTime != 0 &&
      (block.timestamp < timeData.startTime ||
        block.timestamp > timeData.endTime)
    ) return 0;

    return BasisPoints.calculate(membershipPrice, referralBps);
  }
}
