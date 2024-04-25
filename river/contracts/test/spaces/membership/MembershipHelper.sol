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
  constructor() {
    // Funds
    addSelector(IMembership.withdraw.selector);

    // Minting
    addSelector(IMembership.joinSpace.selector);
    addSelector(IMembership.joinSpaceWithReferral.selector);
    addSelector(IMembership.renewMembership.selector);
    addSelector(IMembership.cancelMembership.selector);
    addSelector(IMembership.expiresAt.selector);
    addSelector(IMembership.getTokenIdByMembership.selector);

    // Duration
    addSelector(IMembership.setMembershipDuration.selector);
    addSelector(IMembership.getMembershipDuration.selector);

    // Pricing Module
    addSelector(IMembership.setMembershipPricingModule.selector);
    addSelector(IMembership.getMembershipPricingModule.selector);

    // Pricing
    addSelector(IMembership.setMembershipPrice.selector);
    addSelector(IMembership.getMembershipPrice.selector);
    addSelector(IMembership.getMembershipRenewalPrice.selector);

    // Allocation
    addSelector(IMembership.setMembershipFreeAllocation.selector);
    addSelector(IMembership.getMembershipFreeAllocation.selector);

    // Limits
    addSelector(IMembership.setMembershipLimit.selector);
    addSelector(IMembership.getMembershipLimit.selector);

    // Currency

    addSelector(IMembership.getMembershipCurrency.selector);

    // Factory
    addSelector(IMembership.getSpaceFactory.selector);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function initializer() public pure override returns (bytes4) {
    return MembershipFacet.__Membership_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }
}
