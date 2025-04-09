// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {ModuleRegistry} from "src/attest/ModuleRegistry.sol";

contract DeployModuleRegistry is FacetHelper, Deployer {
    constructor() {
        addSelector(ModuleRegistry.registerModuleSchema.selector);
        addSelector(ModuleRegistry.getModuleSchema.selector);
        addSelector(ModuleRegistry.getModuleSchemaId.selector);
        addSelector(ModuleRegistry.getModuleVersion.selector);
        addSelector(ModuleRegistry.registerModule.selector);
        addSelector(ModuleRegistry.updateModulePermissions.selector);
        addSelector(ModuleRegistry.revokeModule.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return ModuleRegistry.__ModuleRegistry_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/moduleRegistryFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        ModuleRegistry moduleRegistry = new ModuleRegistry();
        vm.stopBroadcast();
        return address(moduleRegistry);
    }
}
