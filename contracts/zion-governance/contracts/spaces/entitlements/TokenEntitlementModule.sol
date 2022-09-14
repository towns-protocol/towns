//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "./../interfaces/ISpaceManager.sol";
import {ISpaceEntitlementModule} from "./../interfaces/ISpaceEntitlementModule.sol";
import {DataTypes} from "./../libraries/DataTypes.sol";
import {IERC20} from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {SpaceEntitlementModule} from "./SpaceEntitlementModule.sol";

contract TokenEntitlementModule is SpaceEntitlementModule {
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    DataTypes.EntitlementType entitlementType;
  }

  struct ExternalToken {
    address contractAddress;
    uint256 quantity;
  }

  struct TokenEntitlement {
    ExternalToken[] tokens;
    Entitlement[] entitlements;
  }

  struct RoomTokenEntitlements {
    mapping(string => TokenEntitlement) entitlementsByDescription;
  }

  struct SpaceTokenEntitlements {
    mapping(string => TokenEntitlement) entitlementsByDescription;
    mapping(uint256 => RoomTokenEntitlements) roomEntitlementsByRoomId;
    mapping(DataTypes.EntitlementType => string[]) tagsByEntitlementType;
  }

  mapping(uint256 => SpaceTokenEntitlements) internal entitlementsBySpaceId;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) SpaceEntitlementModule(name_, description_, spaceManager_) {}

  function setEntitlement(DataTypes.SetEntitlementData calldata vars)
    public
    override
    returns (bytes memory)
  {
    address ownerAddress = ISpaceManager(_spaceManager).getSpaceOwnerBySpaceId(
      vars.spaceId
    );

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    (
      string memory desc,
      address[] memory tokens,
      uint256[] memory quantities
    ) = abi.decode(vars.entitlementData, (string, address[], uint256[]));

    if (tokens.length == 0) {
      revert("No tokens provided");
    }

    if (tokens.length != quantities.length) {
      revert("Token and quantity arrays must be the same length");
    }

    if (vars.roomId > 0) {
      TokenEntitlement storage tokenEntitlement = entitlementsBySpaceId[
        vars.spaceId
      ].roomEntitlementsByRoomId[vars.roomId].entitlementsByDescription[desc];

      for (uint256 i = 0; i < tokens.length; i++) {
        ExternalToken memory externalToken = ExternalToken(
          tokens[i],
          quantities[i]
        );
        tokenEntitlement.tokens.push(externalToken);
      }

      for (uint256 i = 0; i < vars.entitlementTypes.length; i++) {
        Entitlement memory entitlement = Entitlement(
          msg.sender,
          block.timestamp,
          vars.entitlementTypes[i]
        );
        tokenEntitlement.entitlements.push(entitlement);
      }
    } else {
      TokenEntitlement storage tokenEntitlement = entitlementsBySpaceId[
        vars.spaceId
      ].entitlementsByDescription[desc];

      for (uint256 i = 0; i < tokens.length; i++) {
        ExternalToken memory externalToken = ExternalToken(
          tokens[i],
          quantities[i]
        );
        tokenEntitlement.tokens.push(externalToken);
      }

      for (uint256 i = 0; i < vars.entitlementTypes.length; i++) {
        Entitlement memory entitlement = Entitlement(
          msg.sender,
          block.timestamp,
          vars.entitlementTypes[i]
        );

        tokenEntitlement.entitlements.push(entitlement);

        entitlementsBySpaceId[vars.spaceId]
          .tagsByEntitlementType[vars.entitlementTypes[i]]
          .push(desc);
      }
    }

    return vars.entitlementData;
  }

  function removeUserEntitlement(
    uint256 spaceId,
    uint256 roomId,
    string calldata desc,
    DataTypes.EntitlementType[] memory entitlementTypes
  ) public {
    address ownerAddress = ISpaceManager(_spaceManager).getSpaceOwnerBySpaceId(
      spaceId
    );

    if (ownerAddress != msg.sender || msg.sender != _spaceManager) {
      revert("Only the owner can update entitlements");
    }

    if (roomId > 0) {
      delete entitlementsBySpaceId[spaceId]
        .roomEntitlementsByRoomId[roomId]
        .entitlementsByDescription[desc];
    } else {
      delete entitlementsBySpaceId[spaceId].entitlementsByDescription[desc];
    }

    for (uint256 i = 0; i < entitlementTypes.length; i++) {
      delete entitlementsBySpaceId[spaceId].tagsByEntitlementType[
        entitlementTypes[i]
      ];
    }
  }

  function isEntitled(
    uint256 spaceId,
    uint256,
    address user,
    DataTypes.EntitlementType entitlementType
  ) public view override returns (bool) {
    string[] memory tags = entitlementsBySpaceId[spaceId].tagsByEntitlementType[
      entitlementType
    ];

    for (uint256 i = 0; i < tags.length; i++) {
      if (isTokenEntitled(spaceId, user, tags[i])) {
        return true;
      }
    }

    return false;
  }

  function isTokenEntitled(
    uint256 spaceId,
    address user,
    string memory desc
  ) public view returns (bool) {
    ExternalToken[] memory tokens = entitlementsBySpaceId[spaceId]
      .entitlementsByDescription[desc]
      .tokens;

    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 quantity = tokens[i].quantity;
      if (quantity > 0) {
        address contractAddress = tokens[i].contractAddress;

        if (
          IERC721(contractAddress).balanceOf(user) >= quantity ||
          IERC20(contractAddress).balanceOf(user) >= quantity
        ) {
          return true;
        }
      }
    }

    return false;
  }
}
