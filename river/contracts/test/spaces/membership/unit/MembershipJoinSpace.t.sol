// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces

//libraries

//contracts

contract MembershipJoinSpace is MembershipBaseSetup {
  function test_joinSpace() external givenAliceHasMintedMembership {
    assertEq(membership.balanceOf(alice), 1);
  }

  function test_revertWhen_joinSpaceWithZeroAddress() external {
    vm.prank(alice);
    vm.expectRevert(Membership__InvalidAddress.selector);
    membership.joinSpace(address(0));
  }

  function test_revertWhen_CallerIsAlreadyMember() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(alice); // alice is the caller
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(bob);
  }

  function test_revertWhen_ReceiverIsAlreadyMember() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(charlie);
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(alice);
  }

  function test_joinSpace_revert_NotAllowed() external {
    vm.prank(bob);
    vm.expectRevert(Entitlement__NotAllowed.selector);
    membership.joinSpace(bob);
  }

  function test_joinSpace_revert_LimitReached() external {
    vm.prank(founder);
    membership.setMembershipLimit(1);

    assertTrue(membership.getMembershipPrice() == 0);
    assertTrue(membership.getMembershipLimit() == 1);

    vm.prank(alice);
    vm.expectRevert(Membership__MaxSupplyReached.selector);
    membership.joinSpace(alice);
  }

  function test_joinSpace_revert_when_updating_maxSupply() external {
    vm.prank(founder);
    membership.setMembershipLimit(2);

    assertTrue(membership.getMembershipPrice() == 0);
    assertTrue(membership.getMembershipLimit() == 2);

    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidMaxSupply.selector);
    membership.setMembershipLimit(1);
  }

  function test_joinSpace_revert_already_member() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(alice);
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(bob);
  }
}
