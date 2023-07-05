// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces
import {IEntitlement} from "../IEntitlement.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {IRoles} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {ITokenEntitlement} from "./ITokenEntitlement.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract TokenEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  ITokenEntitlement,
  IEntitlement
{
  using EnumerableSet for EnumerableSet.Bytes32Set;

  address public SPACE_ADDRESS;

  /// @notice mapping holding all the entitlements of entitlementId to Entitlement
  mapping(bytes32 => Entitlement) internal entitlementsById;

  /// @notice mapping of all the entitlements for a given roleId
  mapping(uint256 => EnumerableSet.Bytes32Set) internal entitlementIdsByRoleId;

  /// @notice array of all the entitlementIds
  EnumerableSet.Bytes32Set internal allEntitlementIds;

  string public constant name = "Token Entitlement";
  string public constant description = "Entitlement for tokens";
  string public constant moduleType = "TokenEntitlement";

  modifier onlySpace() {
    if (_msgSender() != SPACE_ADDRESS) {
      revert Entitlement__NotAllowed();
    }
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address space) public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Context_init();

    SPACE_ADDRESS = space;
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
      return _isEntitledToChannel(channelId, user, permission);
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

    ExternalToken[] memory externalTokens = abi.decode(
      entitlementData,
      (ExternalToken[])
    );

    //Adds all the tokens passed in to gate this role with an AND
    if (externalTokens.length == 0) {
      revert Entitlement__InvalidValue();
    }

    for (uint256 i = 0; i < externalTokens.length; i++) {
      if (externalTokens[i].contractAddress == address(0)) {
        revert Entitlement__InvalidValue();
      }

      if (externalTokens[i].quantity == 0) {
        revert Entitlement__InvalidValue();
      }

      entitlementsById[entitlementId].tokens.push(externalTokens[i]);
    }

    entitlementsById[entitlementId].roleId = roleId;
    entitlementsById[entitlementId].grantedBy = _msgSender();
    entitlementsById[entitlementId].grantedTime = block.timestamp;

    // set so we can look up all entitlements by role id
    entitlementIdsByRoleId[roleId].add(entitlementId);
    allEntitlementIds.add(entitlementId);
  }

  // @inheritdoc IEntitlement
  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpace returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    entitlementIdsByRoleId[roleId].remove(entitlementId);

    allEntitlementIds.remove(entitlementId);

    // remove from entitlementsById
    delete entitlementsById[entitlementId];
  }

  // @inheritdoc IEntitlement
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory) {
    bytes32[] memory entitlementIds = entitlementIdsByRoleId[roleId].values();

    bytes[] memory entitlements = new bytes[](entitlementIds.length);

    for (uint256 i = 0; i < entitlementIds.length; i++) {
      entitlements[i] = abi.encode(entitlementsById[entitlementIds[i]].tokens);
    }

    return entitlements;
  }

  function encodeExternalTokens(ExternalToken[] calldata tokens) public pure {}

  /// @notice checks is a user is entitled to a specific channel
  /// @param channelId the channel id
  /// @param user the user address who we are checking for
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the channel
  // A convenience function to generate types for the client to encode the token struct. No implementation needed.
  function _isEntitledToChannel(
    string calldata channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool _entitled) {
    IChannel.Channel memory channel = IChannel(SPACE_ADDRESS).getChannel(
      channelId
    );

    for (uint256 i = 0; i < channel.roleIds.length; i++) {
      uint256 roleId = channel.roleIds[i];

      if (_validateRolePermission(roleId, permission)) {
        bytes32[] memory entitlementIdsFromRoleIds = entitlementIdsByRoleId[
          roleId
        ].values();

        for (uint256 j = 0; j < entitlementIdsFromRoleIds.length; j++) {
          if (_isTokenEntitled(user, entitlementIdsFromRoleIds[j])) {
            _entitled = true;
          }
        }
      }
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
    for (uint256 i = 0; i < allEntitlementIds.length(); i++) {
      bytes32 entitlementId = allEntitlementIds.at(i);
      Entitlement memory entitlement = entitlementsById[entitlementId];
      uint256 roleId = entitlement.roleId;

      if (_validateRolePermission(roleId, permission)) {
        bytes32[] memory entitlementIdsFromRoleId = entitlementIdsByRoleId[
          roleId
        ].values();

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
    ExternalToken[] memory tokens = entitlementsById[entitlementId].tokens;

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
    IRoles space = IRoles(SPACE_ADDRESS);

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
