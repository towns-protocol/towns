// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
interface IRolesBase {
  struct Role {
    uint256 id;
    string name;
    bool disabled;
    string[] permissions;
    address[] entitlements;
  }

  struct CreateEntitlement {
    address module;
    bytes data;
  }

  event RoleCreated(address indexed creator, uint256 indexed roleId);

  event RoleUpdated(address indexed updater, uint256 indexed roleId);

  event RoleRemoved(address indexed remover, uint256 indexed roleId);
}

interface IRoles is IRolesBase {
  function createRole(
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external returns (uint256 roleId);

  function getRoles() external view returns (Role[] memory roles);

  function getRoleById(uint256 roleId) external view returns (Role memory role);

  function updateRole(
    uint256 roleId,
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external;

  function removeRole(uint256 roleId) external;

  // permissions

  function addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) external;

  function removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) external;

  function getPermissionsByRoleId(
    uint256 roleId
  ) external view returns (string[] memory permissions);

  // entitlements

  function addRoleToEntitlement(
    uint256 roleId,
    CreateEntitlement calldata entitlement
  ) external;

  function removeRoleFromEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) external;
}
