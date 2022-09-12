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
import "@openzeppelin/contracts/access/Ownable.sol";
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
    uint256 spaceId = ++_spacesCounter;

    // create space
    ZionSpaceController.createSpace(
      info,
      spaceId,
      _msgSender(),
      _spaceByNameHash,
      _spaceById
    );

    // create array of admin entitlement type
    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    entitlementTypes[0] = DataTypes.EntitlementType.Administrator;

    addEntitlement(
      spaceId,
      _defaultEntitlementModuleAddress,
      _defaultEntitlementModuleTag,
      entitlementTypes,
      abi.encode(_msgSender())
    );

    emit Events.CreateSpace(_msgSender(), info.spaceName, spaceId);

    return spaceId;
  }

  /// @inheritdoc ISpaceManager
  function createSpaceWithTokenEntitlement(
    DataTypes.CreateSpaceData calldata info,
    DataTypes.CreateSpaceTokenEntitlementData calldata entitlement
  ) external returns (uint256) {
    uint256 spaceId = createSpace(info);

    addTokenEntitlement(
      spaceId,
      entitlement.entitlementModuleAddress,
      entitlement.tokenAddress,
      entitlement.quantity,
      entitlement.description,
      entitlement.entitlementTypes
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
  function registerDefaultEntitlementModule(
    address entitlementModule,
    string memory entitlementModuleTag
  ) public onlyOwner {
    _defaultEntitlementModuleAddress = entitlementModule;
    _defaultEntitlementModuleTag = entitlementModuleTag;

    emit Events.DefaultEntitlementSet(entitlementModule, entitlementModuleTag);
  }

  /// @notice whitelist an entitlement module to a space
  function whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    string calldata entitlementTag
  ) external {
    _validateCallerIsSpaceOwner(spaceId);
    _whitelistEntitlementModule(spaceId, entitlementAddress, entitlementTag);
  }

  /// @notice registers an entitlement to an entitlement module
  function registerEntitlementWithEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    string calldata entitlementTag,
    DataTypes.EntitlementType[] calldata entitlementTypes,
    bytes calldata entitlementData
  ) external {
    _validateCallerIsSpaceOwner(spaceId);
    _registerEntitlementWithEntitlementModule(
      spaceId,
      entitlementAddress,
      entitlementTag,
      entitlementTypes,
      entitlementData
    );
  }

  /// @inheritdoc ISpaceManager
  function addEntitlement(
    uint256 spaceId,
    address entitlementAddress,
    string memory entitlementTag,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) public {
    _validateCallerIsSpaceOwner(spaceId);

    if (_spaceById[spaceId].entitlements[entitlementTag] != address(0))
      revert Errors.EntitlementAlreadyRegistered();

    _whitelistEntitlementModule(spaceId, entitlementAddress, entitlementTag);

    _registerEntitlementWithEntitlementModule(
      spaceId,
      entitlementAddress,
      entitlementTag,
      entitlementTypes,
      data
    );

    emit Events.EntitlementModuleAdded(
      spaceId,
      entitlementAddress,
      entitlementTag
    );
  }

  function addTokenEntitlement(
    uint256 spaceId,
    address entitlementModuleAddress,
    address tokenAddress,
    uint256 amount,
    string memory description,
    DataTypes.EntitlementType[] memory entitlementTypes
  ) public {
    _validateCallerIsSpaceOwner(spaceId);
    _validateEntitlementInterface(entitlementModuleAddress);

    address[] memory tokens = new address[](1);
    uint256[] memory quantities = new uint256[](1);

    tokens[0] = tokenAddress;
    quantities[0] = amount;

    addEntitlement(
      spaceId,
      entitlementModuleAddress,
      Constants.DEFAULT_TOKEN_ENTITLEMENT_TAG,
      entitlementTypes,
      abi.encode(description, tokens, quantities)
    );
  }

  /// @inheritdoc ISpaceManager
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) public view returns (bool) {
    uint256 tagLength = _spaceById[spaceId].entitlementTags.length;
    bool entitled = false;

    for (uint256 i = 0; i < tagLength; i++) {
      address entitlement = _spaceById[spaceId].entitlements[
        _spaceById[spaceId].entitlementTags[i]
      ];

      if (entitlement != address(0)) {
        ISpaceEntitlementModule entitlementModule = ISpaceEntitlementModule(
          entitlement
        );

        if (
          entitlementModule.isEntitled(spaceId, roomId, user, entitlementType)
        ) {
          entitled = true;
          break;
        }
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
    entitlements = new address[](_spaceById[spaceId].entitlementTags.length);

    for (uint256 i = 0; i < _spaceById[spaceId].entitlementTags.length; i++) {
      entitlements[i] = _spaceById[spaceId].entitlements[
        _spaceById[spaceId].entitlementTags[i]
      ];
    }

    return entitlements;
  }

  /// @inheritdoc ISpaceManager
  function getSpaceIdByNetworkId(string calldata networkSpaceId)
    external
    view
    returns (uint256)
  {
    return _spaceIdByNetworkId[networkSpaceId];
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

  function _whitelistEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    string memory entitlementTag
  ) internal {
    _validateEntitlementInterface(entitlementAddress);

    // set entitlement tag to space entitlement tags
    _spaceById[spaceId].entitlementTags.push(entitlementTag);

    // set entitlement address to space entitlements
    _spaceById[spaceId].entitlements[entitlementTag] = entitlementAddress;
  }

  function _registerEntitlementWithEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    string memory entitlementTag,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) internal {
    // make sure entitlement module is whitelisted
    if (_spaceById[spaceId].entitlements[entitlementTag] != entitlementAddress)
      revert Errors.EntitlementNotWhitelisted();

    // register entitlement
    ISpaceEntitlementModule entitlementModule = ISpaceEntitlementModule(
      entitlementAddress
    );

    // add the entitlement to the entitlement module
    entitlementModule.setEntitlement(
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
