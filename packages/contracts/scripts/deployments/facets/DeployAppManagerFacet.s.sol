// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AppManagerFacet} from "src/account/facets/app/AppManagerFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAppManagerFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(11);

        arr.p(AppManagerFacet.onInstallApp.selector);
        arr.p(AppManagerFacet.onUninstallApp.selector);
        arr.p(AppManagerFacet.onRenewApp.selector);
        arr.p(AppManagerFacet.onUpdateApp.selector);
        arr.p(AppManagerFacet.enableApp.selector);
        arr.p(AppManagerFacet.disableApp.selector);
        arr.p(AppManagerFacet.isAppInstalled.selector);
        arr.p(AppManagerFacet.getAppId.selector);
        arr.p(AppManagerFacet.getAppExpiration.selector);
        arr.p(AppManagerFacet.getInstalledApps.selector);
        arr.p(AppManagerFacet.isAppEntitled.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(AppManagerFacet.__AppManagerFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AppManagerFacet.sol", "");
    }
}
