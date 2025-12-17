// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces
import {Vm} from "forge-std/Vm.sol";
import {IERC721A} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {IReferrals, IReferralsBase} from "src/spaces/facets/referrals/IReferrals.sol";

// libraries
import {console} from "forge-std/console.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";

// contracts
import {Test} from "forge-std/Test.sol";
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

contract MembershipUnifiedJoinSpaceTest is MembershipBaseSetup {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    UNIFIED ACTION TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_basicAction(uint256 paymentAmount) external givenMembershipHasPrice {
        uint256 membershipFee = membership.getMembershipPrice();

        // Bound payment amount to reasonable range (0 to 10x membership fee)
        paymentAmount = bound(paymentAmount, 0, membershipFee * 10);

        deal(alice, paymentAmount);
        vm.prank(alice);

        // Use alice as receiver to avoid entitlement issues
        bytes memory data = abi.encode(alice);

        if (paymentAmount >= membershipFee) {
            // Should succeed with sufficient payment
            membership.joinSpace{value: paymentAmount}(JoinType.Basic, data);

            assertEq(membershipToken.balanceOf(alice), 1);
            assertEq(alice.balance, paymentAmount - membershipFee); // Refund excess
        } else {
            // Should revert with insufficient payment
            vm.expectRevert(Membership__InsufficientPayment.selector);
            membership.joinSpace{value: paymentAmount}(JoinType.Basic, data);
        }
    }

    function test_joinSpace_basicActionFree() external {
        // Test with actual free space (price = 0, freeAllocation = 100)
        IMembership freeMembership = IMembership(freeSpace);
        IERC721A freeMembershipToken = IERC721A(freeSpace);

        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        freeMembership.joinSpace(JoinType.Basic, data);

        assertEq(freeMembershipToken.balanceOf(alice), 1);
    }

    function test_joinSpace_withReferralAction(
        uint16 basisPoints,
        string memory referralCode
    ) external givenMembershipHasPrice {
        // Filter out problematic referral codes early
        vm.assume(bytes(referralCode).length > 0);
        vm.assume(bytes(referralCode).length <= 50); // Reasonable length limit

        uint256 membershipFee = membership.getMembershipPrice();

        // Bound basis points to valid range (1-1000, since 0 is not allowed by the referral system)
        basisPoints = uint16(bound(basisPoints, 1, 1000)); // 0.01% to 10%

        // Set up referral system with fuzzed basis points
        vm.prank(founder);
        referrals.setMaxBpsFee(1000); // 10% max

        IReferralsBase.Referral memory referralInfo = IReferralsBase.Referral({
            referralCode: referralCode,
            basisPoints: basisPoints,
            recipient: charlie
        });

        vm.prank(founder);
        referrals.registerReferral(referralInfo);

        deal(alice, membershipFee);
        vm.prank(alice);

        // Test the unified joinSpace method with fuzzed referral
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: address(0),
            referralCode: referralCode
        });
        bytes memory data = abi.encode(alice, referral);
        membership.joinSpace{value: membershipFee}(JoinType.WithReferral, data);

        assertEq(membershipToken.balanceOf(alice), 1);

        // Check referral fee calculation with fuzzed basis points
        uint256 expectedReferralFee = BasisPoints.calculate(MEMBERSHIP_PRICE, basisPoints);
        assertEq(charlie.balance, expectedReferralFee);
    }

    function test_joinSpace_withUserReferralAction(
        uint16 defaultBpsFee
    ) external givenMembershipHasPrice {
        uint256 membershipFee = membership.getMembershipPrice();

        // Bound default fee to valid range (1-1000 = 0.01%-10%)
        defaultBpsFee = uint16(bound(defaultBpsFee, 1, 1000));

        // Use bob as a clean user referral address (he's defined in setup but has no special privileges)
        address userReferral = bob;

        // Set up default referral fee with fuzzed value
        vm.prank(founder);
        referrals.setDefaultBpsFee(defaultBpsFee);

        deal(alice, membershipFee);
        vm.prank(alice);

        // Test the unified joinSpace method with user referral
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: userReferral,
            referralCode: ""
        });
        bytes memory data = abi.encode(alice, referral);
        membership.joinSpace{value: membershipFee}(JoinType.WithReferral, data);

        assertEq(membershipToken.balanceOf(alice), 1);

        // Check user referral fee was paid to the referral address
        uint256 expectedReferralFee = BasisPoints.calculate(MEMBERSHIP_PRICE, defaultBpsFee);
        assertEq(userReferral.balance, expectedReferralFee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ERROR HANDLING                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_revertIf_invalidAction(uint8 invalidEnumValue) external {
        // Filter out valid enum values early (JoinType has values 0 and 1)
        vm.assume(invalidEnumValue > 1);

        deal(alice, 1 ether);
        vm.prank(alice);

        // Test with fuzzed invalid action enum value
        bytes memory data = abi.encode(alice);
        vm.expectRevert(Membership__InvalidAction.selector);

        // Use low-level call to pass invalid enum value
        bytes memory callData = abi.encodeWithSignature(
            "joinSpace(uint8,bytes)",
            invalidEnumValue,
            data
        );

        (bool success, ) = address(membership).call{value: 1 ether}(callData);
        require(!success, "Expected call to fail");
    }

    function test_joinSpace_revertIf_malformedDataBasic(bytes memory malformedData) external {
        // Filter out valid data early (Basic action expects exactly 32 bytes for address)
        vm.assume(malformedData.length != 32);

        deal(alice, 1 ether);
        vm.prank(alice);

        // Test with fuzzed malformed data for basic action
        vm.expectRevert();
        membership.joinSpace{value: 1 ether}(JoinType.Basic, malformedData);
    }

    function test_joinSpace_revertIf_malformedDataReferral() external {
        deal(alice, 1 ether);
        vm.prank(alice);

        // Test with malformed data for referral action (only address, missing referral)
        bytes memory malformedData = abi.encode(alice);
        vm.expectRevert();
        membership.joinSpace{value: 1 ether}(JoinType.WithReferral, malformedData);
    }

    function test_joinSpace_revertIf_invalidReceiverBasic() external {
        deal(alice, 1 ether);
        vm.prank(alice);

        // Test with zero address as receiver
        bytes memory data = abi.encode(address(0));
        vm.expectRevert(Membership__InvalidAddress.selector);
        membership.joinSpace{value: 1 ether}(JoinType.Basic, data);
    }

    function test_joinSpace_revertIf_invalidReceiverReferral() external {
        deal(alice, 1 ether);
        vm.prank(alice);

        // Test with zero address as receiver in referral action
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: address(0),
            referralCode: ""
        });
        bytes memory data = abi.encode(address(0), referral);
        vm.expectRevert(Membership__InvalidAddress.selector);
        membership.joinSpace{value: 1 ether}(JoinType.WithReferral, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     COMPATIBILITY TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_unifiedAndLegacy_equivalentBehaviorBasic() external givenMembershipHasPrice {
        uint256 membershipFee = membership.getMembershipPrice();

        // Create snapshot of initial state (after modifier setup)
        uint256 snapshot = vm.snapshotState();

        // Test legacy method
        deal(alice, membershipFee);
        vm.prank(alice);
        membership.joinSpace{value: membershipFee}(alice);

        assertEq(membershipToken.balanceOf(alice), 1);

        // Revert to snapshot to restore exact same initial state
        vm.revertToState(snapshot);

        // Test unified method in same initial state
        deal(alice, membershipFee);
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        membership.joinSpace{value: membershipFee}(JoinType.Basic, data);

        // Both should result in the same outcome
        assertEq(membershipToken.balanceOf(alice), 1);
    }

    function test_unifiedAndLegacy_equivalentBehaviorReferral() external givenMembershipHasPrice {
        uint256 membershipFee = membership.getMembershipPrice();

        // Set up referral system
        vm.prank(founder);
        referrals.setDefaultBpsFee(300);

        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: charlie,
            referralCode: ""
        });

        // Create snapshot of initial state (after referral setup)
        uint256 snapshot = vm.snapshotState();

        // Test legacy method
        deal(alice, membershipFee);
        vm.prank(alice);
        membership.joinSpaceWithReferral{value: membershipFee}(alice, referral);
        uint256 charlieBalanceAfterLegacy = charlie.balance;

        assertEq(membershipToken.balanceOf(alice), 1);

        // Revert to snapshot to restore exact same initial state
        vm.revertToState(snapshot);

        // Test unified method in same initial state
        deal(alice, membershipFee);
        vm.prank(alice);
        bytes memory data = abi.encode(alice, referral);
        membership.joinSpace{value: membershipFee}(JoinType.WithReferral, data);
        uint256 charlieBalanceAfterUnified = charlie.balance;

        // Both should result in equivalent outcomes
        assertEq(membershipToken.balanceOf(alice), 1);
        assertEq(charlieBalanceAfterLegacy, charlieBalanceAfterUnified);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      GAS OPTIMIZATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_gasComparison_basicJoin() external {
        uint256 membershipFee = membership.getMembershipPrice();

        // Create snapshot of clean state
        uint256 snapshot = vm.snapshotState();

        // Measure gas for legacy method
        deal(alice, membershipFee);
        vm.prank(alice);
        uint256 gasBefore = gasleft();
        membership.joinSpace{value: membershipFee}(alice);
        uint256 legacyGasUsed = gasBefore - gasleft();

        // Revert to same clean state
        vm.revertToState(snapshot);

        // Measure gas for unified method in identical conditions
        deal(alice, membershipFee);
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        gasBefore = gasleft();
        membership.joinSpace{value: membershipFee}(JoinType.Basic, data);
        uint256 unifiedGasUsed = gasBefore - gasleft();

        // Calculate real overhead
        uint256 gasOverhead = unifiedGasUsed > legacyGasUsed ? unifiedGasUsed - legacyGasUsed : 0;

        // Report actual numbers and verify reasonable overhead
        console.log("Legacy gas:", legacyGasUsed);
        console.log("Unified gas:", unifiedGasUsed);
        console.log("Overhead:", gasOverhead);

        assertLt(gasOverhead, 5000, "Unified method gas overhead too high");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       USDC PAYMENT TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_basicActionUSDC() external givenUSDCMembershipHasPrice {
        uint256 membershipFee = usdcMembership.getMembershipPrice();

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
}
