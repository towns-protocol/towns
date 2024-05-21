// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/IERC5643.sol";

//libraries
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

//contracts

contract MembershipRenewTest is MembershipBaseSetup, IERC5643Base {
  modifier givenMembershipHasExpired() {
    uint256 totalSupply = membership.totalSupply();
    uint256 tokenId;

    for (uint256 i = 1; i <= totalSupply; i++) {
      if (membership.ownerOf(i) == alice) {
        tokenId = i;
        break;
      }
    }

    uint256 expiration = membership.expiresAt(tokenId);
    vm.warp(expiration);
    _;
  }

  function test_renewMembership()
    external
    givenAliceHasMintedMembership
    givenMembershipHasExpired
  {
    uint256 totalSupply = membership.totalSupply();
    uint256 tokenId;

    for (uint256 i = 1; i <= totalSupply; i++) {
      if (membership.ownerOf(i) == alice) {
        tokenId = i;
        break;
      }
    }

    // membership has expired but alice still owns the token
    assertEq(membership.balanceOf(alice), 1);
    assertEq(membership.ownerOf(tokenId), alice);

    uint256 expiration = membership.expiresAt(tokenId);
    vm.expectEmit(address(membership));
    emit SubscriptionUpdate(
      tokenId,
      uint64(expiration + membership.getMembershipDuration())
    );
    membership.renewMembership(tokenId);

    assertEq(membership.balanceOf(alice), 1);
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

    uint256 totalSupply = membership.totalSupply();
    uint256 tokenId;

    for (uint256 i = 1; i <= totalSupply; i++) {
      if (membership.ownerOf(i) == alice) {
        tokenId = i;
        break;
      }
    }

    uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
    vm.prank(alice);
    vm.deal(alice, renewalPrice);
    membership.renewMembership{value: renewalPrice}(tokenId);

    uint256 protocolFee = BasisPoints.calculate(
      renewalPrice,
      platformReqs.getMembershipBps()
    );

    assertEq(protocol.balance, protocolBalance + protocolFee);
    assertEq(
      address(membership).balance,
      spaceBalance + renewalPrice - protocolFee
    );
  }

  function test_revertWhen_renewMembershipNotExpiredYet()
    external
    givenAliceHasMintedMembership
  {
    uint256 totalSupply = membership.totalSupply();
    uint256 tokenId;

    for (uint256 i = 1; i <= totalSupply; i++) {
      if (membership.ownerOf(i) == alice) {
        tokenId = i;
        break;
      }
    }

    vm.prank(alice);
    vm.expectRevert(Membership__NotExpired.selector);
    membership.renewMembership(tokenId);
  }
}
