// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployERC721AQueryable {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](4);
        res[0] = IERC721AQueryable.explicitOwnershipOf.selector;
        res[1] = IERC721AQueryable.explicitOwnershipsOf.selector;
        res[2] = IERC721AQueryable.tokensOfOwnerIn.selector;
        res[3] = IERC721AQueryable.tokensOfOwner.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ERC721AQueryable.sol", "");
    }
}
