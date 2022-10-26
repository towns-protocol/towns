//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "./interfaces/ISpaceManager.sol";
import {IEntitlementModule} from "./interfaces/IEntitlementModule.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Constants} from "./libraries/Constants.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";
import {ZionEntitlementManager} from "./ZionEntitlementManager.sol";
import {IERC165} from "openzeppelin-contracts/contracts/interfaces/IERC165.sol";
import {CreationLogic} from "./libraries/CreationLogic.sol";
import {ZionPermissionsRegistry} from "./ZionPermissionsRegistry.sol";
import {PermissionTypes} from "./libraries/PermissionTypes.sol";
import {ISpace} from "./interfaces/ISpace.sol";

/// @title ZionSpaceManager
/// @author HNT Labs
/// @notice This contract manages the spaces and entitlements in the Zion ecosystem.
contract ZionSpaceManager is ZionEntitlementManager, ISpaceManager {
  modifier onlyAllowed(
    string memory spaceId,
    string memory channelId,
    bytes32 permission
  ) {
    _validateIsAllowed(spaceId, channelId, permission);
    _;
  }

  constructor(address permissionRegistry)
    ZionEntitlementManager(permissionRegistry)
  {}

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

    // mint space nft
    ISpace(SPACE_NFT).mintBySpaceId(spaceId, _msgSender());

    // whitespace default entitlement module
    _whitelistEntitlementModule(spaceId, DEFAULT_USER_ENTITLEMENT_MODULE, true);

    // whitespace default token entitlement module
    _whitelistEntitlementModule(
      spaceId,
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      true
    );

    // Create owner role with all permissions
    uint256 ownerRoleId = _createOwnerRoleEntitlement(
      spaceId,
      info.spaceNetworkId
    );
    _spaceById[spaceId].ownerRoleId = ownerRoleId;

    // Create everyone role with read permission
    _createEveryoneRoleEntitlement(spaceId, info.spaceNetworkId);

    emit Events.CreateSpace(info.spaceNetworkId, _msgSender());

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
    _whitelistEntitlementModule(spaceId, DEFAULT_USER_ENTITLEMENT_MODULE, true);

    // whitespace token entitlement module
    _whitelistEntitlementModule(
      spaceId,
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      true
    );

    // Create owner role with all permissions
    _createOwnerRoleEntitlement(spaceId, info.spaceNetworkId);

    // Create everyone role with read permission
    _createEveryoneRoleEntitlement(spaceId, info.spaceNetworkId);

    // create the additional role being gated by the token
    uint256 permissionLen = entitlement.permissions.length;
    uint256 additionalRoleId = _createRole(spaceId, entitlement.roleName);

    // Add the extra permissions passed to the new role
    if (permissionLen > 0) {
      for (uint256 i = 0; i < permissionLen; ) {
        _addPermissionToRole(
          spaceId,
          additionalRoleId,
          DataTypes.Permission(entitlement.permissions[i])
        );
        unchecked {
          ++i;
        }
      }
    }

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = entitlement.externalTokenEntitlement;

    // add additional role to the token entitlement module
    _addRoleToEntitlementModule(
      info.spaceNetworkId,
      "",
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      additionalRoleId,
      abi.encode(externalTokenEntitlement)
    );

    emit Events.CreateSpace(info.spaceNetworkId, _msgSender());

    return spaceId;
  }

  /// @inheritdoc ISpaceManager
  function createChannel(DataTypes.CreateChannelData memory data)
    external
    onlyAllowed(data.spaceNetworkId, "", PermissionTypes.AddRemoveChannels)
    returns (uint256)
  {
    _validateSpaceExists(data.spaceNetworkId);

    uint256 spaceId = _getSpaceIdByNetworkId(data.spaceNetworkId);
    uint256 channelId = _createChannel(spaceId, data);

    DataTypes.ExternalToken memory spaceNFTInfo = _getOwnerNFTInformation(
      spaceId
    );
    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = spaceNFTInfo;

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        "Space Owner NFT Gate",
        externalTokens
      );

    // add owner role to channel's default entitlement module
    _addRoleToEntitlementModule(
      data.spaceNetworkId,
      data.channelNetworkId,
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      _spaceById[spaceId].ownerRoleId,
      abi.encode(externalTokenEntitlement)
    );

    emit Events.CreateChannel(
      data.spaceNetworkId,
      data.channelNetworkId,
      _msgSender()
    );

    return channelId;
  }

  /// *********************************
  /// *****EXTERNAL FUNCTIONS**********
  /// *********************************
  function setSpaceAccess(string memory spaceNetworkId, bool disabled)
    external
    onlyAllowed(spaceNetworkId, "", PermissionTypes.ModifySpacePermissions)
  {
    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    if (spaceId == 0) revert Errors.SpaceDoesNotExist();

    _spaceById[spaceId].disabled = disabled;

    emit Events.SetSpaceAccess(spaceNetworkId, _msgSender(), disabled);
  }

  function setChannelAccess(
    string calldata spaceNetworkId,
    string calldata channelNetworkId,
    bool disabled
  )
    external
    onlyAllowed(
      spaceNetworkId,
      channelNetworkId,
      PermissionTypes.ModifyChannelPermissions
    )
  {
    _validateSpaceExists(spaceNetworkId);
    _validateChannelExists(spaceNetworkId, channelNetworkId);

    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    uint256 channelId = _getChannelIdByNetworkId(
      spaceNetworkId,
      channelNetworkId
    );

    _channelBySpaceIdByChannelId[spaceId][channelId].disabled = disabled;

    emit Events.SetChannelAccess(
      spaceNetworkId,
      channelNetworkId,
      _msgSender(),
      disabled
    );
  }

  /// @inheritdoc ISpaceManager
  function setDefaultUserEntitlementModule(address entitlementModule)
    external
    onlyOwner
  {
    DEFAULT_USER_ENTITLEMENT_MODULE = entitlementModule;
    emit Events.DefaultEntitlementSet(entitlementModule);
  }

  /// @inheritdoc ISpaceManager
  function setDefaultTokenEntitlementModule(address entitlementModule)
    external
    onlyOwner
  {
    DEFAULT_TOKEN_ENTITLEMENT_MODULE = entitlementModule;
    emit Events.DefaultEntitlementSet(entitlementModule);
  }

  /// @inheritdoc ISpaceManager
  function setSpaceNFT(address spaceNFTAddress) external onlyOwner {
    SPACE_NFT = spaceNFTAddress;
    emit Events.SpaceNFTAddressSet(spaceNFTAddress);
  }

  /// @inheritdoc ISpaceManager
  function whitelistEntitlementModule(
    string calldata spaceId,
    address entitlementAddress,
    bool whitelist
  ) external onlyAllowed(spaceId, "", PermissionTypes.ModifySpacePermissions) {
    _validateEntitlementInterface(entitlementAddress);
    _whitelistEntitlementModule(
      _getSpaceIdByNetworkId(spaceId),
      entitlementAddress,
      whitelist
    );

    emit Events.WhitelistEntitlementModule(
      spaceId,
      entitlementAddress,
      whitelist
    );
  }

  /// @inheritdoc ISpaceManager
  function createRole(string calldata spaceId, string calldata name)
    external
    onlyAllowed(spaceId, "", PermissionTypes.ModifySpacePermissions)
    returns (uint256)
  {
    uint256 roleId = _createRole(_getSpaceIdByNetworkId(spaceId), name);

    emit Events.CreateRole(spaceId, roleId, name, _msgSender());

    return roleId;
  }

  /// @inheritdoc ISpaceManager
  function removeRole(string calldata spaceId, uint256 roleId)
    external
    onlyAllowed(spaceId, "", PermissionTypes.ModifySpacePermissions)
  {
    if (roleId == _spaceById[_getSpaceIdByNetworkId(spaceId)].ownerRoleId)
      revert Errors.InvalidParameters();

    _removeRole(_getSpaceIdByNetworkId(spaceId), roleId);

    emit Events.RemoveRole(spaceId, roleId, _msgSender());
  }

  /// @inheritdoc ISpaceManager
  function addPermissionToRole(
    string calldata spaceId,
    uint256 roleId,
    DataTypes.Permission calldata permission
  ) external onlyAllowed(spaceId, "", PermissionTypes.ModifySpacePermissions) {
    if (
      keccak256(abi.encode(permission)) ==
      keccak256(abi.encode(getPermissionFromMap(PermissionTypes.Owner)))
    ) {
      revert Errors.InvalidParameters();
    }

    _addPermissionToRole(_getSpaceIdByNetworkId(spaceId), roleId, permission);

    emit Events.UpdateRole(spaceId, roleId, _msgSender());
  }

  /// @inheritdoc ISpaceManager
  function removePermissionFromRole(
    string calldata spaceId,
    uint256 roleId,
    DataTypes.Permission calldata permission
  ) external onlyAllowed(spaceId, "", PermissionTypes.ModifySpacePermissions) {
    if (
      keccak256(abi.encode(permission)) ==
      keccak256(abi.encode(getPermissionFromMap(PermissionTypes.Owner)))
    ) {
      revert Errors.InvalidParameters();
    }

    _removePermissionFromRole(
      _getSpaceIdByNetworkId(spaceId),
      roleId,
      permission
    );

    emit Events.UpdateRole(spaceId, roleId, _msgSender());
  }

  /// @inheritdoc ISpaceManager
  function addRoleToEntitlementModule(
    string calldata spaceId,
    string calldata channelId,
    address entitlementModuleAddress,
    uint256 roleId,
    bytes calldata entitlementData
  )
    external
    onlyAllowed(spaceId, channelId, PermissionTypes.ModifyChannelPermissions)
  {
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
  )
    external
    onlyAllowed(spaceId, channelId, PermissionTypes.ModifyChannelPermissions)
  {
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

  function _createOwnerRoleEntitlement(uint256 spaceId, string memory networkId)
    internal
    returns (uint256)
  {
    DataTypes.ExternalToken memory spaceNFTInfo = _getOwnerNFTInformation(
      spaceId
    );

    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = spaceNFTInfo;
    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        "Space Owner NFT Gate",
        externalTokens
      );

    uint256 ownerRoleId = _createOwnerRole(spaceId);
    _addRoleToEntitlementModule(
      networkId,
      "",
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      ownerRoleId,
      abi.encode(externalTokenEntitlement)
    );

    return ownerRoleId;
  }

  function _getOwnerNFTInformation(uint256 spaceId)
    internal
    view
    returns (DataTypes.ExternalToken memory)
  {
    DataTypes.ExternalToken memory tokenInfo = DataTypes.ExternalToken(
      SPACE_NFT,
      1,
      true,
      spaceId
    );
    return tokenInfo;
  }

  /// ****************************
  /// ****VALIDATION FUNCTIONS****
  /// ****************************
  function _validateSpaceExists(string memory spaceId) internal view {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    if (_spaceId == 0) revert Errors.SpaceDoesNotExist();
    if (_spaceById[_spaceId].disabled) revert Errors.SpaceDoesNotExist();
  }

  function _validateChannelExists(
    string memory spaceId,
    string memory channelId
  ) internal view {
    uint256 _channelId = _getChannelIdByNetworkId(spaceId, channelId);
    if (_channelId == 0) revert Errors.ChannelDoesNotExist();
  }

  function _validateIsAllowed(
    string memory spaceNetworkId,
    string memory channelNetworkId,
    bytes32 permission
  ) internal view {
    if (
      // check if the caller is the space manager contract itself, was getting erros when calling internal functions
      _msgSender() == address(this) ||
      _msgSender() ==
      _spaceById[_getSpaceIdByNetworkId(spaceNetworkId)].owner ||
      _isEntitled(
        spaceNetworkId,
        channelNetworkId,
        _msgSender(),
        getPermissionFromMap(permission)
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
    if (DEFAULT_USER_ENTITLEMENT_MODULE == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();
    if (DEFAULT_TOKEN_ENTITLEMENT_MODULE == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();
    if (SPACE_NFT == address(0)) revert Errors.SpaceNFTNotSet();
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
