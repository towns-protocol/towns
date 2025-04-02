// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {DiamondHelper as _DiamondHelper} from
    "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

interface IDiamondInitHelper is IDiamond {
    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external returns (FacetCut[] memory);
}

abstract contract DiamondHelper is IDiamondInitHelper, _DiamondHelper {
    function diamondInitHelper(
        address, // deployer
        string[] memory // facetNames
    ) external virtual returns (FacetCut[] memory) {
        return new FacetCut[](0);
    }
}
