// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

// libraries

// contracts
/// @title IRolesBase
/// @notice Base interface for role management
interface IRolesBase {
  /// @notice Struct representing a role
  /// @param id Unique identifier for the role
  /// @param name Name of the role
  /// @param disabled Flag indicating if the role is disabled
  /// @param permissions List of permissions associated with the role
  /// @param entitlements List of entitlements associated with the role
  struct Role {
    uint256 id;
    string name;
    bool disabled;
    string[] permissions;
    IEntitlement[] entitlements;
  }

  /// @notice Struct for creating an entitlement
  /// @param module The entitlement module
  /// @param data Additional data for the entitlement
  struct CreateEntitlement {
    IEntitlement module;
    bytes data;
  }

  /// @notice Emitted when a new role is created
  /// @param creator Address of the role creator
  /// @param roleId Unique identifier of the created role
  event RoleCreated(address indexed creator, uint256 indexed roleId);

  /// @notice Emitted when a role is updated
  /// @param updater Address of the role updater
  /// @param roleId Unique identifier of the updated role
  event RoleUpdated(address indexed updater, uint256 indexed roleId);

  /// @notice Emitted when a role is removed
  /// @param remover Address of the role remover
  /// @param roleId Unique identifier of the removed role
  event RoleRemoved(address indexed remover, uint256 indexed roleId);

  /// @notice Emitted when permissions are added to a channel role
  /// @param updater Address of the updater
  /// @param roleId Unique identifier of the role
  /// @param channelId Unique identifier of the channel
  event PermissionsAddedToChannelRole(
    address indexed updater,
    uint256 indexed roleId,
    bytes32 indexed channelId
  );

  /// @notice Emitted when permissions are removed from a channel role
  /// @param updater Address of the updater
  /// @param roleId Unique identifier of the role
  /// @param channelId Unique identifier of the channel
  event PermissionsRemovedFromChannelRole(
    address indexed updater,
    uint256 indexed roleId,
    bytes32 indexed channelId
  );

  /// @notice Emitted when permissions are updated for a channel role
  /// @param updater Address of the updater
  /// @param roleId Unique identifier of the role
  /// @param channelId Unique identifier of the channel
  event PermissionsUpdatedForChannelRole(
    address indexed updater,
    uint256 indexed roleId,
    bytes32 indexed channelId
  );

  // =============================================================
  //                           Errors
  // =============================================================
  /// @notice Error thrown when a role does not exist
  error Roles__RoleDoesNotExist();
  /// @notice Error thrown when an entitlement already exists
  error Roles__EntitlementAlreadyExists();
  /// @notice Error thrown when an entitlement does not exist
  error Roles__EntitlementDoesNotExist();
  /// @notice Error thrown when an invalid permission is provided
  error Roles__InvalidPermission();
  /// @notice Error thrown when an invalid entitlement address is provided
  error Roles__InvalidEntitlementAddress();
  /// @notice Error thrown when a permission already exists
  error Roles__PermissionAlreadyExists();
  /// @notice Error thrown when a permission does not exist
  error Roles__PermissionDoesNotExist();
}

/// @title IRoles
/// @notice Interface for role management operations
interface IRoles is IRolesBase {
  /// @notice Creates a new role
  /// @param roleName Name of the role
  /// @param permissions List of permissions for the role
  /// @param entitlements List of entitlements for the role
  /// @return roleId Unique identifier of the created role
  function createRole(
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external returns (uint256 roleId);

  /// @notice Retrieves all roles
  /// @return roles Array of all roles
  function getRoles() external view returns (Role[] memory roles);

  /// @notice Retrieves a role by its ID
  /// @param roleId Unique identifier of the role
  /// @return role The role struct
  function getRoleById(uint256 roleId) external view returns (Role memory role);

  /// @notice Updates an existing role
  /// @param roleId Unique identifier of the role to update
  /// @param roleName New name for the role
  /// @param permissions New list of permissions for the role
  /// @param entitlements New list of entitlements for the role
  function updateRole(
    uint256 roleId,
    string calldata roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) external;

  /// @notice Removes a role
  /// @param roleId Unique identifier of the role to remove
  function removeRole(uint256 roleId) external;

  // permissions

  /// @notice Adds permissions to a role
  /// @param roleId Unique identifier of the role
  /// @param permissions List of permissions to add
  function addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) external;

  /// @notice Removes permissions from a role
  /// @param roleId Unique identifier of the role
  /// @param permissions List of permissions to remove
  function removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) external;

  /// @notice Retrieves permissions for a role
  /// @param roleId Unique identifier of the role
  /// @return permissions List of permissions for the role
  function getPermissionsByRoleId(
    uint256 roleId
  ) external view returns (string[] memory permissions);

  // entitlements

  /// @notice Adds an entitlement to a role
  /// @param roleId Unique identifier of the role
  /// @param entitlement Entitlement to add
  function addRoleToEntitlement(
    uint256 roleId,
    CreateEntitlement calldata entitlement
  ) external;

  /// @notice Removes an entitlement from a role
  /// @param roleId Unique identifier of the role
  /// @param entitlement Entitlement to remove
  function removeRoleFromEntitlement(
    uint256 roleId,
    CreateEntitlement memory entitlement
  ) external;

  /// @notice Sets channel permission overrides for a role
  /// @param roleId Unique identifier of the role
  /// @param channelId Unique identifier of the channel
  /// @param permissions List of permissions to set as overrides
  function setChannelPermissionOverrides(
    uint256 roleId,
    bytes32 channelId,
    string[] memory permissions
  ) external;

  /// @notice Retrieves channel permission overrides for a role
  /// @param roleId Unique identifier of the role
  /// @param channelId Unique identifier of the channel
  /// @return permissions List of permission overrides for the channel
  function getChannelPermissionOverrides(
    uint256 roleId,
    bytes32 channelId
  ) external view returns (string[] memory permissions);

  /// @notice Clears channel permission overrides for a role
  /// @param roleId Unique identifier of the role
  /// @param channelId Unique identifier of the channel
  function clearChannelPermissionOverrides(
    uint256 roleId,
    bytes32 channelId
  ) external;
}
