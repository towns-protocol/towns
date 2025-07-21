// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "src/apps/facets/registry/IAppRegistry.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {ExecutorStorage} from "src/spaces/facets/executor/ExecutorStorage.sol";
import {DependencyLib} from "src/spaces/facets/DependencyLib.sol";
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts

library AppAccountStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.account.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x5203018779d8301358307033923a3bd0a3a759f1f58591c01f878744c0f8c200;

    struct Layout {
        EnumerableSetLib.AddressSet installedApps;
        mapping(address app => bytes32 appId) appIdByApp;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    function getInstalledAppId(address module) internal view returns (bytes32) {
        return getLayout().appIdByApp[module];
    }

    function getApp(address module) internal view returns (IAppRegistry.App memory app) {
        bytes32 appId = getInstalledAppId(module);
        if (appId == EMPTY_UID) return app;
        return DependencyLib.getAppRegistry().getAppById(appId);
    }

    function isAppEntitled(
        address module,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        IAppRegistry.App memory app = getApp(module);

        if (app.appId == EMPTY_UID) return false;

        (bool hasClientAccess, , bool isGroupActive) = ExecutorStorage.hasGroupAccess(
            app.appId,
            client
        );
        if (!hasClientAccess || !isGroupActive) return false;

        uint256 permissionsLength = app.permissions.length;
        for (uint256 i; i < permissionsLength; ++i) {
            if (app.permissions[i] == permission) return true;
        }

        return false;
    }
}
