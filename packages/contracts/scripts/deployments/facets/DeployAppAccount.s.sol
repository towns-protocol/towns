// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAppAccount {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(11);
        arr.p(AppAccount.execute.selector);
        arr.p(AppAccount.onInstallApp.selector);
        arr.p(AppAccount.onUninstallApp.selector);
        arr.p(AppAccount.onRenewApp.selector);
        arr.p(AppAccount.isAppEntitled.selector);
        arr.p(AppAccount.disableApp.selector);
        arr.p(AppAccount.getInstalledApps.selector);
        arr.p(AppAccount.getAppId.selector);
        arr.p(AppAccount.enableApp.selector);
        arr.p(AppAccount.getAppExpiration.selector);
        arr.p(AppAccount.isAppInstalled.selector);
        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return
            IDiamond.FacetCut({
                action: action,
                facetAddress: facetAddress,
                functionSelectors: selectors()
            });
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AppAccount.sol", "");
    }
}
