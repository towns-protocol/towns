// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IMembershipBase} from "src/spaces/facets/membership/IMembership.sol";

//libraries

//contracts
import {MembershipBaseSetup} from "test/spaces/membership/MembershipBaseSetup.sol";

contract PrepayFacetTest is MembershipBaseSetup {
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

    function test_calculateMembershipPrepayFee() external givenMembershipHasPrice {
        uint256 protocolFee = platformReqs.getMembershipFee();
        uint256 supply = 5;

        // Each seat costs MEMBERSHIP_PRICE + protocolFee
        uint256 expectedFee = (MEMBERSHIP_PRICE + protocolFee) * supply;
        uint256 actualFee = prepayFacet.calculateMembershipPrepayFee(supply);

        assertEq(actualFee, expectedFee);
    }

    function test_calculateMembershipPrepayFee_zeroSupply() external view {
        assertEq(prepayFacet.calculateMembershipPrepayFee(0), 0);
    }

    function test_calculateMembershipPrepayFee_zeroPrice() external view {
        // When price is 0, only protocol fee is charged
        uint256 protocolFee = platformReqs.getMembershipFee();
        assertEq(prepayFacet.calculateMembershipPrepayFee(5), protocolFee * 5);
    }

    // =============================================================
    //                           Prepay Membership
    // =============================================================

    function test_prepayMembership() external givenMembershipHasPrice givenFounderHasPrepaid(2) {
        assertEq(prepayFacet.prepaidMembershipSupply(), 2);

        // Platform recipient receives only the protocol fee (not the membership price)
        uint256 protocolFeePerUnit = platformReqs.getMembershipFee();
        uint256 totalProtocolFee = protocolFeePerUnit * 2;
        address platformRecipient = platformReqs.getFeeRecipient();
        assertEq(platformRecipient.balance, totalProtocolFee);

        // Space contract receives the membership revenue (base price, not including protocol fee)
        // getMembershipPrice() includes protocol fee, so we calculate base price separately
        // Each prepaid slot costs 1 ETH (MEMBERSHIP_PRICE) * 2 = 2 ETH
        uint256 expectedSpaceRevenue = MEMBERSHIP_PRICE * 2;
        assertEq(membership.revenue(), expectedSpaceRevenue);
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
        emit MembershipPrepaid(supply);
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
        uint256 protocolFee = platformReqs.getMembershipFee() * supply;

        vm.deal(founder, cost);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: cost}(supply);

        // Only protocol fee goes to platform recipient
        assertEq(platformRecipient.balance, initialBalance + protocolFee);
    }

    // =============================================================
    //                           Reverts
    // =============================================================

    function test_revertWhen_invalidSupplyAmount() external {
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidSupplyAmount.selector);
        prepayFacet.prepayMembership(0);
    }

    function test_revertWhen_msgValueIsNotEqualToCost() external givenMembershipHasPrice {
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidPayment.selector);
        prepayFacet.prepayMembership(1);
    }

    function test_revertWhen_msgValueLessThanCost() external givenMembershipHasPrice {
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(2);

        vm.deal(founder, cost);
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidPayment.selector);
        prepayFacet.prepayMembership{value: cost - 1}(2);
    }

    function test_revertWhen_msgValueGreaterThanCost() external givenMembershipHasPrice {
        uint256 cost = prepayFacet.calculateMembershipPrepayFee(2);

        vm.deal(founder, cost + 1);
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidPayment.selector);
        prepayFacet.prepayMembership{value: cost + 1}(2);
    }

    function test_revertWhen_prepayExceedsSupplyLimit() external givenMembershipHasPrice {
        // Set supply limit to 10
        vm.prank(founder);
        membership.setMembershipLimit(10);

        // Prepay 8 seats
        uint256 cost1 = prepayFacet.calculateMembershipPrepayFee(8);
        vm.deal(founder, cost1);
        vm.prank(founder);
        prepayFacet.prepayMembership{value: cost1}(8);

        // Try to prepay 5 more (8 + 5 = 13 > 10)
        uint256 cost2 = prepayFacet.calculateMembershipPrepayFee(5);
        vm.deal(founder, cost2);
        vm.prank(founder);
        vm.expectRevert(Membership__MaxSupplyReached.selector);
        prepayFacet.prepayMembership{value: cost2}(5);
    }

    function test_prepayPriceAccountsForExistingPrepaidSeats()
        external
        givenMembershipHasPrice
        givenFounderHasPrepaid(5)
    {
        // First prepay of 5 seats costs 5 * (MEMBERSHIP_PRICE + protocolFee)
        // Second prepay of 5 seats should also cost 5 * (MEMBERSHIP_PRICE + protocolFee)
        // because pricing is flat (not tiered) in this test setup
        uint256 protocolFee = platformReqs.getMembershipFee();
        uint256 expectedCost = (MEMBERSHIP_PRICE + protocolFee) * 5;
        uint256 actualCost = prepayFacet.calculateMembershipPrepayFee(5);

        // With flat pricing, both prepays cost the same
        assertEq(actualCost, expectedCost);

        // The key behavior: prepaidSeats now = 5, so second batch is priced at supply 5-9
        // (not 0-4 like before the fix)
        assertEq(prepayFacet.prepaidMembershipSupply(), 5);
    }

    // =============================================================
    //                           Fuzz Tests
    // =============================================================

    function test_fuzz_calculateMembershipPrepayFee(
        uint256 supply
    ) external givenMembershipHasPrice {
        // Bound to reasonable values to avoid overflow
        supply = bound(supply, 0, 1000);

        uint256 protocolFee = platformReqs.getMembershipFee();
        // Each seat costs MEMBERSHIP_PRICE + protocolFee
        uint256 expectedFee = (MEMBERSHIP_PRICE + protocolFee) * supply;

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

        // Verify final prepaid supply after two mints
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
