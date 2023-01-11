// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract RemoveRoleTest is BaseSetup {
  function setUp() external {
    BaseSetup.init();
  }

  function testRemoveRole() external {
    address _moderator = _randomAddress();

    address[] memory _users = new address[](1);
    _users[0] = _moderator;

    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.ModifySpacePermissions;

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "Moderator",
        permissions: _spacePermissions,
        users: _users,
        tokens: new DataTypes.ExternalToken[](0)
      });

    address _space = createSpaceWithEntitlements(_entitlementData);

    assertTrue(
      Space(_space).isEntitledToSpace(
        _moderator,
        Permissions.ModifySpacePermissions
      )
    );

    DataTypes.Role[] memory allRoles = Space(_space).getRoles();
    uint256 moderatorRoleId;

    for (uint256 i = 0; i < allRoles.length; i++) {
      if (keccak256(bytes(allRoles[i].name)) == keccak256(bytes("Moderator"))) {
        moderatorRoleId = allRoles[i].roleId;
      }
    }

    address _userEntitlement = getSpaceUserEntitlement(_space);

    // Revert since role is assigned to entitlement
    vm.expectRevert(Errors.RoleIsAssignedToEntitlement.selector);
    Space(_space).removeRole(moderatorRoleId);

    DataTypes.Entitlement memory _entitlement;
    _entitlement.module = _userEntitlement;
    _entitlement.data = abi.encode(_moderator);

    // Remove role from entitlement
    Space(_space).removeRoleFromEntitlement(moderatorRoleId, _entitlement);

    // Remove role from space
    Space(_space).removeRole(moderatorRoleId);

    assertFalse(
      Space(_space).isEntitledToSpace(
        _moderator,
        Permissions.ModifySpacePermissions
      )
    );
  }

  function testRemoveNonExistentRole() external {
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).removeRole(100);
  }

  function testRemoveRoleOwnerPermissionNotAllowed() external {
    address _moderator = _randomAddress();

    address[] memory _users = new address[](1);
    _users[0] = _moderator;

    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.ModifySpacePermissions;

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "Moderator",
        permissions: _spacePermissions,
        users: _users,
        tokens: new DataTypes.ExternalToken[](0)
      });

    address _space = createSpaceWithEntitlements(_entitlementData);

    assertTrue(
      Space(_space).isEntitledToSpace(
        _moderator,
        Permissions.ModifySpacePermissions
      )
    );

    uint256 ownerRoleId = Space(_space).ownerRoleId();

    vm.prank(_moderator);
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).removeRole(ownerRoleId);
  }
}
