// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

//libraries

//contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {ModuleRegistry} from "src/modules/ModuleRegistry.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployModuleRegistry {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(9);
        arr.p(ModuleRegistry.getModuleSchema.selector);
        arr.p(ModuleRegistry.getModuleSchemaId.selector);
        arr.p(ModuleRegistry.getModuleById.selector);
        arr.p(ModuleRegistry.getLatestModuleId.selector);
        arr.p(ModuleRegistry.registerModule.selector);
        arr.p(ModuleRegistry.removeModule.selector);
        arr.p(ModuleRegistry.adminRegisterModuleSchema.selector);
        arr.p(ModuleRegistry.adminBanModule.selector);
        arr.p(ModuleRegistry.isModuleBanned.selector);
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
                ModuleRegistry.__ModuleRegistry_init,
                (schema, ISchemaResolver(resolver))
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ModuleRegistry.sol", "");
    }
}
