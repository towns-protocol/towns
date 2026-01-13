// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {MembershipFacet} from "src/spaces/facets/membership/MembershipFacet.sol";

// interfaces
import {IERC5643Base} from "src/diamond/facets/token/ERC5643/IERC5643.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts

contract MembershipRenewTest is MembershipBaseSetup, IERC5643Base {
    uint256 private constant EXTRA_ETHER = 1 ether;
    uint256 private constant USDC_PRICE = 10_000_000; // $10 USDC

    modifier givenMembershipHasExpired() {
        uint256 tokenId = _getAliceTokenId();
        uint256 expiration = membership.expiresAt(tokenId);
        vm.warp(expiration);
        _;
    }

    modifier givenAliceHasUsdcMembership() {
        vm.prank(founder);
        usdcMembership.setMembershipPrice(USDC_PRICE);
        uint256 totalPrice = usdcMembership.getMembershipPrice();
        mockUSDC.mint(alice, totalPrice);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), totalPrice);
        vm.prank(alice);
        usdcMembership.joinSpace(JoinType.Basic, abi.encode(alice));
        _;
    }

    modifier givenUsdcMembershipHasExpired() {
        uint256 tokenId = _getAliceUsdcTokenId();
        vm.warp(usdcMembership.expiresAt(tokenId));
        _;
    }

    // Helper Functions
    function _getAliceTokenId() private view returns (uint256) {
        return membershipTokenQueryable.tokensOfOwner(alice)[0];
    }

    function _getAliceUsdcTokenId() private view returns (uint256) {
        return IERC721AQueryable(address(usdcMembership)).tokensOfOwner(alice)[0];
    }

    function _getRenewalPrice(uint256 tokenId) private view returns (uint256) {
        return membership.getMembershipRenewalPrice(tokenId);
    }

    function _setupMembershipPricing(uint256, uint256 price) private {
        vm.startPrank(founder);
        // membership.setMembershipFreeAllocation(freeAllocation);
        membership.setMembershipPrice(price);
        vm.stopPrank();
    }

    function _renewMembershipWithValue(address user, uint256 tokenId, uint256 value) private {
        vm.deal(user, value);
        vm.prank(user);
        membership.renewMembership{value: value}(tokenId);
    }

    function _renewUsdcMembership(address user, uint256 tokenId) private {
        uint256 renewalPrice = usdcMembership.getMembershipRenewalPrice(tokenId);
        mockUSDC.mint(user, renewalPrice);
        vm.prank(user);
        mockUSDC.approve(address(usdcMembership), renewalPrice);
        vm.prank(user);
        usdcMembership.renewMembership(tokenId);
    }

    function _getProtocolFeeData()
        private
        view
        returns (address protocolAddr, uint256 protocolBalance)
    {
        protocolAddr = platformReqs.getFeeRecipient();
        protocolBalance = protocolAddr.balance;
    }

    function _calculateProtocolFee(uint256 basePrice) private view returns (uint256) {
        uint256 bpsFee = BasisPoints.calculate(basePrice, platformReqs.getMembershipBps());
        uint256 minFee = platformReqs.getMembershipFee();
        return FixedPointMathLib.max(bpsFee, minFee);
    }

    function test_renewMembership()
        external
        givenAliceHasMintedMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = _getAliceTokenId();

        // membership has expired but alice still owns the token
        assertEq(membershipToken.balanceOf(alice), 1);
        assertEq(membershipToken.ownerOf(tokenId), alice);

        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 expiration = membership.expiresAt(tokenId);

        vm.expectEmit(address(membership));
        emit SubscriptionUpdate(tokenId, uint64(expiration + membership.getMembershipDuration()));

        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        uint256 points = _getPoints(renewalPrice);

        assertEq(membershipToken.balanceOf(alice), 1);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), points);
    }

    function test_renewSinglePaidMembership()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        (address protocol, uint256 protocolBalance) = _getProtocolFeeData();
        uint256 spaceBalance = address(membership).balance;
        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);
        uint256 currentPointsOwner = IERC20(riverAirdrop).balanceOf(founder);
        _renewMembershipWithValue(alice, tokenId, renewalPrice);
        // With fee-added model: renewalPrice = basePrice + protocolFee
        // Base price is MEMBERSHIP_PRICE
        uint256 protocolFee = _calculateProtocolFee(MEMBERSHIP_PRICE);
        assertEq(protocol.balance, protocolBalance + protocolFee);

        assertEq(address(membership).balance, spaceBalance + MEMBERSHIP_PRICE); // Space gets base price only

        uint256 points = _getPoints(renewalPrice);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
        assertEq(IERC20(riverAirdrop).balanceOf(founder), currentPointsOwner + points);
    }

    function test_renewPaidMembershipWithRefund()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        uint256 points = _getPoints(renewalPrice);

        _renewMembershipWithValue(alice, tokenId, renewalPrice + EXTRA_ETHER);

        assertEq(alice.balance, EXTRA_ETHER);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewPaidMembershipByOtherUser()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        _renewMembershipWithValue(bob, tokenId, renewalPrice);

        uint256 points = _getPoints(renewalPrice);

        assertEq(alice.balance, 0);
        assertEq(bob.balance, 0);
        assertEq(
            membership.expiresAt(tokenId),
            block.timestamp + membership.getMembershipDuration()
        );
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewPaidMembershipByOtherUserWithRefund()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        _renewMembershipWithValue(bob, tokenId, renewalPrice + EXTRA_ETHER);

        uint256 points = _getPoints(renewalPrice);

        assertEq(alice.balance, 0);
        assertEq(bob.balance, EXTRA_ETHER);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewMembership_revertWhenNoEth()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
    {
        uint256 tokenId = _getAliceTokenId();

        vm.prank(alice);
        vm.expectRevert(Membership__InvalidPayment.selector);
        membership.renewMembership(tokenId);
    }

    function test_revertWhen_renewNonExistentToken() external {
        vm.expectRevert(OwnerQueryForNonexistentToken.selector);
        membership.renewMembership(type(uint256).max);
    }

    function test_revertWhen_renewWithInsufficientPayment()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);

        vm.deal(alice, renewalPrice / 2); // Send insufficient funds
        vm.prank(alice);
        vm.expectRevert(Membership__InvalidPayment.selector);
        membership.renewMembership{value: renewalPrice / 2}(tokenId);
    }

    function test_renewMembershipBeforeExpiration() external givenAliceHasMintedMembership {
        uint256 tokenId = _getAliceTokenId();
        uint256 initialExpiration = membership.expiresAt(tokenId);
        uint256 duration = membership.getMembershipDuration();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 newExpiration = initialExpiration + duration;
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        vm.expectEmit(address(membership));
        emit SubscriptionUpdate(tokenId, uint64(newExpiration));

        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        uint256 points = _getPoints(renewalPrice);

        assertEq(membership.expiresAt(tokenId), newExpiration);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewMembershipByAnyone()
        external
        givenAliceHasMintedMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        // Bob renews Alice's membership
        _renewMembershipWithValue(bob, tokenId, renewalPrice);

        uint256 points = _getPoints(renewalPrice);

        // Verify the renewal was successful
        assertGt(membership.expiresAt(tokenId), block.timestamp);
        assertEq(membershipToken.ownerOf(tokenId), alice);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewMembershipMultipleTimes()
        external
        givenAliceHasMintedMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = _getAliceTokenId();
        uint256 duration = membership.getMembershipDuration();
        uint256 initialPoints = IERC20(riverAirdrop).balanceOf(alice);
        uint256 totalPointsEarned;

        // Renew multiple times
        for (uint256 i; i < 3; ++i) {
            uint256 renewalPrice = _getRenewalPrice(tokenId);
            _renewMembershipWithValue(alice, tokenId, renewalPrice);

            uint256 points = _getPoints(renewalPrice);
            totalPointsEarned += points;

            if (i == 0) {
                assertEq(membership.expiresAt(tokenId), block.timestamp + duration);
            } else {
                assertEq(membership.expiresAt(tokenId), block.timestamp + (duration * (i + 1)));
            }

            assertEq(IERC20(riverAirdrop).balanceOf(alice), initialPoints + totalPointsEarned);
        }
    }

    function test_renewExpiredMembershipStartsFromCurrentTime()
        external
        givenAliceHasMintedMembership
    {
        uint256 tokenId = _getAliceTokenId();
        uint256 originalExpiration = membership.expiresAt(tokenId);
        uint256 duration = membership.getMembershipDuration();

        // Warp to well past the expiration time
        vm.warp(originalExpiration + 1 days);

        // Verify membership has expired
        assertTrue(
            membership.expiresAt(tokenId) <= block.timestamp,
            "Membership should be expired"
        );

        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 expectedNewExpiration = block.timestamp + duration;
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        vm.expectEmit(address(membership));
        emit SubscriptionUpdate(tokenId, uint64(expectedNewExpiration));

        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        uint256 points = _getPoints(renewalPrice);

        // Verify the new expiration is based on current time, not the expired time
        assertEq(membership.expiresAt(tokenId), expectedNewExpiration);

        // Verify the gap: new expiration should be much later than original + duration
        assertGt(membership.expiresAt(tokenId), originalExpiration + duration);

        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewMembershipNewTown() external {
        _setupMembershipPricing(2, MEMBERSHIP_PRICE);

        uint256 totalPrice = membership.getMembershipPrice();

        vm.prank(alice);
        vm.deal(alice, totalPrice);
        membership.joinSpace{value: totalPrice}(alice);

        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        uint256 points = _getPoints(renewalPrice);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewMembershipFreeTown() external {
        MembershipFacet freeMembership = MembershipFacet(freeSpace);
        IERC721AQueryable freeMembershipTokenQueryable = IERC721AQueryable(freeSpace);

        // Alice joins for free
        vm.prank(alice);
        freeMembership.joinSpace(alice);

        uint256 tokenId = freeMembershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 originalExpiration = freeMembership.expiresAt(tokenId);

        // Warp to expiration
        vm.warp(originalExpiration);

        // Get protocol fee recipient and check initial balance
        (address protocol, uint256 protocolBalanceBefore) = _getProtocolFeeData();

        // Renewal price should be 0 for truly free memberships
        uint256 renewalPrice = freeMembership.getMembershipRenewalPrice(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        assertEq(renewalPrice, 0, "Renewal price should be 0 for free membership");

        // Alice renews for free (no ETH needed)
        vm.prank(alice);
        freeMembership.renewMembership(tokenId);

        uint256 points = _getPoints(renewalPrice);

        // Verify protocol receives nothing (truly free)
        assertEq(protocol.balance - protocolBalanceBefore, 0, "Protocol should receive nothing");

        // Verify membership was renewed
        assertGt(freeMembership.expiresAt(tokenId), originalExpiration);

        // Verify points (0 for free renewal)
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewMembershipPaidTown() external {
        _setupMembershipPricing(1, MEMBERSHIP_PRICE);
        uint256 membershipPrice = membership.getMembershipPrice();

        vm.deal(alice, membershipPrice);
        vm.prank(alice);
        membership.joinSpace{value: membershipPrice}(alice);

        uint256 tokenId = _getAliceTokenId();
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        uint256 originalExpiration = membership.expiresAt(tokenId);
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        // Warp to expiration
        vm.warp(originalExpiration);

        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        uint256 points = _getPoints(renewalPrice);

        assertGt(membership.expiresAt(tokenId), originalExpiration);
        assertEq(IERC20(riverAirdrop).balanceOf(alice), currentPoints + points);
    }

    function test_renewMembershipAfterPriceDropToFree() external {
        // Setup: Create a paid town with initial price
        uint256 initialPrice = MEMBERSHIP_PRICE;
        _setupMembershipPricing(1, initialPrice);

        uint256 totalPrice = membership.getMembershipPrice();

        // Alice joins at the higher price
        vm.deal(alice, totalPrice);
        vm.prank(alice);
        membership.joinSpace{value: totalPrice}(alice);

        uint256 tokenId = _getAliceTokenId();
        uint256 originalExpiration = membership.expiresAt(tokenId);

        // Verify Alice paid the initial price
        uint256 lockedRenewalPrice = _getRenewalPrice(tokenId);
        assertEq(lockedRenewalPrice, totalPrice, "Initial renewal price should be locked");

        // Town transitions to free
        vm.prank(founder);
        membership.setMembershipPrice(0);

        // Verify current price is now free
        uint256 newMembershipPrice = membership.getMembershipPrice();
        assertEq(newMembershipPrice, 0, "New price should be free");

        // Warp to expiration
        vm.warp(originalExpiration);

        // Get updated renewal price - should be free
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        assertEq(renewalPrice, 0, "Renewal price should use lower current price, not locked price");

        // Track balances
        (address protocol, uint256 protocolBalanceBefore) = _getProtocolFeeData();
        uint256 spaceBalanceBefore = address(membership).balance;
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        // Alice renews for free
        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        // Verify protocol receives nothing (truly free renewal)
        assertEq(protocol.balance - protocolBalanceBefore, 0, "Protocol should receive nothing");

        // Verify space balance unchanged
        assertEq(
            address(membership).balance,
            spaceBalanceBefore,
            "Space balance should be unchanged"
        );

        // Verify membership was renewed
        assertGt(membership.expiresAt(tokenId), originalExpiration, "Membership should be renewed");

        // Verify points (0 for free renewal)
        uint256 points = _getPoints(renewalPrice);
        assertEq(
            IERC20(riverAirdrop).balanceOf(alice),
            currentPoints + points,
            "Points should be awarded"
        );
    }

    function test_renewMembershipAfterPriceDropToLower() external {
        // Setup: Create a paid town with high initial price
        uint256 initialPrice = MEMBERSHIP_PRICE;
        uint256 lowerPrice = MEMBERSHIP_PRICE / 2;
        _setupMembershipPricing(1, initialPrice);

        uint256 totalPrice = membership.getMembershipPrice();

        // Alice joins at the higher price
        vm.deal(alice, totalPrice);
        vm.prank(alice);
        membership.joinSpace{value: totalPrice}(alice);

        uint256 tokenId = _getAliceTokenId();
        uint256 originalExpiration = membership.expiresAt(tokenId);

        // Verify Alice's renewal price is locked at initial price
        assertEq(_getRenewalPrice(tokenId), totalPrice, "Initial renewal price should be locked");

        // Town reduces price to lower amount
        vm.prank(founder);
        membership.setMembershipPrice(lowerPrice);

        // Verify new membership price
        uint256 newTotalPrice = membership.getMembershipPrice();
        assertLt(newTotalPrice, totalPrice, "New membership price should be lower");

        // Warp to expiration
        vm.warp(originalExpiration);

        // Get renewal price - should be the lower current price
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        assertEq(renewalPrice, newTotalPrice, "Renewal should use lower current price");
        assertLt(renewalPrice, totalPrice, "Renewal price should be less than original");

        // Track balances
        (address protocol, uint256 protocolBalanceBefore) = _getProtocolFeeData();
        uint256 spaceBalanceBefore = address(membership).balance;
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        // Alice renews at the lower price
        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        // Calculate expected fees (protocol fee on base price)
        uint256 protocolFee = _calculateProtocolFee(lowerPrice);
        uint256 points = _getPoints(renewalPrice);

        // Verify balances
        assertEq(
            protocol.balance - protocolBalanceBefore,
            protocolFee,
            "Protocol should receive correct fee"
        );
        assertEq(
            address(membership).balance,
            spaceBalanceBefore + lowerPrice,
            "Space should receive base price"
        );

        // Verify membership was renewed
        assertGt(membership.expiresAt(tokenId), originalExpiration, "Membership should be renewed");

        // Verify points
        assertEq(
            IERC20(riverAirdrop).balanceOf(alice),
            currentPoints + points,
            "Points should be awarded based on renewal price"
        );
    }

    function test_renewMembershipAfterPriceIncrease() external {
        // Setup: Create a paid town with low initial price
        uint256 initialPrice = MEMBERSHIP_PRICE / 2;
        uint256 higherPrice = MEMBERSHIP_PRICE;
        _setupMembershipPricing(1, initialPrice);

        uint256 totalPrice = membership.getMembershipPrice();

        // Alice joins at the lower price
        vm.deal(alice, totalPrice);
        vm.prank(alice);
        membership.joinSpace{value: totalPrice}(alice);

        uint256 tokenId = _getAliceTokenId();
        uint256 originalExpiration = membership.expiresAt(tokenId);

        // Verify Alice's renewal price is locked at initial lower price
        assertEq(_getRenewalPrice(tokenId), totalPrice, "Initial renewal price should be locked");

        // Town increases price
        vm.prank(founder);
        membership.setMembershipPrice(higherPrice);

        // Verify new membership price is higher
        uint256 newTotalPrice = membership.getMembershipPrice();
        assertGt(newTotalPrice, totalPrice, "New membership price should be higher");

        // Warp to expiration
        vm.warp(originalExpiration);

        // Get renewal price - should still be the locked lower price
        uint256 renewalPrice = _getRenewalPrice(tokenId);
        assertEq(
            renewalPrice,
            totalPrice,
            "Renewal should maintain locked lower price despite increase"
        );
        assertLt(renewalPrice, newTotalPrice, "Renewal price should be less than new higher price");

        // Track balances
        uint256 currentPoints = IERC20(riverAirdrop).balanceOf(alice);

        // Alice renews at her locked-in lower price
        _renewMembershipWithValue(alice, tokenId, renewalPrice);

        // Verify membership was renewed
        assertGt(membership.expiresAt(tokenId), originalExpiration, "Membership should be renewed");

        // Verify points based on the lower renewal price
        uint256 points = _getPoints(renewalPrice);
        assertEq(
            IERC20(riverAirdrop).balanceOf(alice),
            currentPoints + points,
            "Points should be awarded based on locked lower price"
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     USDC RENEWAL TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_renewMembership_USDC()
        external
        givenAliceHasUsdcMembership
        givenUsdcMembershipHasExpired
    {
        uint256 tokenId = _getAliceUsdcTokenId();
        uint256 spaceBalanceBefore = mockUSDC.balanceOf(address(usdcMembership));

        _renewUsdcMembership(alice, tokenId);

        assertEq(
            mockUSDC.balanceOf(address(usdcMembership)),
            spaceBalanceBefore + USDC_PRICE,
            "Space should receive base price"
        );
    }

    function test_renewMembership_USDC_byOtherUser()
        external
        givenAliceHasUsdcMembership
        givenUsdcMembershipHasExpired
    {
        uint256 tokenId = _getAliceUsdcTokenId();

        _renewUsdcMembership(bob, tokenId);

        assertEq(mockUSDC.balanceOf(bob), 0, "Bob's USDC should be spent");
    }

    function test_renewMembership_revertWhen_USDC_insufficientApproval()
        external
        givenAliceHasUsdcMembership
        givenUsdcMembershipHasExpired
    {
        uint256 tokenId = _getAliceUsdcTokenId();
        uint256 renewalPrice = usdcMembership.getMembershipRenewalPrice(tokenId);

        mockUSDC.mint(alice, renewalPrice);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), renewalPrice - 1);

        vm.prank(alice);
        vm.expectRevert();
        usdcMembership.renewMembership(tokenId);
    }

    function test_renewMembership_revertWhen_USDC_withEth()
        external
        givenAliceHasUsdcMembership
        givenUsdcMembershipHasExpired
    {
        uint256 tokenId = _getAliceUsdcTokenId();

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(Membership__UnexpectedValue.selector);
        usdcMembership.renewMembership{value: 1 ether}(tokenId);
    }

    function test_renewMembership_freeUSDC_refundsEth() external {
        vm.prank(founder);
        usdcMembership.setMembershipPrice(0);

        vm.prank(alice);
        usdcMembership.joinSpace(JoinType.Basic, abi.encode(alice));

        uint256 tokenId = _getAliceUsdcTokenId();
        vm.warp(usdcMembership.expiresAt(tokenId));

        uint256 ethSent = 1 ether;
        vm.deal(alice, ethSent);

        vm.prank(alice);
        usdcMembership.renewMembership{value: ethSent}(tokenId);

        assertEq(alice.balance, ethSent, "ETH should be refunded");
    }
}
