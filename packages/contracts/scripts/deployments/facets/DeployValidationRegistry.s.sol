// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {ValidationRegistryFacet} from "src/apps/facets/validation/ValidationRegistryFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployValidationRegistry {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        uint256 selectorsCount = 6;
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(selectorsCount);

        arr.p(ValidationRegistryFacet.validationRequest.selector);
        arr.p(ValidationRegistryFacet.validationResponse.selector);
        arr.p(ValidationRegistryFacet.getValidationStatus.selector);
        arr.p(ValidationRegistryFacet.getSummary.selector);
        arr.p(ValidationRegistryFacet.getAgentValidations.selector);
        arr.p(ValidationRegistryFacet.getValidatorRequests.selector);

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
        return abi.encodeCall(ValidationRegistryFacet.__ValidationRegistryFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ValidationRegistryFacet.sol", "");
    }
}
