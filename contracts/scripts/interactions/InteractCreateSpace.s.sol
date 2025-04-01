// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";
import {
  IPricingModules,
  IPricingModulesBase
} from "contracts/src/factory/facets/architect/pricing/IPricingModules.sol";

// common
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";

// libraries
import {LibString} from "solady/utils/LibString.sol";

// debugging
import {console} from "forge-std/console.sol";

contract InteractCreateSpace is Interaction, SpaceHelper, IPricingModulesBase {
  string public constant TIERED_LOG_PRICING_MODULE = "TieredLogPricingOracleV3";

  function __interact(
    address deployer
  ) internal override {
    // Get SpaceFactory deployment address
    address spaceFactory = getDeployment("spaceFactory");

    ICreateSpace createSpace = ICreateSpace(spaceFactory);
    IPricingModules pricingModules = IPricingModules(spaceFactory);

    PricingModule[] memory modules = pricingModules.listPricingModules();

    address tieredLogPricing;
    for (uint256 i = 0; i < modules.length; i++) {
      if (LibString.eq(modules[i].name, TIERED_LOG_PRICING_MODULE)) {
        tieredLogPricing = modules[i].module;
      }
    }

    require(tieredLogPricing != address(0), "TieredLogPricingOracleV3 not found");

    IArchitectBase.SpaceInfo memory info = _createEveryoneSpaceInfo("test");
    info.membership.settings.pricingModule = tieredLogPricing;

    vm.startBroadcast(deployer);
    address space = createSpace.createSpace(info);
    vm.stopBroadcast();

    console.log("Space created at address:", space);
  }
}
