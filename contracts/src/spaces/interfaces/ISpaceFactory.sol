// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceFactory {
  function updateImplementations(
    address space,
    address tokenEntitlement,
    address userEntitlement,
    address gateToken,
    address spaceUpgrades
  ) external;

  /// @notice Creates a new space
  /// @param _createSpaceData The data required to create a space
  /// @param _everyonePermissions The permissions of the everyone role
  /// @param _extraEntitlements The extra entitlements of the space
  /// @dev The space network id must be unique
  /// @return The address of the new space
  function createSpace(
    DataTypes.CreateSpaceData calldata _createSpaceData,
    string[] calldata _everyonePermissions,
    DataTypes.CreateSpaceExtraEntitlements calldata _extraEntitlements
  ) external returns (address);

  /// @notice Adds permissions to the owner role at space creation
  /// @param _permissions The permissions to add
  function addOwnerPermissions(string[] calldata _permissions) external;

  /// @notice Returns token id by network id
  function getTokenIdByNetworkId(
    string calldata spaceId
  ) external view returns (uint256);

  /// @notice Returns space address by network id
  function getSpaceAddressByNetworkId(
    string calldata spaceId
  ) external view returns (address);

  /// @notice Returns the initial owner permissions at space creation
  function getOwnerPermissions() external view returns (string[] memory);
}
