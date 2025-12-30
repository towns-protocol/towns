// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {TextResolverFacet} from "src/domains/facets/l2/TextResolverFacet.sol";

library DeployTextResolverFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](2);
        res[0] = TextResolverFacet.setText.selector;
        res[1] = TextResolverFacet.text.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(TextResolverFacet.__TextResolverFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("TextResolverFacet.sol", "");
    }
}

