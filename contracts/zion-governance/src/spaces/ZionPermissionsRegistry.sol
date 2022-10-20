// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "./libraries/DataTypes.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {PermissionTypes} from "./libraries/PermissionTypes.sol";
import {Errors} from "./libraries/Errors.sol";

contract ZionPermissionsRegistry is Ownable {
  /// @notice Mapping for convenience for finding the string from a defined enum of Zion specific permissions
  mapping(bytes32 => DataTypes.Permission) internal _permissionByPermissionHash;
  DataTypes.Permission[] internal _permissions;

  constructor() {
    setInitialPermissions();
  }

  function setInitialPermissions() internal {
    _setPermission(PermissionTypes.Read, DataTypes.Permission({name: "Read"}));
    _setPermission(
      PermissionTypes.Write,
      DataTypes.Permission({name: "Write"})
    );
    _setPermission(
      PermissionTypes.Invite,
      DataTypes.Permission({name: "Invite"})
    );
    _setPermission(
      PermissionTypes.Redact,
      DataTypes.Permission({name: "Redact"})
    );
    _setPermission(PermissionTypes.Ban, DataTypes.Permission({name: "Ban"}));
    _setPermission(PermissionTypes.Ping, DataTypes.Permission({name: "Ping"}));
    _setPermission(
      PermissionTypes.PinMessage,
      DataTypes.Permission({name: "PinMessage"})
    );
    _setPermission(
      PermissionTypes.ModifyPermissions,
      DataTypes.Permission({name: "ModifyPermissions"})
    );
    _setPermission(
      PermissionTypes.ModifyProfile,
      DataTypes.Permission({name: "ModifyProfile"})
    );
    _setPermission(
      PermissionTypes.AddRemoveChannels,
      DataTypes.Permission({name: "AddRemoveChannels"})
    );
    _setPermission(
      PermissionTypes.ModifySpacePermissions,
      DataTypes.Permission({name: "ModifySpacePermissions"})
    );
    _setPermission(
      PermissionTypes.ModifyChannelDefaults,
      DataTypes.Permission({name: "ModifyChannelDefaults"})
    );
  }

  function addPermission(
    bytes32 permissionHash,
    DataTypes.Permission memory permission
  ) external onlyOwner {
    if (
      keccak256(
        abi.encodePacked(_permissionByPermissionHash[permissionHash].name)
      ) != keccak256(abi.encodePacked(""))
    ) revert Errors.PermissionAlreadyExists();
    _setPermission(permissionHash, permission);
  }

  function getAllPermissions()
    external
    view
    returns (DataTypes.Permission[] memory)
  {
    return _permissions;
  }

  function getPermissionByPermissionType(bytes32 permissionType)
    external
    view
    returns (DataTypes.Permission memory)
  {
    return _permissionByPermissionHash[permissionType];
  }

  function _setPermission(
    bytes32 permissionType,
    DataTypes.Permission memory permission
  ) internal {
    _permissions.push(permission);
    _permissionByPermissionHash[permissionType] = permission;
  }
}
