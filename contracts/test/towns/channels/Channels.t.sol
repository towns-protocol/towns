// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils

//interfaces
import {IRoles} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/towns/facets/entitlements/IEntitlementsManager.sol";
import {IEntitlementBase} from "contracts/src/towns/entitlements/IEntitlement.sol";

//libraries

//contracts
import {ChannelsSetup} from "./ChannelsSetup.sol";

// errors
import {Validator__InvalidStringLength} from "contracts/src/utils/Validator.sol";

// solhint-disable-next-line max-line-length
import {ChannelService__ChannelAlreadyExists, ChannelService__RoleAlreadyExists, ChannelService__RoleDoesNotExist} from "contracts/src/towns/facets/channels/ChannelService.sol";

contract ChannelsTest is ChannelsSetup, IEntitlementBase {
  function test_createChannel(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
  }

  function test_revert_createChannel_with_duplicate_role(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = "Write";

    vm.prank(founder);
    uint256 roleId = IRoles(diamond).createRole(
      "Member",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](2);
    roleIds[0] = roleId;
    roleIds[1] = roleId;

    vm.prank(founder);
    vm.expectRevert(ChannelService__RoleAlreadyExists.selector);
    channels.createChannel(channelId, channelMetadata, roleIds);
  }

  function test_createChannel_with_multiple_roles(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = "Write";

    vm.prank(founder);
    uint256 roleId = IRoles(diamond).createRole(
      "Member",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    vm.prank(founder);
    uint256 roleId2 = IRoles(diamond).createRole(
      "AnotherMember",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](2);
    roleIds[0] = roleId;
    roleIds[1] = roleId2;

    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, roleIds);

    IChannel.Channel memory _channel = channels.getChannel(channelId);
    assertEq(_channel.roleIds.length, roleIds.length);

    assertFalse(
      IEntitlementsManager(diamond).isEntitledToTown(_randomAddress(), "Write")
    );

    assertFalse(
      IEntitlementsManager(diamond).isEntitledToChannel(
        channelId,
        _randomAddress(),
        "Write"
      )
    );
  }

  function test_getChannel(
    string memory channelId,
    string memory channelMetadata
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));

    IChannel.Channel memory _channel = channels.getChannel(channelId);

    assertEq(_channel.id, channelId);
    assertEq(_channel.disabled, false);
    assertEq(_channel.metadata, channelMetadata);
    assertEq(_channel.roleIds.length, 0);
  }

  function test_getChannel_with_roles(
    string memory channelId,
    string memory channelMetadata
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(founder);
    uint256 roleId = IRoles(diamond).createRole(
      "Member",
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, roleIds);

    IChannel.Channel memory _channel = channels.getChannel(channelId);
    assertEq(_channel.roleIds.length, roleIds.length);
  }

  function test_getChannels(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));

    IChannel.Channel[] memory _channels = channels.getChannels();

    assertEq(_channels.length, 1);
  }

  function test_getChannels_with_multiple_channels() public {
    string memory channelName1 = "Channel1";
    string memory channelId1 = "Id1";
    string memory channelName2 = "Channel2";
    string memory channelId2 = "Id2";

    vm.startPrank(founder);
    channels.createChannel(channelName1, channelId1, new uint256[](0));
    channels.createChannel(channelName2, channelId2, new uint256[](0));
    vm.stopPrank();

    IChannel.Channel[] memory _channels = channels.getChannels();
    assertEq(_channels.length, 2);
  }

  function test_updateChannel(
    string memory channelMetadata,
    string memory channelId,
    string memory newMetadata
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);
    vm.assume(bytes(newMetadata).length > 2);

    vm.startPrank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
    channels.updateChannel(channelId, newMetadata, false);
    vm.stopPrank();

    IChannel.Channel memory _channel = channels.getChannel(channelId);

    assertEq(_channel.metadata, newMetadata);
    assertEq(_channel.id, channelId);
    assertEq(_channel.disabled, false);
  }

  function test_updateChannel_disable_channel(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
    channels.updateChannel(channelId, channelMetadata, true);
    vm.stopPrank();

    IChannel.Channel memory _channel = channels.getChannel(channelId);
    assertTrue(_channel.disabled);
  }

  function test_removeChannel(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
    channels.removeChannel(channelId);
    vm.stopPrank();

    IChannel.Channel[] memory _channels = channels.getChannels();
    assertEq(_channels.length, 0);
  }

  function test_addRoleToChannel(
    string memory channelMetadata,
    string memory channelId,
    uint256 roleId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
    channels.addRoleToChannel(channelId, roleId);
    vm.stopPrank();

    IChannel.Channel memory _channel = channels.getChannel(channelId);

    assertEq(_channel.roleIds.length, 1);
    assertEq(_channel.roleIds[0], roleId);
  }

  function test_addRoleToChannel_existing_role(
    string memory channelMetadata,
    string memory channelId,
    uint256 roleId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
    channels.addRoleToChannel(channelId, roleId);
    vm.stopPrank();

    vm.prank(founder);
    vm.expectRevert(ChannelService__RoleAlreadyExists.selector);
    channels.addRoleToChannel(channelId, roleId);
  }

  function test_removeRoleFromChannel(
    string memory channelMetadata,
    string memory channelId,
    uint256 roleId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
    channels.addRoleToChannel(channelId, roleId);
    channels.removeRoleFromChannel(channelId, roleId);
    vm.stopPrank();

    IChannel.Channel memory _channel = channels.getChannel(channelId);

    assertEq(_channel.roleIds.length, 0);
  }

  function test_removeRoleFromChannel_nonexistent_role(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    uint256 nonexistentRoleId = 12345; // An ID that doesn't belong to any role

    vm.startPrank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
    vm.stopPrank();

    vm.prank(founder);
    vm.expectRevert(ChannelService__RoleDoesNotExist.selector);
    channels.removeRoleFromChannel(channelId, nonexistentRoleId);
  }

  // =============================================================
  //                           Reverts
  // =============================================================

  function test_createChannel_reverts_when_not_allowed(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.expectRevert(Entitlement__NotAllowed.selector);

    vm.prank(_randomAddress());
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
  }

  function test_createChannel_reverts_when_channelId_too_short(
    string memory channelMetadata
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);

    string memory channelId = "";

    vm.expectRevert(Validator__InvalidStringLength.selector);
    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
  }

  function test_createChannel_reverts_when_channel_exists(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));

    vm.expectRevert(ChannelService__ChannelAlreadyExists.selector);

    vm.prank(founder);
    channels.createChannel(channelId, channelMetadata, new uint256[](0));
  }
}
