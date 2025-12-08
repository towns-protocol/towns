// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppAccount} from "src/spaces/facets/account/IAppAccount.sol";

// libraries
import "./AppManager.sol" as AppManager;

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract AppManagerFacet is IAppAccount, ReentrancyGuardTransient, Facet, OwnableBase {
    function __AppManagerFacet_init() external onlyInitializing {
        _addInterface(type(IAppAccount).interfaceId);
    }

    function __AppManagerFacet_init_unchained() internal {}

    function onInstallApp(bytes32 appId, bytes calldata data) external override nonReentrant {
        AppManager.installApp(msg.sender, appId, data);
    }

    function onUninstallApp(bytes32 appId, bytes calldata data) external override nonReentrant {
        AppManager.uninstallApp(msg.sender, appId, data);
    }

    function onRenewApp(bytes32 appId, bytes calldata) external override nonReentrant {
        AppManager.renewApp(msg.sender, appId);
    }

    function onUpdateApp(bytes32 appId, bytes calldata data) external override nonReentrant {
        AppManager.updateApp(msg.sender, appId, data);
    }

    function enableApp(address app) external override nonReentrant {
        AppManager.enableApp(msg.sender, app);
    }

    function disableApp(address app) external override nonReentrant {
        AppManager.disableApp(msg.sender, app);
    }

    function isAppInstalled(address app) external view override returns (bool) {
        return AppManager.isAppInstalled(msg.sender, app);
    }

    function getAppId(address app) external view override returns (bytes32) {
        return AppManager.getAppId(msg.sender, app);
    }

    function getAppExpiration(address app) external view override returns (uint48) {
        return AppManager.getAppExpiration(msg.sender, app);
    }

    function getInstalledApps() external view override returns (address[] memory) {
        return AppManager.getInstalledApps(msg.sender);
    }

    function isAppEntitled(
        address app,
        address publicKey,
        bytes32 permission
    ) external view override returns (bool) {
        return AppManager.isAppEntitled(msg.sender, app, publicKey, permission);
    }
}
