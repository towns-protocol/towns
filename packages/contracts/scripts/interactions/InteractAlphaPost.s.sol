// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPricingModules} from "src/factory/facets/architect/pricing/IPricingModules.sol";

// deployment
import {DeployTieredLogPricingV3} from "scripts/deployments/utils/DeployTieredLogPricingV3.s.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

contract InteractAlphaPost is Interaction {
    DeployTieredLogPricingV3 deployTieredLogPricingV3 = new DeployTieredLogPricingV3();

    function __interact(address deployer) internal override {
        address spaceFactory = getDeployment("spaceFactory");

        address tieredLogPricing = deployTieredLogPricingV3.deploy(deployer);

        vm.startBroadcast(deployer);
        IPricingModules(spaceFactory).addPricingModule(tieredLogPricing);
        vm.stopBroadcast();
    }
}
