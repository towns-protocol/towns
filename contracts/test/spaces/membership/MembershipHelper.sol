// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";

contract MembershipHelper is FacetHelper {
  MembershipFacet internal membership;

  constructor() {
    membership = new MembershipFacet();

    uint256 index;
    bytes4[] memory selectors_ = new bytes4[](21);

    // Minting
    selectors_[index++] = IMembership.joinTown.selector;
    selectors_[index++] = IMembership.joinTownWithReferral.selector;
    selectors_[index++] = IMembership.renewMembership.selector;
    selectors_[index++] = IMembership.cancelMembership.selector;
    selectors_[index++] = IMembership.expiresAt.selector;

    // Duration
    selectors_[index++] = IMembership.setMembershipDuration.selector;
    selectors_[index++] = IMembership.getMembershipDuration.selector;

    // Pricing Module
    selectors_[index++] = IMembership.setMembershipPricingModule.selector;
    selectors_[index++] = IMembership.getMembershipPricingModule.selector;

    // Pricing
    selectors_[index++] = IMembership.setMembershipPrice.selector;
    selectors_[index++] = IMembership.getMembershipPrice.selector;
    selectors_[index++] = IMembership.getMembershipRenewalPrice.selector;

    // Allocation
    selectors_[index++] = IMembership.setMembershipFreeAllocation.selector;
    selectors_[index++] = IMembership.getMembershipFreeAllocation.selector;

    // Limits
    selectors_[index++] = IMembership.setMembershipLimit.selector;
    selectors_[index++] = IMembership.getMembershipLimit.selector;

    // Currency
    selectors_[index++] = IMembership.setMembershipCurrency.selector;
    selectors_[index++] = IMembership.getMembershipCurrency.selector;

    // Recipient
    selectors_[index++] = IMembership.setMembershipFeeRecipient.selector;
    selectors_[index++] = IMembership.getMembershipFeeRecipient.selector;

    // Factory
    selectors_[index++] = IMembership.getTownFactory.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(membership);
  }

  function initializer() public view override returns (bytes4) {
    return membership.__Membership_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }
}
