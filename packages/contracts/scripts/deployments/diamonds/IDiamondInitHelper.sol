// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IDiamond, Diamond} from "@towns-protocol/diamond/src/Diamond.sol";

interface IDiamondInitHelper is IDiamond {
    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external returns (FacetCut[] memory);

    function diamondInitParams(address deployer) external returns (Diamond.InitParams memory);
}
