// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

import {console} from "forge-std/console.sol";

contract SpaceTestAddPermissionRole is BaseSetup {
  function setUp() external {
    BaseSetup.init();
  }

  function testRevertIfTryingToAddSamePermissionTwice() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    Space(_space).addPermissionToRole(_moderatorRoleId, Permissions.Ban);

    vm.expectRevert(Errors.PermissionAlreadyExists.selector);
    Space(_space).addPermissionToRole(_moderatorRoleId, Permissions.Ban);
  }

  function testRevertIfTryingToAddToNonExistentRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).addPermissionToRole(_moderatorRoleId + 1, Permissions.Ban);
  }

  function testRevertIfTryingToAddOwnerPermission() external {
    (
      address _space,
      address _moderator,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    vm.prank(_moderator);
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).addPermissionToRole(_moderatorRoleId, Permissions.Owner);
  }

  function testRevertIfNotAllowedToAddPermissionToRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).addPermissionToRole(_moderatorRoleId, Permissions.Ban);
  }

  function testAddPermissionRole() external {
    (
      address _space,
      address _moderator,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    // Add permission to role
    Space(_space).addPermissionToRole(_moderatorRoleId, Permissions.Ban);

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
    assertTrue(Space(_space).isEntitled(_moderator, Permissions.Ban));
    assertTrue(exists);
  }
}
