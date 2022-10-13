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
  modifier onlySpaceOwner(string calldata spaceId) {
    _validateCallerIsSpaceOwner(_getSpaceIdByNetworkId(spaceId));
    _;
  }

  modifier onlyAllowed(
    string memory spaceId,
    string memory channelId,
    address caller,
    string memory permission
  ) {
    if (
      caller == address(this) ||
      caller == _spaceById[_getSpaceIdByNetworkId(spaceId)].owner ||
      isEntitled(spaceId, channelId, caller, DataTypes.Permission(permission))
    ) {
      _;
    } else {
      revert Errors.NotAllowed();
    }
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
    _validateSpaceDefaults();

    // create space Id
    uint256 spaceId = _createSpace(info);

    // whitespace default entitlement module
    _whitelistEntitlementModule(
      spaceId,
      _defaultEntitlementModuleAddress,
      true
    );

    // Create roles and add permissions
    uint256 ownerRoleId = _createOwnerRole(spaceId);
    _addRoleToEntitlementModule(
      info.networkId,
      "",
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
    _validateSpaceDefaults();

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

    // Add the default Owner Role
    uint256 ownerRoleId = _createOwnerRole(spaceId);

    // Add the extra permissions passed to the same owner role
    if (entitlement.permissions.length > 0) {
      for (uint256 i = 0; i < entitlement.permissions.length; i++) {
        _addPermissionToRole(
          spaceId,
          ownerRoleId,
          DataTypes.Permission(entitlement.permissions[i])
        );
      }
    }

    // add role to the default entitlement module
    _addRoleToEntitlementModule(
      info.networkId,
      "",
      _defaultEntitlementModuleAddress,
      ownerRoleId,
      abi.encode(_msgSender())
    );

    // add role to te token entitlement module
    _addRoleToEntitlementModule(
      info.networkId,
      "",
      entitlement.entitlementModuleAddress,
      ownerRoleId,
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

  function createChannel(DataTypes.CreateChannelData memory data)
    external
    onlyAllowed(data.spaceId, "", _msgSender(), "AddRemoveChannels")
  {
    uint256 spaceId = _spaceIdByHash[keccak256(bytes(data.spaceId))];

    // validate channel name
    uint256 channelId = ++_channelsBySpaceId[spaceId].idCounter;

    bytes32 networkHash = keccak256(bytes(data.networkId));

    if (_channelIdBySpaceIdByHash[spaceId][networkHash] != 0) {
      revert Errors.SpaceAlreadyRegistered();
    }

    _channelIdBySpaceIdByHash[spaceId][networkHash] = channelId;

    _channelBySpaceIdByChannelId[spaceId][channelId].channelId = channelId;
    _channelBySpaceIdByChannelId[spaceId][channelId].networkId = data.networkId;
    _channelBySpaceIdByChannelId[spaceId][channelId].name = data.channelName;
    _channelBySpaceIdByChannelId[spaceId][channelId].creator = _msgSender();

    // store channel in mapping
    _channelsBySpaceId[spaceId].channels.push(
      _channelBySpaceIdByChannelId[spaceId][channelId]
    );

    // add owner role to channel's default entitlement module
    _addRoleToEntitlementModule(
      data.spaceId,
      data.networkId,
      _defaultEntitlementModuleAddress,
      _spaceById[spaceId].ownerRoleId,
      abi.encode(_msgSender())
    );

    // add extra roles and permissions to the channel's user entitlement module
    for (uint256 i = 0; i < data.roles.length; i++) {
      DataTypes.CreateRoleData memory role = data.roles[i];
      uint256 roleId = _createRole(spaceId, role.name);

      for (uint256 j = 0; j < role.permissions.length; j++) {
        _addPermissionToRole(spaceId, roleId, role.permissions[j]);
      }

      _addRoleToEntitlementModule(
        data.spaceId,
        data.networkId,
        _defaultEntitlementModuleAddress,
        roleId,
        abi.encode(_msgSender())
      );
    }

    // emit event
  }

  /// *********************************
  /// *****EXTERNAL FUNCTIONS**********
  /// *********************************

  /// @inheritdoc ISpaceManager
  function setDefaultEntitlementModule(address entitlementModule)
    external
    onlyOwner
  {
    _defaultEntitlementModuleAddress = entitlementModule;
    emit Events.DefaultEntitlementSet(entitlementModule);
  }

  function setDefaultPermissionsManager(address permissionsManager)
    external
    onlyOwner
  {
    _defaultPermissionsManagerAddress = permissionsManager;
    emit Events.DefaultPermissionsManagerSet(permissionsManager);
  }

  /// @inheritdoc ISpaceManager
  function whitelistEntitlementModule(
    string calldata spaceId,
    address entitlementAddress,
    bool whitelist
  ) external onlyAllowed(spaceId, "", _msgSender(), "ModifySpacePermissions") {
    _validateEntitlementInterface(entitlementAddress);
    _whitelistEntitlementModule(
      _getSpaceIdByNetworkId(spaceId),
      entitlementAddress,
      whitelist
    );
  }

  /// @inheritdoc ISpaceManager
  function createRole(string calldata spaceId, string calldata name)
    external
    onlySpaceOwner(spaceId)
    returns (uint256)
  {
    return _createRole(_getSpaceIdByNetworkId(spaceId), name);
  }

  function addPermissionToRole(
    string calldata spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) external onlySpaceOwner(spaceId) {
    _addPermissionToRole(_getSpaceIdByNetworkId(spaceId), roleId, permission);
  }

  /// @inheritdoc ISpaceManager
  function addRoleToEntitlementModule(
    string calldata spaceId,
    string calldata channelId,
    address entitlementModuleAddress,
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlySpaceOwner(spaceId) {
    _validateEntitlementInterface(entitlementModuleAddress);
    _addRoleToEntitlementModule(
      spaceId,
      channelId,
      entitlementModuleAddress,
      roleId,
      entitlementData
    );

    emit Events.EntitlementModuleAdded(spaceId, entitlementModuleAddress);
  }

  /// @inheritdoc ISpaceManager
  function removeEntitlement(
    string calldata spaceId,
    string calldata channelId,
    address entitlementModuleAddress,
    uint256[] memory roleIds,
    bytes memory data
  ) external onlySpaceOwner(spaceId) {
    _validateEntitlementInterface(entitlementModuleAddress);
    _removeEntitlement(
      spaceId,
      channelId,
      entitlementModuleAddress,
      roleIds,
      data
    );
    emit Events.EntitlementModuleRemoved(spaceId, entitlementModuleAddress);
  }

  /// *********************************
  /// *****EXTERNAL VIEW FUNCTIONS*****
  /// *********************************

  /// @inheritdoc ISpaceManager
  function isEntitled(
    string memory spaceId,
    string memory channelId,
    address user,
    DataTypes.Permission memory permission
  ) public view returns (bool) {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    bool entitled = false;

    for (
      uint256 i = 0;
      i < _spaceById[_spaceId].entitlementModules.length;
      i++
    ) {
      address entitlement = _spaceById[_spaceId].entitlementModules[i];

      if (entitlement == address(0)) continue;

      if (
        IEntitlementModule(entitlement).isEntitled(
          spaceId,
          channelId,
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
  function getPermissionsBySpaceIdByRoleId(
    string calldata spaceId,
    uint256 roleId
  ) public view returns (DataTypes.Permission[] memory) {
    return
      _permissionsBySpaceIdByRoleId[_getSpaceIdByNetworkId(spaceId)][roleId];
  }

  /// @inheritdoc ISpaceManager
  function getRolesBySpaceId(string calldata spaceId)
    public
    view
    returns (DataTypes.Role[] memory)
  {
    return _rolesBySpaceId[_getSpaceIdByNetworkId(spaceId)].roles;
  }

  /// @inheritdoc ISpaceManager
  function getRoleBySpaceIdByRoleId(string calldata spaceId, uint256 roleId)
    public
    view
    returns (DataTypes.Role memory)
  {
    return _rolesBySpaceId[_getSpaceIdByNetworkId(spaceId)].roles[roleId];
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
  function getSpaceInfoBySpaceId(string calldata spaceId)
    external
    view
    returns (DataTypes.SpaceInfo memory)
  {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);

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
  function getEntitlementModulesBySpaceId(string calldata spaceId)
    public
    view
    returns (address[] memory entitlementModules)
  {
    return _spaceById[_getSpaceIdByNetworkId(spaceId)].entitlementModules;
  }

  /// @inheritdoc ISpaceManager
  function isEntitlementModuleWhitelisted(
    string calldata spaceId,
    address entitlementModuleAddress
  ) public view returns (bool) {
    return
      _spaceById[_getSpaceIdByNetworkId(spaceId)].hasEntitlement[
        entitlementModuleAddress
      ];
  }

  /// @inheritdoc ISpaceManager
  function getEntitlementsInfoBySpaceId(string calldata spaceId)
    public
    view
    returns (DataTypes.EntitlementModuleInfo[] memory)
  {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);

    DataTypes.EntitlementModuleInfo[]
      memory entitlementsInfo = new DataTypes.EntitlementModuleInfo[](
        _spaceById[_spaceId].entitlementModules.length
      );

    for (
      uint256 i = 0;
      i < _spaceById[_spaceId].entitlementModules.length;
      i++
    ) {
      address entitlement = _spaceById[_spaceId].entitlementModules[i];

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
  function getSpaceOwnerBySpaceId(string calldata spaceId)
    external
    view
    returns (address ownerAddress)
  {
    return _spaceById[_getSpaceIdByNetworkId(spaceId)].owner;
  }

  function getSpaceIdByNetworkId(string calldata networkId)
    external
    view
    returns (uint256)
  {
    return _getSpaceIdByNetworkId(networkId);
  }

  function getChannelIdByNetworkId(
    string calldata spaceId,
    string calldata channelId
  ) external view returns (uint256) {
    return _getChannelIdByNetworkId(spaceId, channelId);
  }

  /// ****************************
  /// *****INTERNAL FUNCTIONS*****
  /// ****************************
  function _getSpaceIdByNetworkId(string memory networkId)
    internal
    view
    returns (uint256)
  {
    return _spaceIdByHash[keccak256(bytes(networkId))];
  }

  function _getChannelIdByNetworkId(
    string calldata spaceId,
    string calldata channelId
  ) internal view returns (uint256) {
    return
      _channelIdBySpaceIdByHash[_getSpaceIdByNetworkId(spaceId)][
        keccak256(bytes(channelId))
      ];
  }

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
        _spaceIdByHash,
        _spaceById
      );

      return spaceId;
    }
  }

  function _createRole(uint256 spaceId, string memory name)
    internal
    returns (uint256)
  {
    uint256 roleId = _rolesBySpaceId[spaceId].idCounter++;
    _rolesBySpaceId[spaceId].roles.push(DataTypes.Role(roleId, name, false));
    return roleId;
  }

  function _createOwnerRole(uint256 spaceId) internal returns (uint256) {
    uint256 ownerRoleId = _createRole(spaceId, "Owner");
    _spaceById[spaceId].ownerRoleId = ownerRoleId;

    DataTypes.Permission[] memory allPermissions = ZionPermissionsRegistry(
      _defaultPermissionsManagerAddress
    ).getAllPermissions();
    uint256 permissionLen = allPermissions.length;

    for (uint256 i = 0; i < permissionLen; i++) {
      _addPermissionToRole(spaceId, ownerRoleId, allPermissions[i]);
    }

    return ownerRoleId;
  }

  function _addPermissionToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission
  ) internal {
    _permissionsBySpaceIdByRoleId[spaceId][roleId].push(permission);
  }

  function _addRoleToEntitlementModule(
    string memory spaceId,
    string memory channelId,
    address entitlementAddress,
    uint256 roleId,
    bytes memory entitlementData
  ) internal {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);

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

  function _removeEntitlement(
    string calldata spaceId,
    string calldata channelId,
    address entitlementAddress,
    uint256[] memory roleIds,
    bytes memory data
  ) internal {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);

    // make sure entitlement module is whitelisted
    if (!_spaceById[_spaceId].hasEntitlement[entitlementAddress])
      revert Errors.EntitlementNotWhitelisted();

    // add the entitlement to the entitlement module
    IEntitlementModule(entitlementAddress).removeEntitlement(
      spaceId,
      channelId,
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

  /// ****************************
  /// ****VALIDATION FUNCTIONS****
  /// ****************************
  function _validateSpaceDefaults() internal view {
    if (_defaultPermissionsManagerAddress == address(0))
      revert Errors.DefaultPermissionsManagerNotSet();
    if (_defaultEntitlementModuleAddress == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();
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
