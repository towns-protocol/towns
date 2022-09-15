//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/console.sol";
import {ISpaceManager} from "./interfaces/ISpaceManager.sol";
import {ISpaceEntitlementModule} from "./interfaces/ISpaceEntitlementModule.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Constants} from "./libraries/Constants.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";
import {UserGrantedEntitlementModule} from "./entitlements/UserGrantedEntitlementModule.sol";
import {ZionSpaceManagerStorage} from "./storage/ZionSpaceManagerStorage.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ZionSpaceController} from "./libraries/ZionSpaceController.sol";

/// @title ZionSpaceManager
/// @author HNT Labs
/// @notice This contract manages the spaces and entitlements in the Zion ecosystem.
contract ZionSpaceManager is Ownable, ZionSpaceManagerStorage, ISpaceManager {
  /// *********************************
  /// *****SPACE OWNER FUNCTIONS*****
  /// *********************************
  /// @inheritdoc ISpaceManager
  function createSpace(DataTypes.CreateSpaceData calldata info)
    public
    returns (uint256)
  {
    if (_defaultEntitlementModuleAddress == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();

    // create space Id
    uint256 spaceId = _createSpace(info);

    // add default entitlement module
    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    entitlementTypes[0] = DataTypes.EntitlementType.Administrator;
    _addEntitlement(
      spaceId,
      _defaultEntitlementModuleAddress,
      entitlementTypes,
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

    // add default entitlement module
    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    entitlementTypes[0] = DataTypes.EntitlementType.Administrator;
    _addEntitlement(
      spaceId,
      _defaultEntitlementModuleAddress,
      entitlementTypes,
      abi.encode(_msgSender())
    );

    // add token entitlement module
    address[] memory tokens = new address[](1);
    uint256[] memory quantities = new uint256[](1);
    tokens[0] = entitlement.tokenAddress;
    quantities[0] = entitlement.quantity;
    _addEntitlement(
      spaceId,
      entitlement.entitlementModuleAddress,
      entitlement.entitlementTypes,
      abi.encode(entitlement.description, tokens, quantities)
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
  function setNetworkIdToSpaceId(uint256 spaceId, string calldata networkId)
    external
  {
    _validateCallerIsSpaceOwner(spaceId);

    _spaceById[spaceId].networkId = networkId;
    _spaceIdByNetworkId[networkId] = spaceId;

    emit Events.NetworkIdSet(spaceId, networkId);
  }

  /// *********************************
  /// *****ENTITLEMENT FUNCTIONS*******
  /// *********************************

  /// @inheritdoc ISpaceManager
  function registerDefaultEntitlementModule(address entitlementModule)
    public
    onlyOwner
  {
    _defaultEntitlementModuleAddress = entitlementModule;
    emit Events.DefaultEntitlementSet(entitlementModule);
  }

  /// @notice whitelist an entitlement module to a space without setting any entitlements
  function whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementAddress
  ) external {
    _validateCallerIsSpaceOwner(spaceId);
    _validateEntitlementInterface(entitlementAddress);
    _whitelistEntitlementModule(spaceId, entitlementAddress);
  }

  /// @notice registers an entitlement to an entitlement module
  function registerEntitlementWithEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    DataTypes.EntitlementType[] calldata entitlementTypes,
    bytes calldata entitlementData
  ) external {
    _validateCallerIsSpaceOwner(spaceId);
    _validateEntitlementInterface(entitlementAddress);
    _registerEntitlementWithEntitlementModule(
      spaceId,
      entitlementAddress,
      entitlementTypes,
      entitlementData
    );
  }

  /// @inheritdoc ISpaceManager
  function addEntitlement(
    uint256 spaceId,
    address entitlementModuleAddress,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) public {
    _validateCallerIsSpaceOwner(spaceId);
    _validateEntitlementInterface(entitlementModuleAddress);

    if (_spaceById[spaceId].hasEntitlement[entitlementModuleAddress])
      revert Errors.EntitlementAlreadyRegistered();

    _addEntitlement(spaceId, entitlementModuleAddress, entitlementTypes, data);
    emit Events.EntitlementModuleAdded(spaceId, entitlementModuleAddress);
  }

  function addTokenEntitlement(
    uint256 spaceId,
    address entitlementModuleAddress,
    DataTypes.EntitlementType[] memory entitlementTypes,
    address tokenAddress,
    uint256 amount,
    string memory description
  ) public {
    _validateCallerIsSpaceOwner(spaceId);
    _validateEntitlementInterface(entitlementModuleAddress);

    if (_spaceById[spaceId].hasEntitlement[entitlementModuleAddress])
      revert Errors.EntitlementAlreadyRegistered();

    address[] memory tokens = new address[](1);
    uint256[] memory quantities = new uint256[](1);

    tokens[0] = tokenAddress;
    quantities[0] = amount;

    _addEntitlement(
      spaceId,
      entitlementModuleAddress,
      entitlementTypes,
      abi.encode(description, tokens, quantities)
    );

    emit Events.EntitlementModuleAdded(spaceId, entitlementModuleAddress);
  }

  /// @inheritdoc ISpaceManager
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) public view returns (bool) {
    bool entitled = false;

    for (uint256 i = 0; i < _spaceById[spaceId].entitlements.length; i++) {
      address entitlement = _spaceById[spaceId].entitlements[i];

      if (entitlement == address(0)) continue;

      if (
        ISpaceEntitlementModule(entitlement).isEntitled(
          spaceId,
          roomId,
          user,
          entitlementType
        )
      ) {
        entitled = true;
        break;
      }
    }

    return entitled;
  }

  /// *********************************
  /// *****EXTERNAL VIEW FUNCTIONS*****
  /// *********************************

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
  function getEntitlementsBySpaceId(uint256 spaceId)
    public
    view
    returns (address[] memory entitlements)
  {
    return _spaceById[spaceId].entitlements;
  }

  function isEntitlementModuleWhitelisted(
    uint256 spaceId,
    address entitlementModuleAddress
  ) public view returns (bool) {
    return _spaceById[spaceId].hasEntitlement[entitlementModuleAddress];
  }

  function getEntitlementsInfoBySpaceId(uint256 spaceId)
    public
    view
    returns (DataTypes.EntitlementModuleInfo[] memory)
  {
    DataTypes.EntitlementModuleInfo[]
      memory entitlementsInfo = new DataTypes.EntitlementModuleInfo[](
        _spaceById[spaceId].entitlements.length
      );

    for (uint256 i = 0; i < _spaceById[spaceId].entitlements.length; i++) {
      address entitlement = _spaceById[spaceId].entitlements[i];

      if (entitlement == address(0)) continue;

      DataTypes.EntitlementModuleInfo memory info = DataTypes
        .EntitlementModuleInfo(
          entitlement,
          ISpaceEntitlementModule(entitlement).name(),
          ISpaceEntitlementModule(entitlement).description()
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

  function _addEntitlement(
    uint256 spaceId,
    address entitlementAddress,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) internal {
    _whitelistEntitlementModule(spaceId, entitlementAddress);
    _registerEntitlementWithEntitlementModule(
      spaceId,
      entitlementAddress,
      entitlementTypes,
      data
    );
  }

  function _whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementAddress
  ) internal {
    // set entitlement tag to space entitlement tags
    _spaceById[spaceId].hasEntitlement[entitlementAddress] = true;

    // set entitlement address to space entitlements
    _spaceById[spaceId].entitlements.push(entitlementAddress);
  }

  function _registerEntitlementWithEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) internal {
    // make sure entitlement module is whitelisted
    if (_spaceById[spaceId].hasEntitlement[entitlementAddress] != true)
      revert Errors.EntitlementNotWhitelisted();

    // add the entitlement to the entitlement module
    ISpaceEntitlementModule(entitlementAddress).setEntitlement(
      DataTypes.SetEntitlementData(
        spaceId,
        _spaceById[spaceId].roomId,
        entitlementTypes,
        data
      )
    );
  }

  /// @notice validate that the caller is the owner of the space
  /// @param spaceId the space id
  function _validateCallerIsSpaceOwner(uint256 spaceId) internal view {
    if (_spaceById[spaceId].owner == _msgSender()) {
      return;
    }

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
        type(ISpaceEntitlementModule).interfaceId
      ) == false
    ) revert Errors.EntitlementModuleNotSupported();
  }
}
