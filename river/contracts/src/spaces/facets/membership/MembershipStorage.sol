// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library MembershipStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 public constant STORAGE_SLOT =
    0xc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb600;

  struct Layout {
    mapping(uint256 => address) memberByTokenId;
    mapping(address => uint256) tokenIdByMember;
    uint256 membershipPrice;
    uint256 membershipMaxSupply;
    address membershipCurrency;
    address membershipFeeRecipient;
    address spaceFactory;
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
