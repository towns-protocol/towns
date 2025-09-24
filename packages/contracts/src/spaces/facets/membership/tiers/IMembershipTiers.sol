// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries
import {MembershipTier} from "./MembershipTiersStorage.sol";

// contracts

interface IMembershipTiersBase {
    error MembershipTier__AlreadyExists();
    error MembershipTier__InvalidTierId();
    error MembershipTier__DoesNotExist();
    error MembershipTier__TierNotActive();
    error MembershipTier__MaxSupplyReached();
    error MembershipTier__InvalidPricingModule();
    error MembershipTier__InvalidLimit();
    error MembershipTier__InvalidMaxSupply();
    event MembershipTierCreated(uint256 indexed tierId);
    event MembershipTierUpdated(uint256 indexed tierId);
    event MembershipTierMinted(uint256 indexed tierId, address indexed to, uint256 quantity);
}

interface IMembershipTiers is IMembershipTiersBase {}
