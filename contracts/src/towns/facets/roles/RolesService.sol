// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {RolesStorage} from "./RolesStorage.sol";

// contracts
error RolesService__RoleDoesNotExist();
error RolesService__EntitlementAlreadyExists();
error RolesService__EntitlementDoesNotExist();
error RolesService__InvalidPermission();
error RolesService__InvalidEntitlementAddress();
error RolesService__PermissionAlreadyExists();
error RolesService__PermissionDoesNotExist();

library RolesService {
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using EnumerableSet for EnumerableSet.AddressSet;
  using RolesStorage for RolesStorage.Layout;

  function addRole(
    string memory roleName,
    bool isImmutable,
    string[] memory permissions,
    address[] memory entitlements
  ) internal returns (uint256 roleId) {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    roleId = ++rs.roleCount;

    rs.roles.add(roleId);
    rs.roleById[roleId].name = roleName;
    rs.roleById[roleId].isImmutable = isImmutable;

    addPermissionsToRole(roleId, permissions);

    for (uint256 i = 0; i < entitlements.length; i++) {
      // if entitlement is empty, skip
      if (entitlements[i] == address(0)) {
        revert RolesService__InvalidEntitlementAddress();
      }

      rs.roleById[roleId].entitlements.add(entitlements[i]);
    }
  }

  function getEntitlementsByRole(
    uint256 roleId
  ) internal view returns (address[] memory entitlements) {
    checkRole(roleId);

    entitlements = RolesStorage.layout().roleById[roleId].entitlements.values();
  }

  function getRole(
    uint256 roleId
  )
    internal
    view
    returns (
      string memory name,
      bool isImmutable,
      string[] memory permissions,
      address[] memory entitlements
    )
  {
    checkRole(roleId);

    RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];

    name = role.name;
    isImmutable = role.isImmutable;
    permissions = role.permissions.values();
    entitlements = role.entitlements.values();
  }

  // Updates a role with the given parameters
  function updateRole(
    uint256 roleId,
    string memory roleName,
    string[] memory permissions,
    address[] memory entitlements
  ) internal {
    // Update the role name
    if (bytes(roleName).length > 0) {
      RolesStorage.layout().roleById[roleId].name = roleName;
    }

    // Update permissions

    if (permissions.length > 0) {
      string[] memory currentPermissions = RolesStorage
        .layout()
        .roleById[roleId]
        .permissions
        .values();

      // Remove all the current permissions
      removePermissionsFromRole(roleId, currentPermissions);

      // Add all the new permissions
      addPermissionsToRole(roleId, permissions);
    }

    if (entitlements.length > 0) {
      uint256 entitlementsLen = entitlements.length;

      // Remove all the entitlements
      address[] memory currentEntitlements = RolesStorage
        .layout()
        .roleById[roleId]
        .entitlements
        .values();
      uint256 currentEntitlementsLen = currentEntitlements.length;

      for (uint256 i = 0; i < currentEntitlementsLen; ) {
        removeEntitlementFromRole(roleId, currentEntitlements[i]);
        unchecked {
          i++;
        }
      }

      // Add all the new entitlements
      for (uint256 i = 0; i < entitlementsLen; ) {
        addEntitlementToRole(roleId, entitlements[i]);
        unchecked {
          i++;
        }
      }
    }
  }

  function removeRole(uint256 roleId) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    rs.roles.remove(roleId);
    delete rs.roleById[roleId];
    rs.roleById[roleId].name = "";
    rs.roleById[roleId].isImmutable = false;

    uint256 permissionLen = rs.roleById[roleId].permissions.length();

    for (uint256 i = 0; i < permissionLen; ) {
      rs.roleById[roleId].permissions.remove(
        rs.roleById[roleId].permissions.at(i)
      );
      unchecked {
        i++;
      }
    }

    uint256 entitlementLen = rs.roleById[roleId].entitlements.length();

    for (uint256 i = 0; i < entitlementLen; ) {
      rs.roleById[roleId].entitlements.remove(
        rs.roleById[roleId].entitlements.at(i)
      );
      unchecked {
        i++;
      }
    }
  }

  function getRoleIds() internal view returns (uint256[] memory roleIds) {
    return RolesStorage.layout().roles.values();
  }

  // =============================================================
  //                           Permissions
  // =============================================================

  function addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      // if permission is empty, revert
      checkEmptyString(permissions[i]);

      // if permission already exists, revert
      if (rs.roleById[roleId].permissions.contains(permissions[i])) {
        revert RolesService__PermissionAlreadyExists();
      }

      rs.roleById[roleId].permissions.add(permissions[i]);

      unchecked {
        i++;
      }
    }
  }

  function removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      // if permission is empty, revert
      checkEmptyString(permissions[i]);

      if (!rs.roleById[roleId].permissions.contains(permissions[i])) {
        revert RolesService__PermissionDoesNotExist();
      }

      rs.roleById[roleId].permissions.remove(permissions[i]);

      unchecked {
        i++;
      }
    }
  }

  // =============================================================
  //                           Entitlements
  // =============================================================
  function addEntitlementToRole(uint256 roleId, address entitlement) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    if (rs.roleById[roleId].entitlements.contains(entitlement)) {
      revert RolesService__EntitlementAlreadyExists();
    }

    rs.roleById[roleId].entitlements.add(entitlement);
  }

  function removeEntitlementFromRole(
    uint256 roleId,
    address entitlement
  ) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    if (!rs.roleById[roleId].entitlements.contains(entitlement)) {
      revert RolesService__EntitlementDoesNotExist();
    }

    rs.roleById[roleId].entitlements.remove(entitlement);
  }

  // =============================================================
  //                           Helpers
  // =============================================================
  function checkEmptyString(string memory str) internal pure {
    if (bytes(str).length == 0) {
      revert RolesService__InvalidPermission();
    }
  }

  function checkRoleExists(uint256 roleId) internal view {
    if (!RolesStorage.layout().roles.contains(roleId)) {
      revert RolesService__RoleDoesNotExist();
    }
  }

  function checkRole(uint256 roleId) internal view {
    // check that role exists
    if (!RolesStorage.layout().roles.contains(roleId)) {
      revert RolesService__RoleDoesNotExist();
    }
  }
}
