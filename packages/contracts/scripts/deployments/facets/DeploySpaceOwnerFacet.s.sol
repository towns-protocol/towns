// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";
import {DeployERC721A} from "./DeployERC721A.s.sol";

// contracts
import {SpaceOwner} from "src/spaces/facets/owner/SpaceOwner.sol";

library DeploySpaceOwnerFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(33);
        arr.p(SpaceOwner.setFactory.selector);
        arr.p(SpaceOwner.getFactory.selector);
        arr.p(SpaceOwner.setDefaultUri.selector);
        arr.p(SpaceOwner.getDefaultUri.selector);
        arr.p(SpaceOwner.nextTokenId.selector);
        arr.p(SpaceOwner.mintSpace.selector);
        arr.p(SpaceOwner.getSpaceInfo.selector);
        arr.p(SpaceOwner.getSpaceByTokenId.selector);
        arr.p(SpaceOwner.updateSpaceInfo.selector);

        // Votes
        arr.p(IERC6372.clock.selector);
        arr.p(IERC6372.CLOCK_MODE.selector);
        arr.p(IVotes.getVotes.selector);
        arr.p(IVotes.getPastVotes.selector);
        arr.p(IVotes.getPastTotalSupply.selector);
        arr.p(IVotes.delegates.selector);
        arr.p(IVotes.delegate.selector);
        arr.p(IVotes.delegateBySig.selector);

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

    function makeInitData(
        string memory name,
        string memory symbol
    ) internal pure returns (bytes memory) {
        return abi.encodeCall(SpaceOwner.__SpaceOwner_init, (name, symbol));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("SpaceOwner.sol", "");
    }
}
