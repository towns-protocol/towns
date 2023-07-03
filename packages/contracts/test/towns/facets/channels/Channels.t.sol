// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IRole} from "contracts/src/towns/facets/roles/IRole.sol";
import {IRoleStructs} from "contracts/src/towns/facets/roles/IRole.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";

// libraries
import {ChannelService} from "contracts/src/towns/facets/channels/ChannelService.sol";

// contracts
import {TownTest} from "contracts/test/towns/Town.t.sol";

// errors
import {Validator__InvalidStringLength} from "contracts/src/utils/Validator.sol";

// solhint-disable-next-line max-line-length
import {ChannelService__ChannelAlreadyExists, ChannelService__RoleAlreadyExists, ChannelService__RoleDoesNotExist} from "contracts/src/towns/facets/channels/ChannelService.sol";
import {EntitlementsService__NotAllowed} from "contracts/src/towns/facets/entitlements/EntitlementsService.sol";

contract ChannelsTest is TownTest {
  IChannel internal channel;

  function setUp() public override {
    super.setUp();
    channel = IChannel(town);
  }

  function test_createChannel(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
  }

  function test_createChannel_with_multiple_roles(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = "Write";

    vm.prank(townOwner);
    uint256 roleId = IRole(town).createRole(
      "Member",
      permissions,
      new IRoleStructs.CreateEntitlement[](0)
    );

    vm.prank(townOwner);
    uint256 roleId2 = IRole(town).createRole(
      "AnotherMember",
      permissions,
      new IRoleStructs.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](2);
    roleIds[0] = roleId;
    roleIds[1] = roleId2;

    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, roleIds);

    IChannel.Channel memory _channel = channel.getChannel(channelId);
    assertEq(_channel.roleIds.length, roleIds.length);

    assertFalse(
      IEntitlements(town).isEntitledToTown(_randomAddress(), "Write")
    );

    assertFalse(
      IEntitlements(town).isEntitledToChannel(
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

    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));

    IChannel.Channel memory _channel = channel.getChannel(channelId);

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

    vm.prank(townOwner);
    uint256 roleId = IRole(town).createRole(
      "Member",
      new string[](0),
      new IRoleStructs.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, roleIds);

    IChannel.Channel memory _channel = channel.getChannel(channelId);
    assertEq(_channel.roleIds.length, roleIds.length);
  }

  function test_getChannels(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));

    IChannel.Channel[] memory _channels = channel.getChannels();

    assertEq(_channels.length, 1);
  }

  function test_getChannels_with_multiple_channels() public {
    string memory channelName1 = "Channel1";
    string memory channelId1 = "Id1";
    string memory channelName2 = "Channel2";
    string memory channelId2 = "Id2";

    vm.startPrank(townOwner);
    channel.createChannel(channelName1, channelId1, new uint256[](0));
    channel.createChannel(channelName2, channelId2, new uint256[](0));
    vm.stopPrank();

    IChannel.Channel[] memory _channels = channel.getChannels();
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

    vm.startPrank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
    channel.updateChannel(channelId, newMetadata, false);
    vm.stopPrank();

    IChannel.Channel memory _channel = channel.getChannel(channelId);

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

    vm.startPrank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
    channel.updateChannel(channelId, channelMetadata, true);
    vm.stopPrank();

    IChannel.Channel memory _channel = channel.getChannel(channelId);
    assertTrue(_channel.disabled);
  }

  function test_removeChannel(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
    channel.removeChannel(channelId);
    vm.stopPrank();

    IChannel.Channel[] memory _channels = channel.getChannels();
    assertEq(_channels.length, 0);
  }

  function test_addRoleToChannel(
    string memory channelMetadata,
    string memory channelId,
    uint256 roleId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
    channel.addRoleToChannel(channelId, roleId);
    vm.stopPrank();

    IChannel.Channel memory _channel = channel.getChannel(channelId);

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

    vm.startPrank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
    channel.addRoleToChannel(channelId, roleId);
    vm.stopPrank();

    vm.prank(townOwner);
    vm.expectRevert(ChannelService__RoleAlreadyExists.selector);
    channel.addRoleToChannel(channelId, roleId);
  }

  function test_removeRoleFromChannel(
    string memory channelMetadata,
    string memory channelId,
    uint256 roleId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.startPrank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
    channel.addRoleToChannel(channelId, roleId);
    channel.removeRoleFromChannel(channelId, roleId);
    vm.stopPrank();

    IChannel.Channel memory _channel = channel.getChannel(channelId);

    assertEq(_channel.roleIds.length, 0);
  }

  function test_removeRoleFromChannel_nonexistent_role(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    uint256 nonexistentRoleId = 12345; // An ID that doesn't belong to any role

    vm.startPrank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
    vm.stopPrank();

    vm.prank(townOwner);
    vm.expectRevert(ChannelService__RoleDoesNotExist.selector);
    channel.removeRoleFromChannel(channelId, nonexistentRoleId);
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

    vm.expectRevert(EntitlementsService__NotAllowed.selector);

    vm.prank(_randomAddress());
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
  }

  function test_createChannel_reverts_when_channelId_too_short(
    string memory channelMetadata
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);

    string memory channelId = "";

    vm.expectRevert(Validator__InvalidStringLength.selector);
    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
  }

  function test_createChannel_reverts_when_channel_exists(
    string memory channelMetadata,
    string memory channelId
  ) public {
    vm.assume(bytes(channelMetadata).length > 2);
    vm.assume(bytes(channelId).length > 2);

    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));

    vm.expectRevert(ChannelService__ChannelAlreadyExists.selector);

    vm.prank(townOwner);
    channel.createChannel(channelId, channelMetadata, new uint256[](0));
  }
}
