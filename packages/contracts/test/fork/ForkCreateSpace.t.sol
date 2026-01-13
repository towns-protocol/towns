// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// interfaces
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";

import {IPricingModulesBase} from "src/factory/facets/architect/pricing/IPricingModules.sol";
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {ILegacyArchitect, ILegacyArchitectBase} from "test/mocks/legacy/IMockLegacyArchitect.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
// contracts

import {Architect} from "src/factory/facets/architect/Architect.sol";
import {PricingModulesFacet} from "src/factory/facets/architect/pricing/PricingModulesFacet.sol";
import {SpaceHelper} from "test/spaces/SpaceHelper.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract ForkCreateSpace is IArchitectBase, IPricingModulesBase, TestUtils, SpaceHelper {
    function getDynamicPricingModule(address spaceFactory) internal view returns (address) {
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

    function test_joinForkSpaceAlpha() external onlyForked {
        address space = 0x0ca3c941cF5d9229EDd9Be592C06AE59c6A8ACF0;
        address user = 0x696f2C1C73c8a6f39Dec5FD375C37b20a74D4C20;
        address spaceFactory = 0xC09Ac0FFeecAaE5100158247512DC177AeacA3e3;

        uint256 price = IMembership(space).getMembershipPrice();
        uint256 fee = IPlatformRequirements(spaceFactory).getMembershipFee();

        uint256 value = FixedPointMathLib.max(price, fee);

        vm.startPrank(user);
        IMembership(space).joinSpace{value: value}(user);
        vm.stopPrank();
    }

    function test_createForkSpaceAlpha() external onlyForked {
        address founder = _randomAddress();
        address spaceFactory = 0xC09Ac0FFeecAaE5100158247512DC177AeacA3e3;

        ILegacyArchitect legacyCreateSpace = ILegacyArchitect(spaceFactory);
        ICreateSpace createSpace = ICreateSpace(spaceFactory);

        ILegacyArchitectBase.SpaceInfo memory legacySpaceInfo = _createLegacySpaceInfo(
            "fork-space"
        );
        CreateSpace memory createSpaceInfo = _createSpaceWithPrepayInfo("fork-space");

        address dynamicPricingModule = getDynamicPricingModule(spaceFactory);

        console.log("Dynamic Pricing Module: %s", dynamicPricingModule);

        assertNotEq(dynamicPricingModule, address(0));

        legacySpaceInfo.membership.settings.pricingModule = dynamicPricingModule;
        createSpaceInfo.membership.settings.pricingModule = dynamicPricingModule;

        vm.startPrank(founder);
        address legacySpace = legacyCreateSpace.createSpace(legacySpaceInfo);
        address modernSpace = createSpace.createSpaceWithPrepay(createSpaceInfo);
        vm.stopPrank();

        address legacyPricingModule = IMembership(legacySpace).getMembershipPricingModule();
        assertEq(legacyPricingModule, legacySpaceInfo.membership.settings.pricingModule);

        address modernPricingModule = IMembership(modernSpace).getMembershipPricingModule();
        assertEq(modernPricingModule, createSpaceInfo.membership.settings.pricingModule);
    }
}
