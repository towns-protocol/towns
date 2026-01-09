// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {L2RegistrarFacet} from "src/domains/facets/registrar/L2RegistrarFacet.sol";

library DeployL2RegistrarFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(10);

        arr.p(L2RegistrarFacet.register.selector);
        arr.p(L2RegistrarFacet.available.selector);
        arr.p(L2RegistrarFacet.isValidLabel.selector);
        arr.p(L2RegistrarFacet.getRegistry.selector);
        arr.p(L2RegistrarFacet.getCoinType.selector);
        arr.p(L2RegistrarFacet.getSpaceFactory.selector);
        arr.p(L2RegistrarFacet.setSpaceFactory.selector);
        arr.p(L2RegistrarFacet.setRegistry.selector);
        arr.p(L2RegistrarFacet.setCurrency.selector);
        arr.p(L2RegistrarFacet.getCurrency.selector);

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

    function makeInitData(
        address registry,
        address spaceFactory,
        address currency
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(L2RegistrarFacet.__L2Registrar_init, (registry, spaceFactory, currency));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("L2RegistrarFacet.sol", "");
    }
}
