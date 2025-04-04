// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {ImplementationRegistryFacet} from
    "contracts/src/factory/facets/registry/ImplementationRegistry.sol";

contract DeployImplementationRegistry is FacetHelper, Deployer {
    constructor() {
        addSelector(ImplementationRegistryFacet.addImplementation.selector);
        addSelector(ImplementationRegistryFacet.approveImplementation.selector);
        addSelector(ImplementationRegistryFacet.getImplementation.selector);
        addSelector(ImplementationRegistryFacet.getLatestImplementation.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return ImplementationRegistryFacet.__ImplementationRegistry_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/implementationRegistryFacet";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.startBroadcast(deployer);
        ImplementationRegistryFacet facet = new ImplementationRegistryFacet();
        vm.stopBroadcast();
        return address(facet);
    }
}
