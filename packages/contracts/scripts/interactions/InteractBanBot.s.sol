// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";

contract InteractBanBot is Interaction {
    function __interact(address deployer) internal override {
        address appRegistry = getDeployment("appRegistry");
        address appToBan = 0x0Db3e2C47e83556eFEf857047E6379AF07c52544;

        vm.broadcast(deployer);
        AppRegistryFacet(appRegistry).adminBanApp(appToBan);
    }
}
