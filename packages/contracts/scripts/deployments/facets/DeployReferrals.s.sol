// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IReferrals} from "src/spaces/facets/referrals/IReferrals.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployReferrals {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](8);
        res[0] = IReferrals.registerReferral.selector;
        res[1] = IReferrals.referralInfo.selector;
        res[2] = IReferrals.updateReferral.selector;
        res[3] = IReferrals.removeReferral.selector;
        res[4] = IReferrals.setMaxBpsFee.selector;
        res[5] = IReferrals.maxBpsFee.selector;
        res[6] = IReferrals.setDefaultBpsFee.selector;
        res[7] = IReferrals.defaultBpsFee.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ReferralsFacet.sol", "");
    }
}
