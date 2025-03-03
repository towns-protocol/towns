// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/// @title IInstallFacet
/// @notice Interface for installing and uninstalling apps in a space
interface IInstallFacet {
  /// @notice Installs an app into the space for specific channels
  /// @param appId The ID of the app to install
  /// @param channelIds The channel IDs where the app will be installed
  function installApp(uint256 appId, bytes32[] memory channelIds) external;

  /// @notice Uninstalls an app from the space for specific channels
  /// @param appId The ID of the app to uninstall
  /// @param channelIds The channel IDs where the app will be uninstalled
  function uninstallApp(uint256 appId, bytes32[] memory channelIds) external;
}
