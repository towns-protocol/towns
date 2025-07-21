// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IExecutor} from "src/spaces/facets/executor/IExecutor.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployExecutorFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(18);

        // Access Management
        arr.p(IExecutor.grantAccess.selector);
        arr.p(IExecutor.revokeAccess.selector);
        arr.p(IExecutor.renounceAccess.selector);
        arr.p(IExecutor.setGuardian.selector);
        arr.p(IExecutor.setGroupDelay.selector);
        arr.p(IExecutor.setGroupExpiration.selector);
        arr.p(IExecutor.grantAccessWithExpiration.selector);

        // Target Management
        arr.p(IExecutor.setTargetFunctionGroup.selector);
        arr.p(IExecutor.setTargetDisabled.selector);

        // Operation Management
        arr.p(IExecutor.scheduleOperation.selector);
        arr.p(IExecutor.execute.selector);
        arr.p(IExecutor.cancel.selector);

        // Getters
        arr.p(IExecutor.hasAccess.selector);
        arr.p(IExecutor.getAccess.selector);
        arr.p(IExecutor.getGroupDelay.selector);
        arr.p(IExecutor.getScheduleTimepoint.selector);
        arr.p(IExecutor.onExecution.selector);
        arr.p(IExecutor.hashOperation.selector);

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
        return LibDeploy.deployCode("ExecutorFacet.sol", "");
    }
}
