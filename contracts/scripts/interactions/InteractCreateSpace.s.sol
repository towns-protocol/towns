// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";

// debugging
import {console} from "forge-std/console.sol";

contract InteractCreateSpace is Interaction, SpaceHelper {
  function __interact(address deployer) internal override {
    // Get SpaceFactory deployment address
    address spaceFactory = getDeployment("spaceFactory");
    address tieredLogPricing = getDeployment("tieredLogPricingV3");

    ICreateSpace createSpace = ICreateSpace(spaceFactory);

    IArchitectBase.SpaceInfo memory info = _createEveryoneSpaceInfo("test");
    info.membership.settings.pricingModule = tieredLogPricing;

    vm.startBroadcast(deployer);
    address space = createSpace.createSpace(info);
    vm.stopBroadcast();

    console.log("Space created at address:", space);
  }
}
