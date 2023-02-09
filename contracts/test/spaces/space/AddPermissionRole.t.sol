// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/libraries/DataTypes.sol";
import {Errors} from "contracts/src/libraries/Errors.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/core/spaces/Space.sol";

import {console} from "forge-std/console.sol";

contract AddPermissionRoleTest is SpaceBaseSetup {
  function setUp() external {}

  function testRevertIfTryingToAddSamePermissionTwice() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Ban;

    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);

    vm.expectRevert(Errors.PermissionAlreadyExists.selector);
    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);
  }

  function testRevertIfTryingToAddToNonExistentRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Ban;

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).addPermissionsToRole(_moderatorRoleId + 1, _permissions);
  }

  function testRevertIfTryingToAddOwnerPermission() external {
    (
      address _space,
      address _moderator,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Owner;

    vm.prank(_moderator);
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);
  }

  function testRevertIfNotAllowedToaddPermissionsToRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Ban;

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);
  }

  function testAddPermissionRole() external {
    (
      address _space,
      address _moderator,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Ban;

    // Add permission to role
    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);

    // Check permission was added
    bytes32[] memory currentPermissions = Space(_space).getPermissionsByRoleId(
      _moderatorRoleId
    );

    bool exists = false;
    for (uint256 i = 0; i < currentPermissions.length; i++) {
      if (currentPermissions[i] == bytes32(abi.encodePacked(Permissions.Ban))) {
        exists = true;
      }
    }

    // Check entitlements for new permission
    assertTrue(Space(_space).isEntitledToSpace(_moderator, Permissions.Ban));
    assertTrue(exists);
  }
}
