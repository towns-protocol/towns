// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {SpaceDelegationFacet} from "src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

library DeploySpaceDelegation {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(7);
        arr.p(SpaceDelegationFacet.addSpaceDelegation.selector);
        arr.p(SpaceDelegationFacet.removeSpaceDelegation.selector);
        arr.p(SpaceDelegationFacet.getSpaceDelegation.selector);
        arr.p(SpaceDelegationFacet.getSpaceDelegationsByOperator.selector);
        arr.p(SpaceDelegationFacet.getTotalDelegation.selector);
        arr.p(SpaceDelegationFacet.setSpaceFactory.selector);
        arr.p(SpaceDelegationFacet.getSpaceFactory.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("SpaceDelegationFacet", "");
    }
}
