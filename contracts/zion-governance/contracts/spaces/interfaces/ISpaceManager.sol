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
  function registerDefaultEntitlementModule(address entitlementModuleAddress)
    external;

  // @notice Adds or removes an entitlement module from the whitelist and from the space entitlements
  function whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementModuleAddress,
    bool whitelist
  ) external;

  /// @notice add an entitlement to an entitlement module
  function addRoleToEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    uint256 roleId,
    bytes memory data
  ) external;

  /// @notice Removes an entitlement from an entitlement module
  function removeEntitlement(
    uint256 spaceId,
    address entitlementModuleAddress,
    uint256[] memory roleIds,
    bytes memory data
  ) external;

  function createRole(
    uint256 spaceId,
    string memory name,
    bytes8 color
  ) external returns (uint256);

  function addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external;

  /// @notice Checks if a user has access to space or room based on the entitlements it holds
  /// @param spaceId The id of the space
  /// @param roomId The id of the room
  /// @param user The address of the user
  /// @param permission The type of permission to check
  /// @return bool representing if the user has access or not
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.Permission memory permission
  ) external view returns (bool);

  /// @notice Get the space information by id.
  /// @param _spaceId The id of the space
  /// @return SpaceInfo a struct representing the space info
  function getSpaceInfoBySpaceId(uint256 _spaceId)
    external
    view
    returns (DataTypes.SpaceInfo memory);

  /// @notice Returns an array of multiple space information objects
  /// @return SpaceInfo[] an array containing the space info
  function getSpaces() external view returns (DataTypes.SpaceInfo[] memory);

  /// @notice Returns entitlements for a space
  /// @param spaceId The id of the space
  /// @return entitlementModules an array of entitlements
  function getEntitlementModulesBySpaceId(uint256 spaceId)
    external
    view
    returns (address[] memory entitlementModules);

  /// @notice returns if an entitlement module is whitelisted for a space
  function isEntitlementModuleWhitelisted(
    uint256 spaceId,
    address entitlementModuleAddress
  ) external view returns (bool);

  /// @notice Returns the entitlement info for a space
  function getEntitlementsInfoBySpaceId(uint256 spaceId)
    external
    view
    returns (DataTypes.EntitlementModuleInfo[] memory);

  /// @notice Returns the space id by network id
  /// @param networkId The network space id
  /// @return uint256 Returns the space id
  function getSpaceIdByNetworkId(string calldata networkId)
    external
    view
    returns (uint256);

  /// @notice Returns the owner of the space by space id
  /// @param _spaceId The space id
  /// @return ownerAddress The address of the owner of the space
  function getSpaceOwnerBySpaceId(uint256 _spaceId)
    external
    view
    returns (address ownerAddress);

  function getPermissionsBySpaceIdByRoleId(uint256 spaceId, uint256 roleId)
    external
    view
    returns (DataTypes.Permission[] memory);

function getPermissionFromMap(bytes32 permissionType)
    external
    view
    returns (DataTypes.Permission memory permission);

  function getRolesBySpaceId(uint256 spaceId)
    external
    view
    returns (DataTypes.Role[] memory);

  function getRoleBySpaceIdByRoleId(uint256 spaceId, uint256 roleId)
    external
    view
    returns (DataTypes.Role memory);
}
