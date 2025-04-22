// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IReview} from "src/spaces/facets/review/IReview.sol";

// libraries
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";

// contracts

library DeployReviewFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](3);
        res[0] = IReview.setReview.selector;
        res[1] = IReview.getReview.selector;
        res[2] = IReview.getAllReviews.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("ReviewFacet.sol", "");
    }
}
