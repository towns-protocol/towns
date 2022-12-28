// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceFactory {
  function updateInitialImplementations(
    address space,
    address tokenEntitlement,
    address userEntitlement
  ) external;

  function createSpace(
    DataTypes.CreateSpaceData calldata info,
    DataTypes.CreateSpaceEntitlementData calldata entitlementData,
    string[] calldata permissions
  ) external returns (address);
}
