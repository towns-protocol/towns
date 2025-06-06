// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IEntitlementsManager} from "src/spaces/facets/entitlements/IEntitlementsManager.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployEntitlementsManager {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](7);
        res[0] = IEntitlementsManager.addImmutableEntitlements.selector;
        res[1] = IEntitlementsManager.addEntitlementModule.selector;
        res[2] = IEntitlementsManager.removeEntitlementModule.selector;
        res[3] = IEntitlementsManager.getEntitlements.selector;
        res[4] = IEntitlementsManager.getEntitlement.selector;
        res[5] = IEntitlementsManager.isEntitledToSpace.selector;
        res[6] = IEntitlementsManager.isEntitledToChannel.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("EntitlementsManager.sol", "");
    }
}
