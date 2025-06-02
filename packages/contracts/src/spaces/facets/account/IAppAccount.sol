// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

// interfaces

// libraries

// contracts
interface IAppAccountBase {
    struct App {
        bytes32 appId;
        address module;
        address owner;
        address[] clients;
        bytes32[] permissions;
        ExecutionManifest manifest;
        uint256 installPrice;
        uint64 accessDuration;
    }

    /// @notice Params for installing an app
    /// @param delays The delays for the app
    struct AppParams {
        Delays delays;
    }

    /// @notice Delays for the app
    /// @param grantDelay The delay before the app can be granted access to the group
    /// @param executionDelay The delay before the app can execute a transaction
    struct Delays {
        uint32 grantDelay;
        uint32 executionDelay;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error UnauthorizedApp(address app);
    error InvalidAppAddress(address app);
    error InvalidManifest(address app);
    error UnauthorizedSelector();
    error NotEnoughEth();
    error AppAlreadyInstalled();
    error InvalidAppId();
    error AppNotInstalled();
    error AppNotRegistered();
    error AppRevoked();
    error InsufficientPayment();
    error InvalidOwner();
}

interface IAppAccount is IAppAccountBase {
    /// @notice Installs an app with the given parameters
    /// @param app The address of the app to install
    /// @param data The initialization data for the app
    /// @param params The parameters for the app installation including delays
    function installApp(
        address app,
        bytes calldata data,
        AppParams calldata params
    ) external payable;

    /// @notice Disables an app
    /// @param app The address of the app to disable
    function disableApp(address app) external;

    /// @notice Uninstalls an app
    /// @param app The address of the app to uninstall
    /// @param data The data required for app uninstallation
    function uninstallApp(address app, bytes calldata data) external;

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
    function getClients(address app) external view returns (address[] memory);

    /// @notice Gets the price of an app
    /// @param app The address of the app to get the price of
    /// @return The price of the app
    function getAppPrice(address app) external view returns (uint256);

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
