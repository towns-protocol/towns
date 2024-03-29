// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {StreamRegistry} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";

contract DeployStreamRegistry is Deployer {
  function versionName() public pure override returns (string memory) {
    return "streamRegistryFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    StreamRegistry streamRegistryFacet = new StreamRegistry();
    vm.stopBroadcast();
    return address(streamRegistryFacet);
  }
}
