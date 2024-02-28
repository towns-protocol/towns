// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMembershipReferralBase} from "./IMembershipReferral.sol";

// libraries

// contracts

library MembershipReferralStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.facets.membership.MembershipReferralStorage");

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
