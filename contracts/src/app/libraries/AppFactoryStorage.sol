// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {Registry} from "../libraries/RegistryLib.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {AppErrors} from "./AppErrors.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {Validator} from "contracts/src/utils/Validator.sol";
// contracts

library AppFactoryStorage {
  using StringSet for StringSet.Set;
  using CustomRevert for bytes4;
  using Validator for *;

  uint256 internal constant MAX_PERMISSIONS = 10;

  // keccak256(abi.encode(uint256(keccak256("app.facets.factory.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0x1aae9eeeedd4a5127fb9f51b673ba56b6168ea1d2090b2d4267ae2d8099b0900;

  struct Layout {
    uint256 nextAppId;
    StringSet.Set invalidPermissions;
    mapping(uint256 appId => Registry.App app) appById;
    mapping(address implementation => uint256 appId) appIdByAddress;
  }

  function getLayout() internal pure returns (Layout storage ds) {
    assembly {
      ds.slot := STORAGE_SLOT
    }
  }

  function registerAppId(
    Layout storage ds,
    address app
  ) internal returns (uint256 appId) {
    if (ds.appIdByAddress[app] != 0)
      CustomRevert.revertWith(AppErrors.AlreadyRegistered.selector);

    appId = ++ds.nextAppId;
    ds.appIdByAddress[app] = appId;
  }

  function validatePermissions(
    Layout storage ds,
    string[] memory permissions
  ) internal view {
    permissions.checkMaxArrayLength(MAX_PERMISSIONS);

    for (uint256 i; i < permissions.length; ++i) {
      if (ds.invalidPermissions.contains(permissions[i]))
        AppErrors.InvalidPermission.selector.revertWith();
    }
  }

  function checkOwnership(address currentOwner, address owner) internal pure {
    if (currentOwner != owner)
      CustomRevert.revertWith(AppErrors.CallerNotOwner.selector);
  }

  function checkStatus(
    Registry.Status currentStatus,
    Registry.Status newStatus
  ) internal pure {
    // Prevent transitions from Approved to Disabled
    if (
      currentStatus == Registry.Status.Approved &&
      newStatus == Registry.Status.Disabled
    ) {
      CustomRevert.revertWith(AppErrors.InvalidStatusTransition.selector);
    }

    // Prevent transitions from Disabled to Approved (must go through Pending)
    if (
      currentStatus == Registry.Status.Disabled &&
      newStatus == Registry.Status.Approved
    ) {
      CustomRevert.revertWith(AppErrors.InvalidStatusTransition.selector);
    }
  }
}
