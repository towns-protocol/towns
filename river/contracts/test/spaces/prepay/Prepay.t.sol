// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils

//interfaces

//libraries

//contracts
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";

import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {PrepayFacet} from "contracts/src/factory/facets/prepay/PrepayFacet.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";

import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IPrepayBase} from "contracts/src/factory/facets/prepay/IPrepay.sol";

contract PrepayTest is BaseSetup, IPrepayBase, IMembershipBase {
  Architect public architect;
  PrepayFacet public prepay;

  function setUp() public override {
    super.setUp();
    prepay = PrepayFacet(spaceFactory);
    architect = Architect(spaceFactory);
  }

  function test_prepayMembership_revertWhen_invalidAmount() external {
    vm.expectRevert(PrepayBase__InvalidAmount.selector);
    prepay.prepayMembership(everyoneSpace, 0);
  }

  function test_prepayMembership_revertWhen_invalidAddress() external {
    vm.expectRevert(PrepayBase__InvalidAddress.selector);
    prepay.prepayMembership(address(0), 1);
  }

  function test_prepayMembership_revertWhen_notOwner() external {
    address alice = _randomAddress();

    uint256 membershipFee = prepay.calculateMembershipPrepayFee(1);

    vm.expectRevert(PrepayBase__InvalidAddress.selector);
    hoax(alice, membershipFee);
    prepay.prepayMembership{value: membershipFee}(everyoneSpace, 1);
  }

  function test_prepayMembership() external {
    address alice = _randomAddress();
    address bob = _randomAddress();
    address charlie = _randomAddress();

    MembershipFacet membership = MembershipFacet(everyoneSpace);

    vm.startPrank(founder);
    membership.setMembershipFreeAllocation(2);
    membership.setMembershipPrice(1 ether);
    vm.stopPrank();

    // we let alice get a membership
    vm.prank(alice);
    membership.joinSpace(alice);

    // bob will not since our free allocation changed, so now he has to pay
    vm.prank(bob);
    vm.expectRevert(Membership__InsufficientPayment.selector);
    membership.joinSpace(bob);

    uint256 membershipFee = prepay.calculateMembershipPrepayFee(1);

    // founder prepays
    vm.prank(founder);
    vm.deal(founder, membershipFee);
    prepay.prepayMembership{value: membershipFee}(address(membership), 1);

    uint256 supply = prepay.prepaidMembershipSupply(address(membership));
    assertEq(supply, membership.totalSupply() + 1);

    // bob can now join
    vm.prank(bob);
    membership.joinSpace(bob);

    // charlie can't join since no more prepaid supply
    vm.prank(charlie);
    vm.expectRevert(Membership__InsufficientPayment.selector);
    membership.joinSpace(charlie);
  }
}
