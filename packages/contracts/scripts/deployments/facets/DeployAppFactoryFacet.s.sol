// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AppFactoryFacet} from "src/apps/facets/factory/AppFactoryFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";
import {IAppFactoryBase} from "src/apps/facets/factory/IAppFactory.sol";

library DeployAppFactoryFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(8);
        arr.p(AppFactoryFacet.addBeacons.selector);
        arr.p(AppFactoryFacet.removeBeacons.selector);
        arr.p(AppFactoryFacet.getBeacon.selector);
        arr.p(AppFactoryFacet.getBeacons.selector);
        arr.p(AppFactoryFacet.setEntryPoint.selector);
        arr.p(AppFactoryFacet.getEntryPoint.selector);
        arr.p(AppFactoryFacet.createApp.selector);
        arr.p(AppFactoryFacet.createAppByBeacon.selector);
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

    function makeInitData(
        IAppFactoryBase.Beacon[] memory beacons,
        address entryPoint
    ) internal pure returns (bytes memory) {
        return abi.encodeCall(AppFactoryFacet.__AppFactory_init, (beacons, entryPoint));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AppFactoryFacet.sol", "");
    }
}
