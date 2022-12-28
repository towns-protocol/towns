// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

import {console} from "forge-std/console.sol";

contract SpaceTestCreateChannel is BaseSetup {
  function setUp() external {
    BaseSetup.init();
  }

  function testCreateChannelWithNonExistentRole() external {
    address _space = createSimpleSpace();

    DataTypes.Role[] memory _roles = Space(_space).getRoles();
    uint256 _nonExistentRoleId = _roles[_roles.length - 1].roleId + 1;

    DataTypes.CreateChannelData
      memory _channelData = _createSimpleChannelData();
    _channelData.roleIds = new uint256[](1);
    _channelData.roleIds[0] = _nonExistentRoleId;

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).createChannel(_channelData);
  }

  function testCreateChannelWithRoles() external {
    address _bob = _randomAddress();
    address _space = createSimpleSpace();

    string memory _permission = "Vote";

    string[] memory _permissions = new string[](1);
    _permissions[0] = _permission;
    uint256 _memberRoleId = Space(_space).createRole("Member", _permissions);

    // get user entitlement module
    address userEntitlement = getSpaceUserEntitlement(_space);

    // add role to user entitlement module
    Space(_space).addRoleToEntitlement(
      userEntitlement,
      _memberRoleId,
      abi.encode(_bob)
    );

    // add member role id to channel data
    DataTypes.CreateChannelData
      memory _channelData = _createSimpleChannelData();
    _channelData.roleIds = new uint256[](1);
    _channelData.roleIds[0] = _memberRoleId;

    // create channel
    Space(_space).createChannel(_channelData);

    // check if bob is entitled to channel
    assertTrue(
      Space(_space).isEntitled(_channelData.channelNetworkId, _bob, _permission)
    );
  }

  function testCreateChannelNotAllowed() external {
    address _space = createSimpleSpace();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).createChannel(_createSimpleChannelData());
  }

  function testCreateChannelAlreadyRegistered() external {
    address _space = createSimpleSpace();

    Space(_space).createChannel(_createSimpleChannelData());

    vm.expectRevert(Errors.ChannelAlreadyRegistered.selector);
    Space(_space).createChannel(_createSimpleChannelData());
  }

  function testCreateChannel() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address _space = createSimpleSpace();

    DataTypes.CreateChannelData
      memory _channelData = _createSimpleChannelData();

    vm.prank(creator);
    Space(_space).createChannel(_channelData);

    bytes32 channelId = keccak256(
      abi.encodePacked(_channelData.channelNetworkId)
    );

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      channelId
    );

    assertEq(_channel.name, _channelData.channelName);
    assertEq(_channel.channelId, channelId);

    assertTrue(
      Space(_space).isEntitled(
        _channelData.channelNetworkId,
        creator,
        Permissions.Owner
      )
    );
  }
}
