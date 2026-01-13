// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {SchemaRegistry} from "src/apps/facets/schema/SchemaRegistry.sol";

library DeploySchemaRegistry {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](2);
        _selectors[0] = SchemaRegistry.register.selector;
        _selectors[1] = SchemaRegistry.getSchema.selector;
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
        return LibDeploy.deployCode("SchemaRegistry.sol", "");
    }
}
