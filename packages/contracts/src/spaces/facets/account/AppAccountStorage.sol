// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "src/apps/facets/registry/IAppRegistry.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {DependencyLib} from "src/spaces/facets/DependencyLib.sol";
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts

library AppAccountStorage {
    struct Layout {
        EnumerableSetLib.AddressSet installedApps;
        mapping(address app => bytes32 appId) appIdByApp;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.account.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x5203018779d8301358307033923a3bd0a3a759f1f58591c01f878744c0f8c200;

    function getInstalledAppId(address module) internal view returns (bytes32) {
        return getLayout().appIdByApp[module];
    }

    function getApp(address module) internal view returns (IAppRegistry.App memory app) {
        bytes32 appId = getInstalledAppId(module);
        if (appId == EMPTY_UID) return app;
        return DependencyLib.getAppRegistry().getAppById(appId);
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
