// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract RemoveRoleFromChannelTest is SpaceBaseSetup {
  function setUp() public {}

  function testRevertIfNotAllowedByPermissions() external {
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.NotAllowed.selector);

    vm.prank(_randomAddress());
    Space(_space).removeRoleFromChannel(
      "random_channel",
      _randomAddress(),
      _randomUint256()
    );
  }

  function testRevertIfEntitlementNotWhitelisted() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelId, roleIds);

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).removeRoleFromChannel(
      channelId,
      _randomAddress(),
      _randomUint256()
    );
  }

  function testRevertIfRoleDoesNotExist() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelId, roleIds);

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removeRoleFromChannel(
      channelId,
      _userEntitlement,
      _randomUint256()
    );
  }

  function testRemoveRole() external {
    address _space = createSimpleSpace();

    string memory _roleName = "some-role";
    string[] memory _permissions = new string[](0);
    DataTypes.Entitlement[]
      memory _roleEntitlements = new DataTypes.Entitlement[](1);
    _roleEntitlements[0] = DataTypes.Entitlement({
      module: address(0),
      data: ""
    });

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _roleEntitlements
    );

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelId, roleIds);
    address _userEntitlement = getSpaceUserEntitlement(_space);

    Space(_space).addRoleToChannel(channelId, _userEntitlement, _roleId);

    Space(_space).removeRoleFromChannel(channelId, _userEntitlement, _roleId);
  }
}
