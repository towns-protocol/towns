// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils

// interfaces

// libraries

// contracts
import {ReferralsFacetTest} from "test/spaces/referrals/Referrals.t.sol";

contract ReferralsFacet_registerReferral is ReferralsFacetTest {
    function test_registerReferral(
        Referral memory referral
    ) external givenReferralCodeIsRegistered(referral) {
        // Assert
        Referral memory storedReferral = referralsFacet.referralInfo(referral.referralCode);
        assertEq(storedReferral.referralCode, referral.referralCode, "Referral code should match");
        assertEq(storedReferral.basisPoints, referral.basisPoints, "Basis points should match");
        assertEq(storedReferral.recipient, referral.recipient, "Recipient should match");

        // Attempt to register the same referral code again (should fail)
        vm.prank(founder);
        vm.expectRevert(Referrals__ReferralAlreadyExists.selector);
        referralsFacet.registerReferral(referral);
    }

    function test_revertWhen_registerReferral_invalidPermission(
        address user,
        Referral memory referral
    ) external {
        vm.assume(user != founder);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Entitlement__NotAllowed.selector));
        referralsFacet.registerReferral(referral);
    }

    function test_revertWhen_registerReferral_invalidRecipient(Referral memory referral) external {
        vm.assume(bytes(referral.referralCode).length > 0);
        referral.basisPoints = bound(referral.basisPoints, 1, REFERRAL_BPS);
        referral.recipient = address(0);

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidRecipient.selector);
        referralsFacet.registerReferral(referral);
    }

    function test_revertWhen_registerReferral_invalidBasisPoints(
        Referral memory referral
    ) external {
        vm.assume(referral.recipient != address(0));
        vm.assume(bytes(referral.referralCode).length > 0);
        referral.basisPoints = 0;

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidBasisPoints.selector);
        referralsFacet.registerReferral(referral);
    }

    function test_revertWhen_registerReferral_basisPointsExceedMaxBpsFee(
        Referral memory referral
    ) external {
        vm.assume(referral.recipient != address(0));
        vm.assume(bytes(referral.referralCode).length > 0);
        referral.basisPoints = REFERRAL_BPS + 1;

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidBpsFee.selector);
        referralsFacet.registerReferral(referral);
    }

    function test_revertWhen_registerReferral_emptyReferralCode(Referral memory referral) external {
        vm.assume(referral.recipient != address(0));
        referral.basisPoints = bound(referral.basisPoints, 1, REFERRAL_BPS);
        referral.referralCode = "";

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidReferralCode.selector);
        referralsFacet.registerReferral(referral);
    }
}
