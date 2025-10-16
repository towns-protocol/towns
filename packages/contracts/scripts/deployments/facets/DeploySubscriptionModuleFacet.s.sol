// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {SubscriptionModuleFacet} from "../../../src/apps/modules/subscription/SubscriptionModuleFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeploySubscriptionModuleFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(20);
        arr.p(SubscriptionModuleFacet.moduleId.selector);
        arr.p(SubscriptionModuleFacet.onInstall.selector);
        arr.p(SubscriptionModuleFacet.onUninstall.selector);
        arr.p(SubscriptionModuleFacet.validateUserOp.selector);
        arr.p(SubscriptionModuleFacet.validateSignature.selector);
        arr.p(SubscriptionModuleFacet.validateRuntime.selector);
        arr.p(SubscriptionModuleFacet.preUserOpValidationHook.selector);
        arr.p(SubscriptionModuleFacet.preRuntimeValidationHook.selector);
        arr.p(SubscriptionModuleFacet.preSignatureValidationHook.selector);
        arr.p(SubscriptionModuleFacet.batchProcessRenewals.selector);
        arr.p(SubscriptionModuleFacet.getRenewalBuffer.selector);
        arr.p(SubscriptionModuleFacet.getSubscription.selector);
        arr.p(SubscriptionModuleFacet.activateSubscription.selector);
        arr.p(SubscriptionModuleFacet.pauseSubscription.selector);
        arr.p(SubscriptionModuleFacet.getEntityIds.selector);
        arr.p(SubscriptionModuleFacet.isOperator.selector);
        arr.p(SubscriptionModuleFacet.grantOperator.selector);
        arr.p(SubscriptionModuleFacet.revokeOperator.selector);
        arr.p(SubscriptionModuleFacet.setSpaceFactory.selector);
        arr.p(SubscriptionModuleFacet.getSpaceFactory.selector);
        arr.p(bytes4(keccak256("MAX_BATCH_SIZE()")));
        arr.p(bytes4(keccak256("GRACE_PERIOD()")));

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeInitData(address spaceFactory) internal pure returns (bytes memory) {
        return abi.encodeCall(SubscriptionModuleFacet.__SubscriptionModule_init, (spaceFactory));
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
        return LibDeploy.deployCode("SubscriptionModuleFacet.sol", "");
    }
}
