// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {ISpace} from "contracts/src/spaces/interfaces/ISpace.sol";
import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract TokenEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  /// @notice struct holding information about a single entitlement
  /// @param entitlementId unique id of the entitlement
  /// @param roleId id of the role that the entitlement is gating
  /// @param grantedBy address of the account that granted the entitlement
  /// @param grantedTime timestamp of when the entitlement was granted
  /// @param tokens array of tokens that are required for the entitlement, ANDed together
  struct Entitlement {
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    DataTypes.ExternalToken[] tokens;
  }

  address public SPACE_ADDRESS;
  address public TOKEN_ADDRESS;
  uint256 public TOKEN_ID;

  /// @notice mapping holding all the entitlements of entitlementId to Entitlement
  mapping(bytes32 => Entitlement) public entitlementsById;
  /// @notice mapping of all the roles for a given channelId
  mapping(bytes32 => uint256[]) public roleIdsByChannelId;
  /// @notice mapping of all the entitlements for a given roleId
  mapping(uint256 => bytes32[]) public entitlementIdsByRoleId;
  /// @notice array of all the entitlementIds
  bytes32[] public allEntitlementIds;

  string public constant name = "Token Entitlement";
  string public constant description = "Entitlement for tokens";
  string public constant moduleType = "TokenEntitlement";

  modifier onlySpace() {
    if (_msgSender() != SPACE_ADDRESS) {
      revert Errors.NotAllowed();
    }
    _;
  }

  modifier onlyOwner() {
    if (IERC721(TOKEN_ADDRESS).ownerOf(TOKEN_ID) != _msgSender()) {
      revert Errors.NotAllowed();
    }
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address _tokenAddress,
    uint256 _tokenId
  ) public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Context_init();

    TOKEN_ADDRESS = _tokenAddress;
    TOKEN_ID = _tokenId;
  }

  // @inheritdoc IEntitlement
  function setSpace(address _space) external onlyOwner {
    SPACE_ADDRESS = _space;
  }

  /// @notice allow the contract to be upgraded while retaining state
  /// @param newImplementation address of the new implementation
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlySpace {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(IEntitlement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  // @inheritdoc IEntitlement
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

  // @inheritdoc IEntitlement
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
  function getRoleIdsByChannelId(
    string calldata channelId
  ) external view returns (uint256[] memory) {
    bytes32 _channelId = keccak256(abi.encodePacked(channelId));
    return roleIdsByChannelId[_channelId];
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

  // @inheritdoc IEntitlement
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

  // @inheritdoc IEntitlement
  function addRoleIdToChannel(
    string calldata channelId,
    uint256 roleId
  ) external onlySpace {
    bytes32 _channelHash = keccak256(abi.encodePacked(channelId));

    uint256[] memory roleIds = roleIdsByChannelId[_channelHash];

    for (uint256 i = 0; i < roleIds.length; i++) {
      if (roleIds[i] == roleId) {
        revert Errors.RoleAlreadyExists();
      }
    }

    roleIdsByChannelId[_channelHash].push(roleId);
  }

  // @inheritdoc IEntitlement
  function removeRoleIdFromChannel(
    string calldata channelId,
    uint256 roleId
  ) external onlySpace {
    bytes32 _channelHash = keccak256(abi.encodePacked(channelId));
    uint256[] storage roleIds = roleIdsByChannelId[_channelHash];

    for (uint256 i = 0; i < roleIds.length; i++) {
      if (roleIds[i] != roleId) continue;
      roleIds[i] = roleIds[roleIds.length - 1];
      roleIds.pop();
      break;
    }
  }

  function encodeExternalTokens(
    DataTypes.ExternalToken[] calldata tokens
  ) public pure {}

  /// @notice checks is a user is entitled to a specific channel
  /// @param channelId the channel id
  /// @param user the user address who we are checking for
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the channel
  // A convenience function to generate types for the client to encode the token struct. No implementation needed.
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

  /// @notice utility to remove an item from an array
  /// @param array the array to remove from
  /// @param value the value to remove
  function _removeFromArray(bytes32[] storage array, bytes32 value) internal {
    for (uint256 i = 0; i < array.length; i++) {
      if (array[i] != value) continue;
      array[i] = array[array.length - 1];
      array.pop();
      break;
    }
  }

  /// @notice checks if a user is entitled to a space
  /// @param user the user to check
  /// @param permission the permission to check
  /// @return _entitled true if the user is entitled
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

  /// @notice checks if a user holds the necessary tokens to meet the token entitlement requirements
  /// @param user the user to check
  /// @param entitlementId the entitlement id to check
  /// @return true if the user is entitled
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

      // check if the contract is an ERC721
      if (_validateInterfaceId(contractAddress, type(IERC721).interfaceId)) {
        entitled = _isERC721Entitled(
          contractAddress,
          user,
          quantity,
          isSingleToken,
          tokenIds
        );

        // if the user is entitled, we can skip to the next token
        if (entitled) continue;
      }

      // check if the contract is an ERC1155
      if (_validateInterfaceId(contractAddress, type(IERC1155).interfaceId)) {
        entitled = _isERC1155Entitled(
          contractAddress,
          user,
          quantity,
          isSingleToken,
          tokenIds
        );

        // if the user is entitled, we can skip to the next token
        if (entitled) continue;
      }

      // check if the contract is an ERC20
      entitled = _isERC20Entitled(
        contractAddress,
        user,
        quantity,
        isSingleToken,
        tokenIds
      );

      // if the user is not entitled, cancel the loop
      if (!entitled) break;
    }

    return entitled;
  }

  /// @notice checks if a user holds the necessary ERC1155 tokens
  /// @param contractAddress the contract address to check
  /// @param user the user to check
  /// @param quantity the quantity to check, user needs to have at least this amount
  /// @param isSingleToken qualifier on if we are checking for a unique tokenID or not since ERC1155 can contain fungible and non-fungible types
  /// @return bool true if the user holds the tokens
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

  /// @notice checks if a user holds the necessary ERC721 tokens
  /// @param contractAddress the contract address to check
  /// @param user the user to check
  /// @param quantity the quantity to check, user needs to have at least this amount
  /// @param isSingleToken qualifier on if we are checking for a unique ERC721 tokenID or not
  /// @return bool true if the user holds the tokens
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
          address _result
        ) {
          if (_result == user) {
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

  /// @notice checks if a user holds the necessary ERC20 tokens
  /// @param contractAddress the contract address to check
  /// @param user the user to check
  /// @param quantity the quantity to check, user needs to have at least this amount
  /// @return bool true if the user holds the tokens
  function _isERC20Entitled(
    address contractAddress,
    address user,
    uint256 quantity,
    bool isSingleToken,
    uint256[] memory tokenIds
  ) internal view returns (bool) {
    if (isSingleToken) return false;
    if (tokenIds.length > 0) return false;

    try IERC20(contractAddress).balanceOf(user) returns (uint256 balance) {
      if (balance >= quantity) {
        return true;
      }
    } catch {}
    return false;
  }

  /// @notice checks if a role has a permission
  /// @param roleId the role id to check
  /// @param permission the permission to check
  /// @return bool true if the role has the permission
  function _validateRolePermission(
    uint256 roleId,
    bytes32 permission
  ) internal view returns (bool) {
    ISpace space = ISpace(SPACE_ADDRESS);

    string[] memory permissions = space.getPermissionsByRoleId(roleId);
    uint256 length = permissions.length;

    for (uint256 i = 0; i < length; i++) {
      if (bytes32(abi.encodePacked(permissions[i])) == permission) {
        return true;
      }
    }

    return false;
  }

  function _validateInterfaceId(
    address contractAddress,
    bytes4 interfaceId
  ) internal view returns (bool) {
    try IERC165(contractAddress).supportsInterface(interfaceId) returns (
      bool _result
    ) {
      return _result;
    } catch {
      return false;
    }
  }

  /**
   * @dev Added to allow future versions to add new variables in case this contract becomes
   *      inherited. See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[49] private __gap;
}
