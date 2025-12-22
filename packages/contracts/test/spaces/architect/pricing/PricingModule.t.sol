// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPricingModulesBase} from "src/factory/facets/architect/pricing/IPricingModules.sol";

// libraries

// contracts

import {PricingModulesFacet} from "src/factory/facets/architect/pricing/PricingModulesFacet.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

// mocks

import {MockERC20} from "test/mocks/MockERC20.sol";
import {MockPricingModule} from "test/mocks/MockPricingModule.sol";

contract PricingModuleTest is BaseSetup, IPricingModulesBase, IOwnableBase {
    PricingModulesFacet internal pricingModules;
    MockPricingModule internal mockPricingModule;

    function setUp() public override {
        super.setUp();
        pricingModules = PricingModulesFacet(spaceFactory);
        mockPricingModule = new MockPricingModule();
    }

    modifier givenOwner() {
        vm.startPrank(deployer);
        _;
    }

    modifier givenNotOwner(address notOwner) {
        vm.assume(deployer != notOwner);
        vm.prank(notOwner);
        _;
    }

    function test_addPricingModule() public givenOwner {
        vm.expectEmit(spaceFactory);
        emit PricingModuleAdded(address(mockPricingModule));
        pricingModules.addPricingModule(address(mockPricingModule));
        assertTrue(pricingModules.isPricingModule(address(mockPricingModule)));
    }

    function test_revertWhen_addPricingModule_notOwner(
        address notOwner
    ) public givenNotOwner(notOwner) {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner));
        pricingModules.addPricingModule(address(mockPricingModule));
    }

    function test_revertWhen_addPricingModule_zeroAddress() public givenOwner {
        vm.expectRevert(abi.encodeWithSelector(InvalidPricingModule.selector, address(0)));
        pricingModules.addPricingModule(address(0));
    }

    function test_revertWhen_addPricingModule_invalidInterface() public givenOwner {
        address mockToken = address(new MockERC20("mock", "MOCK", 18));
        vm.expectRevert(abi.encodeWithSelector(InvalidPricingModule.selector, mockToken));
        pricingModules.addPricingModule(mockToken);
    }

    function test_revertWhen_addPricingModule_alreadyAdded() public givenOwner {
        pricingModules.addPricingModule(address(mockPricingModule));

        vm.expectRevert(
            abi.encodeWithSelector(InvalidPricingModule.selector, address(mockPricingModule))
        );
        pricingModules.addPricingModule(address(mockPricingModule));
    }

    // =============================================================
    //                           Remove
    // =============================================================

    modifier givenModuleIsAdded() {
        pricingModules.addPricingModule(address(mockPricingModule));
        _;
    }

    function test_removePricingModule() public givenOwner givenModuleIsAdded {
        vm.expectEmit(spaceFactory);
        emit PricingModuleRemoved(address(mockPricingModule));
        pricingModules.removePricingModule(address(mockPricingModule));
        assertFalse(pricingModules.isPricingModule(address(mockPricingModule)));
    }

    function test_revertWhen_removePricingModule_notOwner(
        address notOwner
    ) public givenNotOwner(notOwner) {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner));
        pricingModules.removePricingModule(address(mockPricingModule));
    }

    function test_revertWhen_removePricingModule_zeroAddress() public givenOwner {
        vm.expectRevert(abi.encodeWithSelector(InvalidPricingModule.selector, address(0)));
        pricingModules.removePricingModule(address(0));
    }

    function test_revertWhen_removePricingModule_notAdded() public givenOwner {
        vm.expectRevert(
            abi.encodeWithSelector(InvalidPricingModule.selector, address(mockPricingModule))
        );
        pricingModules.removePricingModule(address(mockPricingModule));
    }
}
