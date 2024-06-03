// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils

//interfaces
import {IPlatformRequirementsBase} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

//libraries

//contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {PlatformRequirementsFacet} from "contracts/src/factory/facets/platform/requirements/PlatformRequirementsFacet.sol";

contract PlatformRequirementsTest is
  BaseSetup,
  IPlatformRequirementsBase,
  IOwnableBase
{
  PlatformRequirementsFacet internal platformReqs;

  function setUp() public override {
    super.setUp();

    platformReqs = PlatformRequirementsFacet(spaceFactory);
  }

  // Fee Recipient
  function test_getFeeRecipient() public {
    address feeRecipient = platformReqs.getFeeRecipient();
    assertEq(feeRecipient, address(deployer));
  }

  function test_setFeeRecipient() public {
    address newFeeRecipient = _randomAddress();

    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    platformReqs.setFeeRecipient(newFeeRecipient);

    vm.prank(deployer);
    vm.expectEmit(true, true, true, true);
    emit PlatformFeeRecipientSet(newFeeRecipient);
    platformReqs.setFeeRecipient(newFeeRecipient);

    address feeRecipient = platformReqs.getFeeRecipient();
    assertEq(feeRecipient, newFeeRecipient);
  }

  // Membership BPS

  function test_getMembershipBps() public {
    uint16 membershipBps = platformReqs.getMembershipBps();
    assertEq(membershipBps, 500);
  }

  function test_setMembershipBps() public {
    uint16 newMembershipBps = 1_000;

    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    platformReqs.setMembershipBps(newMembershipBps);

    vm.expectRevert(Platform__InvalidMembershipBps.selector);
    vm.prank(deployer);
    platformReqs.setMembershipBps(10_001);

    vm.prank(deployer);
    vm.expectEmit(true, true, true, true);
    emit PlatformMembershipBpsSet(newMembershipBps);
    platformReqs.setMembershipBps(newMembershipBps);

    uint16 membershipBps = platformReqs.getMembershipBps();
    assertEq(membershipBps, newMembershipBps);
  }

  // Membership Fee

  function test_getMembershipFee() public {
    uint256 membershipFee = platformReqs.getMembershipFee();
    assertEq(membershipFee, 0.005 ether);
  }

  function test_setMembershipFee() public {
    uint256 newMembershipFee = 1_000;

    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    platformReqs.setMembershipFee(newMembershipFee);

    vm.prank(deployer);
    vm.expectEmit(true, true, true, true);
    emit PlatformMembershipFeeSet(newMembershipFee);
    platformReqs.setMembershipFee(newMembershipFee);

    uint256 membershipFee = platformReqs.getMembershipFee();
    assertEq(membershipFee, newMembershipFee);
  }

  // Membership Mint Limit

  function test_getMembershipMintLimit() public {
    uint256 membershipMintLimit = platformReqs.getMembershipMintLimit();
    assertEq(membershipMintLimit, 1_000);
  }

  function test_setMembershipMintLimit() public {
    uint256 newMembershipMintLimit = 2_000;

    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    platformReqs.setMembershipMintLimit(newMembershipMintLimit);

    vm.expectRevert(Platform__InvalidMembershipMintLimit.selector);
    vm.prank(deployer);
    platformReqs.setMembershipMintLimit(0);

    vm.prank(deployer);
    vm.expectEmit(true, true, true, true);
    emit PlatformMembershipMintLimitSet(newMembershipMintLimit);
    platformReqs.setMembershipMintLimit(newMembershipMintLimit);

    uint256 membershipMintLimit = platformReqs.getMembershipMintLimit();
    assertEq(membershipMintLimit, newMembershipMintLimit);
  }

  // Membership Duration

  function test_getMembershipDuration() public {
    uint256 membershipDuration = platformReqs.getMembershipDuration();
    assertEq(membershipDuration, 365 days);
  }

  function test_setMembershipDuration() public {
    uint64 newMembershipDuration = 1 days;

    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    platformReqs.setMembershipDuration(newMembershipDuration);

    vm.expectRevert(Platform__InvalidMembershipDuration.selector);
    vm.prank(deployer);
    platformReqs.setMembershipDuration(0);

    vm.prank(deployer);
    vm.expectEmit(true, true, true, true);
    emit PlatformMembershipDurationSet(newMembershipDuration);
    platformReqs.setMembershipDuration(newMembershipDuration);

    uint64 membershipDuration = platformReqs.getMembershipDuration();
    assertEq(membershipDuration, newMembershipDuration);
  }
}
