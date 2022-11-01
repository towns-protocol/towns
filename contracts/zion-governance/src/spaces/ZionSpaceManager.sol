//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

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

    //create the space with the metadata passed in
    uint256 spaceId = _createSpace(info);

    // mint space nft
    ISpace(SPACE_NFT).mintBySpaceId(spaceId, _msgSender());

    // whitespace default entitlement module
    _whitelistEntitlementModule(spaceId, DEFAULT_USER_ENTITLEMENT_MODULE, true);

    // whitespace token entitlement module
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
    //save this for convenience to use when creating a channel
    _spaceById[spaceId].ownerRoleId = ownerRoleId;

    // Create everyone role with the permissions passed in
    _createEveryoneRoleEntitlement(
      spaceId,
      info.spaceNetworkId,
      everyonePermissions
    );

    uint256 permissionLen = entitlementData.permissions.length;
    // If there is another role to create then create it
    if (permissionLen > 0) {
      // create the additional role being gated by the token or for specified users
      uint256 additionalRoleId = roleManager.createRole(
        spaceId,
        entitlementData.roleName
      );

      //Add all the permissions for this role to it
      for (uint256 i = 0; i < permissionLen; ) {
        roleManager.addPermissionToRole(
          spaceId,
          additionalRoleId,
          entitlementData.permissions[i]
        );
        unchecked {
          ++i;
        }
      }
      //Iterate through the external tokens for this role and add them all to the token entitlement module
      if (entitlementData.externalTokenEntitlements.length > 0) {
        for (
          uint256 i = 0;
          i < entitlementData.externalTokenEntitlements.length;

        ) {
          DataTypes.ExternalTokenEntitlement
            memory externalTokenEntitlement = entitlementData
              .externalTokenEntitlements[i];
          externalTokenEntitlement.tag = entitlementData
            .externalTokenEntitlements[i]
            .tag;

          // add additional role to the token entitlement module
          _addRoleToEntitlementModule(
            info.spaceNetworkId,
            "",
            DEFAULT_TOKEN_ENTITLEMENT_MODULE,
            additionalRoleId,
            abi.encode(externalTokenEntitlement)
          );
          unchecked {
            ++i;
          }
        }
      }

      //Iterate through the specified users for this role and add them all to the user entitlement module
      if (entitlementData.users.length > 0) {
        for (uint256 i = 0; i < entitlementData.users.length; ) {
          // add additional role to the user entitlement module
          _addRoleToEntitlementModule(
            info.spaceNetworkId,
            "",
            DEFAULT_USER_ENTITLEMENT_MODULE,
            additionalRoleId,
            abi.encode(address(entitlementData.users[i]))
          );
          unchecked {
            ++i;
          }
        }
      }
    }

    emit Events.CreateSpace(info.spaceNetworkId, _msgSender());

    return spaceId;
  }

  /// @inheritdoc ISpaceManager
  function createChannel(DataTypes.CreateChannelData memory data)
    external
    returns (uint256 channelId)
  {
    _validateIsAllowed(
      data.spaceNetworkId,
      "",
      PermissionTypes.AddRemoveChannels
    );
    _validateSpaceExists(data.spaceNetworkId);

    uint256 spaceId = _getSpaceIdByNetworkId(data.spaceNetworkId);
    channelId = _createChannel(spaceId, data);

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
  {
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
  function createRole(string calldata spaceNetworkId, string calldata name)
    external
    returns (uint256 roleId)
  {
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

    if (
      keccak256(abi.encode(permission)) ==
      keccak256(abi.encode(getPermissionFromMap(PermissionTypes.Owner)))
    ) {
      revert Errors.InvalidParameters();
    }

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

    if (
      keccak256(abi.encode(permission)) ==
      keccak256(abi.encode(getPermissionFromMap(PermissionTypes.Owner)))
    ) {
      revert Errors.InvalidParameters();
    }

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
    string calldata channelNetworkId,
    address entitlementModuleAddress,
    uint256 roleId,
    bytes calldata entitlementData
  ) external {
    _validateSpaceExists(spaceNetworkId);
    _validateIsAllowed(
      spaceNetworkId,
      channelNetworkId,
      PermissionTypes.ModifyChannelPermissions
    );

    if (bytes(channelNetworkId).length > 0) {
      _validateChannelExists(spaceNetworkId, channelNetworkId);
    }

    _validateEntitlementInterface(entitlementModuleAddress);

    _addRoleToEntitlementModule(
      spaceNetworkId,
      channelNetworkId,
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
    string calldata channelNetworkId,
    address entitlementModuleAddress,
    uint256[] calldata roleIds,
    bytes calldata data
  ) external {
    _validateSpaceExists(spaceNetworkId);
    _validateIsAllowed(
      spaceNetworkId,
      channelNetworkId,
      PermissionTypes.ModifyChannelPermissions
    );

    if (bytes(channelNetworkId).length > 0) {
      _validateChannelExists(spaceNetworkId, channelNetworkId);
    }

    _validateEntitlementInterface(entitlementModuleAddress);
    _removeEntitlementRole(
      spaceNetworkId,
      channelNetworkId,
      entitlementModuleAddress,
      roleIds,
      data
    );
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
    return _isEntitled(spaceId, channelId, user, permission);
  }

  /// @inheritdoc ISpaceManager
  function getPermissionFromMap(bytes32 permissionType)
    public
    view
    returns (DataTypes.Permission memory)
  {
    return
      IPermissionRegistry(PERMISSION_REGISTRY).getPermissionByPermissionType(
        permissionType
      );
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
    return _channelsBySpaceId[_getSpaceIdByNetworkId(spaceId)];
  }

  /// @inheritdoc ISpaceManager
  function getEntitlementModulesBySpaceId(string calldata spaceId)
    public
    view
    returns (address[] memory)
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
    returns (address)
  {
    return ISpace(SPACE_NFT).getOwnerBySpaceId(_getSpaceIdByNetworkId(spaceId));
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
  ) internal view returns (bool entitled) {
    uint256 _spaceId = _getSpaceIdByNetworkId(spaceId);

    entitled = false;

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
    returns (uint256 spaceId)
  {
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

  function _createOwnerRoleEntitlement(uint256 spaceId, string memory networkId)
    internal
    returns (uint256 ownerRoleId)
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

    uint256 newOwnerRoleId = roleManager.createOwnerRole(spaceId);
    _addRoleToEntitlementModule(
      networkId,
      "",
      DEFAULT_TOKEN_ENTITLEMENT_MODULE,
      ownerRoleId,
      abi.encode(externalTokenEntitlement)
    );

    return newOwnerRoleId;
  }

  function _createEveryoneRoleEntitlement(
    uint256 spaceId,
    string memory networkId,
    DataTypes.Permission[] memory permissions
  ) internal returns (uint256 everyoneRoleId) {
    everyoneRoleId = roleManager.createRole(spaceId, "Everyone");

    for (uint256 i = 0; i < permissions.length; i++) {
      roleManager.addPermissionToRole(spaceId, everyoneRoleId, permissions[i]);
    }

    _addRoleToEntitlementModule(
      networkId,
      "",
      DEFAULT_USER_ENTITLEMENT_MODULE,
      everyoneRoleId,
      abi.encode(Constants.EVERYONE_ADDRESS)
    );
    return everyoneRoleId;
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

    // remove the entitlement from the entitlement module
    IEntitlementModule(entitlementAddress).removeEntitlement(
      spaceId,
      channelId,
      roleIds,
      entitlementData
    );
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
