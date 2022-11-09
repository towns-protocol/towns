//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {IRoleManager} from "../../interfaces/IRoleManager.sol";
import {DataTypes} from "../../libraries/DataTypes.sol";
import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";
import {IERC20} from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";

contract TokenEntitlementModule is EntitlementModuleBase {
  struct TokenEntitlement {
    string tag;
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    DataTypes.ExternalToken[] tokens;
  }

  struct RoomTokenEntitlements {
    mapping(string => TokenEntitlement) entitlementsByTag;
    string[] entitlementTags;
  }

  struct SpaceTokenEntitlements {
    mapping(string => TokenEntitlement) entitlementsByTag;
    string[] entitlementTags;
    mapping(uint256 => RoomTokenEntitlements) roomEntitlementsByRoomId;
    mapping(string => string[]) tagsByPermission;
    mapping(uint256 => string[]) tagsByRoleId;
  }

  mapping(uint256 => SpaceTokenEntitlements) internal entitlementsBySpaceId;

  // spaceId => channelId => roleId => entitlement
  mapping(uint256 => mapping(uint256 => mapping(uint256 => bytes)))
    internal _entitlementDataBySpaceIdByChannelIdByRoleId;

  // spaceId => roleId => entitlement
  mapping(uint256 => mapping(uint256 => bytes))
    internal _entitlementDataBySpaceIdByRoleId;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_,
    address roleManager_
  ) EntitlementModuleBase(name_, description_, spaceManager_, roleManager_) {}

  function getEntitlementData(
    string calldata spaceId,
    string calldata channelId,
    uint256 roleId
  ) public view returns (bytes memory) {
    uint256 _spaceId = ISpaceManager(_spaceManager).getSpaceIdByNetworkId(
      spaceId
    );

    if (bytes(channelId).length == 0) {
      return _entitlementDataBySpaceIdByRoleId[_spaceId][roleId];
    } else {
      uint256 _channelId = ISpaceManager(_spaceManager).getChannelIdByNetworkId(
        spaceId,
        channelId
      );
      return
        _entitlementDataBySpaceIdByChannelIdByRoleId[_spaceId][_channelId][
          roleId
        ];
    }
  }

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

    DataTypes.ExternalTokenEntitlement memory externalTokenEntitlement = abi
      .decode(entitlementData, (DataTypes.ExternalTokenEntitlement));

    string memory tag = externalTokenEntitlement.tag;

    if (bytes(channelId).length > 0) {
      // save entitlement data by channel
      _entitlementDataBySpaceIdByChannelIdByRoleId[_spaceId][_channelId][
        roleId
      ] = entitlementData;

      TokenEntitlement storage tokenEntitlement = entitlementsBySpaceId[
        _spaceId
      ].roomEntitlementsByRoomId[_channelId].entitlementsByTag[tag];

      _addNewTokenEntitlement(tokenEntitlement, entitlementData, roleId);

      // so we can iterate through all the token entitlements for a space
      entitlementsBySpaceId[_spaceId]
        .roomEntitlementsByRoomId[_channelId]
        .entitlementTags
        .push(tag);
      //So we can look up all potential token entitlements for a permission
      setAllDescByPermissionNames(spaceId, roleId, tag);
    } else {
      // save entitlement data by space
      _entitlementDataBySpaceIdByRoleId[_spaceId][roleId] = entitlementData;

      TokenEntitlement storage tokenEntitlement = entitlementsBySpaceId[
        _spaceId
      ].entitlementsByTag[tag];
      _addNewTokenEntitlement(tokenEntitlement, entitlementData, roleId);
      entitlementsBySpaceId[_spaceId].entitlementTags.push(tag);

      setAllDescByPermissionNames(spaceId, roleId, tag);
    }
  }

  function _addNewTokenEntitlement(
    TokenEntitlement storage tokenEntitlement,
    bytes calldata entitlementData,
    uint256 roleId
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
    tokenEntitlement.tag = externalTokenEntitlement.tag;
  }

  function setAllDescByPermissionNames(
    string memory spaceId,
    uint256 roleId,
    string memory desc
  ) internal {
    uint256 _spaceId = ISpaceManager(_spaceManager).getSpaceIdByNetworkId(
      spaceId
    );

    DataTypes.Permission[] memory permissions = IRoleManager(_roleManager)
      .getPermissionsBySpaceIdByRoleId(_spaceId, roleId);

    for (uint256 j = 0; j < permissions.length; j++) {
      DataTypes.Permission memory permission = permissions[j];
      string memory permissionName = permission.name;
      entitlementsBySpaceId[_spaceId].tagsByPermission[permissionName].push(
        desc
      );
      entitlementsBySpaceId[_spaceId].tagsByRoleId[roleId].push(desc);
    }
  }

  function removeEntitlement(
    string calldata spaceId,
    string calldata channelId,
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpaceManager {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    if (ownerAddress != msg.sender || msg.sender != _spaceManager) {
      revert("Only the owner can update entitlements");
    }

    string memory tag = abi.decode(entitlementData, (string));

    if (bytes(channelId).length > 0) {
      uint256 _channelId = spaceManager.getChannelIdByNetworkId(
        spaceId,
        channelId
      );
      delete _entitlementDataBySpaceIdByChannelIdByRoleId[_spaceId][_channelId][
        roleId
      ];
      delete entitlementsBySpaceId[_spaceId]
        .roomEntitlementsByRoomId[_channelId]
        .entitlementsByTag[tag];
    } else {
      delete _entitlementDataBySpaceIdByRoleId[_spaceId][roleId];
      delete entitlementsBySpaceId[_spaceId].entitlementsByTag[tag];
    }

    DataTypes.Role[] memory roles = IRoleManager(_roleManager)
      .getRolesBySpaceId(_spaceId);

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
    string memory tag
  ) public view returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    DataTypes.ExternalToken[] memory tokens = entitlementsBySpaceId[_spaceId]
      .entitlementsByTag[tag]
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

  function getUserRoles(
    string calldata spaceId,
    string calldata channelId,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    //Get all the entitlements for this space
    string[] memory entitlementTags = entitlementsBySpaceId[_spaceId]
      .entitlementTags;

    //Create an empty array of the max size of all entitlements
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      entitlementTags.length
    );
    //Iterate through all the entitlements
    for (uint256 i = 0; i < entitlementTags.length; i++) {
      string memory tag = entitlementTags[i];
      //If the user is entitled to a token entitlement
      if (isTokenEntitled(spaceId, channelId, user, tag)) {
        uint256 roleId = entitlementsBySpaceId[_spaceId]
          .entitlementsByTag[tag]
          .roleId;
        //Get all the roles for that token entitlement, and add them to the array for this user
        roles[i] = IRoleManager(_roleManager).getRoleBySpaceIdByRoleId(
          _spaceId,
          roleId
        );
      }
    }
    return roles;
  }
}
