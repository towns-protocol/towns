// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {ISpace} from "contracts/src/spaces/interfaces/ISpace.sol";
import {IEntitlement} from "contracts/src/spaces/interfaces/IEntitlement.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Utils} from "contracts/src/spaces/libraries/Utils.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UserEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  address public SPACE_ADDRESS;
  address public TOKEN_ADDRESS;
  uint256 public TOKEN_ID;

  struct Entitlement {
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    address[] users;
  }

  mapping(bytes32 => Entitlement) public entitlementsById;
  mapping(bytes32 => uint256[]) public roleIdsByChannelId;
  mapping(uint256 => bytes32[]) public entitlementIdsByRoleId;
  mapping(address => bytes32[]) internal entitlementIdsByUser;

  string public constant name = "User Entitlement";
  string public constant description = "Entitlement for users";
  string public constant moduleType = "UserEntitlement";

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

    address[] memory users = abi.decode(entitlementData, (address[]));

    if (users.length == 0) {
      revert Errors.EntitlementNotFound();
    }

    for (uint256 i = 0; i < users.length; i++) {
      address user = users[i];
      if (user == address(0)) {
        revert Errors.AddressNotFound();
      }

      entitlementIdsByUser[user].push(entitlementId);
    }

    entitlementsById[entitlementId] = Entitlement({
      grantedBy: _msgSender(),
      grantedTime: block.timestamp,
      roleId: roleId,
      users: users
    });

    entitlementIdsByRoleId[roleId].push(entitlementId);
  }

  // @inheritdoc IEntitlement
  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpace returns (bytes32 entitlementId) {
    entitlementId = keccak256(abi.encodePacked(roleId, entitlementData));

    Entitlement memory entitlement = entitlementsById[entitlementId];

    if (entitlement.users.length == 0 || entitlement.roleId == 0) {
      revert Errors.EntitlementNotFound();
    }

    bytes32[] storage entitlementIds = entitlementIdsByRoleId[
      entitlement.roleId
    ];

    _removeFromArray(entitlementIds, entitlementId);

    for (uint256 i = 0; i < entitlement.users.length; i++) {
      address user = entitlement.users[i];
      bytes32[] storage _entitlementIdsByUser = entitlementIdsByUser[user];
      _removeFromArray(_entitlementIdsByUser, entitlementId);
    }

    delete entitlementsById[entitlementId];
  }

  // @inheritdoc IEntitlement
  function getRoleIdsByChannelId(
    string calldata channelId
  ) external view returns (uint256[] memory) {
    bytes32 _channelHash = keccak256(abi.encodePacked(channelId));
    return roleIdsByChannelId[_channelHash];
  }

  // @inheritdoc IEntitlement
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory) {
    bytes32[] memory entitlementIds = entitlementIdsByRoleId[roleId];

    bytes[] memory entitlements = new bytes[](entitlementIds.length);

    for (uint256 i = 0; i < entitlementIds.length; i++) {
      entitlements[i] = abi.encode(entitlementsById[entitlementIds[i]].users);
    }

    return entitlements;
  }

  // @inheritdoc IEntitlement
  function getUserRoles(
    address user
  ) external view returns (DataTypes.Role[] memory) {
    bytes32[] memory entitlementIds = entitlementIdsByUser[user];

    DataTypes.Role[] memory roles = new DataTypes.Role[](entitlementIds.length);

    for (uint256 i = 0; i < entitlementIds.length; i++) {
      Entitlement memory entitlement = entitlementsById[entitlementIds[i]];
      roles[i] = ISpace(SPACE_ADDRESS).getRoleById(entitlement.roleId);
    }

    return roles;
  }

  // @inheritdoc IEntitlement
  function addRoleIdToChannel(
    string calldata channelId,
    uint256 roleId
  ) external onlySpace {
    bytes32 _channelHash = keccak256(abi.encodePacked(channelId));

    uint256[] memory roles = roleIdsByChannelId[_channelHash];

    for (uint256 i = 0; i < roles.length; i++) {
      if (roles[i] == roleId) {
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

  /// @notice checks is a user is entitled to a specific channel
  /// @param channelHash the channel id hash
  /// @param user the user address who we are checking for
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the channel
  function _isEntitledToChannel(
    bytes32 channelHash,
    address user,
    bytes32 permission
  ) internal view returns (bool _entitled) {
    // get role ids mapped to channel
    uint256[] memory channelRoleIds = roleIdsByChannelId[channelHash];

    // get all entitlements for a everyone address
    Entitlement[] memory everyone = _getEntitlementByUser(
      Utils.EVERYONE_ADDRESS
    );

    // get all entitlement for a single address
    Entitlement[] memory single = _getEntitlementByUser(user);

    // combine everyone and single entitlements
    Entitlement[] memory validEntitlements = concatArrays(everyone, single);

    // loop over all role ids in a channel
    for (uint256 i = 0; i < channelRoleIds.length; i++) {
      // get each role id
      uint256 roleId = channelRoleIds[i];

      // loop over all the valid entitlements
      for (uint256 j = 0; j < validEntitlements.length; j++) {
        // check if the role id for that channel matches the entitlement role id
        // and if the permission matches the role permission
        if (
          validEntitlements[j].roleId == roleId &&
          _validateRolePermission(validEntitlements[j].roleId, permission)
        ) {
          _entitled = true;
        }
      }
    }
  }

  /// @notice gets all the entitlements given to a specific user
  /// @param user the user address
  /// @return _entitlements the entitlements
  function _getEntitlementByUser(
    address user
  ) internal view returns (Entitlement[] memory) {
    bytes32[] memory _entitlementIds = entitlementIdsByUser[user];
    Entitlement[] memory _entitlements = new Entitlement[](
      _entitlementIds.length
    );

    for (uint256 i = 0; i < _entitlementIds.length; i++) {
      _entitlements[i] = entitlementsById[_entitlementIds[i]];
    }

    return _entitlements;
  }

  /// @notice checks if a user is entitled to a specific space
  /// @param user the user address
  /// @param permission the permission we are checking for
  /// @return _entitled true if the user is entitled to the space
  function _isEntitledToSpace(
    address user,
    bytes32 permission
  ) internal view returns (bool) {
    Entitlement[] memory everyone = _getEntitlementByUser(
      Utils.EVERYONE_ADDRESS
    );

    Entitlement[] memory single = _getEntitlementByUser(user);

    Entitlement[] memory validEntitlements = concatArrays(everyone, single);

    for (uint256 i = 0; i < validEntitlements.length; i++) {
      if (_validateRolePermission(validEntitlements[i].roleId, permission)) {
        return true;
      }
    }

    return false;
  }

  /// @notice checks if a role has a specific permission
  /// @param roleId the role id
  /// @param permission the permission we are checking for
  /// @return _hasPermission true if the role has the permission
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

  /// @notice utility to concat two arrays
  /// @param a the first array
  /// @param b the second array
  /// @return c the combined array
  function concatArrays(
    Entitlement[] memory a,
    Entitlement[] memory b
  ) internal pure returns (Entitlement[] memory) {
    Entitlement[] memory c = new Entitlement[](a.length + b.length);
    uint256 i = 0;
    for (; i < a.length; i++) {
      c[i] = a[i];
    }
    uint256 j = 0;
    while (j < b.length) {
      c[i++] = b[j++];
    }
    return c;
  }

  /**
   * @dev Added to allow future versions to add new variables in case this contract becomes
   *      inherited. See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[49] private __gap;
}
