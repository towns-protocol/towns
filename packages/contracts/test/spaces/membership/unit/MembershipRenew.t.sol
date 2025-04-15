// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IERC5643Base} from "src/diamond/facets/token/ERC5643/IERC5643.sol";

//libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";

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

    function test_renewMembershipHalfwayThrough() external givenAliceHasMintedMembership {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];
        uint256 expiration = membership.expiresAt(tokenId);
        uint256 allowedRenewalTime = expiration - (membership.getMembershipDuration() / 2);

        // set the time just a second before the allowed renewal time
        vm.warp(allowedRenewalTime - 1);

        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
        vm.deal(alice, renewalPrice);

        vm.expectRevert(Membership__NotExpired.selector);
        membership.renewMembership{value: renewalPrice}(tokenId);

        vm.warp(allowedRenewalTime);

        uint256 newExpiration = expiration + membership.getMembershipDuration();

        vm.prank(alice);
        vm.expectEmit(address(membership));
        emit SubscriptionUpdate(tokenId, uint64(newExpiration));
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

    function test_revertWhen_renewMembershipNotExpiredYet() external givenAliceHasMintedMembership {
        uint256 tokenId = membershipTokenQueryable.tokensOfOwner(alice)[0];

        vm.prank(alice);
        vm.expectRevert(Membership__NotExpired.selector);
        membership.renewMembership(tokenId);
    }
}
