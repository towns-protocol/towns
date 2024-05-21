// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirementsBase} from "./IPlatformRequirements.sol";

// libraries
import {PlatformRequirementsStorage} from "./PlatformRequirementsStorage.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

// contracts

abstract contract PlatformRequirementsBase is IPlatformRequirementsBase {
  // Denominator

  function _getDenominator() internal pure virtual returns (uint256) {
    return 10_000;
  }

  // Fee Recipient
  function _setFeeRecipient(address recipient) internal {
    if (recipient == address(0)) revert Platform__InvalidFeeRecipient();

    PlatformRequirementsStorage.layout().feeRecipient = recipient;

    emit PlatformFeeRecipientSet(recipient);
  }

  function _getFeeRecipient() internal view returns (address) {
    return PlatformRequirementsStorage.layout().feeRecipient;
  }

  // Membership BPS
  function _setMembershipBps(uint16 bps) internal {
    if (bps > BasisPoints.MAX_BPS) revert Platform__InvalidMembershipBps();
    PlatformRequirementsStorage.layout().membershipBps = bps;
    emit PlatformMembershipBpsSet(bps);
  }

  function _getMembershipBps() internal view returns (uint16) {
    return PlatformRequirementsStorage.layout().membershipBps;
  }

  // Membership Fee
  function _setMembershipFee(uint256 fee) internal {
    PlatformRequirementsStorage.layout().membershipFee = fee;
    emit PlatformMembershipFeeSet(fee);
  }

  function _getMembershipFee() internal view returns (uint256) {
    return PlatformRequirementsStorage.layout().membershipFee;
  }

  // Membership Mint Limit
  function _setMembershipMintLimit(uint256 limit) internal {
    if (limit == 0) revert Platform__InvalidMembershipMintLimit();
    PlatformRequirementsStorage.layout().membershipMintLimit = limit;
    emit PlatformMembershipMintLimitSet(limit);
  }

  function _getMembershipMintLimit() internal view returns (uint256) {
    return PlatformRequirementsStorage.layout().membershipMintLimit;
  }

  // Membership Duration
  function _setMembershipDuration(uint64 duration) internal {
    if (duration == 0) revert Platform__InvalidMembershipDuration();
    PlatformRequirementsStorage.layout().membershipDuration = duration;
    emit PlatformMembershipDurationSet(duration);
  }

  function _getMembershipDuration() internal view returns (uint64) {
    return PlatformRequirementsStorage.layout().membershipDuration;
  }
}
