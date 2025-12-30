// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {EntitlementChecker} from "src/base/registry/facets/checker/EntitlementChecker.sol";

library DeployEntitlementChecker {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(10);
        arr.p(EntitlementChecker.registerNode.selector);
        arr.p(EntitlementChecker.unregisterNode.selector);
        arr.p(EntitlementChecker.isValidNode.selector);
        arr.p(EntitlementChecker.getNodeCount.selector);
        arr.p(EntitlementChecker.getNodeAtIndex.selector);
        arr.p(EntitlementChecker.getRandomNodes.selector);
        // requestEntitlementCheck V1 (legacy)
        arr.p(bytes4(keccak256("requestEntitlementCheck(address,bytes32,uint256,address[])")));
        // requestEntitlementCheck unified (enum dispatch)
        arr.p(bytes4(keccak256("requestEntitlementCheck(uint8,bytes)")));
        arr.p(EntitlementChecker.requestEntitlementCheckV2.selector);
        arr.p(EntitlementChecker.getNodesByOperator.selector);

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
        return abi.encodeCall(EntitlementChecker.__EntitlementChecker_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("EntitlementChecker.sol", "");
    }
}
