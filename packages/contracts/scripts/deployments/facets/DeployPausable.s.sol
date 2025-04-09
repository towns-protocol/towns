// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {PausableFacet} from "@towns-protocol/diamond/src/facets/pausable/PausableFacet.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeployPausable is FacetHelper, Deployer {
    constructor() {
        addSelector(PausableFacet.paused.selector);
        addSelector(PausableFacet.pause.selector);
        addSelector(PausableFacet.unpause.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/pausableFacet";
    }

    function initializer() public pure override returns (bytes4) {
        return PausableFacet.__Pausable_init.selector;
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        PausableFacet facet = new PausableFacet();
        vm.stopBroadcast();
        return address(facet);
    }
}
