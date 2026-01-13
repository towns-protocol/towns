// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAppRegistryFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(13);
        arr.p(AppRegistryFacet.getAppSchema.selector);
        arr.p(AppRegistryFacet.getAppSchemaId.selector);
        arr.p(AppRegistryFacet.getAppById.selector);
        arr.p(AppRegistryFacet.getLatestAppId.selector);
        arr.p(AppRegistryFacet.registerApp.selector);
        arr.p(AppRegistryFacet.removeApp.selector);
        arr.p(AppRegistryFacet.upgradeApp.selector);
        arr.p(AppRegistryFacet.getAppPrice.selector);
        arr.p(AppRegistryFacet.getAppDuration.selector);
        arr.p(AppRegistryFacet.adminRegisterAppSchema.selector);
        arr.p(AppRegistryFacet.adminBanApp.selector);
        arr.p(AppRegistryFacet.isAppBanned.selector);
        arr.p(AppRegistryFacet.getAppByClient.selector);
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
        address spaceFactory,
        string memory schema,
        address resolver
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                AppRegistryFacet.__AppRegistry_init,
                (spaceFactory, schema, ISchemaResolver(resolver))
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AppRegistryFacet.sol", "");
    }
}
