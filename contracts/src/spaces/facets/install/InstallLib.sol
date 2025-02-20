// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppInstaller} from "contracts/src/app/interfaces/IAppInstaller.sol";

// libraries
import {Implementations} from "contracts/src/spaces/facets/Implementations.sol";

// contracts

/// @title InstallLib
/// @notice Library for installing and uninstalling apps in a space
library InstallLib {
  /// @notice Installs an app into the space for specific channels
  /// @param appId The ID of the app to install
  /// @param channelIds The channel IDs where the app will be installed
  function installApp(uint256 appId, bytes32[] memory channelIds) internal {
    address appRegistry = Implementations.appRegistry();
    IAppInstaller(appRegistry).install(appId, channelIds);
  }

  /// @notice Uninstalls an app from the space for specific channels
  /// @param appId The ID of the app to uninstall
  /// @param channelIds The channel IDs where the app will be uninstalled
  function uninstallApp(uint256 appId, bytes32[] memory channelIds) internal {
    address appRegistry = Implementations.appRegistry();
    IAppInstaller(appRegistry).uninstall(appId, channelIds);
  }

  /// @notice Checks if an app has a specific permission for a channel
  /// @param channelId The ID of the channel to check
  /// @param appAddress The address of the app to check
  /// @param permission The permission to check
  /// @return bool True if the app has the permission, false otherwise
  function isAppEntitled(
    bytes32 channelId,
    address appAddress,
    bytes32 permission
  ) internal view returns (bool) {
    address appRegistry = Implementations.appRegistry();
    return
      IAppInstaller(appRegistry).isEntitled(
        address(this),
        channelId,
        appAddress,
        permission
      );
  }
}
