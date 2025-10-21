// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITownsApp} from "../../ITownsApp.sol";
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";

// libraries

// contracts

interface IAppInstaller {
    /// @notice Install an app
    /// @param app The app address to install
    /// @param account The account to install the app to
    /// @param data The data to pass to the app's onInstall function
    function installApp(ITownsApp app, IAppAccount account, bytes calldata data) external payable;

    /// @notice Uninstall an app
    /// @param app The app address to uninstall
    /// @param account The account to uninstall the app from
    /// @param data The data to pass to the app's onUninstall function
    function uninstallApp(ITownsApp app, IAppAccount account, bytes calldata data) external;

    /// @notice Update an app to the latest version
    /// @param app The app address to update
    /// @param account The account to update the app to
    function updateApp(ITownsApp app, IAppAccount account) external;

    /// @notice Renew an app
    /// @param app The app address to renew
    /// @param account The account to renew the app for
    /// @param data The data to pass to the app's onRenewApp function
    function renewApp(ITownsApp app, IAppAccount account, bytes calldata data) external payable;
}
