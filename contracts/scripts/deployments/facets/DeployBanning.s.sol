// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";

contract DeployBanning is Deployer, FacetHelper {
    // FacetHelper
    constructor() {
        addSelector(Banning.ban.selector);
        addSelector(Banning.unban.selector);
        addSelector(Banning.isBanned.selector);
        addSelector(Banning.banned.selector);
    }

    // Deploying
    function versionName() public pure override returns (string memory) {
        return "facets/banningFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        Banning banning = new Banning();
        vm.stopBroadcast();
        return address(banning);
    }
}
