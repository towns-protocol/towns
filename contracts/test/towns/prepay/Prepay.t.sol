// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils

//interfaces

//libraries

//contracts
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

import {BaseSetup} from "contracts/test/towns/BaseSetup.sol";
import {PrepayFacet} from "contracts/src/towns/facets/prepay/PrepayFacet.sol";
import {MembershipFacet} from "contracts/src/towns/facets/membership/MembershipFacet.sol";

contract PrepayTest is BaseSetup {
  TownArchitect public townArchitect;
  PrepayFacet public prepay;

  function setUp() public override {
    super.setUp();
    prepay = PrepayFacet(townFactory);
    townArchitect = TownArchitect(townFactory);
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
    membership.joinTown(alice);

    // bob will not since our free allocation changed, so now he has to pay
    vm.prank(bob);
    vm.expectRevert();
    membership.joinTown(bob);

    // founder prepays
    vm.prank(founder);
    vm.deal(founder, 1 ether);
    prepay.prepayMembership{value: 1 ether}(address(membership), 1);

    uint256 supply = prepay.prepaidMembershipSupply(address(membership));
    assertEq(supply, membership.totalSupply() + 1);

    // bob can now join
    vm.prank(bob);
    membership.joinTown(bob);

    // charlie can't join since no more prepaid supply
    vm.prank(charlie);
    vm.expectRevert();
    membership.joinTown(charlie);
  }
}
