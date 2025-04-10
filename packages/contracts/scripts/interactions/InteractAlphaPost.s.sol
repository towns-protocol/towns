// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitect} from "src/factory/facets/architect/IArchitect.sol";

import {IPricingModules} from "src/factory/facets/architect/pricing/IPricingModules.sol";
import {ISpaceProxyInitializer} from "src/spaces/facets/proxy/ISpaceProxyInitializer.sol";

// deployment
import {DeploySpaceProxyInitializer} from "scripts/deployments/utils/DeploySpaceProxyInitializer.s.sol";
import {DeployTieredLogPricingV3} from "scripts/deployments/utils/DeployTieredLogPricingV3.s.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

contract InteractAlphaPost is Interaction {
    DeploySpaceProxyInitializer deploySpaceProxyInitializer = new DeploySpaceProxyInitializer();
    DeployTieredLogPricingV3 deployTieredLogPricingV3 = new DeployTieredLogPricingV3();

    function __interact(address deployer) internal override {
        address spaceFactory = getDeployment("spaceFactory");

        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
        address spaceProxyInitializer = deploySpaceProxyInitializer.deploy(deployer);
        address tieredLogPricing = deployTieredLogPricingV3.deploy(deployer);

        vm.startBroadcast(deployer);
        IArchitect(spaceFactory).setProxyInitializer(ISpaceProxyInitializer(spaceProxyInitializer));
        IPricingModules(spaceFactory).addPricingModule(tieredLogPricing);
        vm.stopBroadcast();
    }
}
