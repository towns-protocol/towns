//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./SpaceStructs.sol";

interface ISpaceManager {
  //administrator can add and remove moderators
  //moderators can add and remove entitlements

  function createSpace(
    string calldata spaceName,
    address[] calldata entitlementModuleAddresses
  ) external;

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    SpaceStructs.EntitlementType entitlementType,
    address userAddress
  ) external view returns (bool);

  function getSpaceValues(uint256 _spaceId)
    external
    view
    returns (
      uint256 spaceId,
      uint256 createdAt,
      string memory name,
      address creatorAddress,
      address ownerAddress
    );

  function addEntitlementModuleAddress(
    uint256 spaceId,
    address _entitlementModuleAddress,
    string memory tag
  ) external;

  function getSpaceOwner(uint256 _spaceId)
    external
    view
    returns (address ownerAddress);

  function getSpaceEntitlementModuleAddresses(uint256 _spaceId)
    external
    view
    returns (address[] memory entitlementModuleAddresses);
}
