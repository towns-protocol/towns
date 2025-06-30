// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IAppAccountBase {
    error InvalidAppAddress(address app);
    error InvalidManifest();
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

    /// @notice Renews an app
    /// @param appId The ID of the app to renew
    /// @param data The data required for app renewal
    function onRenewApp(bytes32 appId, bytes calldata data) external;

    /// @notice Enables an app
    /// @param app The address of the app to enable
    function enableApp(address app) external;

    /// @notice Disables an app
    /// @param app The address of the app to disable
    function disableApp(address app) external;

    /// @notice Checks if an app is installed
    /// @param app The address of the app
    function isAppInstalled(address app) external view returns (bool);

    /// @notice Gets the ID of an app
    /// @param app The address of the app to get the ID of
    /// @return The ID of the app
    function getAppId(address app) external view returns (bytes32);

    /// @notice Gets the expiration of an app
    /// @param app The address of the app to get the expiration of
    /// @return The expiration of the app
    function getAppExpiration(address app) external view returns (uint48);

    /// @notice Gets the apps installed on the account
    /// @return The apps installed on the account
    function getInstalledApps() external view returns (address[] memory);

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

    /// @notice Request a transfer of tokens during app execution
    /// @dev Can only be called by apps during authorized execution
    /// @param token Token address (address(0) or NATIVE_TOKEN for ETH)
    /// @param to Recipient address
    /// @param amount Amount to transfer
    /// @return success Whether the transfer was successful
    function onRequestTransfer(
        address token,
        address to,
        uint256 amount
    ) external returns (bool success);
}
