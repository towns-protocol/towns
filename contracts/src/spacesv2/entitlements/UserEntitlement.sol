// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ISpace} from "../interfaces/ISpace.sol";
import {IEntitlement} from "../interfaces/IEntitlement.sol";

import {Errors} from "../libraries/Errors.sol";
import {Utils} from "../libraries/Utils.sol";
import {DataTypes} from "../libraries/DataTypes.sol";

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UserEntitlement is
  Initializable,
  ERC165Upgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable,
  IEntitlement
{
  string public constant name = "User Entitlement";
  string public constant description = "Entitlement for users";
  string public constant moduleType = "UserEntitlement";

  address public SPACE_ADDRESS;

  uint256 entitlementCount;

  struct Entitlement {
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    address[] users;
  }

  mapping(bytes32 => Entitlement) public entitlementsById;
  mapping(bytes32 => uint256[]) roleIdsByChannelId;
  mapping(uint256 => bytes32[]) entitlementIdsByRoleId;
  mapping(address => bytes32[]) entitlementIdsByUser;

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

  /// @inheritdoc IEntitlement
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

  function addRoleIdToChannel(
    string calldata channelId,
    uint256 roleId
  ) external onlySpace {
    bytes32 _channelId = keccak256(abi.encodePacked(channelId));

    uint256[] memory roles = roleIdsByChannelId[_channelId];

    for (uint256 i = 0; i < roles.length; i++) {
      if (roles[i] == roleId) {
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

  function _removeFromArray(bytes32[] storage array, bytes32 value) internal {
    for (uint256 i = 0; i < array.length; i++) {
      if (array[i] != value) continue;
      array[i] = array[array.length - 1];
      array.pop();
      break;
    }
  }

  function _isEntitledToChannel(
    bytes32 channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool _entitled) {
    // get role ids mapped to channel
    uint256[] memory channelRoleIds = roleIdsByChannelId[channelId];

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
}
