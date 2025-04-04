// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {DiamondCutFacet} from "@towns-protocol/diamond/src/facets/cut/DiamondCutFacet.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

contract DeployDiamondCut is FacetHelper, Deployer {
    constructor() {
        addSelector(DiamondCutFacet.diamondCut.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return DiamondCutFacet.__DiamondCut_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/diamondCutFacet";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.startBroadcast(deployer);
        DiamondCutFacet diamondCut = new DiamondCutFacet();
        vm.stopBroadcast();
        return address(diamondCut);
    }
}
