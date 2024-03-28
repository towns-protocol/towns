// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces

//libraries

//contracts

contract MembershipCancelTest is MembershipBaseSetup {
  modifier givenAliceHasCancelledMembership() {
    uint256 tokenId = membership.getTokenIdByMembership(alice);
    vm.prank(alice);
    membership.cancelMembership(tokenId);
    _;
  }

  function test_cancelMembership()
    external
    givenAliceHasMintedMembership
    givenAliceHasCancelledMembership
  {
    assertEq(membership.balanceOf(alice), 0);
  }

  function test_revertWhen_cancelMembershipNotApproved()
    external
    givenAliceHasMintedMembership
  {
    uint256 tokenId = membership.getTokenIdByMembership(alice);

    vm.prank(_randomAddress());
    vm.expectRevert(ApprovalCallerNotOwnerNorApproved.selector);
    membership.cancelMembership(tokenId);
  }
}
