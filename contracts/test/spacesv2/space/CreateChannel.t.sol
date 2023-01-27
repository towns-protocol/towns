// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spacesv2/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

import {console} from "forge-std/console.sol";

contract CreateChannelTest is SpaceBaseSetup {
  function setUp() external {
    SpaceBaseSetup.init();
  }

  function testCreateChannelWithNonExistentRole() external {
    address _space = createSimpleSpace();

    DataTypes.Role[] memory _roles = Space(_space).getRoles();
    uint256 _nonExistentRoleId = _roles[_roles.length - 1].roleId + 1;

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    roleIds = new uint256[](1);
    roleIds[0] = _nonExistentRoleId;

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).createChannel(channelName, channelNetworkId, roleIds);
  }

  function testCreateChannelWithRoles() external {
    address _bob = _randomAddress();
    address _space = createSimpleSpace();

    string memory _permission = "Vote";

    string[] memory _permissions = new string[](1);
    _permissions[0] = _permission;

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    uint256 _memberRoleId = Space(_space).createRole(
      "Member",
      _permissions,
      _entitlements
    );

    // get user entitlement module
    address userEntitlement = getSpaceUserEntitlement(_space);

    address[] memory _users = new address[](1);
    _users[0] = _bob;

    // add role to user entitlement module
    Space(_space).addRoleToEntitlement(
      _memberRoleId,
      DataTypes.Entitlement(userEntitlement, abi.encode(_users))
    );

    // add member role id to channel data
    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    roleIds = new uint256[](1);
    roleIds[0] = _memberRoleId;

    // create channel
    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    // check if bob is entitled to channel
    assertTrue(
      Space(_space).isEntitledToChannel(channelNetworkId, _bob, _permission)
    );
  }

  function testCreateChannelNotAllowed() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).createChannel(channelName, channelNetworkId, roleIds);
  }

  function testCreateChannelAlreadyRegistered() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.expectRevert(Errors.ChannelAlreadyRegistered.selector);
    Space(_space).createChannel(channelName, channelNetworkId, roleIds);
  }

  function testCreateChannel() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    vm.prank(creator);
    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    bytes32 channelId = keccak256(abi.encodePacked(channelNetworkId));

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      channelId
    );

    assertEq(_channel.name, channelName);
    assertEq(_channel.channelId, channelId);

    assertTrue(
      Space(_space).isEntitledToChannel(
        channelNetworkId,
        creator,
        Permissions.Owner
      )
    );
  }
}
