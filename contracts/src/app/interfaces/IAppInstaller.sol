// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IAppInstallerBase {
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Events                              */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  event AppInstalled(
    address indexed account,
    uint256 indexed appId,
    bytes32[] channelIds
  );

  event AppUninstalled(
    address indexed account,
    uint256 indexed appId,
    bytes32[] channelIds
  );

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         Errors                             */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  error AppAlreadyInstalled();
  error AppNotInstalled();
  error AppInvalidAppId();
  error AppPermissionNotAllowed();
  error AppInvalidChannelIds();
  error AppTooManyChannels();
}

interface IAppInstaller is IAppInstallerBase {
  /// @notice Installs an app for the caller with specified channel IDs
  /// @param appId The ID of the app to install
  /// @param channelIds Array of channel IDs to install the app for
  function install(uint256 appId, bytes32[] memory channelIds) external;

  /// @notice Uninstalls an app for the caller from specified channel IDs
  /// @param appId The ID of the app to uninstall
  /// @param channelIds Array of channel IDs to uninstall the app from
  function uninstall(uint256 appId, bytes32[] memory channelIds) external;

  /// @notice Gets the installation info for an account
  /// @param account The address to check installation info for
  /// @param appId The ID of the app to check
  /// @return installed True if app is installed, false otherwise
  /// @return channels Array of channel IDs installed for the app
  /// @return permissions Array of permissions installed for the app
  function getInstallationInfo(
    address account,
    uint256 appId
  )
    external
    view
    returns (
      bool installed,
      bytes32[] memory channels,
      string[] memory permissions
    );

  /// @notice Gets all app IDs installed for an account
  /// @param account The address to check installed apps for
  /// @return Array of installed app IDs
  function installedApps(
    address account
  ) external view returns (uint256[] memory);

  /// @notice Gets the permissions for an app
  /// @param account The address to check permissions for
  /// @param appId The ID of the app to check
  /// @return Array of permissions installed for the app
  function permissions(
    address account,
    uint256 appId
  ) external view returns (string[] memory);

  /// @notice Checks if an app is installed for specific channels
  /// @param account The address to check installation for
  /// @param appId The ID of the app to check
  /// @param channelIds Array of channel IDs to check installation for
  /// @return True if app is installed for all specified channels
  function isInstalled(
    address account,
    uint256 appId,
    bytes32[] memory channelIds
  ) external view returns (bool);

  /// @notice Checks if an account has permission for an app on a channel
  /// @param channelId The channel ID to check permission for
  /// @param appAddress The address of the app to check
  /// @param permission The permission to check
  /// @return True if account has the permission
  function isEntitled(
    address account,
    bytes32 channelId,
    address appAddress,
    bytes32 permission
  ) external view returns (bool);
}
