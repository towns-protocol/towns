// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {SignerFacet} from "src/spaces/facets/account/SignerFacet.sol";
import {ERC1271Facet} from "@towns-protocol/diamond/src/facets/accounts/ERC1271Facet.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeploySignerFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(5);
        arr.p(ERC1271Facet.isValidSignature.selector);
        arr.p(ERC1271Facet.erc1271Signer.selector);
        arr.p(EIP712Facet.DOMAIN_SEPARATOR.selector);
        arr.p(EIP712Facet.nonces.selector);
        arr.p(EIP712Facet.eip712Domain.selector);
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
        return LibDeploy.deployCode("SignerFacet.sol", "");
    }
}
