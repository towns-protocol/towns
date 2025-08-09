// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IMembershipTiers} from "src/spaces/facets/membership/tiers/IMembershipTiers.sol";

//libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

//contracts

library DeployMembershipTiers {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](6);
        res[0] = IMembershipTiers.createTier.selector;
        res[1] = IMembershipTiers.updateTier.selector;
        res[2] = IMembershipTiers.disableTier.selector;
        res[3] = IMembershipTiers.getTier.selector;
        res[4] = IMembershipTiers.tierOf.selector;
        res[5] = IMembershipTiers.tierPrice.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MembershipTiersFacet.sol", "");
    }
}
