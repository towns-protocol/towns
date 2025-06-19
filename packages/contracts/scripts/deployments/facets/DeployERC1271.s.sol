// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {ERC1271Facet} from "src/spaces/facets/account/ERC1271Facet.sol";
import {ERC1271} from "solady/accounts/ERC1271.sol";
import {EIP712} from "solady/utils/EIP712.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployERC1271 {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(3);
        arr.p(ERC1271.isValidSignature.selector);
        arr.p(EIP712.eip712Domain.selector);
        arr.p(ERC1271Facet.DOMAIN_SEPARATOR.selector);
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
        return LibDeploy.deployCode("ERC1271Facet.sol", "");
    }
}
