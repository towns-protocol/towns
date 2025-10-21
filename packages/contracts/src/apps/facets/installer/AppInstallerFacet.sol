// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITownsApp} from "../../ITownsApp.sol";
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";
import {IAppInstaller} from "./IAppInstaller.sol";

// libraries

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {AppRegistryBase} from "../registry/AppRegistryBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title AppInstallerFacet
/// @author Towns Protocol
/// @notice Facet for installing apps to spaces
contract AppInstallerFacet is IAppInstaller, AppRegistryBase, ReentrancyGuardTransient, Facet {
    function __AppInstaller_init() external onlyInitializing {
        _addInterface(type(IAppInstaller).interfaceId);
    }

    /// @notice Install an app
    /// @param app The app address to install
    /// @param space The space to install the app to
    /// @param data The data to pass to the app's onInstall function
    function installApp(
        ITownsApp app,
        IAppAccount space,
        bytes calldata data
    ) external payable nonReentrant onlyAllowed(space) {
        _installApp(address(app), address(space), data);
    }

    /// @notice Uninstall an app
    /// @param app The app address to uninstall
    /// @param space The space to uninstall the app from
    /// @param data The data to pass to the app's onUninstall function
    function uninstallApp(
        ITownsApp app,
        IAppAccount space,
        bytes calldata data
    ) external nonReentrant onlyAllowed(space) {
        _uninstallApp(address(app), address(space), data);
    }

    /// @notice Update an app to the latest version
    /// @param app The app address to update
    /// @param space The space to update the app to
    function updateApp(ITownsApp app, IAppAccount space) external nonReentrant onlyAllowed(space) {
        _updateApp(address(app), address(space));
    }

    /// @notice Renew an app
    /// @param app The app address to renew
    /// @param space The space to renew the app for
    /// @param data The data to pass to the app's onRenewApp function
    function renewApp(
        ITownsApp app,
        IAppAccount space,
        bytes calldata data
    ) external payable nonReentrant onlyAllowed(space) {
        _renewApp(address(app), address(space), data);
    }
}
