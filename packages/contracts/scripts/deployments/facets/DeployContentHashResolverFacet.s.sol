// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {ContentHashResolverFacet} from "src/domains/facets/l2/ContentHashResolverFacet.sol";

library DeployContentHashResolverFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](2);
        res[0] = ContentHashResolverFacet.setContenthash.selector;
        res[1] = ContentHashResolverFacet.contenthash.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(ContentHashResolverFacet.__ContentHashResolverFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ContentHashResolverFacet.sol", "");
    }
}

