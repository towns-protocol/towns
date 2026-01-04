// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {NodeOperatorFacet} from "src/base/registry/facets/operator/NodeOperatorFacet.sol";

library DeployNodeOperator {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(9);
        arr.p(NodeOperatorFacet.registerOperator.selector);
        arr.p(NodeOperatorFacet.isOperator.selector);
        arr.p(NodeOperatorFacet.setOperatorStatus.selector);
        arr.p(NodeOperatorFacet.getOperatorStatus.selector);
        arr.p(NodeOperatorFacet.setCommissionRate.selector);
        arr.p(NodeOperatorFacet.getCommissionRate.selector);
        arr.p(NodeOperatorFacet.setClaimAddressForOperator.selector);
        arr.p(NodeOperatorFacet.getClaimAddressForOperator.selector);
        arr.p(NodeOperatorFacet.getOperators.selector);

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

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(NodeOperatorFacet.__NodeOperator_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("NodeOperatorFacet.sol", "");
    }
}
