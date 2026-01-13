// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IERC721A} from "src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {ERC721A} from "src/diamond/facets/token/ERC721A/ERC721A.sol";

library DeployERC721ANonTransferable {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](13);
        res[0] = IERC721A.totalSupply.selector;
        res[1] = IERC721A.balanceOf.selector;
        res[2] = IERC721A.ownerOf.selector;
        res[3] = IERC721A.transferFrom.selector;
        res[4] = IERC721A.approve.selector;
        res[5] = IERC721A.getApproved.selector;
        res[6] = IERC721A.setApprovalForAll.selector;
        res[7] = IERC721A.isApprovedForAll.selector;
        res[8] = IERC721A.name.selector;
        res[9] = IERC721A.symbol.selector;
        res[10] = IERC721A.tokenURI.selector;
        res[11] = bytes4(keccak256("safeTransferFrom(address,address,uint256)"));
        res[12] = bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"));
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(
        string memory name,
        string memory symbol
    ) internal pure returns (bytes memory) {
        return abi.encodeCall(ERC721A.__ERC721A_init, (name, symbol));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("ERC721ANonTransferable.sol", "");
    }
}
