// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {SpaceFactoryInit} from "src/factory/SpaceFactoryInit.sol";

// helpers

contract DeploySpaceFactoryInit is Deployer, FacetHelper {
    constructor() {
        addSelector(SpaceFactoryInit.initialize.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return SpaceFactoryInit.initialize.selector;
    }

    function makeInitData(address _proxyInitializer) public pure returns (bytes memory) {
        return abi.encodeWithSelector(initializer(), _proxyInitializer);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/spaceFactoryInit";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        SpaceFactoryInit spaceFactoryInit = new SpaceFactoryInit();
        vm.stopBroadcast();
        return address(spaceFactoryInit);
    }
}
