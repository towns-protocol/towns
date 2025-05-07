// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IBanning} from "src/spaces/facets/banning/IBanning.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployBanning {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](4);
        res[0] = IBanning.ban.selector;
        res[1] = IBanning.unban.selector;
        res[2] = IBanning.isBanned.selector;
        res[3] = IBanning.banned.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("Banning.sol", "");
    }
}
