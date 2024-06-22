// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils

//interfaces
import {IPrepayBase} from "contracts/src/spaces/facets/prepay/IPrepay.sol";

//libraries

//contracts
import {MembershipBaseSetup} from "contracts/test/spaces/membership/MembershipBaseSetup.sol";

contract PrepayFacetTest is MembershipBaseSetup, IPrepayBase {
  modifier givenFounderHasPrepaid(uint256 amount) {
    uint256 membershipFee = prepayFacet.calculateMembershipPrepayFee(amount);

    vm.deal(founder, membershipFee);
    vm.prank(founder);
    prepayFacet.prepayMembership{value: membershipFee}(amount);

    _;
  }

  function test_prepayMembership()
    external
    givenMembershipHasPrice
    givenFounderHasPrepaid(2)
  {
    assertEq(prepayFacet.prepaidMembershipSupply(), 2);

    uint256 membershipFee = prepayFacet.calculateMembershipPrepayFee(2);
    address platformRecipient = platformReqs.getFeeRecipient();
    assertEq(platformRecipient.balance, membershipFee);
  }

  // =============================================================
  //                           Reverts
  // =============================================================

  function test_revertWhen_notOwner() external {
    address notOwner = _randomAddress();

    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner)
    );
    prepayFacet.prepayMembership(1);
  }

  function test_revertWhen_invalidSupplyAmount() external {
    vm.prank(founder);
    vm.expectRevert(Prepay__InvalidSupplyAmount.selector);
    prepayFacet.prepayMembership(0);
  }

  function test_revertWhen_msgValueIsNotEqualToCost()
    external
    givenMembershipHasPrice
  {
    vm.prank(founder);
    vm.expectRevert(Prepay__InvalidAmount.selector);
    prepayFacet.prepayMembership(1);
  }

  // =============================================================
  //                           Integration
  // =============================================================

  /**
   * Scenario:
   *  - Founder prepays 1 membership
   *  - Alice mints a membership
   *  - Bob tries to mint a membership but fails
   */
  function test_integration_prepayMembership()
    external
    givenMembershipHasPrice
    givenFounderHasPrepaid(1)
  {
    // Alice mints a membership
    vm.prank(alice);
    membership.joinSpace(alice);

    // Bob tries to mint a membership but fails
    vm.prank(charlie);
    vm.expectRevert(Membership__InsufficientPayment.selector);
    membership.joinSpace(charlie);
  }
}
