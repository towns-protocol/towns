// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

// libraries
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";

// contracts
import {EntitlementGated} from "src/spaces/facets/gated/EntitlementGated.sol";

library DeploySpaceEntitlementGated {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](3);
        res[0] = EntitlementGated.postEntitlementCheckResult.selector;
        res[1] = EntitlementGated.postEntitlementCheckResultV2.selector;
        res[2] = EntitlementGated.getRuleData.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("SpaceEntitlementGated.sol", "");
    }
}
