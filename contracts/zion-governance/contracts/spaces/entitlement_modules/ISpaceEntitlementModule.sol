//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../SpaceStructs.sol";

interface ISpaceEntitlementModule {
  //administrator can add and remove moderators
  //moderators can add and remove entitlements

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    SpaceStructs.EntitlementType entitlementType
  ) external view returns (bool);

  // function createUserEntitlements(
  //     address originAddress,
  //     uint256 spaceId,
  //     uint256 roomId,
  //     address userAddress,
  //     SpaceStructs.EntitlementType[] calldata entitlementTypes
  // ) external returns (SpaceStructs.Entitlement[] memory);

  // function removeUserEntitlements(
  //     address originAddress,
  //     uint256 spaceId,
  //     uint256 roomId,
  //     address userAddress,
  //     SpaceStructs.EntitlementType[] calldata entitlementType
  // ) external returns (SpaceStructs.Entitlement[] memory);
}
