// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";

import {TokenPausableFacet} from
    "@towns-protocol/diamond/src/facets/pausable/token/TokenPausableFacet.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

contract DeployTokenPausable is FacetHelper, Deployer {
    constructor() {
        addSelector(TokenPausableFacet.paused.selector);
        addSelector(TokenPausableFacet.pause.selector);
        addSelector(TokenPausableFacet.unpause.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/tokenPausableFacet";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.startBroadcast(deployer);
        TokenPausableFacet facet = new TokenPausableFacet();
        vm.stopBroadcast();
        return address(facet);
    }

    function initializer() public pure override returns (bytes4) {
        return TokenPausableFacet.__Pausable_init.selector;
    }
}
