// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";

interface ISpace is IERC165 {
  /// ***** Space Structs *****

  /// @dev SpaceInfo is a struct for storing information about a space
  /// @param spaceAddress the address of the space
  /// @param owner the owner of the space
  /// @param spaceId the network id of the space linking it to the dendrite/casablanca protocol
  /// @param disabled whether the space is disabled or not
  struct SpaceInfo {
    address spaceAddress;
    address owner;
    string spaceId;
    bool disabled;
  }

  /// @dev ChannelInfo is a struct for storing information about a channel
  /// @param channelId the network id of the channel linking it to the dendrite/casablanca protocol
  /// @param disabled whether the channel is disabled or not
  struct ChannelInfo {
    bytes32 channelHash;
    string channelId;
    string name;
    bool disabled;
  }

  /// ***** Contract Logic *****

  /// @dev Returns the type of the contract.
  function contractType() external pure returns (bytes32);

  /// @dev Returns the version of the contract.
  function contractVersion() external pure returns (uint8);

  /// ***** Space Management *****
  /// @notice initializes a new Space
  /// @param name the name of the space
  /// @param networkId the network id of the space linking it to the dendrite/casablanca protocol
  /// @param modules the initial modules to be used by the space for gating
  function initialize(
    string memory name,
    string memory networkId,
    address token,
    uint256 tokenId,
    address[] memory modules
  ) external;

  /// @notice fetches the Space owner
  /// @return the address of the Space owner
  function owner() external view returns (address);

  /// @notice sets whether the space is disabled or not
  /// @param disabled whether to make the space disabled or not
  function setSpaceAccess(bool disabled) external;

  /// @notice sets a created roleId to be the owner role id for the Space
  /// @param roleId the roleId to be set as the owner role id
  function setOwnerRoleId(uint256 roleId) external;

  /// @notice fetches the Space information
  /// @return spaceInfo the Space information
  function getSpaceInfo() external view returns (SpaceInfo memory spaceInfo);

  /// ***** Channel Management *****

  /// @notice fetches the Channel information by the channelId
  /// @param channelId the channelId to fetch the information for
  /// @return channelInfo the Channel information
  function getChannelInfo(
    string calldata channelId
  ) external view returns (ChannelInfo memory channelInfo);

  /// @notice fetches the Channel information by the hashed channelId
  /// @param channelHash the hashed channelId
  /// @return the Channel information
  function getChannelByHash(
    bytes32 channelHash
  ) external view returns (DataTypes.Channel memory);

  /// @notice sets whether the channel is disabled or not
  /// @param channelId the channelId to set the access for
  /// @param disabled whether to make the channel disabled or not
  function setChannelAccess(string calldata channelId, bool disabled) external;

  /// @notice creates a new channel for the space
  /// @param channelName the name of the channel
  /// @param channelId the network id of the channel linking it to the dendrite/casablanca protocol
  /// @param roleIds the roleIds to be set as the initial roles for the channel
  /// @return the channelId of the created channel
  function createChannel(
    string memory channelName,
    string memory channelId,
    uint256[] memory roleIds
  ) external returns (bytes32);

  /// @notice updates a channel name
  /// @param channelId the channelId to update
  /// @param channelName the new name of the channel
  function updateChannel(
    string calldata channelId,
    string memory channelName
  ) external;

  /// ***** Role Management *****
  /// @notice fetches the all the created roles for the space
  function getRoles() external view returns (DataTypes.Role[] memory);

  /// @notice creates a new role for the space
  /// @param roleName the name of the role
  /// @param permissions the permissions to be set for the role
  /// @param entitlements the initial entitlements to gate the role
  /// @return the roleId of the created role
  function createRole(
    string memory roleName,
    string[] memory permissions,
    DataTypes.Entitlement[] memory entitlements
  ) external returns (uint256);

  /// @notice updates a role name by roleId
  /// @param roleId the roleId to update
  /// @param roleName the new name of the role
  function updateRole(uint256 roleId, string memory roleName) external;

  /// @notice removes a role by roleId
  /// @param roleId the roleId to remove
  function removeRole(uint256 roleId) external;

  /// @notice fetches the role information by roleId
  /// @param roleId the roleId to fetch the role information for
  /// @return the role information
  function getRoleById(
    uint256 roleId
  ) external view returns (DataTypes.Role memory);

  /// ***** Permission Management *****
  /// @notice adds a permission to a role by roleId
  /// @param roleId the roleId to add the permission to
  /// @param permissions the permissions to add to the role
  function addPermissionsToRole(
    uint256 roleId,
    string[] memory permissions
  ) external;

  /// @notice fetches the permissions for a role by roleId
  /// @param roleId the roleId to fetch the permissions for
  /// @return permissions array for the role
  function getPermissionsByRoleId(
    uint256 roleId
  ) external view returns (string[] memory);

  /// @notice upgrades an entitlement module implementation
  /// @param _entitlement the current entitlement address
  /// @param _newEntitlement the new entitlement address
  function upgradeEntitlement(
    address _entitlement,
    address _newEntitlement
  ) external;

  /// @notice removes a permission from a role by roleId
  /// @param roleId the roleId to remove the permission from
  /// @param permissions the permissions to remove from the role
  function removePermissionsFromRole(
    uint256 roleId,
    string[] memory permissions
  ) external;

  /// ***** Entitlement Management *****
  /// @notice gets the entitlements for a given role
  /// @param roleId the roleId to fetch the entitlements for
  /// @return the entitlements for the role
  function getEntitlementIdsByRoleId(
    uint256 roleId
  ) external view returns (bytes32[] memory);

  /// @notice gets an entitlement address by its module type
  /// @param moduleType the module type to fetch the entitlement for
  /// @return the entitlement address
  /// @dev if two entitlements have the same name it will return the last one in the array
  function getEntitlementByModuleType(
    string memory moduleType
  ) external view returns (address);

  /// @notice checks if a user is entitled to a permission in a channel
  /// @param channelId the channelId to check the permission for
  /// @param user the user to check the permission for
  /// @param permission the permission to check
  /// @return whether the user is entitled to the permission in the channel
  function isEntitledToChannel(
    string calldata channelId,
    address user,
    string calldata permission
  ) external view returns (bool);

  /// @notice checks if a user is entitled to a permission in the space
  /// @param user the user to check the permission for
  /// @param permission the permission to check
  /// @return whether the user is entitled to the permission in the space
  function isEntitledToSpace(
    address user,
    string calldata permission
  ) external view returns (bool);

  /// @notice fetches all the channels for the space
  function getChannels() external view returns (bytes32[] memory);

  /// @notice fetches all the entitlements for the space
  /// @return entitlement modules array
  function getEntitlementModules()
    external
    view
    returns (DataTypes.EntitlementModule[] memory);

  /// @notice sets a new entitlement module for the space
  /// @param entitlementModule the address of the new entitlement
  /// @param whitelist whether to set the entitlement as activated or not
  function setEntitlementModule(
    address entitlementModule,
    bool whitelist
  ) external;

  /// @notice removes an entitlement from the space
  /// @param roleId the roleId to remove the entitlement from
  /// @param entitlement the address of the entitlement to remove
  function removeRoleFromEntitlement(
    uint256 roleId,
    DataTypes.Entitlement memory entitlement
  ) external;

  /// @notice adds a role to an entitlement
  /// @param roleId the roleId to add to the entitlement
  /// @param entitlement the address of the entitlement
  function addRoleToEntitlement(
    uint256 roleId,
    DataTypes.Entitlement memory entitlement
  ) external;

  /// @notice adds a role to a channel
  /// @param channelId the channelId to add the role to
  /// @param entitlement the address of the entitlement that we are adding the role to
  /// @param roleId the roleId to add to the channel
  function addRoleToChannel(
    string calldata channelId,
    address entitlement,
    uint256 roleId
  ) external;

  /// @notice removes a role from a channel
  /// @param channelId the channelId to remove the role from
  /// @param entitlement the address of the entitlement that we are removing the role from
  /// @param roleId the roleId to remove from the channel
  function removeRoleFromChannel(
    string calldata channelId,
    address entitlement,
    uint256 roleId
  ) external;
}
