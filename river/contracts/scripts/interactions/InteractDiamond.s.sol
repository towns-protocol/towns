// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IPricingModulesBase} from "contracts/src/factory/facets/architect/pricing/IPricingModules.sol";

// libraries

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {PricingModulesFacet} from "contracts/src/factory/facets/architect/pricing/PricingModulesFacet.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract InteractDiamond is IPricingModulesBase, Interaction {
  function __interact(uint256, address) public override {
    address diamond = getDeployment("spaceFactory");
    PricingModule[] memory modules = PricingModulesFacet(diamond)
      .listPricingModules();

    for (uint256 i = 0; i < modules.length; i++) {
      console.log(modules[i].module);
    }
  }
}
