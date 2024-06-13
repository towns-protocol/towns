// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils

//interfaces
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";

//libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

//contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

// solhint-disable-next-line max-line-length
import {ChannelService__ChannelAlreadyExists, ChannelService__RoleAlreadyExists, ChannelService__RoleDoesNotExist, ChannelService__ChannelDoesNotExist} from "contracts/src/spaces/facets/channels/ChannelService.sol";

contract ChannelsTest is BaseSetup, IEntitlementBase {
  function setUp() public override {
    super.setUp();
  }

  function test_createChannel() public {
    bytes32 channelId = "my-cool-channel";
    string memory channelMetadata = "Metadata";

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
  }

  function test_revert_createChannel_with_duplicate_role() public {
    bytes32 channelId = "my-cool-channel";
    string memory channelMetadata = "Metadata";

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Write;

    vm.prank(founder);
    uint256 roleId = IRoles(everyoneSpace).createRole(
      "Member",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](2);
    roleIds[0] = roleId;
    roleIds[1] = roleId;

    vm.prank(founder);
    vm.expectRevert(ChannelService__RoleAlreadyExists.selector);
    IChannel(everyoneSpace).createChannel(channelId, channelMetadata, roleIds);
  }

  function test_createChannel_with_multiple_roles() public {
    bytes32 channelId = "my-cool-channel";
    string memory channelMetadata = "Metadata";

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Write;

    vm.prank(founder);
    uint256 roleId = IRoles(space).createRole(
      "MemberTwo",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    vm.prank(founder);
    uint256 roleId2 = IRoles(space).createRole(
      "MemberThree",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](2);
    roleIds[0] = roleId;
    roleIds[1] = roleId2;

    vm.prank(founder);
    IChannel(space).createChannel(channelId, channelMetadata, roleIds);

    IChannel.Channel memory _channel = IChannel(space).getChannel(channelId);
    assertEq(_channel.roleIds.length, roleIds.length);

    assertFalse(
      IEntitlementsManager(space).isEntitledToSpace(
        _randomAddress(),
        Permissions.Write
      )
    );

    assertFalse(
      IEntitlementsManager(space).isEntitledToChannel(
        channelId,
        _randomAddress(),
        Permissions.Write
      )
    );
  }

  function test_getChannel() public {
    bytes32 channelId = "my-cool-channel";
    string memory channelMetadata = "Metadata";

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );

    IChannel.Channel memory _channel = IChannel(everyoneSpace).getChannel(
      channelId
    );

    assertEq(_channel.id, channelId);
    assertEq(_channel.disabled, false);
    assertEq(_channel.metadata, channelMetadata);
    assertEq(_channel.roleIds.length, 0);
  }

  function test_getChannel_with_roles() public {
    bytes32 channelId = "my-cool-channel";
    string memory channelMetadata = "Metadata";

    vm.prank(founder);
    uint256 roleId = IRoles(everyoneSpace).createRole(
      "Member",
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(channelId, channelMetadata, roleIds);

    IChannel.Channel memory _channel = IChannel(everyoneSpace).getChannel(
      channelId
    );
    assertEq(_channel.roleIds.length, roleIds.length);
  }

  function test_getChannels() public {
    bytes32 channelId = "my-cool-channel";
    string memory channelMetadata = "Metadata";

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );

    IChannel.Channel[] memory _channels = IChannel(everyoneSpace).getChannels();
    bytes32[] memory channelIds = new bytes32[](_channels.length);

    for (uint256 i = 0; i < _channels.length; i++) {
      channelIds[i] = _channels[i].id;
    }

    assertContains(channelIds, channelId);
  }

  function test_getChannels_with_multiple_channels() public {
    bytes32 channelId1 = "Id1";
    string memory channelName1 = "Channel1";

    bytes32 channelId2 = "Id2";
    string memory channelName2 = "Channel2";

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId1,
      channelName1,
      new uint256[](0)
    );
    IChannel(everyoneSpace).createChannel(
      channelId2,
      channelName2,
      new uint256[](0)
    );
    vm.stopPrank();

    IChannel.Channel[] memory _channels = IChannel(everyoneSpace).getChannels();
    bytes32[] memory channelIds = new bytes32[](_channels.length);
    for (uint256 i = 0; i < _channels.length; i++) {
      channelIds[i] = _channels[i].id;
    }

    assertContains(channelIds, channelId1);
    assertContains(channelIds, channelId2);
  }

  function test_updateChannel(
    string memory channelMetadata,
    string memory newMetadata
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);
    vm.assume(bytes(newMetadata).length > 2);

    bytes32 channelId = "my-cool-channel";

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
    IChannel(everyoneSpace).updateChannel(channelId, newMetadata, false);
    vm.stopPrank();

    IChannel.Channel memory _channel = IChannel(everyoneSpace).getChannel(
      channelId
    );

    assertEq(_channel.metadata, newMetadata);
    assertEq(_channel.id, channelId);
    assertEq(_channel.disabled, false);
  }

  function test_updateChannel_disable_channel(
    string memory channelMetadata
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "fooChannel";

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
    IChannel(everyoneSpace).updateChannel(channelId, channelMetadata, true);
    vm.stopPrank();

    IChannel.Channel memory _channel = IChannel(everyoneSpace).getChannel(
      channelId
    );
    assertTrue(_channel.disabled);
  }

  function test_removeChannel(string memory channelMetadata) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "fooChannel";

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
    IChannel(everyoneSpace).removeChannel(channelId);
    vm.stopPrank();

    vm.expectRevert(ChannelService__ChannelDoesNotExist.selector);
    IChannel(everyoneSpace).getChannel(channelId);
  }

  function test_addRoleToChannel(
    string memory channelMetadata,
    uint256 roleId
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "my-cool-channel";

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
    IChannel(everyoneSpace).addRoleToChannel(channelId, roleId);
    vm.stopPrank();

    IChannel.Channel memory _channel = IChannel(everyoneSpace).getChannel(
      channelId
    );

    assertEq(_channel.roleIds.length, 1);
    assertEq(_channel.roleIds[0], roleId);
  }

  function test_addRoleToChannel_existing_role(
    string memory channelMetadata,
    uint256 roleId
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "my-cool-channel";

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
    IChannel(everyoneSpace).addRoleToChannel(channelId, roleId);
    vm.stopPrank();

    vm.prank(founder);
    vm.expectRevert(ChannelService__RoleAlreadyExists.selector);
    IChannel(everyoneSpace).addRoleToChannel(channelId, roleId);
  }

  function test_removeRoleFromChannel(
    string memory channelMetadata,
    uint256 roleId
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "my-cool-channel";

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
    IChannel(everyoneSpace).addRoleToChannel(channelId, roleId);
    IChannel(everyoneSpace).removeRoleFromChannel(channelId, roleId);
    vm.stopPrank();

    IChannel.Channel memory _channel = IChannel(everyoneSpace).getChannel(
      channelId
    );

    assertEq(_channel.roleIds.length, 0);
  }

  function test_removeRoleFromChannel_nonexistent_role(
    string memory channelMetadata
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "my-cool-channel";

    uint256 nonexistentRoleId = 12345; // An ID that doesn't belong to any role

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
    vm.stopPrank();

    vm.prank(founder);
    vm.expectRevert(ChannelService__RoleDoesNotExist.selector);
    IChannel(everyoneSpace).removeRoleFromChannel(channelId, nonexistentRoleId);
  }

  // =============================================================
  //                           Reverts
  // =============================================================

  function test_createChannel_reverts_when_not_allowed(
    string memory channelMetadata
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "my-cool-channel";

    vm.expectRevert(Entitlement__NotAllowed.selector);

    vm.prank(_randomAddress());
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
  }

  function test_createChannel_reverts_when_channel_exists(
    string memory channelMetadata
  ) public {
    bound(bytes(channelMetadata).length, 3, 1000);

    bytes32 channelId = "my-cool-channel";

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );

    vm.expectRevert(ChannelService__ChannelAlreadyExists.selector);

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId,
      channelMetadata,
      new uint256[](0)
    );
  }
}
