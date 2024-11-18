// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {SpaceProxyInitializer} from "contracts/src/spaces/facets/proxy/SpaceProxyInitializer.sol";

contract DeploySpaceProxyInitializer is Deployer {
  function versionName() public pure override returns (string memory) {
    return "spaceProxyInitializer";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    SpaceProxyInitializer proxyInitializer = new SpaceProxyInitializer();
    vm.stopBroadcast();

    return address(proxyInitializer);
  }
}
