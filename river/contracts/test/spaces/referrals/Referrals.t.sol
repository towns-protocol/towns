// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "contracts/test/spaces/membership/MembershipBaseSetup.sol";

//interfaces
import {IReferralsBase} from "contracts/src/spaces/facets/referrals/IReferrals.sol";

//libraries

//contracts
import {ReferralsFacet} from "contracts/src/spaces/facets/referrals/ReferralsFacet.sol";

abstract contract ReferralsFacetTest is MembershipBaseSetup, IReferralsBase {
  ReferralsFacet referralsFacet;

  function setUp() public override {
    super.setUp();
    referralsFacet = ReferralsFacet(userSpace);

    // set max bps fee to 10%
    vm.prank(founder);
    referralsFacet.setMaxBpsFee(REFERRAL_BPS);
  }

  modifier givenReferralCodeIsRegistered(Referral memory referral) {
    vm.assume(referral.recipient != address(0));
    vm.assume(referral.basisPoints > 0 && referral.basisPoints <= REFERRAL_BPS);
    vm.assume(bytes(referral.referralCode).length > 0);
    assumeNotPrecompile(referral.recipient);

    vm.prank(founder);
    vm.expectEmit(address(userSpace));
    emit ReferralRegistered(
      keccak256(bytes(referral.referralCode)),
      referral.basisPoints,
      referral.recipient
    );
    referralsFacet.registerReferral(referral);
    _;
  }
}
