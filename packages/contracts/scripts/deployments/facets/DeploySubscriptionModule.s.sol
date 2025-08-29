// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {SubscriptionModule} from "../../../src/apps/modules/subcription/SubscriptionModule.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeploySubscriptionModule {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(15);
        arr.p(SubscriptionModule.moduleId.selector);
        arr.p(SubscriptionModule.onInstall.selector);
        arr.p(SubscriptionModule.onUninstall.selector);
        arr.p(SubscriptionModule.validateUserOp.selector);
        arr.p(SubscriptionModule.validateSignature.selector);
        arr.p(SubscriptionModule.validateRuntime.selector);
        arr.p(SubscriptionModule.preUserOpValidationHook.selector);
        arr.p(SubscriptionModule.preRuntimeValidationHook.selector);
        arr.p(SubscriptionModule.preSignatureValidationHook.selector);
        arr.p(SubscriptionModule.batchProcessRenewals.selector);
        arr.p(SubscriptionModule.processRenewal.selector);
        arr.p(SubscriptionModule.getSubscription.selector);
        arr.p(SubscriptionModule.pauseSubscription.selector);
        arr.p(SubscriptionModule.getEntityIds.selector);
        arr.p(SubscriptionModule.supportsInterface.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return
            IDiamond.FacetCut({
                action: action,
                facetAddress: facetAddress,
                functionSelectors: selectors()
            });
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("SubscriptionModule.sol", "");
    }
}
