// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AccountModuleFacet} from "src/account/facets/AccountModuleFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAccountModuleFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(11);

        // ERC-6900 functions
        arr.p(AccountModuleFacet.moduleId.selector);
        arr.p(AccountModuleFacet.onInstall.selector);
        arr.p(AccountModuleFacet.onUninstall.selector);
        arr.p(AccountModuleFacet.validateUserOp.selector);
        arr.p(AccountModuleFacet.validateSignature.selector);
        arr.p(AccountModuleFacet.validateRuntime.selector);

        // External functions
        arr.p(AccountModuleFacet.setSpaceFactory.selector);
        arr.p(AccountModuleFacet.setAppRegistry.selector);
        arr.p(AccountModuleFacet.getSpaceFactory.selector);
        arr.p(AccountModuleFacet.getAppRegistry.selector);
        arr.p(AccountModuleFacet.isInstalled.selector);
        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeInitData(
        address spaceFactory,
        address appRegistry
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                AccountModuleFacet.__AccountModuleFacet_init,
                (spaceFactory, appRegistry)
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AccountModuleFacet.sol", "");
    }
}
