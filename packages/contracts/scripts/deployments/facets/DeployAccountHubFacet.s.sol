// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AccountHubFacet} from "src/account/facets/hub/AccountHubFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAccountHubFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(11);

        // ERC-6900 functions
        arr.p(AccountHubFacet.moduleId.selector);
        arr.p(AccountHubFacet.onInstall.selector);
        arr.p(AccountHubFacet.onUninstall.selector);
        arr.p(AccountHubFacet.preExecutionHook.selector);
        arr.p(AccountHubFacet.postExecutionHook.selector);
        arr.p(AccountHubFacet.executionManifest.selector);

        // External functions
        arr.p(AccountHubFacet.setSpaceFactory.selector);
        arr.p(AccountHubFacet.setAppRegistry.selector);
        arr.p(AccountHubFacet.getSpaceFactory.selector);
        arr.p(AccountHubFacet.getAppRegistry.selector);
        arr.p(AccountHubFacet.isInstalled.selector);
        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeInitData(
        address spaceFactory,
        address appRegistry
    ) internal pure returns (bytes memory) {
        return abi.encodeCall(AccountHubFacet.__AccountHubFacet_init, (spaceFactory, appRegistry));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AccountHubFacet.sol", "");
    }
}
