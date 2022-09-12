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

  /// @notice Connects the node network id to a space id
  /// @param spaceId The space id to connect to the network id
  /// @param networkId The network id to connect to the space id
  function setNetworkIdToSpaceId(uint256 spaceId, string calldata networkId)
    external;

  /// @notice Sets the default entitlement for a newly created space
  /// @param entitlementModuleAddress The address of the entitlement module
  /// @param entitlementModuleTag The tag of the entitlement module
  function registerDefaultEntitlementModule(
    address entitlementModuleAddress,
    string memory entitlementModuleTag
  ) external;

  /// @notice Checks if a user has access to space or room based on the entitlements it holds
  /// @param spaceId The id of the space
  /// @param roomId The id of the room
  /// @param user The address of the user
  /// @param entitlementType The type of entitlement to check
  /// @return bool representing if the user has access or not
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) external view returns (bool);

  /// @notice Get the space information by id.
  /// @param _spaceId The id of the space
  /// @return SpaceInfo a struct representing the space info
  function getSpaceInfoBySpaceId(uint256 _spaceId)
    external
    view
    returns (DataTypes.SpaceInfo memory);

  /// @notice whitelist an entitlement module to a space and registers an entitlement to an entitlement module
  function addEntitlement(
    uint256 spaceId,
    address entitlementAddress,
    string memory entitlementTag,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) external;

  /// @notice Returns an array of multiple space information objects
  /// @return SpaceInfo[] an array containing the space info
  function getSpaces() external view returns (DataTypes.SpaceInfo[] memory);

  /// @notice Returns entitlements for a space
  /// @param spaceId The id of the space
  /// @return entitlements an array of entitlements
  function getEntitlementsBySpaceId(uint256 spaceId)
    external
    view
    returns (address[] memory entitlements);

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
}
