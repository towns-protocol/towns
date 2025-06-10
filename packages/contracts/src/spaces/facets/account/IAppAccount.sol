// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IAppAccountBase {
    error InvalidAppAddress(address app);
    error InvalidManifest(address app);
    error UnauthorizedSelector();
    error NotEnoughEth();
    error AppAlreadyInstalled();
    error UnauthorizedApp(address app);
    error InvalidCaller();
}

interface IAppAccount is IAppAccountBase {
    /// @notice Installs an app
    /// @param appId The ID of the app to install
    /// @param data The initialization data for the app
    function onInstallApp(bytes32 appId, bytes calldata data) external;

    /// @notice Uninstalls an app
    /// @param appId The ID of the app to uninstall
    /// @param data The data required for app uninstallation
    function onUninstallApp(bytes32 appId, bytes calldata data) external;

    /// @notice Enables an app
    /// @param app The address of the app to enable
    function enableApp(address app) external;

    /// @notice Disables an app
    /// @param app The address of the app to disable
    function disableApp(address app) external;

    /// @notice Gets the ID of an app
    /// @param app The address of the app to get the ID of
    /// @return The ID of the app
    function getAppId(address app) external view returns (bytes32);

    /// @notice Gets the apps installed on the account
    /// @return The apps installed on the account
    function getInstalledApps() external view returns (address[] memory);

    /// @notice Gets the clients of an app
    /// @param app The address of the app to get the clients of
    /// @return The clients of the app
    function getAppClients(address app) external view returns (address[] memory);

    /// @notice Checks if a client is entitled to a permission for an app
    /// @param app The address of the app to check
    /// @param publicKey The public key to check
    /// @param permission The permission to check
    /// @return True if the client is entitled to the permission, false otherwise
    function isAppEntitled(
        address app,
        address publicKey,
        bytes32 permission
    ) external view returns (bool);
}
