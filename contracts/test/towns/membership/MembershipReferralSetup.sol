// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {MembershipReferralFacet} from "contracts/src/towns/facets/membership/referral/MembershipReferralFacet.sol";

abstract contract MembershipReferralSetup is FacetTest {}

contract MembershipReferralHelper is FacetHelper {
  MembershipReferralFacet internal membershipReferral;

  constructor() {
    membershipReferral = new MembershipReferralFacet();

    uint256 index;
    bytes4[] memory selectors_ = new bytes4[](3);

    selectors_[index++] = membershipReferral.createReferralCode.selector;
    selectors_[index++] = membershipReferral.removeReferralCode.selector;
    selectors_[index++] = membershipReferral.referralCodeBps.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(membershipReferral);
  }

  function initializer() public view override returns (bytes4) {
    return membershipReferral.__MembershipReferralFacet_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }
}
