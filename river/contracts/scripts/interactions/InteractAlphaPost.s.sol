// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {ISpaceProxyInitializer} from "contracts/src/spaces/facets/proxy/ISpaceProxyInitializer.sol";
import {IPricingModules} from "contracts/src/factory/facets/architect/pricing/IPricingModules.sol";

// deployment
import {DeploySpaceProxyInitializer} from "contracts/scripts/deployments/utils/DeploySpaceProxyInitializer.s.sol";
import {DeployTieredLogPricingV3} from "contracts/scripts/deployments/utils/DeployTieredLogPricingV3.s.sol";

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

contract InteractAlphaPost is Interaction {
  DeploySpaceProxyInitializer deploySpaceProxyInitializer =
    new DeploySpaceProxyInitializer();
  DeployTieredLogPricingV3 deployTieredLogPricingV3 =
    new DeployTieredLogPricingV3();
  function __interact(address deployer) internal override {
    address spaceFactory = getDeployment("spaceFactory");

    vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
    address spaceProxyInitializer = deploySpaceProxyInitializer.deploy(
      deployer
    );
    address tieredLogPricing = deployTieredLogPricingV3.deploy(deployer);

    vm.startBroadcast(deployer);
    IArchitect(spaceFactory).setProxyInitializer(
      ISpaceProxyInitializer(spaceProxyInitializer)
    );
    IPricingModules(spaceFactory).addPricingModule(tieredLogPricing);
    vm.stopBroadcast();
  }
}
