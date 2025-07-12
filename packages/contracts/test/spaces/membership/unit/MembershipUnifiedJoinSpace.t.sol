// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces
import {Vm} from "forge-std/Vm.sol";
import {IReferralsBase} from "src/spaces/facets/referrals/IReferrals.sol";

// libraries
import {console} from "forge-std/console.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";

// contracts
import {Test} from "forge-std/Test.sol";
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

contract MembershipUnifiedJoinSpaceTest is Test, MembershipBaseSetup {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    UNIFIED ACTION TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_basicAction() external givenMembershipHasPrice {
        uint256 membershipFee = membership.getMembershipPrice();

        deal(alice, membershipFee);
        vm.prank(alice);

        // Test the unified joinSpace method with Action.JoinBasic
        bytes memory data = abi.encode(alice);
        membership.joinSpace{value: membershipFee}(JoinType.Basic, data);

        assertEq(membershipToken.balanceOf(alice), 1);
        assertEq(alice.balance, 0);
    }

    function test_joinSpace_basicActionFree() external {
        // Test without payment when membership is free
        vm.prank(alice);
        bytes memory data = abi.encode(alice);
        membership.joinSpace(JoinType.Basic, data);

        assertEq(membershipToken.balanceOf(alice), 1);
    }

    function test_joinSpace_withReferralAction() external givenMembershipHasPrice {
        uint256 membershipFee = membership.getMembershipPrice();
        string memory referralCode = "UNIFIED_TEST";

        // Set up referral
        vm.prank(founder);
        referrals.setMaxBpsFee(1000);

        IReferralsBase.Referral memory referralInfo = IReferralsBase.Referral({
            referralCode: referralCode,
            basisPoints: 500,
            recipient: charlie
        });

        vm.prank(founder);
        referrals.registerReferral(referralInfo);

        deal(alice, membershipFee);
        vm.prank(alice);

        // Test the unified joinSpace method with Action.JoinWithReferral
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: address(0),
            referralCode: referralCode
        });
        bytes memory data = abi.encode(alice, referral);
        membership.joinSpace{value: membershipFee}(JoinType.WithReferral, data);

        assertEq(membershipToken.balanceOf(alice), 1);

        // Check referral fee was paid to charlie
        uint256 expectedReferralFee = BasisPoints.calculate(membershipFee, 500);
        assertEq(charlie.balance, expectedReferralFee);
    }

    function test_joinSpace_withUserReferralAction() external givenMembershipHasPrice {
        uint256 membershipFee = membership.getMembershipPrice();

        // Set up default referral fee
        vm.prank(founder);
        referrals.setDefaultBpsFee(300); // 3%

        deal(alice, membershipFee);
        vm.prank(alice);

        // Test the unified joinSpace method with user referral
        ReferralTypes memory referral = ReferralTypes({
            partner: address(0),
            userReferral: bob, // Bob is the referrer
            referralCode: ""
        });
        bytes memory data = abi.encode(alice, referral);
        membership.joinSpace{value: membershipFee}(JoinType.WithReferral, data);

        assertEq(membershipToken.balanceOf(alice), 1);

        // Check user referral fee was paid to bob
        uint256 expectedReferralFee = BasisPoints.calculate(membershipFee, 300);
        assertEq(bob.balance, expectedReferralFee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ERROR HANDLING                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_joinSpace_revertIf_invalidAction() external {
        deal(alice, 1 ether);
        vm.prank(alice);

        // Test with invalid action enum value using assembly
        bytes memory data = abi.encode(alice);
        vm.expectRevert(Membership__InvalidAction.selector);

        // Use low-level call to pass invalid enum value
        bytes memory callData = abi.encodeWithSignature(
            "joinSpace(uint8,bytes)",
            uint8(99), // Invalid enum value
            data
        );

        (bool success, ) = address(membership).call{value: 1 ether}(callData);
        require(!success, "Expected call to fail");
    }

    function test_joinSpace_revertIf_malformedDataBasic() external {
        deal(alice, 1 ether);
        vm.prank(alice);

        // Test with malformed data for basic action (empty data)
        bytes memory malformedData = "";
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
}
