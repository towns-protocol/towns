// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AppInstallerFacet} from "src/apps/facets/installer/AppInstallerFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAppInstallerFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(4);
        arr.p(AppInstallerFacet.installApp.selector);
        arr.p(AppInstallerFacet.uninstallApp.selector);
        arr.p(AppInstallerFacet.updateApp.selector);
        arr.p(AppInstallerFacet.renewApp.selector);
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

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(AppInstallerFacet.__AppInstaller_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AppInstallerFacet.sol", "");
    }
}
