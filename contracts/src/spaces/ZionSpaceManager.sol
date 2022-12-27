//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// import {console} from "forge-std/console.sol";

import {ISpaceManager} from "./interfaces/ISpaceManager.sol";
import {IEntitlementModule} from "./interfaces/IEntitlementModule.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Constants} from "./libraries/Constants.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {CreationLogic} from "./libraries/CreationLogic.sol";
import {PermissionTypes} from "./libraries/PermissionTypes.sol";
import {IPermissionRegistry} from "./interfaces/IPermissionRegistry.sol";
import {ISpace} from "./interfaces/ISpace.sol";
import {IRoleManager} from "./interfaces/IRoleManager.sol";
import {ZionSpaceManagerStorage} from "./storage/ZionSpaceManagerStorage.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Utils} from "./libraries/Utils.sol";

/// @title ZionSpaceManager
/// @author HNT Labs
/// @notice This contract manages the spaces and entitlements in the Zion ecosystem.
contract ZionSpaceManager is Ownable, ZionSpaceManagerStorage, ISpaceManager {
  address internal immutable ROLE_MANAGER;
  address internal immutable PERMISSION_REGISTRY;

  address internal DEFAULT_USER_ENTITLEMENT_MODULE;
  address internal DEFAULT_TOKEN_ENTITLEMENT_MODULE;
  address internal SPACE_NFT;

  IRoleManager internal roleManager;

  constructor(address _permissionRegistry, address _roleManager) {
    if (_permissionRegistry == address(0)) revert Errors.InvalidParameters();
    if (_roleManager == address(0)) revert Errors.InvalidParameters();

    PERMISSION_REGISTRY = _permissionRegistry;
    ROLE_MANAGER = _roleManager;
    roleManager = IRoleManager(_roleManager);
  }

  /// *********************************
  /// *****SPACE OWNER FUNCTIONS*****
  /// *********************************

  /// @inheritdoc ISpaceManager
  function createSpace(
    DataTypes.CreateSpaceData calldata info,
    DataTypes.CreateSpaceEntitlementData calldata entitlementData,
    DataTypes.Permission[] calldata everyonePermissions
  ) external returns (uint256) {
    _validateSpaceDefaults();

    Utils.validateName(info.spaceName);

    //create the space with the metadata passed in
    uint256 spaceId = _createSpace(info);

    // mint space nft
    ISpace(SPACE_NFT).mintBySpaceId(spaceId, _msgSender(), info.spaceMetadata);

    // whitespace default entitlement module
    _whitelistEntitlementModule(spaceId, DEFAULT_USER_ENTITLEMENT_MODULE, true);

    // whitespace token entitlement module
    _whitelistEntitlementModule(
      spaceId,
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      true
    );

    // Create owner role with all permissions
    uint256 ownerRoleId = _createOwnerRoleEntitlement(spaceId);

    //save this for convenience to use when creating a channel
    _spaceById[spaceId].ownerRoleId = ownerRoleId;

    // Create everyone role with the permissions passed in
    _createEveryoneRoleEntitlement(spaceId, everyonePermissions);

    uint256 permissionLen = entitlementData.permissions.length;

    // If there is another role to create then create it
    if (permissionLen > 0) {
      // create the additional role being gated by the token or for specified users
      uint256 additionalRoleId = roleManager.createRole(
        spaceId,
        entitlementData.roleName
      );

      // Add all the permissions for this role to it
      _addPermissionsToRole(
        spaceId,
        additionalRoleId,
        entitlementData.permissions
      );

      // Iterate through the external tokens for this role and add them all to the
      // token entitlement module
      _addRoleToTokenEntitlementModule(
        spaceId,
        additionalRoleId,
        entitlementData.externalTokenEntitlements
      );

      // Iterate through the specified users for this role and add them all to
      // the user entitlement module
      _addRoleToUserEntitlementModule(
        spaceId,
        additionalRoleId,
        entitlementData.users
      );
    }

    emit Events.CreateSpace(info.spaceNetworkId, _msgSender());

    return spaceId;
  }

  /// @inheritdoc ISpaceManager
  function createChannel(
    DataTypes.CreateChannelData calldata data
  ) external returns (uint256 channelId) {
    _validateIsAllowed(
      data.spaceNetworkId,
      "",
      PermissionTypes.AddRemoveChannels
    );
    _validateSpaceExists(data.spaceNetworkId);
    Utils.validateName(data.channelName);

    uint256 spaceId = _getSpaceIdByNetworkId(data.spaceNetworkId);
    channelId = _createChannel(spaceId, data);

    //Get all the entitlement modules for this space
    uint256 entitlementModulesLen = _spaceById[spaceId]
      .entitlementModules
      .length;

    //Iterate through them all to tell them about the association of a role to a channel
    for (uint256 i = 0; i < entitlementModulesLen; i++) {
      address entitlement = _spaceById[spaceId].entitlementModules[i];

      if (entitlement == address(0)) continue;

      IEntitlementModule(entitlement).addRoleIdToChannel(
        spaceId,
        channelId,
        _spaceById[spaceId].ownerRoleId
      );

      for (uint256 j = 0; j < data.roleIds.length; j++) {
        if (data.roleIds[j] == _spaceById[spaceId].ownerRoleId) continue;

        try
          IEntitlementModule(entitlement).addRoleIdToChannel(
            spaceId,
            channelId,
            data.roleIds[j]
          )
        {
          emit Events.CreateChannel(
            data.spaceNetworkId,
            data.channelNetworkId,
            _msgSender()
          );
        } catch {
          revert Errors.AddRoleFailed();
        }
      }
    }

    return channelId;
  }

  /// *********************************
  /// *****EXTERNAL FUNCTIONS**********
  /// *********************************
  function setSpaceAccess(
    string memory spaceNetworkId,
    bool disabled
  ) external {
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifySpacePermissions
    );

    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    if (spaceId == 0) revert Errors.SpaceDoesNotExist();

    _spaceById[spaceId].disabled = disabled;

    emit Events.SetSpaceAccess(spaceNetworkId, _msgSender(), disabled);
  }

  function setChannelAccess(
    string calldata spaceNetworkId,
    string calldata channelNetworkId,
    bool disabled
  ) external {
    _validateIsAllowed(
      spaceNetworkId,
      channelNetworkId,
      PermissionTypes.ModifyChannelPermissions
    );

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
  function setDefaultUserEntitlementModule(
    address entitlementModule
  ) external onlyOwner {
    DEFAULT_USER_ENTITLEMENT_MODULE = entitlementModule;
    emit Events.DefaultEntitlementSet(entitlementModule);
  }

  /// @inheritdoc ISpaceManager
  function setDefaultTokenEntitlementModule(
    address entitlementModule
  ) external onlyOwner {
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
    string calldata spaceNetworkId,
    address entitlementAddress,
    bool whitelist
  ) external {
    _validateEntitlementInterface(entitlementAddress);
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifySpacePermissions
    );

    if (
      entitlementAddress == DEFAULT_TOKEN_ENTITLEMENT_MODULE ||
      entitlementAddress == DEFAULT_USER_ENTITLEMENT_MODULE
    ) {
      revert Errors.NotAllowed();
    }

    _whitelistEntitlementModule(
      _getSpaceIdByNetworkId(spaceNetworkId),
      entitlementAddress,
      whitelist
    );

    emit Events.WhitelistEntitlementModule(
      spaceNetworkId,
      entitlementAddress,
      whitelist
    );
  }

  /// @inheritdoc ISpaceManager
  function addRoleIdsToChannel(
    string calldata spaceId,
    string calldata channelId,
    uint256[] calldata roleId
  ) external {
    _validateIsAllowed(
      spaceId,
      channelId,
      PermissionTypes.ModifyChannelPermissions
    );

    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = _getChannelIdByNetworkId(spaceId, channelId);

    for (uint256 i = 0; i < roleId.length; i++) {
      _addRoleIdToChannel(_spaceId, _channelId, roleId[i]);
    }
  }

  /// @inheritdoc ISpaceManager
  function removeRoleIdsFromChannel(
    string calldata spaceId,
    string calldata channelId,
    uint256[] calldata roleId
  ) external {
    _validateIsAllowed(
      spaceId,
      channelId,
      PermissionTypes.ModifyChannelPermissions
    );

    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = _getChannelIdByNetworkId(spaceId, channelId);

    for (uint256 i = 0; i < roleId.length; i++) {
      _removeRoleIdFromChannel(_spaceId, _channelId, roleId[i]);
    }
  }

  /// @inheritdoc ISpaceManager
  function createRole(
    string calldata spaceNetworkId,
    string calldata name
  ) external returns (uint256 roleId) {
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifySpacePermissions
    );

    roleId = roleManager.createRole(
      _getSpaceIdByNetworkId(spaceNetworkId),
      name
    );

    emit Events.CreateRole(spaceNetworkId, roleId, name, _msgSender());

    return roleId;
  }

  /// @inheritdoc ISpaceManager
  function createRoleWithEntitlementData(
    string calldata spaceNetworkId,
    string calldata roleName,
    DataTypes.Permission[] calldata permissions,
    DataTypes.ExternalTokenEntitlement[] calldata tokenEntitlements, // For Token Entitlements
    address[] calldata users // For User Entitlements
  ) external returns (uint256 roleId) {
    /** Validate inputs */
    require(permissions.length > 0, "No permissions provided");
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifySpacePermissions
    );

    // Create the role
    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    roleId = roleManager.createRole(spaceId, roleName);
    // Add the permissions to the role
    _addPermissionsToRole(spaceId, roleId, permissions);
    // Add the token entitlements to the role
    _addRoleToTokenEntitlementModule(spaceId, roleId, tokenEntitlements);
    // Add the users to the role
    _addRoleToUserEntitlementModule(spaceId, roleId, users);

    emit Events.CreateRoleWithEntitlementData(
      spaceNetworkId,
      roleId,
      roleName,
      _msgSender()
    );
    return roleId;
  }

  /// @inheritdoc ISpaceManager
  function modifyRoleWithEntitlementData(
    string calldata spaceNetworkId,
    uint256 roleId,
    string calldata roleName,
    DataTypes.Permission[] calldata permissions,
    DataTypes.ExternalTokenEntitlement[] calldata tokenEntitlements, // For Token Entitlements
    address[] calldata users // For User Entitlements
  ) external returns (bool isModified) {
    /** Validate inputs */
    require(permissions.length > 0, "No permissions provided");
    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    _validateNotOwnerRoleId(spaceId, roleId);
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifySpacePermissions
    );

    /** Modify the role */
    // Change the role name if it is provided
    roleManager.modifyRoleName(spaceId, roleId, roleName);
    // Change the permissions to the role
    _modifyRolePermissions(spaceId, roleId, permissions);
    // Change the token entitlements to the role
    _modifyRoleTokenEntitlements(spaceId, roleId, tokenEntitlements);
    // Change the users to the role
    _modifyRoleUserEntitlements(spaceId, roleId, users);

    emit Events.ModifyRoleWithEntitlementData(
      spaceNetworkId,
      roleId,
      _msgSender()
    );
    return true;
  }

  /// @inheritdoc ISpaceManager
  function removeRole(string calldata spaceNetworkId, uint256 roleId) external {
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifySpacePermissions
    );

    if (
      roleId == _spaceById[_getSpaceIdByNetworkId(spaceNetworkId)].ownerRoleId
    ) revert Errors.InvalidParameters();

    roleManager.removeRole(_getSpaceIdByNetworkId(spaceNetworkId), roleId);

    emit Events.RemoveRole(spaceNetworkId, roleId, _msgSender());
  }

  /// @inheritdoc ISpaceManager
  function addPermissionToRole(
    string calldata spaceId,
    uint256 roleId,
    DataTypes.Permission calldata permission
  ) external {
    _validateIsAllowed(spaceId, "", PermissionTypes.ModifySpacePermissions);

    roleManager.addPermissionToRole(
      _getSpaceIdByNetworkId(spaceId),
      roleId,
      permission
    );

    emit Events.UpdateRole(spaceId, roleId, _msgSender());
  }

  /// @inheritdoc ISpaceManager
  function removePermissionFromRole(
    string calldata spaceNetworkId,
    uint256 roleId,
    DataTypes.Permission calldata permission
  ) external {
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifySpacePermissions
    );

    roleManager.removePermissionFromRole(
      _getSpaceIdByNetworkId(spaceNetworkId),
      roleId,
      permission
    );

    emit Events.UpdateRole(spaceNetworkId, roleId, _msgSender());
  }

  /// @inheritdoc ISpaceManager
  function addRoleToEntitlementModule(
    string calldata spaceNetworkId,
    address entitlementModuleAddress,
    uint256 roleId,
    bytes calldata entitlementData
  ) external {
    _validateSpaceExists(spaceNetworkId);
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifyChannelPermissions
    );
    _validateEntitlementInterface(entitlementModuleAddress);

    uint256 _spaceId = _getSpaceIdByNetworkId(spaceNetworkId);

    _validateNotOwnerRoleId(_spaceId, roleId);

    _addRoleToEntitlementModule(
      _spaceId,
      entitlementModuleAddress,
      roleId,
      entitlementData
    );

    emit Events.EntitlementModuleAdded(
      spaceNetworkId,
      entitlementModuleAddress
    );
  }

  /// @inheritdoc ISpaceManager
  function removeEntitlement(
    string calldata spaceNetworkId,
    address entitlementModuleAddress,
    uint256 roleId,
    bytes calldata data
  ) external {
    _validateSpaceExists(spaceNetworkId);
    _validateIsAllowed(
      spaceNetworkId,
      "",
      PermissionTypes.ModifyChannelPermissions
    );

    uint256 _spaceId = _getSpaceIdByNetworkId(spaceNetworkId);

    _validateNotOwnerRoleId(_spaceId, roleId);

    _validateEntitlementInterface(entitlementModuleAddress);

    _removeEntitlementRole(_spaceId, entitlementModuleAddress, roleId, data);

    emit Events.EntitlementModuleRemoved(
      spaceNetworkId,
      entitlementModuleAddress
    );
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
    if (_isSpaceAccessDisabled(spaceId)) {
      return false;
    }

    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    uint256 _channelId = _getChannelIdByNetworkId(spaceId, channelId);
    return _isEntitled(_spaceId, _channelId, user, permission);
  }

  /// @inheritdoc ISpaceManager
  function getSpaceInfoBySpaceId(
    string calldata spaceId
  ) external view returns (DataTypes.SpaceInfo memory) {
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
  function getChannelsBySpaceId(
    string memory spaceId
  ) external view returns (DataTypes.Channels memory) {
    return _channelsBySpaceId[_getSpaceIdByNetworkId(spaceId)];
  }

  /// @inheritdoc ISpaceManager
  function getEntitlementModulesBySpaceId(
    string calldata spaceId
  ) public view returns (address[] memory) {
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
  function getEntitlementsInfoBySpaceId(
    string calldata spaceId
  ) public view returns (DataTypes.EntitlementModuleInfo[] memory) {
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
          IEntitlementModule(entitlement).moduleType(),
          IEntitlementModule(entitlement).description()
        );

      entitlementsInfo[i] = info;
    }

    return entitlementsInfo;
  }

  /// @inheritdoc ISpaceManager
  function getSpaceOwnerBySpaceId(
    string calldata spaceId
  ) external view returns (address) {
    return ISpace(SPACE_NFT).getOwnerBySpaceId(_getSpaceIdByNetworkId(spaceId));
  }

  /// @inheritdoc ISpaceManager
  function getSpaceIdByNetworkId(
    string calldata networkId
  ) external view returns (uint256) {
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
  function _getSpaceIdByNetworkId(
    string memory networkId
  ) internal view returns (uint256) {
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
    uint256 spaceId,
    uint256 channelId,
    address user,
    DataTypes.Permission memory permission
  ) internal view returns (bool entitled) {
    entitled = false;

    uint256 entitlementModulesLen = _spaceById[spaceId]
      .entitlementModules
      .length;

    for (uint256 i = 0; i < entitlementModulesLen; i++) {
      address entitlement = _spaceById[spaceId].entitlementModules[i];

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

  function _createSpace(
    DataTypes.CreateSpaceData calldata info
  ) internal returns (uint256 spaceId) {
    unchecked {
      // create space Id
      spaceId = ++_spacesCounter;

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
  ) internal returns (uint256 channelId) {
    unchecked {
      // create channel Id
      channelId = ++_channelsBySpaceId[spaceId].idCounter;

      // create channel
      CreationLogic.createChannel(
        data,
        spaceId,
        channelId,
        _msgSender(),
        _channelsBySpaceId,
        _channelIdBySpaceIdByHash,
        _channelBySpaceIdByChannelId
      );

      return channelId;
    }
  }

  function _createOwnerRoleEntitlement(
    uint256 spaceId
  ) internal returns (uint256 ownerRoleId) {
    DataTypes.ExternalToken memory spaceNFTInfo = _getOwnerNFTInformation(
      spaceId
    );

    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = spaceNFTInfo;
    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        externalTokens
      );

    uint256 newOwnerRoleId = roleManager.createOwnerRole(spaceId);
    _addRoleToEntitlementModule(
      spaceId,
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      ownerRoleId,
      abi.encode(externalTokenEntitlement)
    );

    return newOwnerRoleId;
  }

  function _createEveryoneRoleEntitlement(
    uint256 spaceId,
    DataTypes.Permission[] calldata permissions
  ) internal returns (uint256 everyoneRoleId) {
    everyoneRoleId = roleManager.createRole(spaceId, "Everyone");

    for (uint256 i = 0; i < permissions.length; ) {
      roleManager.addPermissionToRole(spaceId, everyoneRoleId, permissions[i]);
      unchecked {
        ++i;
      }
    }

    _addRoleToEntitlementModule(
      spaceId,
      DEFAULT_USER_ENTITLEMENT_MODULE,
      everyoneRoleId,
      abi.encode(Constants.EVERYONE_ADDRESS)
    );
    return everyoneRoleId;
  }

  function _addRoleIdToChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) internal {
    //Get all the entitlement modules for this space
    uint256 entitlementModulesLen = _spaceById[spaceId]
      .entitlementModules
      .length;

    //Iterate through them all to tell them about the association of a role to a channel
    for (uint256 i = 0; i < entitlementModulesLen; i++) {
      address entitlement = _spaceById[spaceId].entitlementModules[i];

      if (entitlement == address(0)) continue;

      IEntitlementModule(entitlement).addRoleIdToChannel(
        spaceId,
        channelId,
        roleId
      );
    }
  }

  function _removeRoleIdFromChannel(
    uint256 spaceId,
    uint256 channelId,
    uint256 roleId
  ) internal {
    //Get all the entitlement modules for this space
    uint256 entitlementModulesLen = _spaceById[spaceId]
      .entitlementModules
      .length;

    //Iterate through them all to tell them about the association of a role to a channel
    for (uint256 i = 0; i < entitlementModulesLen; i++) {
      address entitlement = _spaceById[spaceId].entitlementModules[i];

      if (entitlement == address(0)) continue;

      IEntitlementModule(entitlement).removeRoleIdFromChannel(
        spaceId,
        channelId,
        roleId
      );
    }
  }

  function _whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    bool whitelist
  ) internal {
    if (whitelist && _spaceById[spaceId].hasEntitlement[entitlementAddress]) {
      revert Errors.EntitlementAlreadyWhitelisted();
    }

    CreationLogic.setEntitlement(
      spaceId,
      entitlementAddress,
      whitelist,
      _spaceById
    );
  }

  function _removeEntitlementRole(
    uint256 spaceId,
    address entitlementAddress,
    uint256 roleId,
    bytes memory entitlementData
  ) internal {
    // make sure entitlement module is whitelisted
    if (!_spaceById[spaceId].hasEntitlement[entitlementAddress])
      revert Errors.EntitlementNotWhitelisted();

    // remove the entitlement from the entitlement module
    IEntitlementModule(entitlementAddress).removeSpaceEntitlement(
      spaceId,
      roleId,
      entitlementData
    );
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
    IEntitlementModule(entitlementAddress).setSpaceEntitlement(
      spaceId,
      roleId,
      entitlementData
    );
  }

  function _getOwnerNFTInformation(
    uint256 spaceId
  ) internal view returns (DataTypes.ExternalToken memory) {
    DataTypes.ExternalToken memory tokenInfo = DataTypes.ExternalToken(
      SPACE_NFT,
      1,
      true,
      spaceId
    );
    return tokenInfo;
  }

  // Add all the permissions for this role to it
  function _addPermissionsToRole(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission[] calldata permissions
  ) internal {
    for (uint256 i = 0; i < permissions.length; ) {
      roleManager.addPermissionToRole(spaceId, roleId, permissions[i]);
      unchecked {
        ++i;
      }
    }
  }

  // Iterate through the external tokens for this role and add them all to the
  // token entitlement module
  function _addRoleToTokenEntitlementModule(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.ExternalTokenEntitlement[] calldata tokenEntitlements
  ) internal {
    for (uint256 i = 0; i < tokenEntitlements.length; ) {
      DataTypes.ExternalTokenEntitlement
        memory externalTokenEntitlement = tokenEntitlements[i];

      // add additional role to the token entitlement module
      _addRoleToEntitlementModule(
        spaceId,
        DEFAULT_TOKEN_ENTITLEMENT_MODULE,
        roleId,
        abi.encode(externalTokenEntitlement)
      );
      unchecked {
        ++i;
      }
    }
  }

  // Iterate through the specified users for this role and add them all to
  // the user entitlement module
  function _addRoleToUserEntitlementModule(
    uint256 spaceId,
    uint256 roleId,
    address[] calldata users
  ) internal {
    for (uint256 i = 0; i < users.length; ) {
      // add additional role to the user entitlement module
      _addRoleToEntitlementModule(
        spaceId,
        DEFAULT_USER_ENTITLEMENT_MODULE,
        roleId,
        abi.encode(users[i])
      );
      unchecked {
        ++i;
      }
    }
  }

  // Modify the permissions for this role
  function _modifyRolePermissions(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission[] calldata newPermissions
  ) internal {
    DataTypes.Permission[] memory currentPermissions = roleManager
      .getPermissionsBySpaceIdByRoleId(spaceId, roleId);
    string memory ownerPermission = IPermissionRegistry(PERMISSION_REGISTRY)
      .getPermissionByPermissionType(PermissionTypes.Owner)
      .name;
    bytes32 ownerHash = keccak256(abi.encodePacked(ownerPermission));
    for (uint256 i = 0; i < currentPermissions.length; ) {
      if (
        keccak256(abi.encodePacked(currentPermissions[i].name)) != ownerHash
      ) {
        // Only remove the permission if it is not the owner permission
        roleManager.removePermissionFromRole(
          spaceId,
          roleId,
          currentPermissions[i]
        );
      }
      unchecked {
        ++i;
      }
    }
    for (uint256 i = 0; i < newPermissions.length; ) {
      if (keccak256(abi.encodePacked(newPermissions[i].name)) != ownerHash) {
        // Only add the permission if it is not the owner permission
        roleManager.addPermissionToRole(spaceId, roleId, newPermissions[i]);
      }
      unchecked {
        ++i;
      }
    }
  }

  function _modifyRoleTokenEntitlements(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.ExternalTokenEntitlement[] calldata tokenEntitlements
  ) internal {
    // Remove all the token entitlement data for this role
    bytes[] memory currentTokenEntitlements = IEntitlementModule(
      DEFAULT_TOKEN_ENTITLEMENT_MODULE
    ).getEntitlementDataByRoleId(spaceId, roleId);
    for (uint256 i = 0; i < currentTokenEntitlements.length; ) {
      _removeEntitlementRole(
        spaceId,
        DEFAULT_TOKEN_ENTITLEMENT_MODULE,
        roleId,
        currentTokenEntitlements[i]
      );
      unchecked {
        ++i;
      }
    }
    // add the updated token entitlement data
    for (uint256 i = 0; i < tokenEntitlements.length; ) {
      DataTypes.ExternalTokenEntitlement
        memory externalTokenEntitlement = tokenEntitlements[i];
      _addRoleToEntitlementModule(
        spaceId,
        DEFAULT_TOKEN_ENTITLEMENT_MODULE,
        roleId,
        abi.encode(externalTokenEntitlement)
      );
      unchecked {
        ++i;
      }
    }
  }

  function _modifyRoleUserEntitlements(
    uint256 spaceId,
    uint256 roleId,
    address[] calldata users
  ) internal {
    // Remove all the user entitlement data for this role
    bytes[] memory currentTokenEntitlements = IEntitlementModule(
      DEFAULT_USER_ENTITLEMENT_MODULE
    ).getEntitlementDataByRoleId(spaceId, roleId);
    for (uint256 i = 0; i < users.length; ) {
      _removeEntitlementRole(
        spaceId,
        DEFAULT_USER_ENTITLEMENT_MODULE,
        roleId,
        currentTokenEntitlements[i]
      );
      unchecked {
        ++i;
      }
    }
    // add the updated user entitlement data
    for (uint256 i = 0; i < users.length; ) {
      _addRoleToEntitlementModule(
        spaceId,
        DEFAULT_USER_ENTITLEMENT_MODULE,
        roleId,
        abi.encode(users[i])
      );
      unchecked {
        ++i;
      }
    }
  }

  /// ****************************
  /// ****VALIDATION FUNCTIONS****
  /// ****************************
  function _validateSpaceExists(string memory spaceId) internal view {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);
    if (_spaceId == 0) revert Errors.SpaceDoesNotExist();
    if (_spaceById[_spaceId].disabled) revert Errors.SpaceDoesNotExist();
  }

  function _isSpaceAccessDisabled(
    string memory spaceNetworkId
  ) internal view returns (bool isDisabled) {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    return _spaceId == 0 || _spaceById[_spaceId].disabled;
  }

  function _validateChannelExists(
    string memory spaceId,
    string memory channelId
  ) internal view {
    uint256 _channelId = _getChannelIdByNetworkId(spaceId, channelId);
    if (_channelId == 0) revert Errors.ChannelDoesNotExist();
  }

  function _validateNotOwnerRoleId(
    uint256 spaceId,
    uint256 roleId
  ) internal view {
    if (roleId == _spaceById[spaceId].ownerRoleId) revert Errors.NotAllowed();
  }

  function _validateIsAllowed(
    string memory spaceNetworkId,
    string memory channelNetworkId,
    bytes32 permission
  ) internal view {
    uint256 spaceId = _getSpaceIdByNetworkId(spaceNetworkId);
    uint256 channelId = _getChannelIdByNetworkId(
      spaceNetworkId,
      channelNetworkId
    );
    if (
      // check if the caller is the space manager contract itself, was getting erros when calling internal functions
      _isEntitled(
        spaceId,
        channelId,
        _msgSender(),
        IPermissionRegistry(PERMISSION_REGISTRY).getPermissionByPermissionType(
          permission
        )
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
  function _validateEntitlementInterface(
    address entitlementAddress
  ) internal view {
    if (
      IERC165(entitlementAddress).supportsInterface(
        type(IEntitlementModule).interfaceId
      ) == false
    ) revert Errors.EntitlementModuleNotSupported();
  }
}
