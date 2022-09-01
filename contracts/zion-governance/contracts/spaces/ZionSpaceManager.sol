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
import {UserGrantedEntitlementModule} from "./entitlements/UserGrantedEntitlement.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZionSpaceManager is Ownable, ISpaceManager {
  using EnumerableSet for EnumerableSet.Bytes32Set;

  uint256 private totalSpaces = 0;

  // Storage
  mapping(string => bool) internal spaceIsRegistered;
  mapping(uint256 => DataTypes.Space) internal spaceById;
  mapping(string => uint256) internal spaceIdByNetworkId;

  // mapping(uint256 => DataTypes.Entitlement[]) internal spaceEntitlementsBySpaceId;

  /// @notice Create a new space.
  function createSpace(DataTypes.CreateSpaceData calldata vars)
    external
    returns (uint256)
  {
    _validateName(vars.spaceName);

    if (spaceIsRegistered[vars.spaceName])
      revert Errors.SpaceAlreadyRegistered();

    spaceIsRegistered[vars.spaceName] = true;

    // creating space
    uint256 spaceId = ++totalSpaces;

    DataTypes.Space storage space = spaceById[spaceId];

    space.spaceId = spaceId;
    space.createdAt = block.timestamp;
    space.name = vars.spaceName;
    space.creator = _msgSender();
    space.owner = _msgSender();

    // check if vars.entitlements support interface
    if (
      IERC165(vars.entitlements[0]).supportsInterface(
        type(ISpaceEntitlementModule).interfaceId
      ) == false
    ) revert Errors.EntitlementModuleNotSupported();

    // set default entitlement module
    space.entitlementTags = ["usergranted"];
    space.entitlements["usergranted"] = vars.entitlements[0];

    UserGrantedEntitlementModule entitlement = UserGrantedEntitlementModule(
      vars.entitlements[0]
    );

    // create array of entitlement types
    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);

    // set the first entitlement type to be the administrator entitlement type
    entitlementTypes[0] = DataTypes.EntitlementType.Administrator;

    // add the user granted entitlement to the entitlement module
    entitlement.setUserEntitlement(
      DataTypes.EntitlementData(spaceId, 0, _msgSender(), entitlementTypes)
    );

    emit Events.CreateSpace(_msgSender(), vars.spaceName, spaceId);

    return spaceId;
  }

  /// @notice Connects the node network id to a space id
  function setNetworkIdToSpaceId(uint256 spaceId, string calldata networkId)
    external
  {
    DataTypes.Space storage space = spaceById[spaceId];

    if (space.owner != _msgSender()) revert Errors.NotSpaceOwner();
    space.networkSpaceId = networkId;
    spaceIdByNetworkId[networkId] = spaceId;
  }

  /// @notice Adds an entitlement module to a space.
  // TODO: rename this to registerEntitlementModule
  function addEntitlementModule(DataTypes.AddEntitlementData calldata vars)
    external
  {
    DataTypes.Space storage space = spaceById[vars.spaceId];
    if (space.owner != _msgSender()) revert Errors.NotSpaceOwner();
    if (space.entitlements[vars.entitlementTag] != address(0))
      revert Errors.EntitlementAlreadyRegistered();

    if (space.entitlements[vars.entitlementTag] == address(0)) {
      space.entitlements[vars.entitlementTag] = vars.entitlement;
      space.entitlementTags.push(vars.entitlementTag);
    }
  }

  // Getters
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

  function getSpaces() external view returns (DataTypes.SpaceInfo[] memory) {
    DataTypes.SpaceInfo[] memory spaces = new DataTypes.SpaceInfo[](
      totalSpaces - 1
    );
    for (uint256 i = 0; i < totalSpaces; i++) {
      DataTypes.Space storage space = spaceById[i];
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

  function getSpaceIdByNetworkId(string calldata networkSpaceId)
    external
    view
    returns (uint256)
  {
    return spaceIdByNetworkId[networkSpaceId];
  }

  function getSpaceOwnerBySpaceId(uint256 _spaceId)
    external
    view
    returns (address ownerAddress)
  {
    return spaceById[_spaceId].owner;
  }

  // Helpers
  /// @notice Checks if a string contains valid username ASCII characters [0-1], [a-z] and _.
  /// @param str the string to be checked.
  /// @return true if the string contains only valid characters, false otherwise.
  function _isAllowedAsciiString(bytes memory str)
    internal
    pure
    returns (bool)
  {
    for (uint256 i = 0; i < str.length; i++) {
      uint8 charInt = uint8(str[i]);
      if (
        (charInt >= 1 && charInt <= 47) ||
        (charInt >= 58 && charInt <= 94) ||
        charInt == 96 ||
        charInt >= 123
      ) {
        return false;
      }
    }
    return true;
  }

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
