// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

//libraries

//contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AppRegistryFacet} from "src/apps/AppRegistryFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAppRegistryFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(9);
        arr.p(AppRegistryFacet.getAppSchema.selector);
        arr.p(AppRegistryFacet.getAppSchemaId.selector);
        arr.p(AppRegistryFacet.getAppById.selector);
        arr.p(AppRegistryFacet.getLatestAppId.selector);
        arr.p(AppRegistryFacet.registerApp.selector);
        arr.p(AppRegistryFacet.removeApp.selector);
        arr.p(AppRegistryFacet.adminRegisterAppSchema.selector);
        arr.p(AppRegistryFacet.adminBanApp.selector);
        arr.p(AppRegistryFacet.isAppBanned.selector);
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
        string memory schema,
        address resolver
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                AppRegistryFacet.__AppRegistry_init,
                (schema, ISchemaResolver(resolver))
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AppRegistryFacet.sol", "");
    }
}
