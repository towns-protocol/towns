// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

//libraries

//contracts
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";
import {ModuleRegistry} from "src/attest/ModuleRegistry.sol";

library DeployModuleRegistry {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](10);
        _selectors[0] = ModuleRegistry.getModuleSchema.selector;
        _selectors[1] = ModuleRegistry.getModuleSchemaId.selector;
        _selectors[2] = ModuleRegistry.getModuleById.selector;
        _selectors[3] = ModuleRegistry.getLatestModuleId.selector;
        _selectors[4] = ModuleRegistry.registerModule.selector;
        _selectors[5] = ModuleRegistry.updateModulePermissions.selector;
        _selectors[6] = ModuleRegistry.removeModule.selector;
        _selectors[7] = ModuleRegistry.adminRegisterModuleSchema.selector;
        _selectors[8] = ModuleRegistry.adminBanModule.selector;
        _selectors[9] = ModuleRegistry.isModuleBanned.selector;
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
        address resolver,
        bool revocable
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                ModuleRegistry.__ModuleRegistry_init,
                (schema, ISchemaResolver(resolver), revocable)
            );
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("ModuleRegistry.sol", "");
    }
}
