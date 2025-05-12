// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {TownsPoints} from "src/airdrop/points/TownsPoints.sol";

library DeployTownsPoints {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(11);
        arr.p(TownsPoints.mint.selector);
        arr.p(TownsPoints.batchMintPoints.selector);
        arr.p(TownsPoints.getPoints.selector);
        arr.p(TownsPoints.balanceOf.selector);
        arr.p(TownsPoints.totalSupply.selector);
        arr.p(TownsPoints.name.selector);
        arr.p(TownsPoints.symbol.selector);
        arr.p(TownsPoints.decimals.selector);

        // CheckIn
        arr.p(TownsPoints.checkIn.selector);
        arr.p(TownsPoints.getCurrentStreak.selector);
        arr.p(TownsPoints.getLastCheckIn.selector);

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

    function makeInitData(address spaceFactory) internal pure returns (bytes memory) {
        return abi.encodeCall(TownsPoints.__TownsPoints_init, (spaceFactory));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("TownsPoints.sol", "");
    }
}
