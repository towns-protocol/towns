// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "test/spaces/membership/MembershipBaseSetup.sol";

// interfaces
import {IReferralsBase} from "src/spaces/facets/referrals/IReferrals.sol";

// libraries

// contracts
import {ReferralsFacet} from "src/spaces/facets/referrals/ReferralsFacet.sol";

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
        vm.assume(bytes(referral.referralCode).length > 0);
        assumeNotPrecompile(referral.recipient);
        referral.basisPoints = bound(referral.basisPoints, 1, REFERRAL_BPS);

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
