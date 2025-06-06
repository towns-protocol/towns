// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";

library DeployAppAccount {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](9);
        _selectors[0] = AppAccount.execute.selector;
        _selectors[1] = AppAccount.onInstallApp.selector;
        _selectors[2] = AppAccount.onUninstallApp.selector;
        _selectors[3] = AppAccount.isAppEntitled.selector;
        _selectors[4] = AppAccount.disableApp.selector;
        _selectors[5] = AppAccount.getInstalledApps.selector;
        _selectors[6] = AppAccount.getAppId.selector;
        _selectors[7] = AppAccount.getAppClients.selector;
        _selectors[8] = AppAccount.enableApp.selector;
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
