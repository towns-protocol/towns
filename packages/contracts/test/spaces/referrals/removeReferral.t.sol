// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils

// interfaces

// libraries

// contracts
import {ReferralsFacetTest} from "test/spaces/referrals/Referrals.t.sol";

contract ReferralsFacet_removeReferral is ReferralsFacetTest {
    function test_removeReferral(
        Referral memory referral
    ) external givenReferralCodeIsRegistered(referral) {
        vm.prank(founder);
        vm.expectEmit(address(userSpace));
        emit ReferralRemoved(keccak256(bytes(referral.referralCode)));
        referralsFacet.removeReferral(referral.referralCode);
    }

    function test_revertWhen_removeReferral_withInvalidPermissions(
        Referral memory referral,
        address user
    ) external givenReferralCodeIsRegistered(referral) {
        vm.assume(user != founder);
        vm.prank(user);
        vm.expectRevert(Entitlement__NotAllowed.selector);
        referralsFacet.removeReferral(referral.referralCode);
    }
}
