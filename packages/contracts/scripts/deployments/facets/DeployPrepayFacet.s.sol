// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IPrepay} from "src/spaces/facets/prepay/IPrepay.sol";

//libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

//contracts

library DeployPrepayFacet {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](3);
        res[0] = IPrepay.prepayMembership.selector;
        res[1] = IPrepay.prepaidMembershipSupply.selector;
        res[2] = IPrepay.calculateMembershipPrepayFee.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("PrepayFacet.sol", "");
    }
}
