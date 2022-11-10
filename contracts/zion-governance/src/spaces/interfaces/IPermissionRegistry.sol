//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface IPermissionRegistry {
  /// @notice Get the permission of a space
  /// @param permissionType The type of permission
  function getPermissionByPermissionType(
    bytes32 permissionType
  ) external view returns (DataTypes.Permission memory);

  /// @notice Get all permisions on the registry
  function getAllPermissions()
    external
    view
    returns (DataTypes.Permission[] memory);
}
