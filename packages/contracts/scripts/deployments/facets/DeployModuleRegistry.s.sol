// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

//libraries

//contracts
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";
import {ModuleRegistry} from "src/attest/ModuleRegistry.sol";

library DeployModuleRegistry {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](10);
        _selectors[0] = ModuleRegistry.getModuleSchema.selector;
        _selectors[1] = ModuleRegistry.getModuleSchemaId.selector;
        _selectors[2] = ModuleRegistry.getModule.selector;
        _selectors[3] = ModuleRegistry.getModuleVersion.selector;
        _selectors[4] = ModuleRegistry.getModuleClients.selector;
        _selectors[5] = ModuleRegistry.registerModule.selector;
        _selectors[6] = ModuleRegistry.updateModulePermissions.selector;
        _selectors[7] = ModuleRegistry.revokeModule.selector;
        _selectors[8] = ModuleRegistry.adminRegisterModuleSchema.selector;
        _selectors[9] = ModuleRegistry.adminBanModule.selector;
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
        return abi.encodeCall(ModuleRegistry.__ModuleRegistry_init, ());
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("ModuleRegistry.sol", "");
    }
}
