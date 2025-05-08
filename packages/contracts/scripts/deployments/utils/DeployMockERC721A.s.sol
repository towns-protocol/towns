// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";
import {DeployERC721A} from "../facets/DeployERC721A.s.sol";

// contracts
import {MockERC721A} from "../../../test/mocks/MockERC721A.sol";

library DeployMockERC721A {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(16);
        arr.p(MockERC721A.mintTo.selector);
        arr.p(MockERC721A.mint.selector);
        arr.p(MockERC721A.burn.selector);
        {
            bytes4[] memory selectors_ = DeployERC721A.selectors();
            for (uint256 i; i < selectors_.length; ++i) {
                arr.p(selectors_[i]);
            }
        }
        bytes32[] memory selectors__ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors__
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MockERC721A.sol", "");
    }
}
