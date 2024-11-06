// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";

//libraries
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

//contracts

contract MembershipWithdraw is MembershipBaseSetup {
  function test_withdraw()
    external
    givenMembershipHasPrice
    givenAliceHasPaidMembership
  {
    address multisig = _randomAddress();
    uint256 protocolFee = BasisPoints.calculate(
      MEMBERSHIP_PRICE,
      IPlatformRequirements(spaceFactory).getMembershipBps()
    );

    vm.prank(founder);
    membership.withdraw(multisig);

    assertEq(multisig.balance, MEMBERSHIP_PRICE - protocolFee);
  }

  function test_revertWhen_withdrawNotOwner() external {
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    membership.withdraw(alice);
  }

  function test_revertWhen_withdrawInvalidAddress()
    external
    givenFounderIsCaller
  {
    vm.expectRevert(Membership__InvalidAddress.selector);
    membership.withdraw(address(0));
  }

  function test_revertWhen_withdrawZeroBalance() external givenFounderIsCaller {
    vm.expectRevert(Membership__InsufficientPayment.selector);
    membership.withdraw(founder);
  }

  // Integration
  // test withdraw a second time
  function test_withdrawSecondTime()
    external
    givenMembershipHasPrice
    givenAliceHasPaidMembership
  {
    vm.prank(founder);
    membership.withdraw(founder);

    uint256 protocolFee = BasisPoints.calculate(
      MEMBERSHIP_PRICE,
      IPlatformRequirements(spaceFactory).getMembershipBps()
    );

    uint256 expectedBalance = MEMBERSHIP_PRICE - protocolFee;

    assertEq(founder.balance, expectedBalance);

    vm.startPrank(charlie);
    vm.deal(charlie, MEMBERSHIP_PRICE);
    membership.joinSpace{value: MEMBERSHIP_PRICE}(charlie);
    assertEq(membershipToken.balanceOf(charlie), 1);
    vm.stopPrank();

    vm.prank(founder);
    membership.withdraw(founder);

    assertEq(founder.balance, expectedBalance * 2);
  }
}
