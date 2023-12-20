// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "./IRoles.sol";

// libraries
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";

// services
import {EntitlementsManagerService} from "contracts/src/towns/facets/entitlements/EntitlementsManagerService.sol";
import {ChannelService} from "contracts/src/towns/facets/channels/ChannelService.sol";
import {RolesStorage} from "./RolesStorage.sol";

abstract contract RolesBase is IRolesBase {
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using EnumerableSet for EnumerableSet.AddressSet;

  // =============================================================
  //                         Role Management
  // =============================================================
  function _createRole(
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) internal returns (uint256 roleId) {
    Validator.checkLength(roleName, 2);

    uint256 entitlementsLen = entitlements.length;

    address[] memory entitlementAddresses = new address[](entitlementsLen);

    roleId = _getNextRoleId();

    for (uint256 i = 0; i < entitlementsLen; ) {
      EntitlementsManagerService.validateEntitlement(entitlements[i].module);
      entitlementAddresses[i] = entitlements[i].module;

      // check for empty address or data
      Validator.checkByteLength(entitlements[i].data);

      EntitlementsManagerService.proxyAddRoleToEntitlement(
        entitlements[i].module,
        roleId,
        entitlements[i].data
      );

      unchecked {
        i++;
      }
    }

    _addRole(roleName, false, permissions, entitlementAddresses);

    emit RoleCreated(msg.sender, roleId);
  }

  function _getRoles() internal view returns (Role[] memory roles) {
    uint256[] memory roleIds = _getRoleIds();
    uint256 roleIdLen = roleIds.length;

    roles = new Role[](roleIdLen);

    for (uint256 i = 0; i < roleIdLen; ) {
      (
        string memory name,
        bool isImmutable,
        string[] memory permissions,
        address[] memory entitlements
      ) = _getRole(roleIds[i]);

      roles[i] = Role({
        id: roleIds[i],
        name: name,
        disabled: isImmutable,
        permissions: permissions,
        entitlements: entitlements
      });

      unchecked {
        i++;
      }
    }
  }

  function _getRoleById(
    uint256 roleId
  ) internal view returns (Role memory role) {
    (
      string memory name,
      bool isImmutable,
      string[] memory permissions,
      address[] memory entitlements
    ) = _getRole(roleId);

    return
      Role({
        id: roleId,
        name: name,
        disabled: isImmutable,
        permissions: permissions,
        entitlements: entitlements
      });
  }

  // make nonreentrant
  function _updateRole(
    uint256 roleId,
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) internal {
    // get current entitlements before updating them
    address[] memory currentEntitlements = _getEntitlementsByRole(roleId);
    uint256 currentEntitlementsLen = currentEntitlements.length;

    uint256 entitlementsLen = entitlements.length;
    address[] memory entitlementAddresses = new address[](entitlementsLen);

    for (uint256 i = 0; i < entitlementsLen; ) {
      EntitlementsManagerService.validateEntitlement(entitlements[i].module);
      EntitlementsManagerService.checkEntitlement(entitlements[i].module);
      entitlementAddresses[i] = entitlements[i].module;
      unchecked {
        i++;
      }
    }

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
      _removePermissionsFromRole(roleId, currentPermissions);

      // Add all the new permissions
      _addPermissionsToRole(roleId, permissions);
    }

    if (entitlementsLen == 0) {
      return;
    }

    if (entitlementAddresses.length > 0) {
      uint256 entitlementAddressesLen = entitlementAddresses.length;

      for (uint256 i = 0; i < currentEntitlementsLen; ) {
        _removeEntitlementFromRole(roleId, currentEntitlements[i]);
        unchecked {
          i++;
        }
      }

      // Add all the new entitlements
      for (uint256 i = 0; i < entitlementAddressesLen; ) {
        _addEntitlementToRole(roleId, entitlementAddresses[i]);
        unchecked {
          i++;
        }
      }
    }

    // loop through old entitlements and remove them
    for (uint256 i = 0; i < currentEntitlementsLen; ) {
      bytes[] memory entitlementData = EntitlementsManagerService
        .proxyGetEntitlementDataByRole(currentEntitlements[i], roleId);
      uint256 entitlementDataLen = entitlementData.length;

      for (uint256 j = 0; j < entitlementDataLen; ) {
        EntitlementsManagerService.proxyRemoveRoleFromEntitlement(
          currentEntitlements[i],
          roleId,
          entitlementData[j]
        );

        unchecked {
          j++;
        }
      }

      unchecked {
        i++;
      }
    }

    for (uint256 i = 0; i < entitlementsLen; ) {
      // check for empty address or data
      Validator.checkByteLength(entitlements[i].data);

      EntitlementsManagerService.proxyAddRoleToEntitlement(
        entitlements[i].module,
        roleId,
        entitlements[i].data
      );

      unchecked {
        i++;
      }
    }

    emit RoleUpdated(msg.sender, roleId);
  }

  function _removeRole(uint256 roleId) internal {
    // get current entitlements
    address[] memory currentEntitlements = _getEntitlementsByRole(roleId);
    uint256 currentEntitlementsLen = currentEntitlements.length;

    RolesStorage.Layout storage rs = RolesStorage.layout();

    rs.roles.remove(roleId);
    delete rs.roleById[roleId];
    rs.roleById[roleId].name = "";
    rs.roleById[roleId].isImmutable = false;

    uint256 permissionLen = rs.roleById[roleId].permissions.length();
    uint256 entitlementLen = rs.roleById[roleId].entitlements.length();

    for (uint256 i = 0; i < permissionLen; ) {
      rs.roleById[roleId].permissions.remove(
        rs.roleById[roleId].permissions.at(i)
      );
      unchecked {
        i++;
      }
    }

    for (uint256 i = 0; i < entitlementLen; ) {
      rs.roleById[roleId].entitlements.remove(
        rs.roleById[roleId].entitlements.at(i)
      );
      unchecked {
        i++;
      }
    }

    string[] memory channelIds = ChannelService.getChannelIdsByRole(roleId);
    uint256 channelIdsLen = channelIds.length;

    // remove role from channels
    for (uint256 i = 0; i < channelIdsLen; ) {
      ChannelService.removeRoleFromChannel(channelIds[i], roleId);

      unchecked {
        i++;
      }
    }

    // remove role from entitlements
    for (uint256 i = 0; i < currentEntitlementsLen; ) {
      bytes[] memory entitlementData = EntitlementsManagerService
        .proxyGetEntitlementDataByRole(currentEntitlements[i], roleId);
      uint256 entitlementDataLen = entitlementData.length;

      for (uint256 j = 0; j < entitlementDataLen; j++) {
        EntitlementsManagerService.proxyRemoveRoleFromEntitlement(
          currentEntitlements[i],
          roleId,
          entitlementData[j]
        );
      }

      unchecked {
        i++;
      }
    }

    emit RoleRemoved(msg.sender, roleId);
  }

  // =============================================================
  //                           Internals
  // =============================================================
  function _getNextRoleId() internal view returns (uint256 roleId) {
    RolesStorage.Layout storage rs = RolesStorage.layout();
    return rs.roleCount + 1;
  }

  function _checkRoleExists(uint256 roleId) internal view {
    // check that role exists
    if (!RolesStorage.layout().roles.contains(roleId)) {
      revert Roles__RoleDoesNotExist();
    }
  }

  function _getRole(
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
    RolesStorage.Role storage role = RolesStorage.layout().roleById[roleId];
    name = role.name;
    isImmutable = role.isImmutable;
    permissions = role.permissions.values();
    entitlements = role.entitlements.values();
  }

  function _getRoleIds() internal view returns (uint256[] memory roleIds) {
    return RolesStorage.layout().roles.values();
  }

  function _getEntitlementsByRole(
    uint256 roleId
  ) internal view returns (address[] memory entitlements) {
    entitlements = RolesStorage.layout().roleById[roleId].entitlements.values();
  }

  function _addRole(
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

    _addPermissionsToRole(roleId, permissions);

    for (uint256 i = 0; i < entitlements.length; i++) {
      // if entitlement is empty, skip
      if (entitlements[i] == address(0)) {
        revert Roles__InvalidEntitlementAddress();
      }

      rs.roleById[roleId].entitlements.add(entitlements[i]);
    }
  }

  // =============================================================
  //                    Permission Management
  // =============================================================

  function _addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      // if permission is empty, revert
      _checkEmptyString(permissions[i]);

      // if permission already exists, revert
      if (rs.roleById[roleId].permissions.contains(permissions[i])) {
        revert Roles__PermissionAlreadyExists();
      }

      rs.roleById[roleId].permissions.add(permissions[i]);

      unchecked {
        i++;
      }
    }
  }

  function _removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) internal {
    // check permissions
    RolesStorage.Layout storage rs = RolesStorage.layout();

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      // if permission is empty, revert
      _checkEmptyString(permissions[i]);

      if (!rs.roleById[roleId].permissions.contains(permissions[i])) {
        revert Roles__PermissionDoesNotExist();
      }

      rs.roleById[roleId].permissions.remove(permissions[i]);

      unchecked {
        i++;
      }
    }
  }

  function _getPermissionsByRoleId(
    uint256 roleId
  ) internal view returns (string[] memory permissions) {
    (, , permissions, ) = _getRole(roleId);
  }

  // =============================================================
  //                  Role - Entitlement Management
  // =============================================================

  function _addRoleToEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) internal {
    // check role exists
    _checkRoleExists(roleId);

    // check entitlements exists
    EntitlementsManagerService.checkEntitlement(entitlement.module);

    // add entitlement to role
    _addEntitlementToRole(roleId, entitlement.module);

    // set entitlement to role
    EntitlementsManagerService.proxyAddRoleToEntitlement(
      entitlement.module,
      roleId,
      entitlement.data
    );
  }

  function _removeRoleFromEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) internal {
    // check entitlements exists
    EntitlementsManagerService.checkEntitlement(entitlement.module);

    // remove entitlement from role
    _removeEntitlementFromRole(roleId, entitlement.module);

    // set entitlement to role
    EntitlementsManagerService.proxyRemoveRoleFromEntitlement(
      entitlement.module,
      roleId,
      entitlement.data
    );
  }

  function _checkEmptyString(string memory str) internal pure {
    if (bytes(str).length == 0) {
      revert Roles__InvalidPermission();
    }
  }

  function _removeEntitlementFromRole(
    uint256 roleId,
    address entitlement
  ) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    if (!rs.roleById[roleId].entitlements.contains(entitlement)) {
      revert Roles__EntitlementDoesNotExist();
    }

    rs.roleById[roleId].entitlements.remove(entitlement);
  }

  function _addEntitlementToRole(uint256 roleId, address entitlement) internal {
    RolesStorage.Layout storage rs = RolesStorage.layout();

    if (rs.roleById[roleId].entitlements.contains(entitlement)) {
      revert Roles__EntitlementAlreadyExists();
    }

    rs.roleById[roleId].entitlements.add(entitlement);
  }
}
