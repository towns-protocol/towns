//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface IPermissionRegistry {
  function getPermissionByPermissionType(bytes32 permissionType)
    external
    view
    returns (DataTypes.Permission memory);
}
