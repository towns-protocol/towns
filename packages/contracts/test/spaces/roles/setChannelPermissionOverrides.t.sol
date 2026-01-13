// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

import {Permissions} from "src/spaces/facets/Permissions.sol";
import {IChannelBase} from "src/spaces/facets/channels/IChannel.sol";

// contracts
import {RolesBaseSetup} from "test/spaces/roles/RolesBaseSetup.sol";

// mocks

contract RolesTestSetChannelPermissionsOverrides is RolesBaseSetup {
    // =============================================================
    // Channel Permissions
    // =============================================================
    function test_setChannelPermissionOverrides() external givenRoleExists givenRoleIsInChannel {
        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.Read;

        vm.prank(founder);
        roles.setChannelPermissionOverrides(ROLE_ID, CHANNEL_ID, permissions);

        // get the channel permissions
        string[] memory channelPermissions = roles.getChannelPermissionOverrides(
            ROLE_ID,
            CHANNEL_ID
        );

        assertEq(channelPermissions.length, 1);
        assertEq(channelPermissions[0], permissions[0]);
    }

    function test_revertWhen_setChannelPermissionOverrideInvalidPermission() external {
        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.Read;

        vm.prank(_randomAddress());
        vm.expectRevert(Entitlement__NotAllowed.selector);
        roles.setChannelPermissionOverrides(ROLE_ID, CHANNEL_ID, permissions);
    }

    function test_revertWhen_setChannelPermissionOverrideChannelDoesNotExist()
        external
        givenRoleExists
    {
        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.Read;

        vm.prank(founder);
        vm.expectRevert(IChannelBase.ChannelService__ChannelDoesNotExist.selector);
        roles.setChannelPermissionOverrides(ROLE_ID, CHANNEL_ID, permissions);
    }

    function test_revertWhen_setChannelPermissionOverrideRoleDoesNotExist()
        external
        givenRoleExists
        givenRoleIsInChannel
    {
        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.Read;

        vm.prank(founder);
        vm.expectRevert(Roles__RoleDoesNotExist.selector);
        roles.setChannelPermissionOverrides(_randomUint256(), CHANNEL_ID, permissions);
    }
}
