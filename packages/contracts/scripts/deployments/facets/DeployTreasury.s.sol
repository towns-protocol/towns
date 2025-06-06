// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {ITreasury} from "src/spaces/facets/treasury/ITreasury.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployTreasury {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](4);
        res[0] = ITreasury.withdraw.selector;
        res[1] = ITreasury.onERC721Received.selector;
        res[2] = ITreasury.onERC1155Received.selector;
        res[3] = ITreasury.onERC1155BatchReceived.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("Treasury.sol", "");
    }
}
