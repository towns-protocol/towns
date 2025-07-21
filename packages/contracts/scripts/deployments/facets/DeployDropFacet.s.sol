// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {DropFacet} from "src/airdrop/drop/DropFacet.sol";

library DeployDropFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(9);
        arr.p(DropFacet.claimWithPenalty.selector);
        arr.p(DropFacet.claimAndStake.selector);
        arr.p(DropFacet.setClaimConditions.selector);
        arr.p(DropFacet.addClaimCondition.selector);
        arr.p(DropFacet.getActiveClaimConditionId.selector);
        arr.p(DropFacet.getClaimConditionById.selector);
        arr.p(DropFacet.getSupplyClaimedByWallet.selector);
        arr.p(DropFacet.getDepositIdByWallet.selector);
        arr.p(DropFacet.getClaimConditions.selector);

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

    function makeInitData(address stakingContract) internal pure returns (bytes memory) {
        return abi.encodeCall(DropFacet.__DropFacet_init, (stakingContract));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("DropFacet.sol", "");
    }
}
