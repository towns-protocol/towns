// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {ExtendedResolverFacet} from "src/domains/facets/l2/ExtendedResolverFacet.sol";

library DeployExtendedResolverFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](1);
        res[0] = ExtendedResolverFacet.resolve.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(ExtendedResolverFacet.__ExtendedResolverFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ExtendedResolverFacet.sol", "");
    }
}
