// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

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
    uint256 membershipMaxSupply;
    address membershipCurrency;
    address membershipFeeRecipient;
    address townFactory;
    uint64 membershipDuration;
    uint256 freeAllocation;
    address pricingModule;
    mapping(uint256 => uint256) renewalPriceByTokenId;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
