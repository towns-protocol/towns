// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {MockLegacyArchitect} from "test/mocks/legacy/MockLegacyArchitect.sol";

contract DeployMockLegacyArchitect is FacetHelper, Deployer {
    constructor() {
        addSelector(MockLegacyArchitect.createSpace.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return MockLegacyArchitect.__Architect_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/mockLegacyArchitectFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        MockLegacyArchitect architect = new MockLegacyArchitect();
        vm.stopBroadcast();
        return address(architect);
    }
}
