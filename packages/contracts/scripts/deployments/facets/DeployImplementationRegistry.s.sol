// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {ImplementationRegistryFacet} from "src/factory/facets/registry/ImplementationRegistry.sol";

library DeployImplementationRegistry {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](4);
        _selectors[0] = ImplementationRegistryFacet.addImplementation.selector;
        _selectors[1] = ImplementationRegistryFacet.approveImplementation.selector;
        _selectors[2] = ImplementationRegistryFacet.getImplementation.selector;
        _selectors[3] = ImplementationRegistryFacet.getLatestImplementation.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(ImplementationRegistryFacet.__ImplementationRegistry_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ImplementationRegistryFacet", "");
    }
}
