//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceManager {
  // function createSpace(
  //   DataTypes.CreateSpaceData calldata info,
  //   DataTypes.CreateSpacePurchaseableEntitlementData calldata entitlement
  // ) external returns (uint256);

  /// @notice Create a new space.
  /// @param info The data to create the space.
  function createSpace(DataTypes.CreateSpaceData calldata info)
    external
    returns (uint256);

  /// @notice Create a new space with a token entitlement.
  function createSpaceWithTokenEntitlement(
    DataTypes.CreateSpaceData calldata info,
    DataTypes.CreateSpaceTokenEntitlementData calldata entitlement
  ) external returns (uint256);

  /// @notice Sets the default entitlement for a newly created space
  /// @param entitlementModuleAddress The address of the entitlement module
  function setDefaultEntitlementModule(address entitlementModuleAddress)
    external;

  // @notice Adds or removes an entitlement module from the whitelist and from the space entitlements
  function whitelistEntitlementModule(
    string calldata spaceId,
    address entitlementModuleAddress,
    bool whitelist
  ) external;

  /// @notice add an entitlement to an entitlement module
  function addRoleToEntitlementModule(
    string calldata spaceId,
    string calldata channelId,
    address entitlementAddress,
    uint256 roleId,
    bytes memory data
  ) external;

  /// @notice Removes an entitlement from an entitlement module
  function removeEntitlement(
    string calldata spaceId,
    string calldata channelId,
    address entitlementModuleAddress,
    uint256[] memory roleIds,
    bytes memory data
  ) external;

  function createRole(string calldata spaceId, string calldata name)
    external
    returns (uint256);

  function addPermissionToRole(
    string calldata spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external;

  /// @notice Checks if a user has access to space or channel based on the entitlements it holds
  /// @param spaceId The id of the space
  /// @param channelId The id of the channel
  /// @param user The address of the user
  /// @param permission The type of permission to check
  /// @return bool representing if the user has access or not
  function isEntitled(
    string calldata spaceId,
    string calldata channelId,
    address user,
    DataTypes.Permission memory permission
  ) external view returns (bool);

  /// @notice Get the space information by id.
  /// @param spaceId The id of the space
  /// @return SpaceInfo a struct representing the space info
  function getSpaceInfoBySpaceId(string calldata spaceId)
    external
    view
    returns (DataTypes.SpaceInfo memory);

  /// @notice Returns an array of multiple space information objects
  /// @return SpaceInfo[] an array containing the space info
  function getSpaces() external view returns (DataTypes.SpaceInfo[] memory);

  /// @notice Returns entitlements for a space
  /// @param spaceId The id of the space
  /// @return entitlementModules an array of entitlements
  function getEntitlementModulesBySpaceId(string calldata spaceId)
    external
    view
    returns (address[] memory entitlementModules);

  /// @notice returns if an entitlement module is whitelisted for a space
  function isEntitlementModuleWhitelisted(
    string calldata spaceId,
    address entitlementModuleAddress
  ) external view returns (bool);

  /// @notice Returns the entitlement info for a space
  function getEntitlementsInfoBySpaceId(string calldata spaceId)
    external
    view
    returns (DataTypes.EntitlementModuleInfo[] memory);

  function getSpaceIdByNetworkId(string calldata networkId)
    external
    view
    returns (uint256);

  function getChannelIdByNetworkId(
    string calldata spaceId,
    string calldata channelId
  ) external view returns (uint256);

  /// @notice Returns the owner of the space by space id
  /// @param spaceId The space id
  /// @return ownerAddress The address of the owner of the space
  function getSpaceOwnerBySpaceId(string calldata spaceId)
    external
    view
    returns (address ownerAddress);

  function getPermissionsBySpaceIdByRoleId(
    string calldata spaceId,
    uint256 roleId
  ) external view returns (DataTypes.Permission[] memory);

  function getPermissionFromMap(bytes32 permissionType)
    external
    view
    returns (DataTypes.Permission memory permission);

  function getRolesBySpaceId(string calldata spaceId)
    external
    view
    returns (DataTypes.Role[] memory);

  function getRoleBySpaceIdByRoleId(string calldata spaceId, uint256 roleId)
    external
    view
    returns (DataTypes.Role memory);
}
