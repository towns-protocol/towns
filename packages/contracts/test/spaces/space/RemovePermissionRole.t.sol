// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

import {console} from "forge-std/console.sol";

contract RemovePermissionRoleTest is SpaceBaseSetup {
  function setUp() external {}

  function testremovePermissionsFromRole() external {
    (
      address _space,
      address _moderator,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Ban;

    Space(_space).addPermissionsToRole(_moderatorRoleId, permissions);

    assertTrue(Space(_space).isEntitledToSpace(_moderator, Permissions.Ban));

    Space(_space).removePermissionsFromRole(_moderatorRoleId, permissions);

    assertFalse(Space(_space).isEntitledToSpace(_moderator, Permissions.Ban));

    string[] memory _permissions = Space(_space).getPermissionsByRoleId(
      _moderatorRoleId
    );
    bool _found = false;

    for (uint256 i = 0; i < _permissions.length; i++) {
      if (_isEqual(_permissions[i], Permissions.Ban)) {
        _found = true;
        break;
      }
    }

    assertFalse(_found);
  }

  function testRevertIfTryingtoRemovePermissionFromNonExistentRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Ban;

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removePermissionsFromRole(_moderatorRoleId + 5, permissions);
  }

  function testRevertIfNotAllowedToremovePermissionsFromRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Ban;

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removePermissionsFromRole(_moderatorRoleId, permissions);
  }

  function testRevertIfTryingtoRemoveOwnerPermission() external {
    (address _space, , ) = createSpaceWithModeratorEntitlements();

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Owner;

    uint256 ownerRoleId = Space(_space).ownerRoleId();

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removePermissionsFromRole(ownerRoleId, permissions);
  }
}
