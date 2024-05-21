// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";

//libraries
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

//contracts

contract MembershipJoinSpaceReferral is MembershipBaseSetup {
  function test_joinSpaceWithReferral()
    external
    givenReferralCodeHasBeenCreated
    givenAliceHasMintedReferralMembership
  {
    assertEq(membership.balanceOf(alice), 1);
  }

  function test_joinSpaceWithPaidReferral()
    external
    givenMembershipHasPrice
    givenReferralCodeHasBeenCreated
    givenAliceHasPaidReferralMembership
  {
    assertEq(membership.balanceOf(alice), 1);

    address protocol = platformReqs.getFeeRecipient();
    uint256 protocolFee = BasisPoints.calculate(
      MEMBERSHIP_PRICE,
      IPlatformRequirements(spaceFactory).getMembershipBps()
    );

    assertEq(protocol.balance, protocolFee);

    uint256 netMembershipPrice = MEMBERSHIP_PRICE - protocolFee;

    uint16 referralBps = referrals.referralCodeBps(REFERRAL_CODE);
    uint256 referralFee = BasisPoints.calculate(
      netMembershipPrice,
      referralBps
    );

    assertEq(bob.balance, referralFee);
    assertEq(address(membership).balance, netMembershipPrice - referralFee);
  }
}
