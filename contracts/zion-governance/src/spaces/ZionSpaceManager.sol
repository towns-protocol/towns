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
import {CreationLogic} from "./libraries/CreationLogic.sol";
import {ZionPermissionsRegistry} from "./ZionPermissionsRegistry.sol";

/// @title ZionSpaceManager
/// @author HNT Labs
/// @notice This contract manages the spaces and entitlements in the Zion ecosystem.
contract ZionSpaceManager is Ownable, ZionSpaceManagerStorage, ISpaceManager {
  address internal immutable PERMISSION_REGISTRY;
  address internal DEFAULT_ENTITLEMENT_MODULE;

  modifier onlyAllowed(
    string memory spaceId,
    string memory channelId,
    string memory permission
  ) {
    _validateIsAllowed(spaceId, channelId, permission);
    _;
  }

  constructor(address permissionRegistry) {
    if (permissionRegistry == address(0)) revert Errors.InvalidParameters();
    PERMISSION_REGISTRY = permissionRegistry;
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
    _whitelistEntitlementModule(spaceId, DEFAULT_ENTITLEMENT_MODULE, true);

    // Create roles and add permissions
    uint256 ownerRoleId = _createOwnerRole(spaceId);
    _addRoleToEntitlementModule(
      info.spaceNetworkId,
      "",
      DEFAULT_ENTITLEMENT_MODULE,
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
    _whitelistEntitlementModule(spaceId, DEFAULT_ENTITLEMENT_MODULE, true);

    // whitespace token entitlement module
    _whitelistEntitlementModule(
      spaceId,
      entitlement.entitlementModuleAddress,
      true
    );

    // Add the default Owner Role
    uint256 ownerRoleId = _createOwnerRole(spaceId);
    uint256 permissionLen = entitlement.permissions.length;

    // Add the extra permissions passed to the same owner role
    if (permissionLen > 0) {
      for (uint256 i = 0; i < permissionLen; i++) {
        _addPermissionToRole(
          spaceId,
          ownerRoleId,
          DataTypes.Permission(entitlement.permissions[i])
        );
      }
    }

    // add role to the default entitlement module
    _addRoleToEntitlementModule(
      info.spaceNetworkId,
      "",
      DEFAULT_ENTITLEMENT_MODULE,
      ownerRoleId,
      abi.encode(_msgSender())
    );

    // add role to te token entitlement module
    _addRoleToEntitlementModule(
      info.spaceNetworkId,
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

  function createChannel(
    DataTypes.CreateChannelData memory data,
    DataTypes.CreateRoleData memory role
  )
    external
    onlyAllowed(data.spaceNetworkId, "", "AddRemoveChannels")
    returns (uint256)
  {
    _validateSpaceExists(data.spaceNetworkId);

    uint256 spaceId = _getSpaceIdByNetworkId(data.spaceNetworkId);
    uint256 channelId = _createChannel(spaceId, data);

    // add owner role to channel's default entitlement module
    _addRoleToEntitlementModule(
      data.spaceNetworkId,
      data.channelNetworkId,
      DEFAULT_ENTITLEMENT_MODULE,
      _spaceById[spaceId].ownerRoleId,
      abi.encode(_msgSender())
    );

    // create role with permissions
    uint256 roleId = _createRole(spaceId, role.name);

    uint256 permissionLen = role.permissions.length;

    for (uint256 j = 0; j < permissionLen; ) {
      _addPermissionToRole(spaceId, roleId, role.permissions[j]);
      unchecked {
        ++j;
      }
    }

    return channelId;
  }

  /// *********************************
  /// *****EXTERNAL FUNCTIONS**********
  /// *********************************
  function setSpaceAccess(string memory spaceNetworkId, bool disabled)
    external
    onlyAllowed(spaceNetworkId, "", "ModifySpacePermissions")
  {
    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    if (spaceId == 0) revert Errors.SpaceDoesNotExist();

    _spaceById[spaceId].disabled = disabled;
  }

  function setChannelAccess(
    string calldata spaceNetworkId,
    string calldata channelNetworkId,
    bool disabled
  )
    external
    onlyAllowed(spaceNetworkId, channelNetworkId, "ModifyPermissions")
  {
    _validateSpaceExists(spaceNetworkId);
    uint256 _channelId = _getChannelIdByNetworkId(
      spaceNetworkId,
      channelNetworkId
    );
    if (_channelId == 0) revert Errors.ChannelDoesNotExist();

    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    uint256 channelId = _getChannelIdByNetworkId(
      spaceNetworkId,
      channelNetworkId
    );

    _channelBySpaceIdByChannelId[spaceId][channelId].disabled = disabled;
  }

  /// @inheritdoc ISpaceManager
  function setDefaultEntitlementModule(address entitlementModule)
    external
    onlyOwner
  {
    DEFAULT_ENTITLEMENT_MODULE = entitlementModule;
    emit Events.DefaultEntitlementSet(entitlementModule);
  }

  /// @inheritdoc ISpaceManager
  function whitelistEntitlementModule(
    string calldata spaceId,
    address entitlementAddress,
    bool whitelist
  ) external onlyAllowed(spaceId, "", "ModifySpacePermissions") {
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
    onlyAllowed(spaceId, "", "ModifyPermissions")
    returns (uint256)
  {
    return _createRole(_getSpaceIdByNetworkId(spaceId), name);
  }

  /// @inheritdoc ISpaceManager
  function removeRole(string calldata spaceId, uint256 roleId)
    external
    onlyAllowed(spaceId, "", "ModifyPermissions")
  {
    _removeRole(_getSpaceIdByNetworkId(spaceId), roleId);
  }

  /// @inheritdoc ISpaceManager
  function addPermissionToRole(
    string calldata spaceId,
    uint256 roleId,
    DataTypes.Permission calldata permission
  ) external onlyAllowed(spaceId, "", "ModifyPermissions") {
    _addPermissionToRole(_getSpaceIdByNetworkId(spaceId), roleId, permission);
  }

  /// @inheritdoc ISpaceManager
  function removePermissionFromRole(
    string calldata spaceId,
    uint256 roleId,
    DataTypes.Permission calldata permission
  ) external onlyAllowed(spaceId, "", "ModifyPermissions") {
    _removePermissionFromRole(
      _getSpaceIdByNetworkId(spaceId),
      roleId,
      permission
    );
  }

  /// @inheritdoc ISpaceManager
  function addRoleToEntitlementModule(
    string calldata spaceId,
    string calldata channelId,
    address entitlementModuleAddress,
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlyAllowed(spaceId, channelId, "ModifyPermissions") {
    _validateSpaceExists(spaceId);

    if (bytes(channelId).length > 0) {
      _validateChannelExists(spaceId, channelId);
    }

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
    uint256[] calldata roleIds,
    bytes calldata data
  ) external onlyAllowed(spaceId, channelId, "ModifyPermissions") {
    _validateSpaceExists(spaceId);

    if (bytes(channelId).length > 0) {
      _validateChannelExists(spaceId, channelId);
    }

    _validateEntitlementInterface(entitlementModuleAddress);
    _removeRoleFromEntitlementModule(
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
    string calldata spaceId,
    string calldata channelId,
    address user,
    DataTypes.Permission calldata permission
  ) external view returns (bool) {
    return _isEntitled(spaceId, channelId, user, permission);
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

  /// @inheritdoc ISpaceManager
  function getPermissionFromMap(bytes32 permissionType)
    public
    view
    returns (DataTypes.Permission memory permission)
  {
    return
      ZionPermissionsRegistry(PERMISSION_REGISTRY)
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
        _spaceById[_spaceId].networkId,
        _spaceById[_spaceId].createdAt,
        _spaceById[_spaceId].name,
        _spaceById[_spaceId].creator,
        _spaceById[_spaceId].owner,
        _spaceById[_spaceId].disabled
      );
  }

  /// @inheritdoc ISpaceManager
  function getChannelInfoByChannelId(
    string calldata spaceId,
    string calldata channelId
  ) external view returns (DataTypes.ChannelInfo memory) {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = _getChannelIdByNetworkId(spaceId, channelId);

    return
      DataTypes.ChannelInfo(
        _channelBySpaceIdByChannelId[_spaceId][_channelId].channelId,
        _channelBySpaceIdByChannelId[_spaceId][_channelId].networkId,
        _channelBySpaceIdByChannelId[_spaceId][_channelId].createdAt,
        _channelBySpaceIdByChannelId[_spaceId][_channelId].name,
        _channelBySpaceIdByChannelId[_spaceId][_channelId].creator,
        _channelBySpaceIdByChannelId[_spaceId][_channelId].disabled
      );
  }

  /// @inheritdoc ISpaceManager
  function getSpaces() external view returns (DataTypes.SpaceInfo[] memory) {
    DataTypes.SpaceInfo[] memory spaces = new DataTypes.SpaceInfo[](
      _spacesCounter
    );

    for (uint256 i = 0; i < _spacesCounter; ) {
      DataTypes.Space storage space = _spaceById[i + 1];
      spaces[i] = DataTypes.SpaceInfo(
        space.spaceId,
        space.networkId,
        space.createdAt,
        space.name,
        space.creator,
        space.owner,
        space.disabled
      );
      unchecked {
        ++i;
      }
    }
    return spaces;
  }

  /// @inheritdoc ISpaceManager
  function getChannelsBySpaceId(string memory spaceId)
    external
    view
    returns (DataTypes.Channels memory)
  {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    return _channelsBySpaceId[_spaceId];
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

    uint256 entitlementModulesLen = _spaceById[_spaceId]
      .entitlementModules
      .length;

    for (uint256 i = 0; i < entitlementModulesLen; i++) {
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

  /// @inheritdoc ISpaceManager
  function getSpaceIdByNetworkId(string calldata networkId)
    external
    view
    returns (uint256)
  {
    return _getSpaceIdByNetworkId(networkId);
  }

  /// @inheritdoc ISpaceManager
  function getChannelIdByNetworkId(
    string calldata spaceId,
    string calldata channelId
  ) external view returns (uint256) {
    return _getChannelIdByNetworkId(spaceId, channelId);
  }

  /// ****************************
  /// *****INTERNAL FUNCTIONS*****
  /// ****************************
  function _isEntitled(
    string memory spaceId,
    string memory channelId,
    address user,
    DataTypes.Permission memory permission
  ) internal view returns (bool) {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);

    bool entitled = false;

    uint256 entitlementModulesLen = _spaceById[_spaceId]
      .entitlementModules
      .length;

    for (uint256 i = 0; i < entitlementModulesLen; i++) {
      address entitlement = _spaceById[_spaceId].entitlementModules[i];

      if (
        entitlement == address(0) ||
        !_spaceById[_spaceId].hasEntitlement[entitlement]
      ) continue;

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

  function _getSpaceIdByNetworkId(string memory networkId)
    internal
    view
    returns (uint256)
  {
    return _spaceIdByHash[keccak256(bytes(networkId))];
  }

  function _getChannelIdByNetworkId(
    string memory spaceId,
    string memory channelId
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
      CreationLogic.createSpace(
        info,
        spaceId,
        _msgSender(),
        _spaceIdByHash,
        _spaceById
      );

      return spaceId;
    }
  }

  function _createChannel(
    uint256 spaceId,
    DataTypes.CreateChannelData memory data
  ) internal returns (uint256) {
    unchecked {
      // create channel Id
      uint256 channelId = ++_channelsBySpaceId[spaceId].idCounter;

      // create channel
      CreationLogic.createChannel(
        data,
        spaceId,
        channelId,
        _msgSender(),
        _channelIdBySpaceIdByHash,
        _channelBySpaceIdByChannelId
      );

      // store channel in mapping
      _channelsBySpaceId[spaceId].channels.push(
        _channelBySpaceIdByChannelId[spaceId][channelId]
      );

      return channelId;
    }
  }

  function _createRole(uint256 spaceId, string memory name)
    internal
    returns (uint256)
  {
    uint256 roleId = _rolesBySpaceId[spaceId].idCounter++;
    _rolesBySpaceId[spaceId].roles.push(DataTypes.Role(roleId, name));

    emit Events.CreateRole(spaceId, roleId, _msgSender(), name);

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

    for (uint256 i = 0; i < permissionLen; i++) {
      if (_stringEquals(permission.name, permissions[i].name)) {
        permissions[i] = permissions[permissionLen - 1];
        permissions.pop();
        break;
      }
    }
  }

  function _removeRole(uint256 spaceId, uint256 roleId) internal {
    DataTypes.Role[] storage roles = _rolesBySpaceId[spaceId].roles;

    uint256 roleLen = roles.length;

    for (uint256 i = 0; i < roleLen; i++) {
      if (roleId == roles[i].roleId) {
        DataTypes.Permission[]
          memory permissions = _permissionsBySpaceIdByRoleId[spaceId][roleId];

        uint256 permissionLen = permissions.length;

        for (uint256 j = 0; j < permissionLen; j++) {
          _removePermissionFromRole(spaceId, roleId, permissions[j]);
        }

        roles[i] = roles[roleLen - 1];
        roles.pop();
        break;
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

  function _removeRoleFromEntitlementModule(
    string calldata spaceId,
    string calldata channelId,
    address entitlementAddress,
    uint256[] memory roleIds,
    bytes memory entitlementData
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

  /// ****************************
  /// ****VALIDATION FUNCTIONS****
  /// ****************************
  function _stringEquals(string memory s1, string memory s2)
    internal
    pure
    returns (bool)
  {
    bytes memory b1 = bytes(s1);
    bytes memory b2 = bytes(s2);
    uint256 l1 = b1.length;
    if (l1 != b2.length) return false;
    for (uint256 i = 0; i < l1; i++) {
      if (b1[i] != b2[i]) return false;
    }
    return true;
  }

  function _validateSpaceExists(string memory spaceId) internal view {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    if (_spaceId == 0) revert Errors.SpaceDoesNotExist();
    if (_spaceById[_spaceId].disabled) revert Errors.SpaceDoesNotExist();
  }

  function _validateChannelExists(
    string memory spaceId,
    string memory channelId
  ) internal view {
    _validateSpaceExists(spaceId);

    uint256 _channelId = _getChannelIdByNetworkId(spaceId, channelId);
    if (_channelId == 0) revert Errors.ChannelDoesNotExist();
  }

  function _validateIsAllowed(
    string memory spaceId,
    string memory channelId,
    string memory permission
  ) internal view {
    if (
      // check if the caller is the space manager contract itself, was getting erros when calling internal functions
      _msgSender() == address(this) ||
      _msgSender() == _spaceById[_getSpaceIdByNetworkId(spaceId)].owner ||
      _isEntitled(
        spaceId,
        channelId,
        _msgSender(),
        DataTypes.Permission(permission)
      )
    ) {
      return;
    } else {
      revert Errors.NotAllowed();
    }
  }

  function _validateSpaceDefaults() internal view {
    if (PERMISSION_REGISTRY == address(0))
      revert Errors.DefaultPermissionsManagerNotSet();
    if (DEFAULT_ENTITLEMENT_MODULE == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();
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
