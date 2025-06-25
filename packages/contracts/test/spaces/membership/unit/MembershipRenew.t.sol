// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {MembershipFacet} from "src/spaces/facets/membership/MembershipFacet.sol";

//interfaces
import {IERC5643Base} from "src/diamond/facets/token/ERC5643/IERC5643.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";

//libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";

// debuggging
import {console} from "forge-std/console.sol";

//contracts

contract MembershipRenewTest is MembershipBaseSetup, IERC5643Base {
    modifier givenMembershipHasExpired() {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 expiration = membership.expiresAt(tokenId);
        vm.warp(expiration);
        _;
    }

    function test_renewMembership()
        external
        givenAliceHasMintedMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];

        // membership has expired but alice still owns the token
        assertEq(membershipToken.balanceOf(alice), 1);
        assertEq(membershipToken.ownerOf(tokenId), alice);

        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
        vm.deal(alice, renewalPrice);

        uint256 expiration = membership.expiresAt(tokenId);
        vm.expectEmit(address(membership));
        emit SubscriptionUpdate(tokenId, uint64(expiration + membership.getMembershipDuration()));
        membership.renewMembership{value: renewalPrice}(tokenId);

        assertEq(membershipToken.balanceOf(alice), 1);
    }

    function test_renewPaidMembership()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        address protocol = platformReqs.getFeeRecipient();
        uint256 protocolBalance = protocol.balance;
        uint256 spaceBalance = address(membership).balance;

        uint256 totalSupply = membershipToken.totalSupply();
        uint256 tokenId;

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (membershipToken.ownerOf(i) == alice) {
                tokenId = i;
                break;
            }
        }

        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
        vm.prank(alice);
        vm.deal(alice, renewalPrice);
        membership.renewMembership{value: renewalPrice}(tokenId);

        uint256 protocolFee = BasisPoints.calculate(renewalPrice, platformReqs.getMembershipBps());

        assertEq(protocol.balance, protocolBalance + protocolFee);
        assertEq(address(membership).balance, spaceBalance + renewalPrice - protocolFee);
    }

    function test_renewPaidMembershipWithRefund()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);

        vm.prank(alice);
        vm.deal(alice, renewalPrice + 1 ether);
        membership.renewMembership{value: renewalPrice + 1 ether}(tokenId);

        assertEq(alice.balance, 1 ether);
    }

    function test_renewPaidMembershipByOtherUser()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);

        vm.prank(bob);
        vm.deal(bob, renewalPrice);
        membership.renewMembership{value: renewalPrice}(tokenId);

        assertEq(alice.balance, 0);
        assertEq(bob.balance, 0);
        assertEq(
            membership.expiresAt(tokenId),
            block.timestamp + membership.getMembershipDuration()
        );
    }

    function test_renewPaidMembershipByOtherUserWithRefund()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);

        vm.prank(bob);
        vm.deal(bob, renewalPrice + 1 ether);
        membership.renewMembership{value: renewalPrice + 1 ether}(tokenId);

        assertEq(alice.balance, 0);
        assertEq(bob.balance, 1 ether);
    }

    function test_revertWhen_renewMembershipNoEth() external givenAliceHasMintedMembership {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];

        vm.prank(alice);
        vm.expectRevert(Membership__InvalidPayment.selector);
        membership.renewMembership(tokenId);
    }

    function test_revertWhen_renewNonExistentToken() external {
        uint256 nonExistentTokenId = 999999;
        vm.expectRevert(OwnerQueryForNonexistentToken.selector);
        membership.renewMembership(nonExistentTokenId);
    }

    function test_revertWhen_renewWithInsufficientPayment()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);

        vm.prank(alice);
        vm.deal(alice, renewalPrice / 2); // Send insufficient funds
        vm.expectRevert(Membership__InvalidPayment.selector);
        membership.renewMembership{value: renewalPrice / 2}(tokenId);
    }

    function test_renewMembershipBeforeExpiration() external givenAliceHasMintedMembership {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 initialExpiration = membership.expiresAt(tokenId);
        uint256 duration = membership.getMembershipDuration();

        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
        uint256 newExpiration = initialExpiration + duration;

        vm.prank(alice);
        vm.deal(alice, renewalPrice);
        vm.expectEmit(address(membership));
        emit SubscriptionUpdate(tokenId, uint64(newExpiration));
        membership.renewMembership{value: renewalPrice}(tokenId);

        assertEq(membership.expiresAt(tokenId), newExpiration);
    }

    function test_renewMembershipByAnyone()
        external
        givenAliceHasMintedMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];

        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
        vm.deal(bob, renewalPrice);

        // Bob renews Alice's membership
        vm.prank(bob);
        membership.renewMembership{value: renewalPrice}(tokenId);

        // Verify the renewal was successful
        assertGt(membership.expiresAt(tokenId), block.timestamp);
        assertEq(membershipToken.ownerOf(tokenId), alice);
    }

    function test_renewMembershipMultipleTimes()
        external
        givenAliceHasMintedMembership
        givenMembershipHasExpired
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 duration = membership.getMembershipDuration();

        // Renew 3 times
        for (uint256 i; i < 3; ++i) {
            uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);

            vm.prank(alice);
            vm.deal(alice, renewalPrice);
            membership.renewMembership{value: renewalPrice}(tokenId);

            if (i == 0) {
                assertEq(membership.expiresAt(tokenId), block.timestamp + duration);
            } else {
                assertEq(membership.expiresAt(tokenId), block.timestamp + (duration * (i + 1)));
            }
        }
    }

    function test_renewExpiredMembershipStartsFromCurrentTime()
        external
        givenAliceHasMintedMembership
    {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 originalExpiration = membership.expiresAt(tokenId);
        uint256 duration = membership.getMembershipDuration();

        // Warp to well past the expiration time (1 day after expiration)
        vm.warp(originalExpiration + 1 days);

        // Verify membership has expired
        assertTrue(
            membership.expiresAt(tokenId) <= block.timestamp,
            "Membership should be expired"
        );

        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
        vm.deal(alice, renewalPrice);

        // Expected new expiration should be current time + duration, not original expiration + duration
        uint256 expectedNewExpiration = block.timestamp + duration;

        vm.prank(alice);
        vm.expectEmit(address(membership));
        emit SubscriptionUpdate(tokenId, uint64(expectedNewExpiration));
        membership.renewMembership{value: renewalPrice}(tokenId);

        // Verify the new expiration is based on current time, not the expired time
        assertEq(membership.expiresAt(tokenId), expectedNewExpiration);

        // Verify the gap: new expiration should be much later than original + duration
        assertGt(membership.expiresAt(tokenId), originalExpiration + duration);
    }

    function test_renewMembershipNewTown() external {
        vm.startPrank(founder);
        membership.setMembershipFreeAllocation(2);
        membership.setMembershipPrice(0.01 ether);
        vm.stopPrank();

        vm.startPrank(alice);
        membership.joinSpace(alice);
        vm.stopPrank();

        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);

        vm.deal(alice, renewalPrice);

        vm.prank(alice);
        membership.renewMembership{value: renewalPrice}(tokenId);
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
        address protocol = platformReqs.getFeeRecipient();
        uint256 protocolBalanceBefore = protocol.balance;

        // Calculate protocol fee (should be 0 since base price is 0)
        uint256 renewalPrice = freeMembership.getMembershipRenewalPrice(tokenId);
        uint256 protocolFee = platformReqs.getMembershipFee();

        assertEq(renewalPrice, protocolFee);

        // Fund Alice's wallet with protocol fee
        vm.deal(alice, renewalPrice);

        // Renew membership
        vm.prank(alice);
        freeMembership.renewMembership{value: renewalPrice}(tokenId);

        // Verify protocol fee was paid
        assertEq(protocol.balance - protocolBalanceBefore, protocolFee);

        // Verify membership was renewed
        assertGt(freeMembership.expiresAt(tokenId), originalExpiration);
    }

    function test_renewMembershipPaidTown() external {
        vm.startPrank(founder);
        membership.setMembershipFreeAllocation(1);
        membership.setMembershipPrice(0.005 ether);
        vm.stopPrank();

        vm.deal(alice, 0.005 ether);

        vm.startPrank(alice);
        membership.joinSpace{value: 0.005 ether}(alice);
        vm.stopPrank();

        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);

        uint256 originalExpiration = membership.expiresAt(tokenId);

        // Warp to expiration
        vm.warp(originalExpiration);

        vm.deal(alice, renewalPrice);

        vm.prank(alice);
        membership.renewMembership{value: renewalPrice}(tokenId);

        assertGt(membership.expiresAt(tokenId), originalExpiration);
    }
}
