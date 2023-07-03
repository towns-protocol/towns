// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract CreateChannelTest is SpaceBaseSetup {
  function setUp() external {}

  function testCreateChannelWithNonExistentRole() external {
    address _space = createSimpleSpace();

    DataTypes.Role[] memory _roles = Space(_space).getRoles();
    uint256 _nonExistentRoleId = _roles[_roles.length - 1].roleId + 1;

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    roleIds = new uint256[](1);
    roleIds[0] = _nonExistentRoleId;

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).createChannel(channelName, channelId, roleIds);
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
      "member",
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
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    roleIds = new uint256[](1);
    roleIds[0] = _memberRoleId;

    // create channel
    Space(_space).createChannel(channelName, channelId, roleIds);

    // check if bob is entitled to channel
    assertTrue(Space(_space).isEntitledToChannel(channelId, _bob, _permission));
  }

  function testCreateChannelNotAllowed() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).createChannel(channelName, channelId, roleIds);
  }

  function testCreateChannelAlreadyRegistered() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelId, roleIds);

    vm.expectRevert(Errors.ChannelAlreadyRegistered.selector);
    Space(_space).createChannel(channelName, channelId, roleIds);
  }

  function testCreateChannel() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    vm.prank(creator);
    Space(_space).createChannel(channelName, channelId, roleIds);

    bytes32 channelHash = keccak256(abi.encodePacked(channelId));

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      channelHash
    );

    assertEq(_channel.name, channelName);
    assertEq(_channel.channelHash, channelHash);

    assertTrue(
      Space(_space).isEntitledToChannel(channelId, creator, Permissions.Owner)
    );
  }

  function testCreateEmptyChannelName() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = ("", "!7evmpuHDDgkady9u:localhost", new uint256[](0)); // Empty Name here

    vm.prank(creator);
    vm.expectRevert(Errors.NameLengthInvalid.selector);
    Space(_space).createChannel(channelName, channelId, roleIds);
  }
}
