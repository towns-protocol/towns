// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {AppErrors} from "./AppErrors.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Registry} from "../types/AppTypes.sol";
import {AppRegistryStorage} from "./AppRegistryStorage.sol";

// contracts

library Helpers {
  using StringSet for StringSet.Set;

  function checkCreateRegistration(
    AppRegistryStorage.Layout storage ds,
    address app,
    Registry.Status status,
    address owner,
    string[] memory permissions
  ) internal view {
    if (msg.sender != owner)
      CustomRevert.revertWith(AppErrors.CallerNotOwner.selector);

    if (app == owner)
      CustomRevert.revertWith(AppErrors.InvalidAppAddress.selector);

    if (app == address(this))
      CustomRevert.revertWith(AppErrors.InvalidAppAddress.selector);

    if (status != Registry.Status.Pending)
      CustomRevert.revertWith(AppErrors.InvalidStatus.selector);

    if (ds.appIdByAddress[app] != 0)
      CustomRevert.revertWith(AppErrors.AlreadyRegistered.selector);

    checkInvalidPermissions(permissions, ds.invalidPermissions);
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

  function checkOwnership(address currentOwner, address owner) internal pure {
    if (currentOwner != owner)
      CustomRevert.revertWith(AppErrors.CallerNotOwner.selector);
  }

  function checkInvalidPermissions(
    string[] memory permissions,
    StringSet.Set storage invalidPermissions
  ) internal view {
    for (uint256 i; i < permissions.length; ++i) {
      if (invalidPermissions.contains(permissions[i]))
        CustomRevert.revertWith(AppErrors.InvalidPermission.selector);
    }
  }
}
