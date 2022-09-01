//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceEntitlementModule {
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    DataTypes.EntitlementType entitlementType
  ) external view returns (bool);
}
