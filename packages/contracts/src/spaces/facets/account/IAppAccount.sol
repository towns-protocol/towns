// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/**
 * @title IAppAccountBase
 * @notice Base interface for app account functionality
 * @dev Defines the core structures, errors, and base functionality for app accounts
 */
interface IAppAccountBase {
    /// @notice Params for installing an app
    /// @param allowance The maximum amount of ETH that can be spent by the app
    /// @param grantDelay The delay before the app can be granted access to the group
    /// @param executionDelay The delay before the app can execute a transaction
    struct AppParams {
        uint256 allowance;
        uint32 grantDelay;
        uint32 executionDelay;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Thrown when an unauthorized app attempts to perform an operation
     * @param app The address of the unauthorized app
     */
    error UnauthorizedApp(address app);

    /**
     * @notice Thrown when the app address is invalid (e.g., zero address)
     * @param app The invalid app address
     */
    error InvalidAppAddress(address app);

    /**
     * @notice Thrown when the manifest provided by the app doesn't match the cached manifest
     * @param app The address of the app with the invalid manifest
     */
    error InvalidManifest(address app);

    /**
     * @notice Thrown when an unauthorized function selector is used
     */
    error UnauthorizedSelector();

    /**
     * @notice Thrown when there is not enough ETH to set an allowance
     */
    error NotEnoughEth();

    /**
     * @notice Thrown when attempting to install an app that is already installed
     */
    error AppAlreadyInstalled();

    /**
     * @notice Thrown when an invalid appId is provided (e.g., zero appId)
     */
    error InvalidAppId();

    /**
     * @notice Thrown when attempting to operate on an app that is not installed
     */
    error AppNotInstalled();

    /**
     * @notice Thrown when attempting to operate on an app that is not registered
     */
    error AppNotRegistered();

    /**
     * @notice Thrown when attempting to operate on an app that has been revoked
     */
    error AppRevoked();
}

/**
 * @title IAppAccount
 * @author Towns Protocol Team
 * @notice Interface for app account functionality
 * @dev Extends IAppAccountBase with methods for installing, uninstalling, and managing apps
 */
interface IAppAccount is IAppAccountBase {
    /**
     * @notice Execute a transaction on behalf of the account
     * @dev Only authorized targets are allowed and reentrancy is prevented
     * @param target The address of the contract to call
     * @param value The amount of ETH to send with the call
     * @param data The calldata to send
     */
    function execute(address target, uint256 value, bytes calldata data) external payable;

    /**
     * @notice Install an app in the account
     * @dev Registers the app, sets up its hooks, and configures its permissions
     * @param appId The unique identifier of the app to install
     * @param data Additional data to pass to the app's onInstall function
     * @param params Configuration parameters for the app installation
     */
    function installApp(bytes32 appId, bytes calldata data, AppParams calldata params) external;

    /**
     * @notice Uninstall an app from the account
     * @dev Removes the app's hooks, revokes its permissions, and calls its onUninstall function
     * @param appId The unique identifier of the app to uninstall
     * @param data Additional data to pass to the app's onUninstall function
     */
    function uninstallApp(bytes32 appId, bytes calldata data) external;

    /**
     * @notice Check if a client is entitled to a specific permission for an app
     * @dev Verifies if the client has the specified permission for the given app
     * @param appId The unique identifier of the app
     * @param publicKey The address of the client to check
     * @param permission The permission to check for
     * @return True if the client has the permission, false otherwise
     */
    function isAppEntitled(
        bytes32 appId,
        address publicKey,
        bytes32 permission
    ) external view returns (bool);

    /**
     * @notice Set the maximum amount of ETH that an app can spend
     * @dev Updates the allowance for the specified app
     * @param appId The unique identifier of the app
     * @param allowance The new allowance value
     */
    function setAppAllowance(bytes32 appId, uint256 allowance) external;

    /**
     * @notice Get the current ETH allowance for an app
     * @dev Returns the maximum amount of ETH the app can spend
     * @param appId The unique identifier of the app
     * @return The current allowance value
     */
    function getAppAllowance(bytes32 appId) external view returns (uint256);
}
