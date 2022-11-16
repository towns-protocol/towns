//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {IERC20} from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {IRoleManager} from "../../interfaces/IRoleManager.sol";

import {DataTypes} from "../../libraries/DataTypes.sol";
import {PermissionTypes} from "../../libraries/PermissionTypes.sol";
import {Errors} from "../../libraries/Errors.sol";

import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";

contract TokenEntitlementModule is EntitlementModuleBase {
  struct TokenEntitlement {
    uint256 entitlementId;
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    DataTypes.ExternalToken[] tokens;
  }

  struct SpaceTokenEntitlements {
    mapping(uint256 => TokenEntitlement) entitlementsById;
    uint256[] entitlementIds;
    mapping(uint256 => uint256[]) roleIdsByChannelId;
    mapping(uint256 => uint256[]) entitlementIdsByRoleId;
  }

  struct EntitlementInfo {
    uint256 entitlementId;
    bytes entitlementData;
  }

  mapping(uint256 => SpaceTokenEntitlements) internal entitlementsBySpaceId;

  constructor(
    string memory name_,
    string memory description_,
    string memory moduleType_,
    address spaceManager_,
    address roleManager_,
    address permissionRegistry_
  )
    EntitlementModuleBase(
      name_,
      description_,
      moduleType_,
      spaceManager_,
      roleManager_,
      permissionRegistry_
    )
  {}

  function setSpaceEntitlement(
    uint256 spaceId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    // get the length of the total Ids to get our next Id
    uint256 entitlementId = entitlementsBySpaceId[spaceId]
      .entitlementIds
      .length;

    // and add it to the array for iteration
    entitlementsBySpaceId[spaceId].entitlementIds.push(entitlementId);

    //Get and save the main entitlement object
    TokenEntitlement storage tokenEntitlement = entitlementsBySpaceId[spaceId]
      .entitlementsById[entitlementId];
    _addNewTokenEntitlement(
      tokenEntitlement,
      entitlementData,
      roleId,
      entitlementId
    );

    //Set so we can look up all entitlements by role when creating a new channel with a roleId
    entitlementsBySpaceId[spaceId].entitlementIdsByRoleId[roleId].push(
      entitlementId
    );
  }

  function addRoleIdToChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) external override onlySpaceManager {
    // check for duplicate role ids
    uint256[] memory roleIds = entitlementsBySpaceId[spaceId]
      .roleIdsByChannelId[channelId];

    for (uint256 i = 0; i < roleIds.length; i++) {
      if (roleIds[i] == roleId) {
        revert Errors.RoleAlreadyExists();
      }
    }

    //Add the roleId to the mapping for the channel
    entitlementsBySpaceId[spaceId].roleIdsByChannelId[channelId].push(roleId);
  }

  function _addNewTokenEntitlement(
    TokenEntitlement storage tokenEntitlement,
    bytes calldata entitlementData,
    uint256 roleId,
    uint256 entitlementId
  ) internal {
    DataTypes.ExternalTokenEntitlement memory externalTokenEntitlement = abi
      .decode(entitlementData, (DataTypes.ExternalTokenEntitlement));

    //Adds all the tokens passed in to gate this role with an AND
    if (externalTokenEntitlement.tokens.length == 0) {
      revert("No tokens set");
    }

    DataTypes.ExternalToken[] memory externalTokens = externalTokenEntitlement
      .tokens;
    for (uint256 i = 0; i < externalTokens.length; i++) {
      if (externalTokens[i].contractAddress == address(0)) {
        revert("No tokens provided");
      }

      if (externalTokens[i].quantity == 0) {
        revert("No quantities provided");
      }
      DataTypes.ExternalToken memory token = externalTokens[i];
      tokenEntitlement.tokens.push(token);
    }

    tokenEntitlement.grantedBy = msg.sender;
    tokenEntitlement.grantedTime = block.timestamp;
    tokenEntitlement.roleId = roleId;
    tokenEntitlement.entitlementId = entitlementId;
  }

  function removeSpaceEntitlement(
    uint256 spaceId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    uint256 entitlementId = abi.decode(entitlementData, (uint256));

    //When removing, remove it from the main map and the roleId map but NOT from the array
    //of all EntitlementIds since we use that as a counter

    //Remove the association of this entitlementId to this roleId
    uint256[] memory entitlementIdsFromRoleIds = entitlementsBySpaceId[spaceId]
      .entitlementIdsByRoleId[roleId];
    for (uint256 i = 0; i < entitlementIdsFromRoleIds.length; i++) {
      if (entitlementIdsFromRoleIds[i] == entitlementId) {
        delete entitlementsBySpaceId[spaceId].entitlementIdsByRoleId[i];
      }
    }

    //delete the main object
    delete entitlementsBySpaceId[spaceId].entitlementsById[entitlementId];
  }

  function removeRoleIdFromChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) external override onlySpaceManager {
    //Remove the association of this roleId to this channelId
    uint256[] memory roleIdsFromChannelIds = entitlementsBySpaceId[spaceId]
      .roleIdsByChannelId[channelId];
    for (uint256 i = 0; i < roleIdsFromChannelIds.length; i++) {
      if (roleIdsFromChannelIds[i] == roleId) {
        delete entitlementsBySpaceId[spaceId].roleIdsByChannelId[channelId][i];
      }
    }
  }

  function isEntitled(
    uint256 spaceId,
    uint256 channelId,
    address user,
    DataTypes.Permission memory permission
  ) public view override returns (bool) {
    if (channelId > 0) {
      return isEntitledToChannel(spaceId, channelId, user, permission);
    } else {
      return isEntitledToSpace(spaceId, user, permission);
    }
  }

  function isEntitledToSpace(
    uint256 spaceId,
    address user,
    DataTypes.Permission memory permission
  ) internal view returns (bool) {
    //Get all the entitlement ids
    uint256[] memory entitlementIds = entitlementsBySpaceId[spaceId]
      .entitlementIds;

    //For each, check if the role in it has the permission we are looking for,
    //if so add it to the array of validRoleIds
    uint256[] memory validRoleIds = new uint256[](entitlementIds.length);
    for (uint256 i = 0; i < entitlementIds.length; i++) {
      uint256 entitlementId = entitlementIds[i];
      TokenEntitlement memory entitlement = entitlementsBySpaceId[spaceId]
        .entitlementsById[entitlementId];
      uint256 roleId = entitlement.roleId;
      if (_checkRoleHasPermission(spaceId, roleId, permission)) {
        validRoleIds[i] = roleId;
      }
    }

    //for each of those roles, get all the entitlements associated with that role
    for (uint256 i = 0; i < validRoleIds.length; i++) {
      uint256 roleId = validRoleIds[i];
      uint256[] memory entitlementIdsFromRoleIds = entitlementsBySpaceId[
        spaceId
      ].entitlementIdsByRoleId[roleId];
      //And check if that entitlement allows the user access, if so return true
      for (uint256 j = 0; j < entitlementIdsFromRoleIds.length; j++) {
        if (isTokenEntitled(spaceId, user, entitlementIdsFromRoleIds[j])) {
          return true;
        }
      }
    }
    //otherwise if none do, return false
    return false;
  }

  function isEntitledToChannel(
    uint256 spaceId,
    uint256 channelId,
    address user,
    DataTypes.Permission memory permission
  ) internal view returns (bool) {
    // First get all the roles for that channel
    uint256[] memory channelRoleIds = entitlementsBySpaceId[spaceId]
      .roleIdsByChannelId[channelId];

    // Then get strip that down to only the roles that have the permission we care about
    uint256[] memory validRoleIds = new uint256[](channelRoleIds.length);
    for (uint256 i = 0; i < channelRoleIds.length; i++) {
      uint256 roleId = channelRoleIds[i];
      if (_checkRoleHasPermission(spaceId, roleId, permission)) {
        validRoleIds[i] = roleId;
      }
    }

    //for each of those roles, get all the entitlements associated with that role
    for (uint256 i = 0; i < validRoleIds.length; i++) {
      uint256[] memory entitlementIdsFromRoleIds = entitlementsBySpaceId[
        spaceId
      ].entitlementIdsByRoleId[validRoleIds[i]];

      //And check if that entitlement allows the user access, if so return true
      for (uint256 j = 0; j < entitlementIdsFromRoleIds.length; j++) {
        if (isTokenEntitled(spaceId, user, entitlementIdsFromRoleIds[j])) {
          return true;
        }
      }
    }

    //if none of them do, return false
    return false;
  }

  function isTokenEntitled(
    uint256 spaceId,
    address user,
    uint256 entitlementId
  ) public view returns (bool) {
    DataTypes.ExternalToken[] memory tokens = entitlementsBySpaceId[spaceId]
      .entitlementsById[entitlementId]
      .tokens;

    bool entitled = false;
    //Check each token for a given entitlement, if any are false, the whole thing is false
    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 quantity = tokens[i].quantity;
      uint256 tokenId = tokens[i].tokenId;
      bool isSingleToken = tokens[i].isSingleToken;

      address contractAddress = tokens[i].contractAddress;

      if (
        _isERC721Entitled(
          contractAddress,
          user,
          quantity,
          isSingleToken,
          tokenId
        ) || _isERC20Entitled(contractAddress, user, quantity)
      ) {
        entitled = true;
      } else {
        entitled = false;
        break;
      }
    }

    return entitled;
  }

  function _isERC721Entitled(
    address contractAddress,
    address user,
    uint256 quantity,
    bool isSingleToken,
    uint256 tokenId
  ) internal view returns (bool) {
    if (isSingleToken) {
      try IERC721(contractAddress).ownerOf(tokenId) returns (address owner) {
        if (owner == user) {
          return true;
        }
      } catch {}
    } else {
      try IERC721(contractAddress).balanceOf(user) returns (uint256 balance) {
        if (balance >= quantity) {
          return true;
        }
      } catch {}
    }
    return false;
  }

  function _isERC20Entitled(
    address contractAddress,
    address user,
    uint256 quantity
  ) internal view returns (bool) {
    try IERC20(contractAddress).balanceOf(user) returns (uint256 balance) {
      if (balance >= quantity) {
        return true;
      }
    } catch {}
    return false;
  }

  /// Check if any of the entitlements contain the permission we are checking for
  function _checkRoleHasPermission(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) internal view returns (bool) {
    DataTypes.Permission[] memory permissions = IRoleManager(_roleManager)
      .getPermissionsBySpaceIdByRoleId(spaceId, roleId);

    for (uint256 p = 0; p < permissions.length; p++) {
      if (
        keccak256(abi.encodePacked(permissions[p].name)) ==
        keccak256(abi.encodePacked(permission.name))
      ) {
        return true;
      }
    }

    return false;
  }

  function getUserRoles(
    uint256 spaceId,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    //Get all the entitlements for this space
    uint256[] memory entitlementIds = entitlementsBySpaceId[spaceId]
      .entitlementIds;

    //Create an empty array of the max size of all entitlements
    DataTypes.Role[] memory roles = new DataTypes.Role[](entitlementIds.length);
    //Iterate through all the entitlements
    for (uint256 i = 0; i < entitlementIds.length; i++) {
      uint256 entitlementId = entitlementIds[i];
      //If the user is entitled to a token entitlement
      //Get all the roles for that token entitlement, and add them to the array for this user
      if (isTokenEntitled(spaceId, user, entitlementId)) {
        uint256 roleId = entitlementsBySpaceId[spaceId]
          .entitlementsById[entitlementId]
          .roleId;

        roles[i] = IRoleManager(_roleManager).getRoleBySpaceIdByRoleId(
          spaceId,
          roleId
        );
      }
    }
    return roles;
  }
}
