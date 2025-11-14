// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployFeeManager {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(8);
        arr.p(IFeeManager.calculateFee.selector);
        arr.p(IFeeManager.chargeFee.selector);
        arr.p(IFeeManager.setFeeConfig.selector);
        arr.p(IFeeManager.setFeeHook.selector);
        arr.p(IFeeManager.setProtocolFeeRecipient.selector);
        arr.p(IFeeManager.getFeeConfig.selector);
        arr.p(IFeeManager.getFeeHook.selector);
        arr.p(IFeeManager.getProtocolFeeRecipient.selector);

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
        return LibDeploy.deployCode("FeeManagerFacet.sol", "");
    }

    function makeInitData(address protocolFeeRecipient) internal pure returns (bytes memory) {
        return abi.encodeCall(IFeeManager.__FeeManagerFacet__init, protocolFeeRecipient);
    }
}
