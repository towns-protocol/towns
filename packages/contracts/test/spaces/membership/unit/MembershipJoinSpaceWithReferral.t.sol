// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPartnerRegistryBase} from "src/factory/facets/partner/IPartnerRegistry.sol";
import {IReferralsBase} from "src/spaces/facets/referrals/IReferrals.sol";

// libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";

// contracts
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

contract MembershipJoinSpaceWithReferralTest is
    MembershipBaseSetup,
    IPartnerRegistryBase,
    IReferralsBase
{
    modifier givenValidReferral(ReferralTypes memory referral) {
        vm.assume(referral.partner != address(0));
        vm.assume(referral.userReferral != address(0));
        vm.assume(referral.partner != referral.userReferral);
        vm.assume(bytes(referral.referralCode).length > 0);
        _;
    }

    modifier givenPartnerIsRegistered(Partner memory partner) {
        vm.assume(partner.account != address(0));
        vm.assume(partner.recipient != address(0));
        partner.active = true;
        partner.fee = bound(partner.fee, 0, partnerRegistry.maxPartnerFee());
        partnerRegistry.registerPartner(partner);
        _;
    }

    modifier givenMaxBpsFeeIsSet() {
        vm.prank(founder);
        referrals.setMaxBpsFee(REFERRAL_BPS);
        _;
    }

    function test_joinSpaceWithReferral(
        ReferralTypes memory referral
    ) external givenValidReferral(referral) {
        vm.assume(alice != referral.userReferral);

        vm.startPrank(alice);
        membership.joinSpaceWithReferral(alice, referral);
        vm.stopPrank();

        assertEq(membershipToken.balanceOf(alice), 1);
    }

    function test_joinSpaceWithReferral_isNotReferral() external givenMembershipHasPrice {
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: address(0),
            referralCode: ""
        });

        uint256 totalPrice = membership.getMembershipPrice();
        vm.deal(alice, totalPrice);
        vm.prank(alice);
        membership.joinSpaceWithReferral{value: totalPrice}(alice, referral);

        uint256 protocolFee = BasisPoints.calculate(
            MEMBERSHIP_PRICE,
            platformReqs.getMembershipBps()
        );
        uint256 minFee = platformReqs.getMembershipFee();
        protocolFee = protocolFee > minFee ? protocolFee : minFee;

        address protocol = platformReqs.getFeeRecipient();

        assertEq(protocol.balance, protocolFee);
        assertEq(address(membership).balance, MEMBERSHIP_PRICE); // Space gets base price
    }

    function test_revertWhen_joinSpaceWithReferral_partnerReferral(
        Partner memory partner
    )
        external
        givenMembershipHasPrice
        givenPartnerIsRegistered(partner)
        assumeEOA(partner.account)
    {
        vm.assume(partner.account != platformReqs.getFeeRecipient());
        vm.assume(partner.account.balance == 0);

        ReferralTypes memory referral = ReferralTypes({
            partner: partner.account,
            userReferral: address(0),
            referralCode: ""
        });

        uint256 totalPrice = membership.getMembershipPrice();
        vm.deal(alice, totalPrice);
        vm.prank(alice);
        membership.joinSpaceWithReferral{value: totalPrice}(alice, referral);

        uint256 protocolFee = BasisPoints.calculate(
            MEMBERSHIP_PRICE,
            platformReqs.getMembershipBps()
        );

        uint256 partnerFee = BasisPoints.calculate(MEMBERSHIP_PRICE, partner.fee);

        uint256 minFee = platformReqs.getMembershipFee();
        protocolFee = protocolFee > minFee ? protocolFee : minFee;
        
        assertEq(partner.account.balance, partnerFee, "partner fee");
        assertEq(platformReqs.getFeeRecipient().balance, protocolFee);
        // With fee-added model, space gets base price minus partner fee only
        assertEq(address(membership).balance, MEMBERSHIP_PRICE - partnerFee);
    }

    function test_revertWhen_joinSpaceWithReferral_referralCodeRegistered()
        external
        givenMembershipHasPrice
        givenMaxBpsFeeIsSet
    {
        address referralRecipient = _randomAddress();

        Referral memory referral = Referral({
            referralCode: "REFERRAL_CODE",
            basisPoints: referrals.maxBpsFee(),
            recipient: referralRecipient
        });

        vm.prank(founder);
        referrals.registerReferral(referral);

        ReferralTypes memory membershipReferral = ReferralTypes({
            partner: address(0),
            userReferral: address(0),
            referralCode: referral.referralCode
        });

        uint256 totalPrice = membership.getMembershipPrice();
        vm.deal(alice, totalPrice);
        vm.prank(alice);
        membership.joinSpaceWithReferral{value: totalPrice}(alice, membershipReferral);

        uint256 protocolFee = BasisPoints.calculate(
            MEMBERSHIP_PRICE,
            platformReqs.getMembershipBps()
        );
        uint256 minFee = platformReqs.getMembershipFee();
        protocolFee = protocolFee > minFee ? protocolFee : minFee;

        uint256 referralFee = BasisPoints.calculate(
            MEMBERSHIP_PRICE,
            referrals.referralInfo(referral.referralCode).basisPoints
        );

        assertEq(platformReqs.getFeeRecipient().balance, protocolFee);
        assertEq(referralRecipient.balance, referralFee);
        // With fee-added model, space gets base price minus referral fee only
        assertEq(address(membership).balance, MEMBERSHIP_PRICE - referralFee);
        assertEq(alice.balance, 0);
        assertEq(membershipToken.balanceOf(alice), 1);
    }

    function test_joinSpaceWithReferral_userReferral() external givenMembershipHasPrice {
        vm.prank(founder);
        referrals.setDefaultBpsFee(REFERRAL_BPS);

        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: bob,
            referralCode: ""
        });

        uint256 totalPrice = membership.getMembershipPrice();
        vm.deal(alice, totalPrice);
        vm.prank(alice);
        membership.joinSpaceWithReferral{value: totalPrice}(alice, referral);

        uint256 protocolFee = BasisPoints.calculate(
            MEMBERSHIP_PRICE,
            platformReqs.getMembershipBps()
        );
        uint256 minFee = platformReqs.getMembershipFee();
        protocolFee = protocolFee > minFee ? protocolFee : minFee;

        uint256 referralFee = BasisPoints.calculate(MEMBERSHIP_PRICE, referrals.defaultBpsFee());

        assertEq(bob.balance, referralFee);
        // With fee-added model, space gets base price minus referral fee only
        assertEq(address(membership).balance, MEMBERSHIP_PRICE - referralFee);
        assertEq(membershipToken.balanceOf(alice), 1);
    }

    // reverts

    function test_revertWhen_joinSpaceWithReferral_invalidReceiverAddress(
        ReferralTypes memory referral
    ) external givenValidReferral(referral) {
        vm.expectRevert(Membership__InvalidAddress.selector);
        membership.joinSpaceWithReferral(address(0), referral);
    }

    function test_revertWhen_joinSpaceWithReferral_maxSupplyReached(
        ReferralTypes memory referral
    ) external givenValidReferral(referral) {
        vm.prank(founder);
        membership.setMembershipLimit(1);

        vm.expectRevert(Membership__MaxSupplyReached.selector);
        membership.joinSpaceWithReferral(alice, referral);
    }

    function test_revertWhen_joinSpaceWithReferral_insufficientPayment(
        ReferralTypes memory referral
    ) external givenValidReferral(referral) givenMembershipHasPrice {
        vm.deal(alice, MEMBERSHIP_PRICE - 1);
        vm.prank(alice);
        vm.expectRevert(Membership__InsufficientPayment.selector);
        membership.joinSpaceWithReferral{value: MEMBERSHIP_PRICE - 1}(alice, referral);
    }
}
