// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library MembershipStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 public constant STORAGE_SLOT =
    0xc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb600;

  struct Layout {
    mapping(uint256 => address) deprecatedMemberByTokenId;
    mapping(address => uint256) deprecatedTokenIdByMember;
    uint256 membershipPrice;
    uint256 membershipMaxSupply;
    address membershipCurrency;
    address membershipFeeRecipient;
    address spaceFactory;
    uint64 membershipDuration;
    uint256 freeAllocation;
    address pricingModule;
    mapping(uint256 => uint256) renewalPriceByTokenId;
    uint256 tokenBalance;
    mapping(bytes32 => address) pendingJoinRequests;
    string membershipImage;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
