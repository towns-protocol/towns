// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces
import {Vm} from "forge-std/Vm.sol";
import {IERC721A} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IEntitlementGated, IEntitlementGatedBase} from "src/spaces/facets/gated/IEntitlementGated.sol";
import {IReferrals, IReferralsBase} from "src/spaces/facets/referrals/IReferrals.sol";

// libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";

// contracts
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {EntitlementTestUtils} from "test/utils/EntitlementTestUtils.sol";

contract MembershipJoinSpaceUSDCTest is
    IEntitlementGatedBase,
    EntitlementTestUtils,
    MembershipBaseSetup
{
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       BASIC USDC TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_basicActionUSDC() external givenUSDCMembershipHasPrice {
        uint256 membershipFee = usdcMembership.getMembershipPrice();
        uint256 protocolFeeRecipientBalanceBefore = mockUSDC.balanceOf(deployer);

        // Mint and approve USDC
        mockUSDC.mint(alice, membershipFee);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), membershipFee);

        // Join space with USDC (no ETH)
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        usdcMembership.joinSpace(JoinType.Basic, data);

        assertEq(usdcMembershipToken.balanceOf(alice), 1);
        assertEq(mockUSDC.balanceOf(alice), 0);

        // Verify protocol fee was paid in USDC (min $1.50 for $10 base price)
        uint256 expectedProtocolFee = 1_500_000; // $1.50 minimum fee
        assertEq(
            mockUSDC.balanceOf(deployer) - protocolFeeRecipientBalanceBefore,
            expectedProtocolFee,
            "Protocol fee should be paid in USDC"
        );
    }

    function test_joinSpace_withReferralActionUSDC(
        uint16 basisPoints
    ) external givenUSDCMembershipHasPrice {
        uint256 membershipFee = usdcMembership.getMembershipPrice();

        // Bound basis points to valid range (1-1000, since 0 is not allowed by the referral system)
        basisPoints = uint16(bound(basisPoints, 1, 1000)); // 0.01% to 10%

        // Set up referral system with fuzzed basis points
        IReferrals usdcReferrals = IReferrals(usdcSpace);
        vm.prank(founder);
        usdcReferrals.setMaxBpsFee(1000); // 10% max

        IReferralsBase.Referral memory referralInfo = IReferralsBase.Referral({
            referralCode: "USDC_REFERRAL",
            basisPoints: basisPoints,
            recipient: charlie
        });

        vm.prank(founder);
        usdcReferrals.registerReferral(referralInfo);

        // Mint and approve USDC
        mockUSDC.mint(alice, membershipFee);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), membershipFee);

        // Join with referral
        vm.prank(alice);
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: address(0),
            referralCode: "USDC_REFERRAL"
        });
        bytes memory data = abi.encode(alice, referral);
        usdcMembership.joinSpace(JoinType.WithReferral, data);

        assertEq(usdcMembershipToken.balanceOf(alice), 1);

        // Check referral fee was paid in USDC
        uint256 basePrice = 10_000_000; // $10 USDC base price
        uint256 expectedReferralFee = BasisPoints.calculate(basePrice, basisPoints);
        assertEq(mockUSDC.balanceOf(charlie), expectedReferralFee);
    }

    function test_joinSpace_withUserReferralActionUSDC(
        uint16 defaultBpsFee
    ) external givenUSDCMembershipHasPrice {
        uint256 membershipFee = usdcMembership.getMembershipPrice();

        // Bound default fee to valid range (1-1000 = 0.01%-10%)
        defaultBpsFee = uint16(bound(defaultBpsFee, 1, 1000));

        // Use bob as user referral
        address userReferral = bob;

        // Set up default referral fee
        IReferrals usdcReferrals = IReferrals(usdcSpace);
        vm.prank(founder);
        usdcReferrals.setDefaultBpsFee(defaultBpsFee);

        // Mint and approve USDC
        mockUSDC.mint(alice, membershipFee);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), membershipFee);

        // Join with user referral
        vm.prank(alice);
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: userReferral,
            referralCode: ""
        });
        bytes memory data = abi.encode(alice, referral);
        usdcMembership.joinSpace(JoinType.WithReferral, data);

        assertEq(usdcMembershipToken.balanceOf(alice), 1);

        // Check user referral fee was paid in USDC
        uint256 basePrice = 10_000_000; // $10 USDC base price
        uint256 expectedReferralFee = BasisPoints.calculate(basePrice, defaultBpsFee);
        assertEq(mockUSDC.balanceOf(userReferral), expectedReferralFee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ERROR HANDLING                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_revertIf_ethSentWithUSDC() external givenUSDCMembershipHasPrice {
        uint256 membershipFee = usdcMembership.getMembershipPrice();

        // Mint and approve USDC
        mockUSDC.mint(alice, membershipFee);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), membershipFee);

        // Try to join with both ETH and USDC - should revert
        deal(alice, 1 ether);
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        vm.expectRevert(Membership__UnexpectedValue.selector);
        usdcMembership.joinSpace{value: 1 ether}(JoinType.Basic, data);
    }

    function test_joinSpace_USDC_insufficientApproval() external givenUSDCMembershipHasPrice {
        uint256 membershipFee = usdcMembership.getMembershipPrice();

        // Mint USDC but approve less than required
        mockUSDC.mint(alice, membershipFee);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), membershipFee - 1);

        // Should revert due to insufficient approval
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        vm.expectRevert(); // ERC20 transfer will fail
        usdcMembership.joinSpace(JoinType.Basic, data);
    }

    function test_joinSpace_USDC_freeMembership() external {
        // Set USDC space price to 0 (free)
        vm.prank(founder);
        usdcMembership.setMembershipPrice(0);

        // Join without any approval needed
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        usdcMembership.joinSpace(JoinType.Basic, data);

        assertEq(usdcMembershipToken.balanceOf(alice), 1);
        assertEq(mockUSDC.balanceOf(alice), 0); // No USDC spent
    }

    function test_joinSpace_USDC_freeMembership_revertWhenEthSent() external {
        // Set USDC space price to 0 (free)
        vm.prank(founder);
        usdcMembership.setMembershipPrice(0);

        // User accidentally sends ETH to free USDC membership - should revert
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        vm.expectRevert(Membership__UnexpectedValue.selector);
        usdcMembership.joinSpace{value: 1 ether}(JoinType.Basic, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    CROSSCHAIN TESTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_USDC_crosschainEntitlement_passes()
        external
        givenUSDCMembershipHasPrice
        givenUSDCSpaceHasCrosschainEntitlements
    {
        uint256 price = usdcMembership.getMembershipPrice();

        mockUSDC.mint(bob, price);
        vm.prank(bob);
        mockUSDC.approve(address(usdcMembership), price);

        vm.recordLogs();
        vm.prank(bob);
        usdcMembership.joinSpace(bob);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        (
            ,
            ,
            address resolver,
            bytes32 txId,
            uint256 roleId,
            address[] memory nodes
        ) = _getRequestV2EventData(logs);

        uint256 quorum = nodes.length / 2;
        for (uint256 i; i <= quorum; ++i) {
            vm.prank(nodes[i]);
            IEntitlementGated(resolver).postEntitlementCheckResult(
                txId,
                roleId,
                NodeVoteStatus.PASSED
            );
        }

        assertEq(usdcMembershipToken.balanceOf(bob), 1);
        assertEq(mockUSDC.balanceOf(bob), 0);
    }

    function test_joinSpace_USDC_crosschainEntitlement_fails()
        external
        givenUSDCMembershipHasPrice
        givenUSDCSpaceHasCrosschainEntitlements
    {
        uint256 price = usdcMembership.getMembershipPrice();

        mockUSDC.mint(bob, price);
        vm.prank(bob);
        mockUSDC.approve(address(usdcMembership), price);

        vm.recordLogs();
        vm.prank(bob);
        usdcMembership.joinSpace(bob);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        (
            ,
            ,
            address resolver,
            bytes32 txId,
            uint256 roleId,
            address[] memory nodes
        ) = _getRequestV2EventData(logs);

        uint256 quorum = nodes.length / 2;
        for (uint256 i; i <= quorum; ++i) {
            vm.prank(nodes[i]);
            IEntitlementGated(resolver).postEntitlementCheckResult(
                txId,
                roleId,
                NodeVoteStatus.FAILED
            );
        }

        assertEq(usdcMembershipToken.balanceOf(bob), 0);
        assertEq(mockUSDC.balanceOf(bob), price); // refunded
    }

    function test_joinSpace_USDC_multipleCrosschainEntitlements()
        external
        givenUSDCMembershipHasPrice
        givenUSDCSpaceHasCrosschainEntitlements
    {
        uint256 price = usdcMembership.getMembershipPrice();

        mockUSDC.mint(bob, price);
        vm.prank(bob);
        mockUSDC.approve(address(usdcMembership), price);

        vm.recordLogs();
        vm.prank(bob);
        usdcMembership.joinSpace(bob);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        uint256 numCheckRequests = _getRequestV2EventCount(logs);
        assertEq(numCheckRequests, 3);
        assertEq(usdcMembershipToken.balanceOf(bob), 0);
    }
}
