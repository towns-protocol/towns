// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppAccount} from "src/spaces/facets/account/IAppAccount.sol";

// libraries
import "./AppManagerMod.sol" as AppManager;

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

contract AppManagerFacet is IAppAccount, ReentrancyGuardTransient, Facet {
    function __AppManagerFacet_init() external onlyInitializing {
        _addInterface(type(IAppAccount).interfaceId);
    }

    function __AppManagerFacet_init_unchained() internal {}

    function onInstallApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManager.installApp(msg.sender, appId, data);
    }

    function onUninstallApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManager.uninstallApp(msg.sender, appId, data);
    }

    function onRenewApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManager.renewApp(msg.sender, appId, data);
    }

    function onUpdateApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManager.updateApp(msg.sender, appId, data);
    }

    function enableApp(address app) external nonReentrant {
        AppManager.enableApp(msg.sender, app);
    }

    function disableApp(address app) external nonReentrant {
        AppManager.disableApp(msg.sender, app);
    }

    function isAppInstalled(address app) external view returns (bool) {
        return AppManager.isAppInstalled(msg.sender, app);
    }

    function getAppId(address app) external view returns (bytes32) {
        return AppManager.getAppId(msg.sender, app);
    }

    function getAppExpiration(address app) external view returns (uint48) {
        return AppManager.getAppExpiration(msg.sender, app);
    }

    function getInstalledApps() external view returns (address[] memory) {
        return AppManager.getInstalledApps(msg.sender);
    }

    function isAppEntitled(
        address app,
        address publicKey,
        bytes32 permission
    ) external view returns (bool) {
        return AppManager.isAppEntitled(msg.sender, app, publicKey, permission);
    }
}
