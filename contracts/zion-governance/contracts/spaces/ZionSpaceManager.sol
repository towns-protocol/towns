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

/// @title ZionSpaceManager
/// @author HNT Labs
/// @notice This contract manages the spaces and entitlements in the Zion ecosystem.
contract ZionSpaceManager is Ownable, ZionSpaceManagerStorage, ISpaceManager {
  /// *********************************
  /// *****SPACE OWNER FUNCTIONS*****
  /// *********************************

  /// @inheritdoc ISpaceManager
  function createSpace(DataTypes.CreateSpaceData calldata vars)
    external
    returns (uint256)
  {
    if (_defaultEntitlementModuleAddress == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();

    _validateSpaceName(vars.spaceName);

    bytes32 spaceNameHash = keccak256(abi.encodePacked(vars.spaceName));

    if (_spaceByNameHash[spaceNameHash] != 0)
      revert Errors.SpaceAlreadyRegistered();

    // creating space
    uint256 spaceId = ++_spacesCounter;

    _spaceByNameHash[spaceNameHash] = spaceId;
    _spaceById[spaceId].spaceId = spaceId;
    _spaceById[spaceId].createdAt = block.timestamp;
    _spaceById[spaceId].name = vars.spaceName;
    _spaceById[spaceId].creator = _msgSender();
    _spaceById[spaceId].owner = _msgSender();
    _spaceById[spaceId].roomId = 0;

    // create array of entitlement types
    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    entitlementTypes[0] = DataTypes.EntitlementType.Administrator;

    // whitelist entitlement on space
    _whitelistEntitlementModule(
      spaceId,
      _defaultEntitlementModuleAddress,
      _defaultEntitlementModuleTag
    );

    // set the default entitlements on the entitlement module
    _registerEntitlement(
      spaceId,
      _defaultEntitlementModuleAddress,
      _defaultEntitlementModuleTag,
      entitlementTypes,
      abi.encode(_msgSender())
    );

    emit Events.CreateSpace(_msgSender(), vars.spaceName, spaceId);

    return spaceId;
  }

  // createSpace
  // createSpaceWithEntitlements

  /// @inheritdoc ISpaceManager
  function setNetworkIdToSpaceId(uint256 spaceId, string calldata networkId)
    external
  {
    _validateCallerIsSpaceOwner(spaceId);

    _spaceById[spaceId].networkSpaceId = networkId;
    _spaceIdByNetworkId[networkId] = spaceId;

    emit Events.NetworkIdSet(spaceId, networkId);
  }

  function addTokenEntitlement(
    uint256 spaceId,
    address entitlementModuleAddress,
    address tokenAddress,
    uint256 amount,
    string memory description,
    DataTypes.EntitlementType[] memory entitlementTypes
  ) external {
    _validateCallerIsSpaceOwner(spaceId);

    address[] memory tokens = new address[](1);
    uint256[] memory quantities = new uint256[](1);

    tokens[0] = tokenAddress;
    quantities[0] = amount;

    _whitelistEntitlementModule(
      spaceId,
      entitlementModuleAddress,
      "token-entitlement"
    );

    _registerEntitlement(
      spaceId,
      entitlementModuleAddress,
      "token-entitlement",
      entitlementTypes,
      abi.encode(description, tokens, quantities)
    );

    emit Events.EntitlementModuleAdded(
      spaceId,
      entitlementModuleAddress,
      "token-entitlement"
    );
  }

  /// @inheritdoc ISpaceManager
  // pay with our token to whitelist a module ?
  function addEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    string memory entitlementTag,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) external {
    _validateCallerIsSpaceOwner(spaceId);

    if (_spaceById[spaceId].entitlements[entitlementTag] != address(0))
      revert Errors.EntitlementAlreadyRegistered();

    _whitelistEntitlementModule(spaceId, entitlementAddress, entitlementTag);

    _registerEntitlement(
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

  /// @inheritdoc ISpaceManager
  function registerDefaultEntitlementModule(
    address entitlementModule,
    string memory entitlementModuleTag
  ) public onlyOwner {
    _defaultEntitlementModuleAddress = entitlementModule;
    _defaultEntitlementModuleTag = entitlementModuleTag;

    emit Events.DefaultEntitlementSet(entitlementModule, entitlementModuleTag);
  }

  /// @inheritdoc ISpaceManager
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) public view returns (bool) {
    uint256 tagLength = _spaceById[spaceId].entitlementTags.length;

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
          return true;
        }
      }
    }

    return false;
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

  function _registerEntitlement(
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

  // setEntitlementOnEntitlemtnModule - set entitlement on an existing entitlement module
  // registerEntitlementModule - register a new entitlement module without setting entitlement
  function _validateCallerIsSpaceOwner(uint256 spaceId) internal view {
    if (_spaceById[spaceId].owner == _msgSender()) {
      return;
    }

    revert Errors.NotSpaceOwner();
  }

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

  /// @notice Checks if a string is a valid space name.
  /// @param name The name of the space
  function _validateSpaceName(string calldata name) internal pure {
    bytes memory byteName = bytes(name);

    if (
      byteName.length < Constants.MIN_NAME_LENGTH ||
      byteName.length > Constants.MAX_NAME_LENGTH
    ) revert Errors.NameLengthInvalid();

    uint256 byteNameLength = byteName.length;
    for (uint256 i = 0; i < byteNameLength; ) {
      if (
        (byteName[i] < "0" ||
          byteName[i] > "z" ||
          (byteName[i] > "9" && byteName[i] < "a")) &&
        byteName[i] != "." &&
        byteName[i] != "-" &&
        byteName[i] != "_"
      ) revert Errors.NameContainsInvalidCharacters();
      unchecked {
        ++i;
      }
    }
  }
}
