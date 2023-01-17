// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ISpace} from "../interfaces/ISpace.sol";
import {IEntitlement} from "../interfaces/IEntitlement.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";

import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract TokenEntitlement is
  Initializable,
  ERC165Upgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  struct Entitlement {
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    DataTypes.ExternalToken[] tokens;
  }

  string public constant name = "Token Entitlement";
  string public constant description = "Entitlement for tokens";
  string public constant moduleType = "TokenEntitlement";

  address public SPACE_ADDRESS;

  mapping(bytes32 => Entitlement) public entitlementsById;
  mapping(bytes32 => uint256[]) roleIdsByChannelId;
  mapping(uint256 => bytes32[]) entitlementIdsByRoleId;
  bytes32[] public allEntitlementIds;

  modifier onlySpace() {
    require(
      _msgSender() == owner() || _msgSender() == SPACE_ADDRESS,
      "Space: only space"
    );
    _;
  }

  function initialize() public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Ownable_init();
  }

  function setSpace(address _space) external onlyOwner {
    SPACE_ADDRESS = _space;
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyOwner {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(IEntitlement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function isEntitled(
    string calldata channelId,
    address user,
    bytes32 permission
  ) external view returns (bool) {
    if (bytes(channelId).length > 0) {
      return
        _isEntitledToChannel(
          keccak256(abi.encodePacked(channelId)),
          user,
          permission
        );
    } else {
      return _isEntitledToSpace(user, permission);
    }
  }

  function setEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpace returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    DataTypes.ExternalToken[] memory externalTokens = abi.decode(
      entitlementData,
      (DataTypes.ExternalToken[])
    );

    //Adds all the tokens passed in to gate this role with an AND
    if (externalTokens.length == 0) {
      revert Errors.EntitlementNotFound();
    }

    for (uint256 i = 0; i < externalTokens.length; i++) {
      if (externalTokens[i].contractAddress == address(0)) {
        revert Errors.AddressNotFound();
      }

      if (externalTokens[i].quantity == 0) {
        revert Errors.QuantityNotFound();
      }

      entitlementsById[entitlementId].tokens.push(externalTokens[i]);
    }

    entitlementsById[entitlementId].roleId = roleId;
    entitlementsById[entitlementId].grantedBy = _msgSender();
    entitlementsById[entitlementId].grantedTime = block.timestamp;

    // set so we can look up all entitlements by role id
    entitlementIdsByRoleId[roleId].push(entitlementId);
    allEntitlementIds.push(entitlementId);
  }

  // @inheritdoc IEntitlement
  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpace returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    // remove from roleIdsByChannelId
    bytes32[] storage entitlementIdsFromRoleIds = entitlementIdsByRoleId[
      roleId
    ];

    _removeFromArray(entitlementIdsFromRoleIds, entitlementId);

    // remove from allEntitlementIds
    _removeFromArray(allEntitlementIds, entitlementId);

    // remove from entitlementsById
    delete entitlementsById[entitlementId];
  }

  // @inheritdoc IEntitlement
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory) {
    bytes32[] memory entitlementIds = entitlementIdsByRoleId[roleId];

    bytes[] memory entitlements = new bytes[](entitlementIds.length);

    for (uint256 i = 0; i < entitlementIds.length; i++) {
      entitlements[i] = abi.encode(entitlementsById[entitlementIds[i]].tokens);
    }

    return entitlements;
  }

  function getUserRoles(
    address user
  ) external view returns (DataTypes.Role[] memory) {
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      allEntitlementIds.length
    );

    for (uint256 i = 0; i < allEntitlementIds.length; i++) {
      if (!_isTokenEntitled(user, allEntitlementIds[i])) continue;
      uint256 roleId = entitlementsById[allEntitlementIds[i]].roleId;
      roles[i] = ISpace(SPACE_ADDRESS).getRoleById(roleId);
    }

    return roles;
  }

  function addRoleIdToChannel(
    string calldata channelId,
    uint256 roleId
  ) external onlySpace {
    bytes32 _channelId = keccak256(abi.encodePacked(channelId));

    uint256[] memory roleIds = roleIdsByChannelId[_channelId];

    for (uint256 i = 0; i < roleIds.length; i++) {
      if (roleIds[i] == roleId) {
        revert Errors.RoleAlreadyExists();
      }
    }

    roleIdsByChannelId[_channelId].push(roleId);
  }

  function removeRoleIdFromChannel(
    string calldata channelId,
    uint256 roleId
  ) external onlySpace {
    bytes32 _channelId = keccak256(abi.encodePacked(channelId));
    uint256[] storage roleIds = roleIdsByChannelId[_channelId];

    for (uint256 i = 0; i < roleIds.length; i++) {
      if (roleIds[i] != roleId) continue;
      roleIds[i] = roleIds[roleIds.length - 1];
      roleIds.pop();
      break;
    }
  }

  // A convenience function to generate types for the client to encode the token struct. No implementation needed.
  function encodeExternalTokens(
    DataTypes.ExternalToken[] calldata tokens
  ) public pure {}

  function _isEntitledToChannel(
    bytes32 channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool _entitled) {
    uint256[] memory channelRoleIds = roleIdsByChannelId[channelId];

    for (uint256 i = 0; i < channelRoleIds.length; i++) {
      uint256 roleId = channelRoleIds[i];

      if (_validateRolePermission(roleId, permission)) {
        bytes32[] memory entitlementIdsFromRoleIds = entitlementIdsByRoleId[
          roleId
        ];

        for (uint256 j = 0; j < entitlementIdsFromRoleIds.length; j++) {
          if (_isTokenEntitled(user, entitlementIdsFromRoleIds[j])) {
            _entitled = true;
          }
        }
      }
    }
  }

  function _removeFromArray(bytes32[] storage array, bytes32 value) internal {
    for (uint256 i = 0; i < array.length; i++) {
      if (array[i] != value) continue;
      array[i] = array[array.length - 1];
      array.pop();
      break;
    }
  }

  function _isEntitledToSpace(
    address user,
    bytes32 permission
  ) internal view returns (bool _entitled) {
    // get valid role ids from all entitlement ids
    for (uint256 i = 0; i < allEntitlementIds.length; i++) {
      bytes32 entitlementId = allEntitlementIds[i];
      Entitlement memory entitlement = entitlementsById[entitlementId];
      uint256 roleId = entitlement.roleId;

      if (_validateRolePermission(roleId, permission)) {
        bytes32[] memory entitlementIdsFromRoleId = entitlementIdsByRoleId[
          roleId
        ];

        for (uint256 j = 0; j < entitlementIdsFromRoleId.length; j++) {
          if (_isTokenEntitled(user, entitlementIdsFromRoleId[j])) {
            _entitled = true;
          }
        }
      }
    }
  }

  function _isTokenEntitled(
    address user,
    bytes32 entitlementId
  ) internal view returns (bool) {
    DataTypes.ExternalToken[] memory tokens = entitlementsById[entitlementId]
      .tokens;

    bool entitled = false;

    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 quantity = tokens[i].quantity;
      address contractAddress = tokens[i].contractAddress;
      uint256[] memory tokenIds = tokens[i].tokenIds;
      bool isSingleToken = tokens[i].isSingleToken;

      if (
        _isERC721Entitled(
          contractAddress,
          user,
          quantity,
          isSingleToken,
          tokenIds
        ) ||
        _isERC20Entitled(contractAddress, user, quantity) ||
        _isERC1155Entitled(
          contractAddress,
          user,
          quantity,
          isSingleToken,
          tokenIds
        )
      ) {
        entitled = true;
      } else {
        entitled = false;
        break;
      }
    }

    return entitled;
  }

  function _isERC1155Entitled(
    address contractAddress,
    address user,
    uint256 quantity,
    bool isSingleToken,
    uint256[] memory tokenTypes
  ) internal view returns (bool) {
    for (uint256 i = 0; i < tokenTypes.length; i++) {
      try IERC1155(contractAddress).balanceOf(user, tokenTypes[i]) returns (
        uint256 balance
      ) {
        if (isSingleToken && balance > 0) {
          return true;
        } else if (!isSingleToken && balance >= quantity) {
          return true;
        }
      } catch {}
    }

    return false;
  }

  function _isERC721Entitled(
    address contractAddress,
    address user,
    uint256 quantity,
    bool isSingleToken,
    uint256[] memory tokenIds
  ) internal view returns (bool) {
    if (isSingleToken) {
      for (uint256 i = 0; i < tokenIds.length; i++) {
        try IERC721(contractAddress).ownerOf(tokenIds[i]) returns (
          address owner
        ) {
          if (owner == user) {
            return true;
          }
        } catch {}
      }
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

  function _validateRolePermission(
    uint256 roleId,
    bytes32 permission
  ) internal view returns (bool) {
    ISpace space = ISpace(SPACE_ADDRESS);

    bytes32[] memory permissions = space.getPermissionsByRoleId(roleId);

    for (uint256 i = 0; i < permissions.length; i++) {
      if (permissions[i] == permission) {
        return true;
      }
    }

    return false;
  }
}
