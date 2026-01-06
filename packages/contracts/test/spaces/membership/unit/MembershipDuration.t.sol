// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

// interfaces
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";

// libraries
import {Factory} from "src/utils/libraries/Factory.sol";
// contracts
import {CreateSpaceFacet} from "src/factory/facets/create/CreateSpace.sol";
import {MembershipFacet} from "src/spaces/facets/membership/MembershipFacet.sol";

contract MembershipDurationTest is MembershipBaseSetup {
    uint64 CUSTOM_DURATION = 20 days;

    function test_getMembershipDuration() public view {
        uint256 duration = membership.getMembershipDuration();
        assertEq(duration, platformReqs.getMembershipDuration());
    }

    function test_createSpaceWithCustomDuration() public returns (address) {
        address[] memory allowedUsers = new address[](2);
        allowedUsers[0] = alice;
        allowedUsers[1] = charlie;

        IArchitectBase.SpaceInfo memory customDurationSpace = _createUserSpaceInfo(
            "CustomDurationSpace",
            allowedUsers
        );
        customDurationSpace.membership.settings.duration = CUSTOM_DURATION;
        customDurationSpace.membership.settings.pricingModule = pricingModule;
        customDurationSpace.membership.settings.freeAllocation = FREE_ALLOCATION;

        vm.prank(founder);
        address _spaceAddress = CreateSpaceFacet(spaceFactory).createSpace(customDurationSpace);

        IMembership space = IMembership(_spaceAddress);
        assertEq(space.getMembershipDuration(), CUSTOM_DURATION);

        return _spaceAddress;
    }

    function test_joinSpaceWithCustomDuration() public {
        address spaceAddress = test_createSpaceWithCustomDuration();
        IMembership _membership = IMembership(spaceAddress);

        vm.prank(alice);
        _membership.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(spaceAddress).tokensOfOwner(alice)[0];
        assertEq(_membership.expiresAt(tokenId), block.timestamp + CUSTOM_DURATION);
    }

    function test_setMembershipDuration() public {
        uint64 newDuration = 40 days;

        // Set membership duration
        vm.prank(founder);
        MembershipFacet(userSpace).setMembershipDuration(newDuration);

        // Verify the duration was set
        assertEq(membership.getMembershipDuration(), newDuration);

        // Test that future mints use the new duration
        vm.prank(alice);
        membership.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(userSpace).tokensOfOwner(alice)[0];
        assertEq(membership.expiresAt(tokenId), block.timestamp + newDuration);
    }

    function test_updateMembershipDuration() public {
        uint64 newDuration = 30 days;

        // Check initial duration
        uint64 initialDuration = membership.getMembershipDuration();
        assertEq(initialDuration, platformReqs.getMembershipDuration());

        // Update duration as owner
        vm.prank(founder);
        MembershipFacet(userSpace).setMembershipDuration(newDuration);

        // Verify duration was updated
        uint64 updatedDuration = membership.getMembershipDuration();
        assertEq(updatedDuration, newDuration);

        // Verify tokens minted after update use new duration
        vm.prank(alice);
        membership.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(userSpace).tokensOfOwner(alice)[0];
        assertEq(membership.expiresAt(tokenId), block.timestamp + newDuration);
    }

    function test_renewMembershipWithUpdatedDuration() public {
        // Create a space with initial duration
        address spaceAddress = test_createSpaceWithCustomDuration();
        IMembership space = IMembership(spaceAddress);

        // Alice joins the space
        vm.prank(alice);
        space.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(spaceAddress).tokensOfOwner(alice)[0];
        uint256 initialExpiry = space.expiresAt(tokenId);
        assertEq(initialExpiry, block.timestamp + CUSTOM_DURATION);

        // Fast forward to near expiration
        vm.warp(block.timestamp + CUSTOM_DURATION - 1 days);

        // Update duration as owner
        uint64 newDuration = 60 days;
        vm.prank(founder);
        MembershipFacet(spaceAddress).setMembershipDuration(newDuration);

        // Renew the membership
        uint256 renewalPrice = space.getMembershipRenewalPrice(tokenId);

        hoax(alice, renewalPrice);
        space.renewMembership{value: renewalPrice}(tokenId);

        // Verify new expiration reflects updated duration
        // Current expiry (near original end) + new duration
        uint256 expectedNewExpiry = initialExpiry + newDuration;
        assertEq(space.expiresAt(tokenId), expectedNewExpiry);
    }

    function test_revertWhen_createSpaceWithTooLargeDuration() public {
        address[] memory allowedUsers = new address[](2);
        allowedUsers[0] = alice;
        allowedUsers[1] = charlie;

        // Get the max duration from platform requirements
        uint64 maxDuration = platformReqs.getMembershipDuration();
        uint64 tooLargeDuration = maxDuration + 1 days;

        IArchitectBase.SpaceInfo memory invalidDurationSpace = _createUserSpaceInfo(
            "InvalidDurationSpace",
            allowedUsers
        );
        invalidDurationSpace.membership.settings.duration = tooLargeDuration;
        invalidDurationSpace.membership.settings.pricingModule = pricingModule;

        // Expect revert when creating space with duration exceeding platform limits
        vm.prank(founder);
        vm.expectRevert(
            abi.encodeWithSelector(
                Factory.Factory__FailedDeployment.selector,
                abi.encodeWithSelector(Membership__InvalidDuration.selector)
            )
        );
        CreateSpaceFacet(spaceFactory).createSpace(invalidDurationSpace);
    }

    function test_revertWhen_updateDurationExceedingMaximum() public {
        // Get the max duration from platform requirements
        uint64 maxDuration = platformReqs.getMembershipDuration();
        uint64 tooLargeDuration = maxDuration + 1 days;

        // Expect revert when setting duration exceeding platform limits
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidDuration.selector);
        MembershipFacet(userSpace).setMembershipDuration(tooLargeDuration);
    }

    function test_revertWhen_unauthorizedDurationUpdate() public {
        uint64 newDuration = 30 days;

        // Attempt to update duration as non-owner (alice)
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, alice));
        MembershipFacet(userSpace).setMembershipDuration(newDuration);

        // Verify duration did not change
        uint64 currentDuration = membership.getMembershipDuration();
        assertEq(currentDuration, platformReqs.getMembershipDuration());
    }

    function test_multipleRenewals() public {
        // Create a space with custom duration
        address spaceAddress = test_createSpaceWithCustomDuration();
        IMembership space = IMembership(spaceAddress);

        // Alice joins the space
        vm.prank(alice);
        space.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(spaceAddress).tokensOfOwner(alice)[0];
        uint256 initialExpiry = space.expiresAt(tokenId);

        // First renewal
        uint256 renewalPrice = space.getMembershipRenewalPrice(tokenId);

        hoax(alice, renewalPrice);
        space.renewMembership{value: renewalPrice}(tokenId);

        uint256 firstRenewalExpiry = space.expiresAt(tokenId);
        assertEq(firstRenewalExpiry, initialExpiry + CUSTOM_DURATION);

        hoax(alice, renewalPrice);
        space.renewMembership{value: renewalPrice}(tokenId);

        uint256 secondRenewalExpiry = space.expiresAt(tokenId);
        assertEq(secondRenewalExpiry, firstRenewalExpiry + CUSTOM_DURATION);
    }

    function test_revertWhen_setMembershipZeroDuration() public {
        uint64 zeroDuration = 0;

        // Try to set duration to zero (should fail or fallback to platform default)
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidDuration.selector);
        MembershipFacet(userSpace).setMembershipDuration(zeroDuration);
    }

    function test_renewMembershipAfterExpiration() public {
        // Create a space with custom duration
        address spaceAddress = test_createSpaceWithCustomDuration();
        IMembership space = IMembership(spaceAddress);

        // Alice joins the space
        vm.prank(alice);
        space.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(spaceAddress).tokensOfOwner(alice)[0];
        uint256 initialExpiry = space.expiresAt(tokenId);

        // Fast forward past expiration
        vm.warp(initialExpiry + 1);

        // Renew the membership after it has expired
        uint256 renewalPrice = space.getMembershipRenewalPrice(tokenId);

        hoax(alice, renewalPrice);
        space.renewMembership{value: renewalPrice}(tokenId);

        // Expired memberships renew from current time + duration
        uint256 expectedNewExpiry = block.timestamp + CUSTOM_DURATION;

        // Verify the new expiration is based on current time + duration (not extending from the expired time)
        assertEq(space.expiresAt(tokenId), expectedNewExpiry);
    }

    function test_differentOwnerRenewal() public {
        // Create a space with custom duration
        address spaceAddress = test_createSpaceWithCustomDuration();
        IMembership space = IMembership(spaceAddress);

        // Alice joins the space
        vm.prank(alice);
        space.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(spaceAddress).tokensOfOwner(alice)[0];

        // Another user (charlie) attempts to renew Alice's membership
        uint256 renewalPrice = space.getMembershipRenewalPrice(tokenId);

        // Renewal should work since anyone should be able to pay for someone's membership
        hoax(charlie, renewalPrice);
        space.renewMembership{value: renewalPrice}(tokenId);

        // Verify the membership was renewed correctly
        assertEq(space.expiresAt(tokenId), block.timestamp + CUSTOM_DURATION * 2);
    }

    function test_updateDurationAndRenewalInteraction() public {
        // Create a space with initial duration
        address spaceAddress = test_createSpaceWithCustomDuration();
        IMembership space = IMembership(spaceAddress);

        // Alice joins the space
        vm.prank(alice);
        space.joinSpace(alice);

        uint256 tokenId = IERC721AQueryable(spaceAddress).tokensOfOwner(alice)[0];
        uint256 initialExpiry = space.expiresAt(tokenId);

        // Update duration multiple times
        uint64 newDuration1 = 30 days;
        uint64 newDuration2 = 15 days;

        // First update
        vm.prank(founder);
        MembershipFacet(spaceAddress).setMembershipDuration(newDuration1);

        // Assert alice's membership duration is the same
        assertEq(space.expiresAt(tokenId), initialExpiry);

        // First renewal
        uint256 renewalPrice = space.getMembershipRenewalPrice(tokenId);
        vm.deal(alice, renewalPrice);

        vm.prank(alice);
        space.renewMembership{value: renewalPrice}(tokenId);

        uint256 firstRenewalExpiry = space.expiresAt(tokenId);
        assertEq(firstRenewalExpiry, initialExpiry + newDuration1);

        // Second update
        vm.prank(founder);
        MembershipFacet(spaceAddress).setMembershipDuration(newDuration2);

        renewalPrice = space.getMembershipRenewalPrice(tokenId);
        hoax(alice, renewalPrice);
        space.renewMembership{value: renewalPrice}(tokenId);

        uint256 secondRenewalExpiry = space.expiresAt(tokenId);
        assertEq(secondRenewalExpiry, firstRenewalExpiry + newDuration2);
    }
}
