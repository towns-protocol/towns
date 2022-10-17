//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {DataTypes} from "../../libraries/DataTypes.sol";
import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";
import {IERC20} from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";

contract TokenEntitlementModule is EntitlementModuleBase {
  struct Entitlement {
    address grantedBy;
    uint256 grantedTime;
    uint256 roleId;
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
    string[] entitlementDescriptions;
  }

  struct SpaceTokenEntitlements {
    mapping(string => TokenEntitlement) entitlementsByDescription;
    string[] entitlementDescriptions;
    mapping(uint256 => RoomTokenEntitlements) roomEntitlementsByRoomId;
    mapping(string => string[]) tagsByPermission;
    mapping(uint256 => string[]) tagsByRoleId;
  }

  mapping(uint256 => SpaceTokenEntitlements) internal entitlementsBySpaceId;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) EntitlementModuleBase(name_, description_, spaceManager_) {}

  function setEntitlement(
    string memory spaceId,
    string memory channelId,
    uint256 roleId,
    bytes calldata entitlementData
  ) public override onlySpaceManager {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = spaceManager.getChannelIdByNetworkId(
      spaceId,
      channelId
    );
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    (string memory desc, address token, uint256 quantity) = abi.decode(
      entitlementData,
      (string, address, uint256)
    );

    if (token == address(0)) {
      revert("No tokens provided");
    }

    if (quantity == 0) {
      revert("No quantities provided");
    }

    if (bytes(channelId).length > 0) {
      TokenEntitlement storage tokenEntitlement = entitlementsBySpaceId[
        _spaceId
      ].roomEntitlementsByRoomId[_channelId].entitlementsByDescription[desc];

      ExternalToken memory externalToken = ExternalToken(token, quantity);
      tokenEntitlement.tokens.push(externalToken);

      Entitlement memory entitlement = Entitlement(
        msg.sender,
        block.timestamp,
        roleId
      );
      tokenEntitlement.entitlements.push(entitlement);
      // so we can iterate through all the token entitlements for a space
      entitlementsBySpaceId[_spaceId]
        .roomEntitlementsByRoomId[_channelId]
        .entitlementDescriptions
        .push(desc);
      //So we can look up all potential token entitlements for a permission
      setAllDescByPermissionNames(spaceId, roleId, desc);
    } else {
      TokenEntitlement storage tokenEntitlement = entitlementsBySpaceId[
        _spaceId
      ].entitlementsByDescription[desc];

      ExternalToken memory externalToken = ExternalToken(token, quantity);
      tokenEntitlement.tokens.push(externalToken);

      Entitlement memory entitlement = Entitlement(
        msg.sender,
        block.timestamp,
        roleId
      );

      tokenEntitlement.entitlements.push(entitlement);
      entitlementsBySpaceId[_spaceId].entitlementDescriptions.push(desc);

      setAllDescByPermissionNames(spaceId, roleId, desc);
    }
  }

  function setAllDescByPermissionNames(
    string memory spaceId,
    uint256 roleId,
    string memory desc
  ) internal {
    DataTypes.Permission[] memory permissions = ISpaceManager(_spaceManager)
      .getPermissionsBySpaceIdByRoleId(spaceId, roleId);

    uint256 _spaceId = ISpaceManager(_spaceManager).getSpaceIdByNetworkId(
      spaceId
    );

    for (uint256 j = 0; j < permissions.length; j++) {
      DataTypes.Permission memory permission = permissions[j];
      string memory permissionName = permission.name;
      entitlementsBySpaceId[_spaceId].tagsByPermission[permissionName].push(
        desc
      );
      entitlementsBySpaceId[_spaceId].tagsByRoleId[roleId].push(desc);
      //todo Add All Permission for every one
    }
  }

  function removeEntitlement(
    string calldata spaceId,
    string calldata channelId,
    uint256[] calldata,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = spaceManager.getChannelIdByNetworkId(
      spaceId,
      channelId
    );
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    if (ownerAddress != msg.sender || msg.sender != _spaceManager) {
      revert("Only the owner can update entitlements");
    }

    string memory desc = abi.decode(entitlementData, (string));

    if (bytes(channelId).length > 0) {
      delete entitlementsBySpaceId[_spaceId]
        .roomEntitlementsByRoomId[_channelId]
        .entitlementsByDescription[desc];
    } else {
      delete entitlementsBySpaceId[_spaceId].entitlementsByDescription[desc];
    }

    DataTypes.Role[] memory roles = ISpaceManager(_spaceManager)
      .getRolesBySpaceId(spaceId);

    for (uint256 i = 0; i < roles.length; i++) {
      delete entitlementsBySpaceId[_spaceId].tagsByRoleId[roles[i].roleId];
    }
  }

  function isEntitled(
    string calldata spaceId,
    string calldata channelId,
    address user,
    DataTypes.Permission memory permission
  ) public view override returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    string[] memory tags = entitlementsBySpaceId[_spaceId].tagsByPermission[
      permission.name
    ];

    for (uint256 i = 0; i < tags.length; i++) {
      if (isTokenEntitled(spaceId, channelId, user, tags[i])) {
        return true;
      }
    }

    return false;
  }

  function isTokenEntitled(
    string calldata spaceId,
    string calldata,
    address user,
    string memory desc
  ) public view returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    ExternalToken[] memory tokens = entitlementsBySpaceId[_spaceId]
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

  function getUserRoles(
    string calldata spaceId,
    string calldata channelId,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    //Get all the entitlements for this space
    string[] memory entitlementDescriptions = entitlementsBySpaceId[_spaceId]
      .entitlementDescriptions;

    //Create an empty array of the max size of all entitlements
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      entitlementDescriptions.length
    );
    //Iterate through all the entitlements
    for (uint256 i = 0; i < entitlementDescriptions.length; i++) {
      string memory desc = entitlementDescriptions[i];
      //If the user is entitled to a token entitlement
      if (isTokenEntitled(spaceId, channelId, user, desc)) {
        Entitlement[] memory entitlements = entitlementsBySpaceId[_spaceId]
          .entitlementsByDescription[desc]
          .entitlements;
        //Get all the roles for that token entitlement, and add them to the array for this user
        for (uint256 j = 0; j < entitlements.length; j++) {
          roles[i] = spaceManager.getRoleBySpaceIdByRoleId(
            spaceId,
            entitlements[i].roleId
          );
        }
      }
    }
    return roles;
  }
}
