// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// contracts
import {Deployer} from "scripts/common/Deployer.s.sol";
import {SpaceProxyInitializer} from "src/spaces/facets/proxy/SpaceProxyInitializer.sol";

contract DeploySpaceProxyInitializer is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/spaceProxyInitializer";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        SpaceProxyInitializer proxyInitializer = new SpaceProxyInitializer();
        vm.stopBroadcast();

        return address(proxyInitializer);
    }
}
