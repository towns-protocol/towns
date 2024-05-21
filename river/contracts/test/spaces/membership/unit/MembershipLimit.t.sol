// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces

//libraries

//contracts

contract MembershipMintLimitTest is MembershipBaseSetup {
  modifier givenFounderSetAMintLimit() {
    vm.prank(founder);
    membership.setMembershipLimit(100);
    _;
  }

  function test_setMembershipLimit() external givenFounderSetAMintLimit {
    assertEq(membership.getMembershipLimit(), 100);
  }

  function test_revertWhen_setMembershipLimitNotOwner() external {
    address random = _randomAddress();
    vm.prank(random);
    vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, random));
    membership.setMembershipLimit(100);
  }

  function test_revertWhen_setMembershipLimitIsMoreThanCurrentSupply()
    external
    givenAliceHasMintedMembership
  {
    uint256 totalSupply = membership.totalSupply();

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidMaxSupply.selector);
    membership.setMembershipLimit(totalSupply - 1);
  }

  function test_revertWhen_setMembershipLimitLowerAgain() external {
    vm.prank(founder);
    membership.setMembershipLimit(100);

    vm.prank(founder);
    membership.setMembershipLimit(99);
  }
}
