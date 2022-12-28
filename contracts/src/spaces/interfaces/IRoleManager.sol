//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface IRoleManager {
  function setSpaceManager(address spaceManager) external;

  function createRole(
    uint256 spaceId,
    string memory name
  ) external returns (uint256);

  function createRole(
    uint256 spaceId,
    string memory name,
    DataTypes.Permission[] calldata permissions
  ) external returns (uint256);

  function createOwnerRole(uint256 spaceId) external returns (uint256);

  function addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external;

  function removePermissionFromRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external;

  function removeRole(uint256 spaceId, uint256 roleId) external;

  function modifyRoleName(
    uint256 spaceId,
    uint256 roleId,
    string calldata newRoleName
  ) external;

  /// @notice Returns the permissions for a role in a space
  function getPermissionsBySpaceIdByRoleId(
    uint256 spaceId,
    uint256 roleId
  ) external view returns (DataTypes.Permission[] memory);

  /// @notice Returns the roles of a space
  function getRolesBySpaceId(
    uint256 spaceId
  ) external view returns (DataTypes.Role[] memory);

  /// @notice Returns the role of a space by id
  function getRoleBySpaceIdByRoleId(
    uint256 spaceId,
    uint256 roleId
  ) external view returns (DataTypes.Role memory);
}
