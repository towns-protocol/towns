//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "./interfaces/ISpaceManager.sol";
import {IEntitlementModule} from "./interfaces/IEntitlementModule.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Constants} from "./libraries/Constants.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";
import {UserGrantedEntitlementModule} from "./modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionSpaceManagerStorage} from "./storage/ZionSpaceManagerStorage.sol";
import {IERC165} from "openzeppelin-contracts/contracts/interfaces/IERC165.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ZionSpaceController} from "./libraries/ZionSpaceController.sol";
import {ZionPermissionsRegistry} from "./ZionPermissionsRegistry.sol";

/// @title ZionSpaceManager
/// @author HNT Labs
/// @notice This contract manages the spaces and entitlements in the Zion ecosystem.
contract ZionSpaceManager is Ownable, ZionSpaceManagerStorage, ISpaceManager {
  modifier onlySpaceOwner(uint256 spaceId) {
    _validateCallerIsSpaceOwner(spaceId);
    _;
  }

  constructor(address defaultPermissionsManagerAddress_) {
    _defaultPermissionsManagerAddress = defaultPermissionsManagerAddress_;
  }

  /// *********************************
  /// *****SPACE OWNER FUNCTIONS*****
  /// *********************************

  /// @inheritdoc ISpaceManager
  function createSpace(DataTypes.CreateSpaceData calldata info)
    external
    returns (uint256)
  {
    if (_defaultEntitlementModuleAddress == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();
    if (_defaultPermissionsManagerAddress == address(0))
      revert Errors.DefaultPermissionsManagerNotSet();

    // create space Id
    uint256 spaceId = _createSpace(info);

    // whitespace default entitlement module
    _whitelistEntitlementModule(
      spaceId,
      _defaultEntitlementModuleAddress,
      true
    );

    // Create roles and add permissions
    uint256 ownerRoleId = _createRole(spaceId, "Owner", "#fff");

    // Add permissions to owner role
    DataTypes.Permission[] memory allPermissions = ZionPermissionsRegistry(
      _defaultPermissionsManagerAddress
    ).getAllPermissions();

    for (uint256 i = 0; i < allPermissions.length; i++) {
      _addPermissionToRole(spaceId, ownerRoleId, allPermissions[i]);
    }

    _addRoleToEntitlementModule(
      spaceId,
      _defaultEntitlementModuleAddress,
      ownerRoleId,
      abi.encode(_msgSender())
    );

    emit Events.CreateSpace(
      spaceId,
      _msgSender(),
      _msgSender(),
      info.spaceName
    );

    return spaceId;
  }

  /// @inheritdoc ISpaceManager
  function createSpaceWithTokenEntitlement(
    DataTypes.CreateSpaceData calldata info,
    DataTypes.CreateSpaceTokenEntitlementData calldata entitlement
  ) external returns (uint256) {
    uint256 spaceId = _createSpace(info);

    // whitespace default entitlement module
    _whitelistEntitlementModule(
      spaceId,
      _defaultEntitlementModuleAddress,
      true
    );

    // whitespace token entitlement module
    _whitelistEntitlementModule(
      spaceId,
      entitlement.entitlementModuleAddress,
      true
    );

    //Add the default administrator Role
    string memory ownerRoleName = "Administrator";
    uint256 ownerRoleId = _createRole(spaceId, ownerRoleName, "#fff");

    DataTypes.Permission[] memory allPermissions = ZionPermissionsRegistry(
      _defaultPermissionsManagerAddress
    ).getAllPermissions();

    for (uint256 i = 0; i < allPermissions.length; i++) {
      _addPermissionToRole(spaceId, ownerRoleId, allPermissions[i]);
    }

    // add default entitlement module
    _addRoleToEntitlementModule(
      spaceId,
      _defaultEntitlementModuleAddress,
      ownerRoleId,
      abi.encode(_msgSender())
    );

    //Add the role associated with the token gating
    string memory tokenRoleName = "Token Holder";
    uint256 tokenRoleId = _createRole(spaceId, tokenRoleName, "#fff");

    for (uint256 i = 0; i < entitlement.permissions.length; i++) {
      DataTypes.Permission memory permission = DataTypes.Permission(
        entitlement.permissions[i]
      );
      _addPermissionToRole(spaceId, tokenRoleId, permission);
    }

    // add token entitlement module
    _addRoleToEntitlementModule(
      spaceId,
      entitlement.entitlementModuleAddress,
      tokenRoleId,
      abi.encode(
        entitlement.description,
        entitlement.tokenAddress,
        entitlement.quantity
      )
    );

    emit Events.CreateSpace(
      spaceId,
      _msgSender(),
      _msgSender(),
      info.spaceName
    );

    return spaceId;
  }

  /// *********************************
  /// *****EXTERNAL FUNCTIONS**********
  /// *********************************

  /// @inheritdoc ISpaceManager
  function registerDefaultEntitlementModule(address entitlementModule)
    external
    onlyOwner
  {
    _defaultEntitlementModuleAddress = entitlementModule;
    emit Events.DefaultEntitlementSet(entitlementModule);
  }

  function registerDefaultPermissionsManager(address permissionsManager)
    external
    onlyOwner
  {
    _defaultPermissionsManagerAddress = permissionsManager;
    emit Events.DefaultPermissionsManagerSet(permissionsManager);
  }

  /// @inheritdoc ISpaceManager
  function whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    bool whitelist
  ) external onlySpaceOwner(spaceId) {
    _validateEntitlementInterface(entitlementAddress);
    _whitelistEntitlementModule(spaceId, entitlementAddress, whitelist);
  }

  /// @inheritdoc ISpaceManager
  function createRole(
    uint256 spaceId,
    string memory name,
    bytes8 color
  ) external onlySpaceOwner(spaceId) returns (uint256) {
    return _createRole(spaceId, name, color);
  }

  /// @inheritdoc ISpaceManager
  function addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external onlySpaceOwner(spaceId) {
    _addPermissionToRole(spaceId, roleId, permission);
  }

  /// @inheritdoc ISpaceManager
  function addRoleToEntitlementModule(
    uint256 spaceId,
    address entitlementModuleAddress,
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpaceOwner(spaceId) {
    _validateEntitlementInterface(entitlementModuleAddress);
    _addRoleToEntitlementModule(
      spaceId,
      entitlementModuleAddress,
      roleId,
      entitlementData
    );

    emit Events.EntitlementModuleAdded(spaceId, entitlementModuleAddress);
  }

  /// @inheritdoc ISpaceManager
  function removeEntitlement(
    uint256 spaceId,
    address entitlementModuleAddress,
    uint256[] memory roleIds,
    bytes memory data
  ) external onlySpaceOwner(spaceId) {
    _validateEntitlementInterface(entitlementModuleAddress);
    _removeEntitlement(spaceId, entitlementModuleAddress, roleIds, data);
    emit Events.EntitlementModuleRemoved(spaceId, entitlementModuleAddress);
  }

  /// *********************************
  /// *****EXTERNAL VIEW FUNCTIONS*****
  /// *********************************

  /// @inheritdoc ISpaceManager
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.Permission memory permission
  ) external view returns (bool) {
    bool entitled = false;

    for (
      uint256 i = 0;
      i < _spaceById[spaceId].entitlementModules.length;
      i++
    ) {
      address entitlement = _spaceById[spaceId].entitlementModules[i];

      if (entitlement == address(0)) continue;

      if (
        IEntitlementModule(entitlement).isEntitled(
          spaceId,
          roomId,
          user,
          permission
        )
      ) {
        entitled = true;
        break;
      }
    }

    return entitled;
  }

  /// @inheritdoc ISpaceManager
  function getPermissionsBySpaceIdByRoleId(uint256 spaceId, uint256 roleId)
    public
    view
    returns (DataTypes.Permission[] memory)
  {
    return _permissionsBySpaceIdByRoleId[spaceId][roleId];
  }

  /// @inheritdoc ISpaceManager
  function getRolesBySpaceId(uint256 spaceId)
    public
    view
    returns (DataTypes.Role[] memory)
  {
    return _rolesBySpaceId[spaceId].roles;
  }

  /// @inheritdoc ISpaceManager
  function getRoleBySpaceIdByRoleId(uint256 spaceId, uint256 roleId)
    public
    view
    returns (DataTypes.Role memory)
  {
    return _rolesBySpaceId[spaceId].roles[roleId];
  }

  function getPermissionFromMap(bytes32 permissionType)
    public
    view
    returns (DataTypes.Permission memory permission)
  {
    return
      ZionPermissionsRegistry(_defaultPermissionsManagerAddress)
        .getPermissionByPermissionType(permissionType);
  }

  /// @inheritdoc ISpaceManager
  function getSpaceInfoBySpaceId(uint256 _spaceId)
    external
    view
    returns (DataTypes.SpaceInfo memory)
  {
    return
      DataTypes.SpaceInfo(
        _spaceById[_spaceId].spaceId,
        _spaceById[_spaceId].createdAt,
        _spaceById[_spaceId].name,
        _spaceById[_spaceId].creator,
        _spaceById[_spaceId].owner
      );
  }

  /// @inheritdoc ISpaceManager
  function getSpaces() external view returns (DataTypes.SpaceInfo[] memory) {
    DataTypes.SpaceInfo[] memory spaces = new DataTypes.SpaceInfo[](
      _spacesCounter
    );

    for (uint256 i = 0; i < _spacesCounter; i++) {
      DataTypes.Space storage space = _spaceById[i + 1];
      spaces[i] = DataTypes.SpaceInfo(
        space.spaceId,
        space.createdAt,
        space.name,
        space.creator,
        space.owner
      );
    }
    return spaces;
  }

  /// @inheritdoc ISpaceManager
  function getEntitlementModulesBySpaceId(uint256 spaceId)
    public
    view
    returns (address[] memory entitlementModules)
  {
    return _spaceById[spaceId].entitlementModules;
  }

  /// @inheritdoc ISpaceManager
  function isEntitlementModuleWhitelisted(
    uint256 spaceId,
    address entitlementModuleAddress
  ) public view returns (bool) {
    return _spaceById[spaceId].hasEntitlement[entitlementModuleAddress];
  }

  /// @inheritdoc ISpaceManager
  function getEntitlementsInfoBySpaceId(uint256 spaceId)
    public
    view
    returns (DataTypes.EntitlementModuleInfo[] memory)
  {
    DataTypes.EntitlementModuleInfo[]
      memory entitlementsInfo = new DataTypes.EntitlementModuleInfo[](
        _spaceById[spaceId].entitlementModules.length
      );

    for (
      uint256 i = 0;
      i < _spaceById[spaceId].entitlementModules.length;
      i++
    ) {
      address entitlement = _spaceById[spaceId].entitlementModules[i];

      if (entitlement == address(0)) continue;

      DataTypes.EntitlementModuleInfo memory info = DataTypes
        .EntitlementModuleInfo(
          entitlement,
          IEntitlementModule(entitlement).name(),
          IEntitlementModule(entitlement).description()
        );

      entitlementsInfo[i] = info;
    }

    return entitlementsInfo;
  }

  /// @inheritdoc ISpaceManager
  function getSpaceIdByNetworkId(string calldata networkId)
    external
    view
    returns (uint256)
  {
    return _spaceIdByNetworkId[networkId];
  }

  /// @inheritdoc ISpaceManager
  function getSpaceOwnerBySpaceId(uint256 _spaceId)
    external
    view
    returns (address ownerAddress)
  {
    return _spaceById[_spaceId].owner;
  }

  /// ****************************
  /// *****INTERNAL FUNCTIONS*****
  /// ****************************
  function _createSpace(DataTypes.CreateSpaceData calldata info)
    internal
    returns (uint256)
  {
    unchecked {
      // create space Id
      uint256 spaceId = ++_spacesCounter;

      // create space
      ZionSpaceController.createSpace(
        info,
        spaceId,
        _msgSender(),
        _spaceByNameHash,
        _spaceById,
        _spaceIdByNetworkId
      );

      return spaceId;
    }
  }

  function _createRole(
    uint256 spaceId,
    string memory name,
    bytes8 color
  ) internal returns (uint256) {
    uint256 roleId = _rolesBySpaceId[spaceId].idCounter++;
    _rolesBySpaceId[spaceId].roles.push(
      DataTypes.Role(roleId, name, color, false)
    );
    return roleId;
  }

  function _addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) internal {
    _permissionsBySpaceIdByRoleId[spaceId][roleId].push(permission);
  }

  function _addRoleToEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    uint256 roleId,
    bytes memory entitlementData
  ) internal {
    // make sure entitlement module is whitelisted
    if (!_spaceById[spaceId].hasEntitlement[entitlementAddress])
      revert Errors.EntitlementNotWhitelisted();

    // add the entitlement to the entitlement module
    IEntitlementModule(entitlementAddress).setEntitlement(
      spaceId,
      0,
      roleId,
      entitlementData
    );
  }

  function _removeEntitlement(
    uint256 spaceId,
    address entitlementAddress,
    uint256[] memory roleIds,
    bytes memory data
  ) internal {
    // make sure entitlement module is whitelisted
    if (!_spaceById[spaceId].hasEntitlement[entitlementAddress])
      revert Errors.EntitlementNotWhitelisted();

    // add the entitlement to the entitlement module
    IEntitlementModule(entitlementAddress).removeEntitlement(
      spaceId,
      0,
      roleIds,
      data
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
      for (uint256 i = 0; i < len; i++) {
        if (_spaceById[spaceId].entitlementModules[i] == entitlementAddress) {
          // Remove the entitlement address from the space entitlements
          _spaceById[spaceId].entitlementModules[i] = _spaceById[spaceId]
            .entitlementModules[len - 1];
          _spaceById[spaceId].entitlementModules.pop();
        }
      }
    }
  }

  /// @notice validate that the caller is the owner of the space
  /// @param spaceId the space id
  function _validateCallerIsSpaceOwner(uint256 spaceId) internal view {
    if (_spaceById[spaceId].owner != _msgSender())
      revert Errors.NotSpaceOwner();
  }

  /// @notice validates that the entitlement module implements the correct interface
  /// @param entitlementAddress the address of the entitlement module
  function _validateEntitlementInterface(address entitlementAddress)
    internal
    view
  {
    if (
      IERC165(entitlementAddress).supportsInterface(
        type(IEntitlementModule).interfaceId
      ) == false
    ) revert Errors.EntitlementModuleNotSupported();
  }
}
