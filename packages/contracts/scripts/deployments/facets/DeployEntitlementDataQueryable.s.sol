// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IEntitlementDataQueryable} from "src/spaces/facets/entitlements/extensions/IEntitlementDataQueryable.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeployEntitlementDataQueryable {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](3);
        res[0] = IEntitlementDataQueryable.getEntitlementDataByPermission.selector;
        res[1] = IEntitlementDataQueryable.getChannelEntitlementDataByPermission.selector;
        res[2] = IEntitlementDataQueryable.getCrossChainEntitlementData.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("EntitlementDataQueryable.sol", "");
    }
}
