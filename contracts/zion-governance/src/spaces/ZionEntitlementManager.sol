//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {IEntitlementModule} from "./interfaces/IEntitlementModule.sol";
import {ZionSpaceManagerStorage} from "./storage/ZionSpaceManagerStorage.sol";
import {Errors} from "./libraries/Errors.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Events} from "./libraries/Events.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ZionPermissionsRegistry} from "./ZionPermissionsRegistry.sol";
import {Constants} from "./libraries/Constants.sol";
import {PermissionTypes} from "./libraries/PermissionTypes.sol";

abstract contract ZionEntitlementManager is Ownable, ZionSpaceManagerStorage {
  address internal immutable PERMISSION_REGISTRY;
  address internal DEFAULT_USER_ENTITLEMENT_MODULE;
  address internal DEFAULT_TOKEN_ENTITLEMENT_MODULE;
  address internal SPACE_NFT;

  constructor(address permissionRegistry) {
    if (permissionRegistry == address(0)) revert Errors.InvalidParameters();
    PERMISSION_REGISTRY = permissionRegistry;
  }

  function _createRole(uint256 spaceId, string memory name)
    internal
    returns (uint256)
  {
    uint256 roleId = _rolesBySpaceId[spaceId].idCounter++;
    _rolesBySpaceId[spaceId].roles.push(DataTypes.Role(roleId, name));

    return roleId;
  }

  function _createOwnerRole(uint256 spaceId) internal returns (uint256) {
    uint256 ownerRoleId = _createRole(spaceId, "Owner");
    _spaceById[spaceId].ownerRoleId = ownerRoleId;

    DataTypes.Permission[] memory allPermissions = ZionPermissionsRegistry(
      PERMISSION_REGISTRY
    ).getAllPermissions();
    uint256 permissionLen = allPermissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      _addPermissionToRole(spaceId, ownerRoleId, allPermissions[i]);
      unchecked {
        ++i;
      }
    }

    return ownerRoleId;
  }

  function _createEveryoneRoleEntitlement(
    uint256 spaceId,
    string memory networkId
  ) internal returns (uint256) {
    uint256 everyoneRoleId = _createRole(spaceId, "Everyone");
    DataTypes.Permission memory readPermission = ZionPermissionsRegistry(
      PERMISSION_REGISTRY
    ).getPermissionByPermissionType(PermissionTypes.Read);
    _addPermissionToRole(spaceId, everyoneRoleId, readPermission);

    _addRoleToEntitlementModule(
      networkId,
      "",
      DEFAULT_USER_ENTITLEMENT_MODULE,
      everyoneRoleId,
      abi.encode(Constants.EVERYONE_ADDRESS)
    );
    return everyoneRoleId;
  }

  function _addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) internal {
    _permissionsBySpaceIdByRoleId[spaceId][roleId].push(permission);
  }

  function _removePermissionFromRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) internal {
    DataTypes.Permission[] storage permissions = _permissionsBySpaceIdByRoleId[
      spaceId
    ][roleId];

    uint256 permissionLen = permissions.length;

    for (uint256 i = 0; i < permissionLen; ) {
      if (_stringEquals(permission.name, permissions[i].name)) {
        permissions[i] = permissions[permissionLen - 1];
        permissions.pop();
        break;
      }

      unchecked {
        ++i;
      }
    }
  }

  function _removeRole(uint256 spaceId, uint256 roleId) internal {
    DataTypes.Role[] storage roles = _rolesBySpaceId[spaceId].roles;

    uint256 roleLen = roles.length;

    for (uint256 i = 0; i < roleLen; ) {
      if (roleId == roles[i].roleId) {
        DataTypes.Permission[]
          memory permissions = _permissionsBySpaceIdByRoleId[spaceId][roleId];

        uint256 permissionLen = permissions.length;

        for (uint256 j = 0; j < permissionLen; ) {
          _removePermissionFromRole(spaceId, roleId, permissions[j]);
          unchecked {
            ++j;
          }
        }

        roles[i] = roles[roleLen - 1];
        roles.pop();
        break;
      }

      unchecked {
        ++i;
      }
    }
  }

  function _addRoleToEntitlementModule(
    string memory spaceId,
    string memory channelId,
    address entitlementAddress,
    uint256 roleId,
    bytes memory entitlementData
  ) internal {
    uint256 _spaceId = _spaceIdByHash[keccak256(bytes(spaceId))];

    // make sure entitlement module is whitelisted
    if (!_spaceById[_spaceId].hasEntitlement[entitlementAddress])
      revert Errors.EntitlementNotWhitelisted();

    // add the entitlement to the entitlement module
    IEntitlementModule(entitlementAddress).setEntitlement(
      spaceId,
      channelId,
      roleId,
      entitlementData
    );
  }

  function _removeRoleFromEntitlementModule(
    string calldata spaceId,
    string calldata channelId,
    address entitlementAddress,
    uint256[] memory roleIds,
    bytes memory entitlementData
  ) internal {
    uint256 _spaceId = _spaceIdByHash[keccak256(bytes(spaceId))];

    // make sure entitlement module is whitelisted
    if (!_spaceById[_spaceId].hasEntitlement[entitlementAddress])
      revert Errors.EntitlementNotWhitelisted();

    // add the entitlement to the entitlement module
    IEntitlementModule(entitlementAddress).removeEntitlement(
      spaceId,
      channelId,
      roleIds,
      entitlementData
    );
  }

  function _whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    bool whitelist
  ) internal {
    if (whitelist && _spaceById[spaceId].hasEntitlement[entitlementAddress]) {
      revert Errors.EntitlementAlreadyWhitelisted();
    }

    // set entitlement tag to space entitlement tags
    _spaceById[spaceId].hasEntitlement[entitlementAddress] = whitelist;

    // set entitlement address to space entitlements
    if (whitelist) {
      _spaceById[spaceId].entitlementModules.push(entitlementAddress);
    } else {
      uint256 len = _spaceById[spaceId].entitlementModules.length;
      for (uint256 i = 0; i < len; ) {
        if (_spaceById[spaceId].entitlementModules[i] == entitlementAddress) {
          // Remove the entitlement address from the space entitlements
          _spaceById[spaceId].entitlementModules[i] = _spaceById[spaceId]
            .entitlementModules[len - 1];
          _spaceById[spaceId].entitlementModules.pop();
        }

        unchecked {
          ++i;
        }
      }
    }
  }

  function _stringEquals(string memory s1, string memory s2)
    internal
    pure
    returns (bool)
  {
    bytes memory b1 = bytes(s1);
    bytes memory b2 = bytes(s2);
    uint256 l1 = b1.length;
    if (l1 != b2.length) return false;
    for (uint256 i = 0; i < l1; ) {
      if (b1[i] != b2[i]) return false;
      unchecked {
        ++i;
      }
    }
    return true;
  }
}
