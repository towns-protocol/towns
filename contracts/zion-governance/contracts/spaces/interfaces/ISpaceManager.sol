//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";

interface ISpaceManager {
  // admin can add and remove mods
  // mods can add and remove enttilements
  function createSpace(DataTypes.CreateSpaceData calldata vars)
    external
    returns (uint256);

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) external view returns (bool);

  function getSpaceInfoBySpaceId(uint256 _spaceId)
    external
    view
    returns (DataTypes.SpaceInfo memory);

  function addEntitlementModule(DataTypes.AddEntitlementData calldata vars)
    external;

  function getEntitlementsBySpaceId(uint256 spaceId)
    external
    view
    returns (address[] memory entitlements);

  function getSpaceOwnerBySpaceId(uint256 _spaceId)
    external
    view
    returns (address ownerAddress);
}
