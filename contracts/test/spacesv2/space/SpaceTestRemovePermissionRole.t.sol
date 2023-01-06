// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

import {console} from "forge-std/console.sol";

contract SpaceTestRemovePermissionRole is BaseSetup {
  function setUp() external {
    BaseSetup.init();
  }

  function testRemovePermissionFromRole() external {
    (
      address _space,
      address _moderator,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    Space(_space).addPermissionToRole(_moderatorRoleId, Permissions.Ban);

    assertTrue(Space(_space).isEntitledToSpace(_moderator, Permissions.Ban));

    Space(_space).removePermissionFromRole(_moderatorRoleId, Permissions.Ban);

    assertFalse(Space(_space).isEntitledToSpace(_moderator, Permissions.Ban));

    bytes32[] memory _permissions = Space(_space).getPermissionsByRoleId(
      _moderatorRoleId
    );
    bool _found = false;

    for (uint256 i = 0; i < _permissions.length; i++) {
      if (_isEqual(_bytes32ToString(_permissions[i]), Permissions.Ban)) {
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

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removePermissionFromRole(
      _moderatorRoleId + 1,
      Permissions.Ban
    );
  }

  function testRevertIfNotAllowedToRemovePermissionFromRole() external {
    (
      address _space,
      ,
      uint256 _moderatorRoleId
    ) = createSpaceWithModeratorEntitlements();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removePermissionFromRole(_moderatorRoleId, Permissions.Ban);
  }

  function testRevertIfTryingtoRemoveOwnerPermission() external {
    (address _space, , ) = createSpaceWithModeratorEntitlements();

    uint256 ownerRoleId = Space(_space).ownerRoleId();

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removePermissionFromRole(ownerRoleId, Permissions.Owner);
  }
}
