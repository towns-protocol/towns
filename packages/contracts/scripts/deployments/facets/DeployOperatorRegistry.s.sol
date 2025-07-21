// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {OperatorRegistry} from "src/river/registry/facets/operator/OperatorRegistry.sol";

library DeployOperatorRegistry {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](4);
        res[0] = OperatorRegistry.approveOperator.selector;
        res[1] = OperatorRegistry.isOperator.selector;
        res[2] = OperatorRegistry.removeOperator.selector;
        res[3] = OperatorRegistry.getAllOperators.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address[] memory operators) internal pure returns (bytes memory) {
        return abi.encodeCall(OperatorRegistry.__OperatorRegistry_init, (operators));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("OperatorRegistry.sol", "");
    }
}
