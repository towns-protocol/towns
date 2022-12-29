// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract SpaceTestRemoveRoleFromChannel is BaseSetup {
  function setUp() public {
    BaseSetup.init();
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

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).removeRoleFromChannel(
      "random_channel",
      _randomAddress(),
      _randomUint256()
    );
  }

  function testRevertIfRoleDoesNotExist() external {
    address _space = createSimpleSpace();
    address _userEntitlement = getSpaceUserEntitlement(_space);

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removeRoleFromChannel(
      "random_channel",
      _userEntitlement,
      _randomUint256()
    );
  }

  function testRemoveRole() external {
    address _space = createSimpleSpace();

    string memory _roleName = "some-role";
    string[] memory _permissions = new string[](0);

    uint256 _roleId = Space(_space).createRole(_roleName, _permissions);

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);
    address _userEntitlement = getSpaceUserEntitlement(_space);

    Space(_space).addRoleToChannel(channelName, _userEntitlement, _roleId);

    Space(_space).removeRoleFromChannel(channelName, _userEntitlement, _roleId);
  }
}
