// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipReferralBase} from "./IMembershipReferral.sol";

// libraries

// contracts

library MembershipReferralStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.referral.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x3c2290b88407133303e904ceb4ee7d0d14164eda8a629372d8406216ceb57e00;

  struct Layout {
    mapping(uint256 => uint16) referralCodes;
    mapping(uint256 => IMembershipReferralBase.TimeData) referralCodeTimes;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
