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
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ZionSpaceManager
/// @author HNT Labs
/// @notice This contract manages the spaces and entitlements in the Zion ecosystem.
contract ZionSpaceManager is Ownable, ISpaceManager {
  /// @notice variable representing the current total amount of spaces in the contract
  uint256 private totalSpaces = 0;

  /// @notice variable representing the default entitlement module address and tag
  address private defaultEntitlementModuleAddress;
  string private defaultEntitlementModuleTag = "usergranted";

  // Storage
  /// @notice Mapping representing if a space has been registered or not.
  mapping(string => bool) internal spaceIsRegistered;

  /// @notice Mapping representing the space data by id.
  mapping(uint256 => DataTypes.Space) internal spaceById;

  /// @notice Mapping representing the space id by network id
  mapping(string => uint256) internal spaceIdByNetworkId;

  /// @inheritdoc ISpaceManager
  function createSpace(DataTypes.CreateSpaceData calldata vars)
    external
    returns (uint256)
  {
    _validateName(vars.spaceName);

    if (spaceIsRegistered[vars.spaceName])
      revert Errors.SpaceAlreadyRegistered();

    if (defaultEntitlementModuleAddress == address(0))
      revert Errors.DefaultEntitlementModuleNotSet();

    spaceIsRegistered[vars.spaceName] = true;

    // creating space
    uint256 spaceId = ++totalSpaces;

    DataTypes.Space storage space = spaceById[spaceId];

    space.spaceId = spaceId;
    space.createdAt = block.timestamp;
    space.name = vars.spaceName;
    space.creator = _msgSender();
    space.owner = _msgSender();
    space.roomId = 0;

    // create array of entitlement types
    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    entitlementTypes[0] = DataTypes.EntitlementType.Administrator;

    // create entitlement data
    _addEntitlement(
      spaceId,
      defaultEntitlementModuleAddress,
      defaultEntitlementModuleTag,
      entitlementTypes,
      abi.encode(_msgSender())
    );

    emit Events.CreateSpace(_msgSender(), vars.spaceName, spaceId);

    return spaceId;
  }

  /// @inheritdoc ISpaceManager
  function setNetworkIdToSpaceId(uint256 spaceId, string calldata networkId)
    external
  {
    DataTypes.Space storage space = spaceById[spaceId];

    if (space.owner != _msgSender()) revert Errors.NotSpaceOwner();
    space.networkSpaceId = networkId;
    spaceIdByNetworkId[networkId] = spaceId;
  }

  /// @inheritdoc ISpaceManager
  function addEntitlementModule(
    uint256 spaceId,
    address entitlementAddress,
    string memory entitlementTag,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) external {
    DataTypes.Space storage space = spaceById[spaceId];
    if (space.owner != _msgSender()) revert Errors.NotSpaceOwner();
    if (space.entitlements[entitlementTag] != address(0))
      revert Errors.EntitlementAlreadyRegistered();

    _addEntitlement(
      spaceId,
      entitlementAddress,
      entitlementTag,
      entitlementTypes,
      data
    );
  }

  /// @inheritdoc ISpaceManager
  function registerDefaultEntitlementModule(
    address _entitlementModule,
    string memory _entitlementModuleTag
  ) public onlyOwner {
    defaultEntitlementModuleAddress = _entitlementModule;
    defaultEntitlementModuleTag = _entitlementModuleTag;
  }

  /// @inheritdoc ISpaceManager
  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.EntitlementType entitlementType
  ) public view returns (bool) {
    DataTypes.Space storage space = spaceById[spaceId];

    for (uint256 i = 0; i < space.entitlementTags.length; i++) {
      address entitlement = space.entitlements[space.entitlementTags[i]];
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
    DataTypes.Space storage space = spaceById[_spaceId];
    return
      DataTypes.SpaceInfo(
        space.spaceId,
        space.createdAt,
        space.name,
        space.creator,
        space.owner
      );
  }

  /// @inheritdoc ISpaceManager
  function getSpaces() external view returns (DataTypes.SpaceInfo[] memory) {
    DataTypes.SpaceInfo[] memory spaces = new DataTypes.SpaceInfo[](
      totalSpaces
    );

    for (uint256 i = 0; i < totalSpaces; i++) {
      DataTypes.Space storage space = spaceById[i + 1];
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
    DataTypes.Space storage space = spaceById[spaceId];
    entitlements = new address[](space.entitlementTags.length);

    for (uint256 i = 0; i < space.entitlementTags.length; i++) {
      entitlements[i] = space.entitlements[space.entitlementTags[i]];
    }

    return entitlements;
  }

  /// @inheritdoc ISpaceManager
  function getSpaceIdByNetworkId(string calldata networkSpaceId)
    external
    view
    returns (uint256)
  {
    return spaceIdByNetworkId[networkSpaceId];
  }

  /// @inheritdoc ISpaceManager
  function getSpaceOwnerBySpaceId(uint256 _spaceId)
    external
    view
    returns (address ownerAddress)
  {
    return spaceById[_spaceId].owner;
  }

  /**
   * Internal functions
   */

  function _addEntitlement(
    uint256 spaceId,
    address entitlementAddress,
    string memory entitlementTag,
    DataTypes.EntitlementType[] memory entitlementTypes,
    bytes memory data
  ) internal {
    // check if entitlements support interface
    if (
      IERC165(entitlementAddress).supportsInterface(
        type(ISpaceEntitlementModule).interfaceId
      ) == false
    ) revert Errors.EntitlementModuleNotSupported();

    // set default entitlement module
    spaceById[spaceId].entitlementTags.push(entitlementTag);

    spaceById[spaceId].entitlements[entitlementTag] = entitlementAddress;

    ISpaceEntitlementModule entitlementModule = ISpaceEntitlementModule(
      entitlementAddress
    );

    // add the user granted entitlement to the entitlement module
    entitlementModule.setEntitlement(
      DataTypes.SetEntitlementData(
        spaceId,
        spaceById[spaceId].roomId,
        entitlementTypes,
        data
      )
    );
  }

  /// @notice Checks if a string is a valid space name.
  /// @param name The name of the space
  function _validateName(string calldata name) private pure {
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
