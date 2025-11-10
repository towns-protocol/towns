// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {IdentityRegistryFacet} from "src/apps/facets/identity/IdentityRegistryFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployIdentityRegistry {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(7);
        arr.p(bytes4(keccak256("register()")));
        arr.p(bytes4(keccak256("register(string)")));
        arr.p(bytes4(keccak256("register(string, (key, value)[])")));
        arr.p(IdentityRegistryFacet.getMetadata.selector);
        arr.p(IdentityRegistryFacet.setMetadata.selector);
        arr.p(IdentityRegistryFacet.setAgentUri.selector);
        arr.p(IdentityRegistryFacet.tokenURI.selector);
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
        return abi.encodeCall(IdentityRegistryFacet.__IdentityRegistryFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("IdentityRegistryFacet.sol", "");
    }
}
