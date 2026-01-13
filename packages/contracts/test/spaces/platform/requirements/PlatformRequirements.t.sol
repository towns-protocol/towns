// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils

// interfaces

import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPlatformRequirementsBase} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries

// contracts

import {PlatformRequirementsFacet} from "src/factory/facets/platform/requirements/PlatformRequirementsFacet.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

contract PlatformRequirementsTest is BaseSetup, IPlatformRequirementsBase, IOwnableBase {
    PlatformRequirementsFacet internal platformReqs;

    function setUp() public override {
        super.setUp();

        platformReqs = PlatformRequirementsFacet(spaceFactory);
    }

    // Fee Recipient
    function test_getFeeRecipient() public view {
        address feeRecipient = platformReqs.getFeeRecipient();
        assertEq(feeRecipient, address(deployer));
    }

    function test_setFeeRecipient() public {
        address newFeeRecipient = _randomAddress();

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setFeeRecipient(newFeeRecipient);

        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit PlatformFeeRecipientSet(newFeeRecipient);
        platformReqs.setFeeRecipient(newFeeRecipient);

        address feeRecipient = platformReqs.getFeeRecipient();
        assertEq(feeRecipient, newFeeRecipient);
    }

    // Membership BPS

    function test_getMembershipBps() public view {
        uint16 membershipBps = platformReqs.getMembershipBps();
        assertEq(membershipBps, 1000);
    }

    function test_setMembershipBps() public {
        uint16 newMembershipBps = 1000;

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setMembershipBps(newMembershipBps);

        vm.expectRevert(Platform__InvalidMembershipBps.selector);
        vm.prank(deployer);
        platformReqs.setMembershipBps(10_001);

        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit PlatformMembershipBpsSet(newMembershipBps);
        platformReqs.setMembershipBps(newMembershipBps);

        uint16 membershipBps = platformReqs.getMembershipBps();
        assertEq(membershipBps, newMembershipBps);
    }

    // Membership Fee
    function test_getMembershipFee() public view {
        uint256 membershipFee = platformReqs.getMembershipFee();
        assertEq(membershipFee, 0.0005 ether);
    }

    function test_MembershipFee_lessThanMinPrice() public view {
        uint256 membershipMinPrice = platformReqs.getMembershipMinPrice();
        assertLt(platformReqs.getMembershipFee(), membershipMinPrice);
    }

    function test_setMembershipFee() public {
        uint256 newMembershipFee = 1000;

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setMembershipFee(newMembershipFee);

        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit PlatformMembershipFeeSet(newMembershipFee);
        platformReqs.setMembershipFee(newMembershipFee);

        uint256 membershipFee = platformReqs.getMembershipFee();
        assertEq(membershipFee, newMembershipFee);
    }

    // Membership Mint Limit
    function test_getMembershipMintLimit() public view {
        uint256 membershipMintLimit = platformReqs.getMembershipMintLimit();
        assertEq(membershipMintLimit, 1000);
    }

    function test_setMembershipMintLimit() public {
        uint256 newMembershipMintLimit = 2000;

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setMembershipMintLimit(newMembershipMintLimit);

        vm.expectRevert(Platform__InvalidMembershipMintLimit.selector);
        vm.prank(deployer);
        platformReqs.setMembershipMintLimit(0);

        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit PlatformMembershipMintLimitSet(newMembershipMintLimit);
        platformReqs.setMembershipMintLimit(newMembershipMintLimit);

        uint256 membershipMintLimit = platformReqs.getMembershipMintLimit();
        assertEq(membershipMintLimit, newMembershipMintLimit);
    }

    // Membership Duration

    function test_getMembershipDuration() public view {
        uint256 membershipDuration = platformReqs.getMembershipDuration();
        assertEq(membershipDuration, 365 days);
    }

    function test_setMembershipDuration() public {
        uint64 newMembershipDuration = 1 days;

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setMembershipDuration(newMembershipDuration);

        vm.expectRevert(Platform__InvalidMembershipDuration.selector);
        vm.prank(deployer);
        platformReqs.setMembershipDuration(0);

        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit PlatformMembershipDurationSet(newMembershipDuration);
        platformReqs.setMembershipDuration(newMembershipDuration);

        uint64 membershipDuration = platformReqs.getMembershipDuration();
        assertEq(membershipDuration, newMembershipDuration);
    }

    // Membership Min Price
    function test_setMembershipMinPrice() external {
        uint256 newMembershipMinPrice = 0.001 ether;

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setMembershipMinPrice(newMembershipMinPrice);

        vm.expectRevert(Platform__InvalidMembershipMinPrice.selector);
        vm.prank(deployer);
        platformReqs.setMembershipMinPrice(0);

        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit PlatformMembershipMinPriceSet(newMembershipMinPrice);
        platformReqs.setMembershipMinPrice(newMembershipMinPrice);

        uint256 membershipMinPrice = platformReqs.getMembershipMinPrice();
        assertEq(membershipMinPrice, newMembershipMinPrice);
    }

    // Swap Fees
    function test_getSwapFees() public view {
        (uint16 treasuryBps, uint16 posterBps) = platformReqs.getSwapFees();
        assertEq(treasuryBps, 0);
        assertEq(posterBps, 0);
    }

    function test_setSwapFees_revertIf_notOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setSwapFees(100, 200);
    }

    function test_setSwapFees_revertIf_bpsExceedsMax() public {
        vm.startPrank(deployer);
        vm.expectRevert(Platform__InvalidSwapFeeBps.selector);
        platformReqs.setSwapFees(10_001, 100);

        vm.expectRevert(Platform__InvalidSwapFeeBps.selector);
        platformReqs.setSwapFees(100, 10_001);
        vm.stopPrank();
    }

    function test_fuzz_setSwapFees(uint16 treasuryBps, uint16 posterBps) public {
        treasuryBps = uint16(bound(treasuryBps, 0, 10_000));
        posterBps = uint16(bound(posterBps, 0, 10_000));

        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit PlatformSwapFeesSet(treasuryBps, posterBps);
        platformReqs.setSwapFees(treasuryBps, posterBps);

        (uint16 newTreasuryBps, uint16 newPosterBps) = platformReqs.getSwapFees();
        assertEq(newTreasuryBps, treasuryBps);
        assertEq(newPosterBps, posterBps);
    }

    // Router Whitelist
    function test_isRouterWhitelisted() public view {
        address router = _randomAddress();
        assertFalse(platformReqs.isRouterWhitelisted(router));
    }

    function test_setRouterWhitelisted_revertIf_notOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        platformReqs.setRouterWhitelisted(address(1), true);
    }

    function test_fuzz_setRouterWhitelisted(address router, bool whitelisted) public {
        vm.prank(deployer);
        vm.expectEmit(spaceFactory);
        emit RouterWhitelistUpdated(router, whitelisted);
        platformReqs.setRouterWhitelisted(router, whitelisted);
        assertEq(platformReqs.isRouterWhitelisted(router), whitelisted);
    }
}
