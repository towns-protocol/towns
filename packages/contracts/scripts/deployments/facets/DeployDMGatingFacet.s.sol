// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DMGatingFacet} from "src/account/facets/dm/DMGatingFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployDMGatingFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(7);

        arr.p(DMGatingFacet.installCriteria.selector);
        arr.p(DMGatingFacet.uninstallCriteria.selector);
        arr.p(DMGatingFacet.setCombinationMode.selector);
        arr.p(DMGatingFacet.isEntitled.selector);
        arr.p(DMGatingFacet.getInstalledCriteria.selector);
        arr.p(DMGatingFacet.isCriteriaInstalled.selector);
        arr.p(DMGatingFacet.getCombinationMode.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(DMGatingFacet.__DMGatingFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("DMGatingFacet.sol", "");
    }
}
