// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces

//libraries

//contracts

contract MembershipFreeAllocationTest is MembershipBaseSetup {
  function test_setMembershipAllocation() external {
    uint256 currentFreeAllocation = membership.getMembershipFreeAllocation();

    assertEq(currentFreeAllocation, platformReqs.getMembershipMintLimit());

    uint256 newAllocation = 100;

    vm.prank(founder);
    membership.setMembershipFreeAllocation(newAllocation);

    assertEq(membership.getMembershipFreeAllocation(), newAllocation);
  }

  function test_revertWhen_setMembershipFreeAllocationIsNotOwner() external {
    address random = _randomAddress();

    vm.prank(random);
    vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, random));
    membership.setMembershipFreeAllocation(100);
  }

  function test_revertWhen_setMembershipFreeAllocationIsMoreThanCurrentSupply()
    external
  {
    vm.prank(founder);
    membership.setMembershipLimit(100);

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidFreeAllocation.selector);
    membership.setMembershipFreeAllocation(101);
  }

  function test_revertWhen_setMembershipFreeAllocationIsMoreThanPlatformAllows()
    external
  {
    uint256 platformLimit = platformReqs.getMembershipMintLimit();

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidFreeAllocation.selector);
    membership.setMembershipFreeAllocation(platformLimit + 1);
  }
}
