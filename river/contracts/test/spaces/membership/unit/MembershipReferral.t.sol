// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipReferralBase} from "contracts/src/spaces/facets/membership/referral/IMembershipReferral.sol";

// libraries
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

// contracts
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

contract MembershipReferralFacetTest is
  IMembershipReferralBase,
  MembershipBaseSetup
{
  function test_initialization() public {
    uint256 defaultCode = 123;
    uint16 defaultBps = 1000;
    assertEq(referrals.referralCodeBps(defaultCode), defaultBps);
  }

  // createReferralCode
  function test_createReferralCode() public {
    uint256 code = 245;
    uint16 bps = 1000;

    vm.prank(founder);
    referrals.createReferralCode(code, bps);

    assertEq(referrals.referralCodeBps(code), bps);
  }

  function test_createReferralCode_reverts_invalidCode() public {
    uint256 code = 245;
    vm.prank(founder);
    referrals.createReferralCode(code, 1000);

    vm.expectRevert(Membership__InvalidReferralCode.selector);
    vm.prank(founder);
    referrals.createReferralCode(code, 1000);
  }

  function test_createReferralCode_reverts_invalidBps() public {
    uint256 code = 245;
    uint16 invalidBps = uint16(BasisPoints.MAX_BPS) + 1;

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidReferralBps.selector);
    referrals.createReferralCode(code, invalidBps);
  }

  // createReferralCodeWithTime
  function test_createReferralCodeWithTime() public {
    uint256 code = 245;
    uint16 bps = 1000;
    uint256 startTime = block.timestamp + 10;
    uint256 endTime = block.timestamp + 100;

    vm.prank(founder);
    referrals.createReferralCodeWithTime(code, bps, startTime, endTime);

    assertEq(referrals.referralCodeBps(code), bps);
    assertEq(referrals.calculateReferralAmount(100 ether, code), 0);

    vm.warp(startTime);

    // 100 ether * 10% = 10 ether
    assertEq(
      referrals.calculateReferralAmount(100 ether, code),
      BasisPoints.calculate(100 ether, bps)
    );

    vm.warp(endTime + 1);

    assertEq(referrals.calculateReferralAmount(100 ether, code), 0);
  }

  // removeReferralCode
  function test_removeReferralCode() public {
    uint256 code = 246;
    uint16 bps = 500;

    vm.prank(founder);
    referrals.createReferralCode(code, bps);

    vm.prank(founder);
    referrals.removeReferralCode(code);

    assertEq(referrals.referralCodeBps(code), 0);
  }

  function test_removeReferralCode_non_existent() public {
    uint256 nonExistentCode = 999;

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidReferralCode.selector);
    referrals.removeReferralCode(nonExistentCode);
  }

  // calculateReferralAmount
  function test_calculateReferralAmount() public {
    uint256 referralCode = 248;
    uint16 bps = 800;
    uint256 membershipPrice = 100 ether;

    vm.prank(founder);
    referrals.createReferralCode(referralCode, bps);

    uint16 referralBps = referrals.referralCodeBps(referralCode);

    uint256 expectedReferralAmount = BasisPoints.calculate(
      membershipPrice,
      referralBps
    );

    assertEq(
      referrals.calculateReferralAmount(membershipPrice, referralCode),
      expectedReferralAmount
    );
  }

  function test_calculateReferralAmount_revert_invalid_code() public {
    uint256 invalidCode = 999;
    uint256 membershipPrice = 100 ether;

    assertEq(
      referrals.calculateReferralAmount(membershipPrice, invalidCode),
      0
    );
  }
}
