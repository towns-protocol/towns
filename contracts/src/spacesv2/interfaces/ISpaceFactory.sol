// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceFactory {
  function updateImplementations(
    address space,
    address tokenEntitlement,
    address userEntitlement
  ) external;

  function createSpace(
    string calldata spaceName,
    string calldata spaceNetworkId,
    string calldata spaceMetadata,
    string[] calldata _everyonePermissions,
    DataTypes.CreateSpaceExtraEntitlements calldata _extraEntitlements
  ) external returns (address);
}
