// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/libraries/DataTypes.sol";
import {Errors} from "contracts/src/libraries/Errors.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/core/spaces/Space.sol";

contract AddRoleToChannelTest is SpaceBaseSetup {
  function setUp() public {}

  function testRevertIfNotAllowedByPermissions() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.expectRevert(Errors.NotAllowed.selector);

    vm.prank(_randomAddress());
    Space(_space).addRoleToChannel(
      channelNetworkId,
      _randomAddress(),
      _randomUint256()
    );
  }

  function testRevertIfEntitlementNotWhitelisted() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).addRoleToChannel(
      channelNetworkId,
      _randomAddress(),
      _randomUint256()
    );
  }

  function testRevertIfRoleDoesNotExist() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).addRoleToChannel(
      channelNetworkId,
      _userEntitlement,
      _randomUint256()
    );
  }

  function testAddRoleToChannel() external {
    address _space = createSimpleSpace();

    string memory _roleName = "some-role";
    string[] memory _permissions = new string[](0);
    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _entitlements
    );

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);
    address _userEntitlement = getSpaceUserEntitlement(_space);

    Space(_space).addRoleToChannel(channelNetworkId, _userEntitlement, _roleId);
  }
}
