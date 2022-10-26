//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../src/spaces/interfaces/ISpaceManager.sol";
import {DataTypes} from "../../src/spaces/libraries/DataTypes.sol";

abstract contract SpaceTestUtils {
  function createSimpleSpace(
    string memory spaceName,
    string memory spaceNetworkId,
    ISpaceManager spaceManager
  ) internal returns (uint256) {
    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData(spaceName, spaceNetworkId),
      getEmptyCreateSpaceEntitlementData(),
      new DataTypes.Permission[](0)
    );
    return spaceId;
  }

  function createSimpleSpaceWithEveryonePermissions(
    string memory spaceName,
    string memory spaceNetworkId,
    DataTypes.Permission[] memory permissions,
    ISpaceManager spaceManager
  ) internal returns (uint256) {
    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData(spaceName, spaceNetworkId),
      getEmptyCreateSpaceEntitlementData(),
      permissions
    );
    return spaceId;
  }

  function getEmptyCreateSpaceEntitlementData()
    internal
    pure
    returns (DataTypes.CreateSpaceEntitlementData memory)
  {
    DataTypes.CreateSpaceEntitlementData memory data = DataTypes
      .CreateSpaceEntitlementData(
        "",
        new DataTypes.Permission[](0),
        new DataTypes.ExternalTokenEntitlement[](0),
        new address[](0)
      );
    return data;
  }

  function getCreateSpaceEntitlementData(
    string memory roleName,
    DataTypes.Permission[] memory permissions,
    DataTypes.ExternalTokenEntitlement[] memory externalTokenEntitlements,
    address[] memory users
  ) internal pure returns (DataTypes.CreateSpaceEntitlementData memory) {
    DataTypes.CreateSpaceEntitlementData memory data = DataTypes
      .CreateSpaceEntitlementData(
        roleName,
        permissions,
        externalTokenEntitlements,
        users
      );
    return data;
  }

  function getTestNFTEntitlement(address nftAddress)
    internal
    pure
    returns (DataTypes.ExternalTokenEntitlement memory)
  {
    address tokenAddress = address(nftAddress);
    uint256 quantity = 1;
    bool isSingleToken = false;
    uint256 tokenId = 0;

    DataTypes.ExternalToken memory externalToken = DataTypes.ExternalToken(
      tokenAddress,
      quantity,
      isSingleToken,
      tokenId
    );

    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = externalToken;

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        "Test Token Gate",
        externalTokens
      );
    return externalTokenEntitlement;
  }
}
