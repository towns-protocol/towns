// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spacesv2/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract RemoveRoleFromChannelTest is SpaceBaseSetup {
  function setUp() public {
    SpaceBaseSetup.init();
  }

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
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).removeRoleFromChannel(
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
    Space(_space).removeRoleFromChannel(
      channelNetworkId,
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
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);
    address _userEntitlement = getSpaceUserEntitlement(_space);

    Space(_space).addRoleToChannel(channelNetworkId, _userEntitlement, _roleId);

    Space(_space).removeRoleFromChannel(
      channelNetworkId,
      _userEntitlement,
      _roleId
    );
  }
}
