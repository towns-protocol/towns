// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IMembershipReferralBase} from "./IMembershipReferral.sol";

// libraries
import {MembershipReferralStorage} from "./MembershipReferralStorage.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

// contracts

abstract contract MembershipReferralBase is IMembershipReferralBase {
  function __MembershipReferralBase_init() internal {
    _createReferralCode(1, 1000); // 10%
  }

  /**
   * @notice Create a referral code
   * @param code The referral code
   * @param bps The basis points to be paid to the referrer
   */
  function _createReferralCode(uint256 code, uint16 bps) internal {
    MembershipReferralStorage.Layout storage ds = MembershipReferralStorage
      .layout();
    uint16 referralCode = ds.referralCodes[code];

    if (referralCode != 0) revert Membership__InvalidReferralCode();
    if (bps > BasisPoints.MAX_BPS) revert Membership__InvalidReferralBps();

    ds.referralCodes[code] = bps;

    emit Membership__ReferralCreated(code, bps);
  }

  function _removeReferralCode(uint256 code) internal {
    MembershipReferralStorage.Layout storage ds = MembershipReferralStorage
      .layout();

    delete ds.referralCodes[code];

    emit Membership__ReferralRemoved(code);
  }

  function _referralCodeBps(uint256 code) internal view returns (uint16) {
    return MembershipReferralStorage.layout().referralCodes[code];
  }

  function _calculateReferralAmount(
    uint256 membershipPrice,
    uint256 referralCode
  ) internal view returns (uint256) {
    uint16 referralBps = _referralCodeBps(referralCode);
    if (referralBps == 0) return 0;
    return BasisPoints.calculate(membershipPrice, referralBps);
  }
}
