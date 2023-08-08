// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IRoles} from "./IRoles.sol";

// libraries
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

// contracts
import {RolesBase} from "./RolesBase.sol";
import {Entitled} from "../Entitled.sol";

contract Roles is IRoles, RolesBase, Entitled {
  function createRole(
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external override returns (uint256) {
    _validatePermission(Permissions.ModifySpaceSettings);
    return _createRole(roleName, permissions, entitlements);
  }

  function getRoles() external view override returns (Role[] memory) {
    return _getRoles();
  }

  function getRoleById(
    uint256 roleId
  ) external view override returns (Role memory) {
    return _getRoleById(roleId);
  }

  function updateRole(
    uint256 roleId,
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external override {
    _validatePermission(Permissions.ModifySpaceSettings);
    _updateRole(roleId, roleName, permissions, entitlements);
  }

  function removeRole(uint256 roleId) external override {
    _validatePermission(Permissions.ModifySpaceSettings);
    _removeRole(roleId);
  }

  // permissions

  function addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) external override {
    _addPermissionsToRole(roleId, permissions);
  }

  function removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) external override {
    _validatePermission(Permissions.ModifySpaceSettings);
    _removePermissionsFromRole(roleId, permissions);
  }

  function getPermissionsByRoleId(
    uint256 roleId
  ) external view override returns (string[] memory permissions) {
    return _getPermissionsByRoleId(roleId);
  }

  // entitlements
  function addRoleToEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) external {
    _validatePermission(Permissions.ModifySpaceSettings);
    _addRoleToEntitlement(roleId, entitlement);
  }

  function removeRoleFromEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) external {
    _validatePermission(Permissions.ModifySpaceSettings);
    _removeRoleFromEntitlement(roleId, entitlement);
  }
}
