// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
// contracts
import {MembershipReferralFacet} from "contracts/src/spaces/facets/membership/referral/MembershipReferralFacet.sol";

contract MembershipReferralHelper is FacetHelper {
  constructor() {
    addSelector(MembershipReferralFacet.createReferralCode.selector);
    addSelector(MembershipReferralFacet.createReferralCodeWithTime.selector);
    addSelector(MembershipReferralFacet.removeReferralCode.selector);
    addSelector(MembershipReferralFacet.referralCodeBps.selector);
    addSelector(MembershipReferralFacet.referralCodeTime.selector);
    addSelector(MembershipReferralFacet.calculateReferralAmount.selector);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function initializer() public pure override returns (bytes4) {
    return MembershipReferralFacet.__MembershipReferralFacet_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }
}
