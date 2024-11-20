// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {ILegacyArchitect, ILegacyArchitectBase} from "contracts/test/mocks/legacy/IMockLegacyArchitect.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IPricingModulesBase} from "contracts/src/factory/facets/architect/pricing/IPricingModules.sol";
import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";

//libraries

//contracts
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {PricingModulesFacet} from "contracts/src/factory/facets/architect/pricing/PricingModulesFacet.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract ForkCreateSpace is
  IArchitectBase,
  IPricingModulesBase,
  TestUtils,
  SpaceHelper
{
  function getDynamicPricingModule(
    address spaceFactory
  ) internal view returns (address) {
    PricingModulesFacet pricingModules = PricingModulesFacet(spaceFactory);
    PricingModule[] memory modules = pricingModules.listPricingModules();

    for (uint256 i = 0; i < modules.length; i++) {
      if (
        keccak256(abi.encodePacked(modules[i].name)) ==
        keccak256(abi.encodePacked("TieredLogPricingOracleV3"))
      ) {
        return modules[i].module;
      }
    }

    return address(0);
  }

  function test_createForkSpaceAlpha() external onlyForked {
    address founder = _randomAddress();
    address spaceFactory = 0xC09Ac0FFeecAaE5100158247512DC177AeacA3e3;

    ILegacyArchitect legacyCreateSpace = ILegacyArchitect(spaceFactory);
    ICreateSpace createSpace = ICreateSpace(spaceFactory);

    ILegacyArchitectBase.SpaceInfo
      memory legacySpaceInfo = _createLegacySpaceInfo("fork-space");
    CreateSpace memory createSpaceInfo = _createSpaceWithPrepayInfo(
      "fork-space"
    );

    address dynamicPricingModule = getDynamicPricingModule(spaceFactory);

    console.log("Dynamic Pricing Module: %s", dynamicPricingModule);

    assertNotEq(dynamicPricingModule, address(0));

    legacySpaceInfo.membership.settings.pricingModule = dynamicPricingModule;
    createSpaceInfo.membership.settings.pricingModule = dynamicPricingModule;

    vm.startPrank(founder);
    address legacySpace = legacyCreateSpace.createSpace(legacySpaceInfo);
    address modernSpace = createSpace.createSpaceWithPrepay(createSpaceInfo);
    vm.stopPrank();

    address legacyPricingModule = IMembership(legacySpace)
      .getMembershipPricingModule();
    assertEq(
      legacyPricingModule,
      legacySpaceInfo.membership.settings.pricingModule
    );

    address modernPricingModule = IMembership(modernSpace)
      .getMembershipPricingModule();
    assertEq(
      modernPricingModule,
      createSpaceInfo.membership.settings.pricingModule
    );
  }
}
