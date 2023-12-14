// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library MembershipReferralStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.facets.membership.MembershipReferralStorage");

  struct Layout {
    mapping(uint256 => uint16) referralCodes;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
