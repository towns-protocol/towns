// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IERC721A} from "../../../src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts

library DeployERC721A {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(13);
        arr.p(IERC721A.totalSupply.selector);
        arr.p(IERC721A.balanceOf.selector);
        arr.p(IERC721A.ownerOf.selector);
        arr.p(IERC721A.transferFrom.selector);
        arr.p(IERC721A.approve.selector);
        arr.p(IERC721A.getApproved.selector);
        arr.p(IERC721A.setApprovalForAll.selector);
        arr.p(IERC721A.isApprovedForAll.selector);
        arr.p(bytes4(keccak256("safeTransferFrom(address,address,uint256)")));
        arr.p(bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)")));
        arr.p(IERC721A.name.selector);
        arr.p(IERC721A.symbol.selector);
        arr.p(IERC721A.tokenURI.selector);
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
        return LibDeploy.deployCode("ERC721A.sol", "");
    }
}
