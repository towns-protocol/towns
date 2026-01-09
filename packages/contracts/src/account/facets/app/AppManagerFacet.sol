// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppAccount} from "src/spaces/facets/account/IAppAccount.sol";

// libraries
import {AppManagerMod} from "./AppManagerMod.sol";
import {AccountHubMod} from "../hub/AccountHubMod.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

contract AppManagerFacet is IAppAccount, ReentrancyGuardTransient, Facet {
    using AppManagerMod for AppManagerMod.Layout;
    using AccountHubMod for AccountHubMod.Layout;

    function __AppManagerFacet_init() external onlyInitializing {
        _addInterface(type(IAppAccount).interfaceId);
    }

    function onInstallApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManagerMod.getStorage().installApp(
            AccountHubMod.getStorage().appRegistry,
            msg.sender,
            appId,
            data
        );
    }

    function onUninstallApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManagerMod.getStorage().uninstallApp(
            AccountHubMod.getStorage().appRegistry,
            msg.sender,
            appId,
            data
        );
    }

    function onRenewApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManagerMod.getStorage().renewApp(
            AccountHubMod.getStorage().appRegistry,
            msg.sender,
            appId,
            data
        );
    }

    function onUpdateApp(bytes32 appId, bytes calldata data) external nonReentrant {
        AppManagerMod.getStorage().updateApp(
            AccountHubMod.getStorage().appRegistry,
            msg.sender,
            appId,
            data
        );
    }

    function enableApp(address app) external nonReentrant {
        AppManagerMod.getStorage().enableApp(msg.sender, app);
    }

    function disableApp(address app) external nonReentrant {
        AppManagerMod.getStorage().disableApp(msg.sender, app);
    }

    function isAppInstalled(address app) external view returns (bool) {
        return AppManagerMod.getStorage().isAppInstalled(msg.sender, app);
    }

    function getAppId(address app) external view returns (bytes32) {
        return AppManagerMod.getStorage().getAppId(msg.sender, app);
    }

    function getAppExpiration(address app) external view returns (uint48) {
        return AppManagerMod.getStorage().getAppExpiration(msg.sender, app);
    }

    function getInstalledApps() external view returns (address[] memory) {
        return AppManagerMod.getStorage().getInstalledApps(msg.sender);
    }

    function isAppEntitled(
        address app,
        address publicKey,
        bytes32 permission
    ) external view returns (bool) {
        return
            AppManagerMod.getStorage().isAppEntitled(
                AccountHubMod.getStorage().appRegistry,
                msg.sender,
                app,
                publicKey,
                permission
            );
    }
}
