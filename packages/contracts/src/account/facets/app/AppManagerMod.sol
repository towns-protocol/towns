// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppRegistry, IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {LibCall} from "solady/utils/LibCall.sol";

library AppManagerMod {
    // types
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    struct App {
        bytes32 appId;
        address app;
        uint48 installedAt;
        uint48 expiration;
        bool active;
    }

    /// @notice Storage layout for the AppManager
    /// @custom:storage-location erc7201:towns.account.app.manager.storage
    struct Layout {
        mapping(address account => EnumerableSetLib.Bytes32Set) apps;
        mapping(address account => mapping(bytes32 appId => App)) appById;
        mapping(address account => mapping(address app => bytes32 appId)) appIdByApp;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("towns.account.app.manager.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x2e45e2674c3081261f26138b3a1b39b0261feef8186e18fcf5badd4929fe7b00;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when the app ID is invalid
    error AppManager__InvalidAppId();

    /// @notice Thrown when the app is already installed
    error AppManager__AppAlreadyInstalled();

    /// @notice Thrown when the app is not installed
    error AppManager__AppNotInstalled();

    /// @notice Thrown when the app is not registered
    error AppManager__AppNotRegistered();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Installs an app
    /// @param account The account to install the app to
    /// @param appId The ID of the app to install
    /// @param data The data to pass to the app's onInstall function
    function installApp(
        Layout storage $,
        address appRegistry,
        address account,
        bytes32 appId,
        bytes calldata data
    ) internal {
        if (appId == EMPTY_UID) AppManager__InvalidAppId.selector.revertWith();

        IAppRegistry registry = IAppRegistry(appRegistry);
        IAppRegistryBase.App memory app = registry.getAppById(appId);
        if (app.appId == EMPTY_UID) AppManager__AppNotRegistered.selector.revertWith();

        EnumerableSetLib.Bytes32Set storage apps = $.apps[account];

        if (apps.contains(app.appId)) AppManager__AppAlreadyInstalled.selector.revertWith();

        apps.add(app.appId);
        $.appIdByApp[account][app.module] = app.appId;
        $.appById[account][app.appId] = App({
            appId: app.appId,
            app: app.module,
            installedAt: uint48(block.timestamp),
            expiration: calcExpiration($, account, app.appId, app.duration),
            active: true
        });

        if (data.length > 0) {
            bytes memory callData = abi.encodeCall(IModule.onInstall, (data));
            LibCall.callContract(app.module, 0, callData);
        }
    }

    /// @notice Uninstalls an app
    /// @param account The account to uninstall the app from
    /// @param appId The ID of the app to uninstall
    /// @param data The data to pass to the app's onUninstall function
    function uninstallApp(
        Layout storage $,
        address appRegistry,
        address account,
        bytes32 appId,
        bytes calldata data
    ) internal {
        if (appId == EMPTY_UID) AppManager__InvalidAppId.selector.revertWith();

        IAppRegistry registry = IAppRegistry(appRegistry);
        IAppRegistryBase.App memory app = registry.getAppById(appId);
        if (app.appId == EMPTY_UID) AppManager__AppNotRegistered.selector.revertWith();

        EnumerableSetLib.Bytes32Set storage apps = $.apps[account];

        if (!apps.contains(app.appId)) AppManager__AppNotInstalled.selector.revertWith();

        address module = $.appById[account][app.appId].app;

        // Remove from storage
        apps.remove(app.appId);
        delete $.appIdByApp[account][module];
        delete $.appById[account][app.appId];

        // Call module's onUninstall if data is provided (non-reverting)
        if (data.length > 0) {
            // solhint-disable-next-line no-empty-blocks
            try IModule(module).onUninstall(data) {} catch {}
        }
    }

    /// @notice Renews an app subscription
    /// @param account The account that owns the app
    /// @param appId The ID of the app to renew
    function renewApp(
        Layout storage $,
        address appRegistry,
        address account,
        bytes32 appId,
        bytes calldata /* data */
    ) internal {
        if (appId == EMPTY_UID) AppManager__InvalidAppId.selector.revertWith();

        IAppRegistry registry = IAppRegistry(appRegistry);
        IAppRegistryBase.App memory app = registry.getAppById(appId);
        if (app.appId == EMPTY_UID) AppManager__AppNotRegistered.selector.revertWith();

        if (!$.apps[account].contains(appId)) AppManager__AppNotInstalled.selector.revertWith();

        // Calculate and update the new expiration
        $.appById[account][appId].expiration = calcExpiration($, account, appId, app.duration);
    }

    /// @notice Updates an app to a new version
    /// @param account The account that owns the app
    /// @param newAppId The ID of the new app version
    /// @param data The data containing the current module address
    function updateApp(
        Layout storage $,
        address appRegistry,
        address account,
        bytes32 newAppId,
        bytes calldata data
    ) internal {
        if (data.length < 32) AppManager__InvalidAppId.selector.revertWith();

        address module = abi.decode(data, (address));
        if (module == address(0)) AppManager__InvalidAppId.selector.revertWith();

        // Get current app ID from module
        bytes32 currentAppId = $.appIdByApp[account][module];
        if (currentAppId == EMPTY_UID) AppManager__AppNotInstalled.selector.revertWith();
        if (currentAppId == newAppId) AppManager__AppAlreadyInstalled.selector.revertWith();

        IAppRegistry registry = IAppRegistry(appRegistry);
        IAppRegistryBase.App memory newApp = registry.getAppById(newAppId);
        if (newApp.appId == EMPTY_UID) AppManager__AppNotRegistered.selector.revertWith();

        // Read the old module from the stored app before deletion
        address oldModule = $.appById[account][currentAppId].app;

        // Remove old app from storage
        $.apps[account].remove(currentAppId);
        delete $.appById[account][currentAppId];
        delete $.appIdByApp[account][oldModule];

        // Add new app
        $.apps[account].add(newAppId);
        $.appIdByApp[account][newApp.module] = newAppId;
        $.appById[account][newAppId] = App({
            appId: newAppId,
            app: newApp.module,
            installedAt: uint48(block.timestamp),
            expiration: calcExpiration($, account, newAppId, newApp.duration),
            active: true
        });
    }

    /// @notice Enables an app
    /// @param account The account that owns the app
    /// @param app The app address to enable
    function enableApp(Layout storage $, address account, address app) internal {
        bytes32 appId = $.appIdByApp[account][app];
        if (appId == EMPTY_UID) AppManager__AppNotInstalled.selector.revertWith();
        $.appById[account][appId].active = true;
    }

    /// @notice Disables an app
    /// @param account The account that owns the app
    /// @param app The app address to disable
    function disableApp(Layout storage $, address account, address app) internal {
        bytes32 appId = $.appIdByApp[account][app];
        if (appId == EMPTY_UID) AppManager__AppNotInstalled.selector.revertWith();
        $.appById[account][appId].active = false;
    }

    /// @notice Checks if an app is installed
    /// @param account The account to check
    /// @param app The app address
    /// @return True if the app is installed
    function isAppInstalled(
        Layout storage $,
        address account,
        address app
    ) internal view returns (bool) {
        bytes32 appId = $.appIdByApp[account][app];
        return appId != EMPTY_UID && $.appById[account][appId].active;
    }

    /// @notice Gets the app ID for a given app address
    /// @param account The account to check
    /// @param app The app address
    /// @return The app ID
    function getAppId(
        Layout storage $,
        address account,
        address app
    ) internal view returns (bytes32) {
        return $.appIdByApp[account][app];
    }

    /// @notice Gets the expiration timestamp for a given app
    /// @param account The account to check
    /// @param app The app address
    /// @return The expiration timestamp
    function getAppExpiration(
        Layout storage $,
        address account,
        address app
    ) internal view returns (uint48) {
        bytes32 appId = $.appIdByApp[account][app];
        return $.appById[account][appId].expiration;
    }

    /// @notice Gets all installed app addresses for an account
    /// @param account The account to check
    /// @return apps The array of installed app addresses (only active apps)
    function getInstalledApps(
        Layout storage $,
        address account
    ) internal view returns (address[] memory apps) {
        bytes32[] memory appIds = $.apps[account].values();
        uint256 length = appIds.length;

        // Count active apps first
        uint256 activeCount;
        for (uint256 i; i < length; ++i) {
            if ($.appById[account][appIds[i]].active) ++activeCount;
        }

        // Build array of active apps only
        apps = new address[](activeCount);
        uint256 j;
        for (uint256 i; i < length; ++i) {
            App storage app = $.appById[account][appIds[i]];
            if (app.active) {
                apps[j++] = app.app;
            }
        }
    }

    /// @notice Checks if an app is entitled to a permission
    /// @param account The account to check
    /// @param module The app module address
    /// @param client The client address making the request
    /// @param permission The permission to check
    /// @return True if the app is entitled to the permission
    function isAppEntitled(
        Layout storage $,
        address appRegistry,
        address account,
        address module,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        bytes32 appId = $.appIdByApp[account][module];
        if (appId == EMPTY_UID) return false;

        // Check app is active
        if (!$.appById[account][appId].active) return false;

        IAppRegistry registry = IAppRegistry(appRegistry);

        // Check app not banned
        if (registry.isAppBanned(module)) return false;

        // Check app has not expired
        if ($.appById[account][appId].expiration < block.timestamp) return false;

        IAppRegistryBase.App memory app = registry.getAppById(appId);
        if (app.appId == EMPTY_UID) return false;

        // Check client matches the registered client
        if (app.client != client) return false;

        // Check permission exists in app.permissions
        uint256 permissionsLength = app.permissions.length;
        for (uint256 i; i < permissionsLength; ++i) {
            if (app.permissions[i] == permission) return true;
        }

        return false;
    }

    /// @notice Calculates the expiration for an app
    /// @param $ The storage layout
    /// @param account The account that owns the app
    /// @param appId The ID of the app
    /// @param newDuration The new duration of the app
    /// @return The expiration timestamp
    function calcExpiration(
        Layout storage $,
        address account,
        bytes32 appId,
        uint48 newDuration
    ) internal view returns (uint48) {
        uint48 currentExpiration = $.appById[account][appId].expiration;
        if (currentExpiration > block.timestamp) {
            return currentExpiration + newDuration;
        } else {
            return uint48(block.timestamp) + newDuration;
        }
    }

    /// @notice Returns the storage layout for the AppManager
    /// @return $ The storage layout
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
