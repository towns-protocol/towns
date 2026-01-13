// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {ReferralsFacetTest} from "test/spaces/referrals/Referrals.t.sol";

// interfaces

// libraries
import {LibString} from "solady/utils/LibString.sol";

// contracts

contract ReferralsFacet_updateReferral is ReferralsFacetTest {
    using LibString for string;

    function test_updateReferral(
        Referral memory referral
    ) external givenReferralCodeIsRegistered(referral) {
        referral.basisPoints = REFERRAL_BPS;
        referral.recipient = _randomAddress();

        // Act
        vm.prank(founder);
        vm.expectEmit(address(userSpace));
        emit ReferralUpdated(
            keccak256(bytes(referral.referralCode)),
            referral.basisPoints,
            referral.recipient
        );
        referralsFacet.updateReferral(referral);

        // Assert
        Referral memory storedReferral = referralsFacet.referralInfo(referral.referralCode);

        assertEq(storedReferral.basisPoints, referral.basisPoints, "Basis points should match");

        assertEq(storedReferral.recipient, referral.recipient, "Recipient should match");
    }

    function test_revertWhen_updateReferralWithInvalidRecipient(
        Referral memory referral
    ) external givenReferralCodeIsRegistered(referral) {
        referral.recipient = address(0);

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidRecipient.selector);
        referralsFacet.updateReferral(referral);
    }

    function test_revertWhen_updateReferralWithInvalidBasisPoints(
        Referral memory referral
    ) external givenReferralCodeIsRegistered(referral) {
        referral.basisPoints = 0;

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidBasisPoints.selector);
        referralsFacet.updateReferral(referral);
    }

    function test_revertWhen_updateReferralWithInvalidReferralCode(
        Referral memory referral
    ) external givenReferralCodeIsRegistered(referral) {
        referral.referralCode = "";

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidReferralCode.selector);
        referralsFacet.updateReferral(referral);
    }

    function test_revertWhen_updateReferralWithInvalidBpsFee(
        Referral memory referral
    ) external givenReferralCodeIsRegistered(referral) {
        referral.basisPoints = REFERRAL_BPS + 1;

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidBpsFee.selector);
        referralsFacet.updateReferral(referral);
    }

    function test_revertWhen_updateReferralWithNonExistentReferralCode(
        Referral memory referral,
        string memory invalidCode
    ) external givenReferralCodeIsRegistered(referral) {
        vm.assume(!invalidCode.eq(referral.referralCode));
        referral.referralCode = invalidCode;

        vm.prank(founder);
        vm.expectRevert(Referrals__InvalidReferralCode.selector);
        referralsFacet.updateReferral(referral);
    }
}
