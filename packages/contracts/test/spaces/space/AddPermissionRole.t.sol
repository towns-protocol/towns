// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

import {Utils} from "contracts/src/spaces/libraries/Utils.sol";

import {console} from "forge-std/console.sol";

contract AddPermissionRoleTest is SpaceBaseSetup {
  function setUp() external {}

  function testRevertIfTryingToAddSamePermissionTwice() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](2);
    _permissions[0] = Permissions.Ban;
    _permissions[1] = Permissions.Ping;

    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);

    vm.expectRevert(Errors.PermissionAlreadyExists.selector);
    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);
  }

  function testRevertIfTryingaddPermissionsToRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](2);
    _permissions[0] = Permissions.Ban;
    _permissions[1] = Permissions.Ping;

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).addPermissionsToRole(_moderatorRoleId + 5, _permissions);
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

  function testAddPermissionRoleOnly() external {
    (
      address _space,
      address _moderator,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Ban;

    // Add permission to role
    Space(_space).addPermissionsToRole(_moderatorRoleId, _permissions);

    string[] memory currentPermissions = Space(_space).getPermissionsByRoleId(
      _moderatorRoleId
    );

    bool exists = false;

    for (uint256 i = 0; i < currentPermissions.length; i++) {
      if (Utils.isEqual(currentPermissions[i], Permissions.Ban)) {
        exists = true;
        break;
      }
    }

    // Check entitlements for new permission
    Space(_space).isEntitledToSpace(_moderator, Permissions.Ban);
    assertTrue(exists);
  }
}
