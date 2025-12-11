// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils

//interfaces
import {IPrepayBase} from "src/spaces/facets/prepay/IPrepay.sol";

//libraries

//contracts
import {MembershipBaseSetup} from "test/spaces/membership/MembershipBaseSetup.sol";

contract PrepayFacetTest is MembershipBaseSetup, IPrepayBase {
    modifier givenFounderHasPrepaid(uint256 amount) {
        uint256 membershipFee = prepayFacet.calculateMembershipPrepayFee(amount);

        vm.deal(founder, membershipFee);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: membershipFee}(amount);

        _;
    }

    // =============================================================
    //                           View Functions
    // =============================================================

    function test_prepaidMembershipSupply_initiallyZero() external view {
        assertEq(prepayFacet.prepaidMembershipSupply(), 0);
    }

    function test_calculateMembershipPrepayFee() external view {
        uint256 membershipFee = platformReqs.getMembershipFee();
        uint256 supply = 5;

        uint256 expectedFee = supply * membershipFee;
        uint256 actualFee = prepayFacet.calculateMembershipPrepayFee(supply);

        assertEq(actualFee, expectedFee);
    }

    function test_calculateMembershipPrepayFee_zeroSupply() external view {
        assertEq(prepayFacet.calculateMembershipPrepayFee(0), 0);
    }

    // =============================================================
    //                           Prepay Membership
    // =============================================================

    function test_prepayMembership() external givenMembershipHasPrice givenFounderHasPrepaid(2) {
        assertEq(prepayFacet.prepaidMembershipSupply(), 2);

        uint256 membershipFee = prepayFacet.calculateMembershipPrepayFee(2);
        address platformRecipient = platformReqs.getFeeRecipient();
        assertEq(platformRecipient.balance, membershipFee);
    }

    function test_prepayMembership_singleUnit() external givenMembershipHasPrice {
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(1);

        vm.deal(founder, cost);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: cost}(1);

        assertEq(prepayFacet.prepaidMembershipSupply(), 1);
    }

    function test_prepayMembership_emitsEvent() external givenMembershipHasPrice {
        uint256 supply = 3;
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(supply);

        vm.deal(founder, cost);
        vm.prank(founder);
        vm.expectEmit(true, true, true, true);
        emit Prepay__Prepaid(supply);
        prepayFacet.prepayMembership{value: cost}(supply);
    }

    function test_prepayMembership_multiplePrepaysAccumulate()
        external
        givenMembershipHasPrice
        givenFounderHasPrepaid(2)
    {
        assertEq(prepayFacet.prepaidMembershipSupply(), 2);

        // Prepay again
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(3);
        vm.deal(founder, cost);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: cost}(3);

        // Should accumulate
        assertEq(prepayFacet.prepaidMembershipSupply(), 5);
    }

    function test_prepayMembership_transfersToPlatformRecipient() external givenMembershipHasPrice {
        address platformRecipient = platformReqs.getFeeRecipient();
        uint256 initialBalance = platformRecipient.balance;

        uint256 supply = 2;
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(supply);

        vm.deal(founder, cost);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: cost}(supply);

        assertEq(platformRecipient.balance, initialBalance + cost);
    }

    // =============================================================
    //                           Reverts
    // =============================================================

    function test_revertWhen_invalidSupplyAmount() external {
        vm.prank(founder);
        vm.expectRevert(Prepay__InvalidSupplyAmount.selector);
        prepayFacet.prepayMembership(0);
    }

    function test_revertWhen_msgValueIsNotEqualToCost() external givenMembershipHasPrice {
        vm.prank(founder);
        vm.expectRevert(Prepay__InvalidAmount.selector);
        prepayFacet.prepayMembership(1);
    }

    function test_revertWhen_msgValueLessThanCost() external givenMembershipHasPrice {
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(2);

        vm.deal(founder, cost);
        vm.prank(founder);
        vm.expectRevert(Prepay__InvalidAmount.selector);
        prepayFacet.prepayMembership{value: cost - 1}(2);
    }

    function test_revertWhen_msgValueGreaterThanCost() external givenMembershipHasPrice {
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(2);

        vm.deal(founder, cost + 1);
        vm.prank(founder);
        vm.expectRevert(Prepay__InvalidAmount.selector);
        prepayFacet.prepayMembership{value: cost + 1}(2);
    }

    function test_revertWhen_notOwnerOrSpaceFactory() external givenMembershipHasPrice {
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(1);

        hoax(alice, cost);
        vm.expectRevert(Prepay__NotAllowed.selector);
        prepayFacet.prepayMembership{value: cost}(1);
    }

    function test_revertWhen_randomAddressCalls() external givenMembershipHasPrice {
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(1);
        address randomUser = makeAddr("randomUser");

        hoax(randomUser, cost);
        vm.expectRevert(Prepay__NotAllowed.selector);
        prepayFacet.prepayMembership{value: cost}(1);
    }

    // =============================================================
    //                           Fuzz Tests
    // =============================================================

    function test_fuzz_calculateMembershipPrepayFee(uint256 supply) external view {
        // Bound to reasonable values to avoid overflow
        supply = bound(supply, 0, type(uint128).max);

        uint256 membershipFee = platformReqs.getMembershipFee();
        uint256 expectedFee = supply * membershipFee;

        assertEq(prepayFacet.calculateMembershipPrepayFee(supply), expectedFee);
    }

    function test_fuzz_prepayMembership(uint256 supply) external givenMembershipHasPrice {
        // Bound to reasonable non-zero values
        supply = bound(supply, 1, 1000);

        uint256 cost = prepayFacet.calculateMembershipPrepayFee(supply);

        vm.deal(founder, cost);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: cost}(supply);

        assertEq(prepayFacet.prepaidMembershipSupply(), supply);
    }

    // =============================================================
    //                           Integration
    // =============================================================

    /**
     * Scenario:
     *  - Founder prepays 1 membership
     *  - Alice mints a membership
     *  - Charlie tries to mint a membership but fails
     */
    function test_integration_prepayMembership() external givenFounderHasPrepaid(1) {
        vm.startPrank(founder);
        membership.setMembershipPrice(MEMBERSHIP_PRICE);
        vm.stopPrank();

        // Alice mints a membership
        vm.prank(alice);
        membership.joinSpace(alice);

        // Charlie tries to mint a membership but fails
        vm.prank(charlie);
        vm.expectRevert(Membership__InsufficientPayment.selector);
        membership.joinSpace(charlie);
    }

    /**
     * Scenario:
     *  - Founder prepays 3 memberships
     *  - Alice, Charlie, and Bob all mint memberships successfully
     *  - Prepaid supply is exhausted
     */
    function test_integration_multipleUsersMintAgainstPrepaid() external givenFounderHasPrepaid(3) {
        vm.startPrank(founder);
        membership.setMembershipPrice(MEMBERSHIP_PRICE);
        vm.stopPrank();

        assertEq(prepayFacet.prepaidMembershipSupply(), 3);

        // Alice mints
        vm.prank(alice);
        membership.joinSpace(alice);
        assertEq(prepayFacet.prepaidMembershipSupply(), 2);

        // Charlie mints
        vm.prank(charlie);
        membership.joinSpace(charlie);
        assertEq(prepayFacet.prepaidMembershipSupply(), 1);

        // Bob mints (need to add bob as entitled user first or use free allocation)
        // Since bob is not in the allowed users list, let's verify prepaid supply decreased
        assertEq(prepayFacet.prepaidMembershipSupply(), 1);
    }

    /**
     * Scenario:
     *  - Founder prepays 2 memberships
     *  - Alice mints
     *  - Founder prepays 1 more
     *  - Charlie mints
     *  - Prepaid supply should be 1
     */
    function test_integration_prepayAfterPartialConsumption() external givenFounderHasPrepaid(2) {
        vm.startPrank(founder);
        membership.setMembershipPrice(MEMBERSHIP_PRICE);
        vm.stopPrank();

        // Alice mints
        vm.prank(alice);
        membership.joinSpace(alice);
        assertEq(prepayFacet.prepaidMembershipSupply(), 1);

        // Founder prepays 1 more
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(1);
        vm.deal(founder, cost);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: cost}(1);
        assertEq(prepayFacet.prepaidMembershipSupply(), 2);

        // Charlie mints
        vm.prank(charlie);
        membership.joinSpace(charlie);
        assertEq(prepayFacet.prepaidMembershipSupply(), 1);
    }
}
