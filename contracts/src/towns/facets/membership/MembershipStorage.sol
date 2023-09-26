// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

library MembershipStorage {
  bytes32 public constant STORAGE_SLOT =
    keccak256("towns.facets.membership.MembershipStorage");

  struct Layout {
    mapping(uint256 => address) memberByTokenId;
    mapping(address => uint256) tokenIdByMember;
    uint256 membershipPrice;
    uint256 membershipLimit;
    address membershipCurrency;
    address membershipFeeRecipient;
    address townFactory;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
