// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {RoleStorage} from "./RoleStorage.sol";

// contracts
error RoleService__RoleDoesNotExist();
error RoleService__EntitlementAlreadyExists();
error RoleService__EntitlementDoesNotExist();
error RoleService__InvalidPermission();
error RoleService__InvalidEntitlementAddress();
error RoleService__PermissionAlreadyExists();
error RoleService__PermissionDoesNotExist();

library RoleService {
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using EnumerableSet for EnumerableSet.AddressSet;
  using RoleStorage for RoleStorage.Layout;

  function addRole(
    string memory roleName,
    bool isImmutable,
    string[] memory permissions,
    address[] memory entitlements
  ) internal returns (uint256 roleId) {
    RoleStorage.Layout storage rs = RoleStorage.layout();

    roleId = ++rs.roleCount;

    rs.roles.add(roleId);
    rs.roleById[roleId].name = roleName;
    rs.roleById[roleId].isImmutable = isImmutable;

    addPermissionsToRole(roleId, permissions);

    for (uint256 i = 0; i < entitlements.length; i++) {
      // if entitlement is empty, skip
      if (entitlements[i] == address(0)) {
        revert RoleService__InvalidEntitlementAddress();
      }

      rs.roleById[roleId].entitlements.add(entitlements[i]);
    }
  }

  function getEntitlementsByRole(
    uint256 roleId
  ) internal view returns (address[] memory entitlements) {
    checkRole(roleId);

    entitlements = RoleStorage.layout().roleById[roleId].entitlements.values();
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

    RoleStorage.Role storage role = RoleStorage.layout().roleById[roleId];

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
      RoleStorage.layout().roleById[roleId].name = roleName;
    }

    // Update permissions

    if (permissions.length > 0) {
      string[] memory currentPermissions = RoleStorage
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
      address[] memory currentEntitlements = RoleStorage
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
    RoleStorage.Layout storage rs = RoleStorage.layout();

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
    return RoleStorage.layout().roles.values();
  }

  // =============================================================
  //                           Permissions
  // =============================================================

  function addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) internal {
    RoleStorage.Layout storage rs = RoleStorage.layout();

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      // if permission is empty, revert
      checkEmptyString(permissions[i]);

      // if permission already exists, revert
      if (rs.roleById[roleId].permissions.contains(permissions[i])) {
        revert RoleService__PermissionAlreadyExists();
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
    RoleStorage.Layout storage rs = RoleStorage.layout();

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      // if permission is empty, revert
      checkEmptyString(permissions[i]);

      if (!rs.roleById[roleId].permissions.contains(permissions[i])) {
        revert RoleService__PermissionDoesNotExist();
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
    RoleStorage.Layout storage rs = RoleStorage.layout();

    if (rs.roleById[roleId].entitlements.contains(entitlement)) {
      revert RoleService__EntitlementAlreadyExists();
    }

    rs.roleById[roleId].entitlements.add(entitlement);
  }

  function removeEntitlementFromRole(
    uint256 roleId,
    address entitlement
  ) internal {
    RoleStorage.Layout storage rs = RoleStorage.layout();

    if (!rs.roleById[roleId].entitlements.contains(entitlement)) {
      revert RoleService__EntitlementDoesNotExist();
    }

    rs.roleById[roleId].entitlements.remove(entitlement);
  }

  // =============================================================
  //                           Helpers
  // =============================================================
  function checkEmptyString(string memory str) internal pure {
    if (bytes(str).length == 0) {
      revert RoleService__InvalidPermission();
    }
  }

  function checkRoleExists(uint256 roleId) internal view {
    if (!RoleStorage.layout().roles.contains(roleId)) {
      revert RoleService__RoleDoesNotExist();
    }
  }

  function checkRole(uint256 roleId) internal view {
    // check that role exists
    if (!RoleStorage.layout().roles.contains(roleId)) {
      revert RoleService__RoleDoesNotExist();
    }
  }
}
