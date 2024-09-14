// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {SpaceFactoryInit} from "contracts/src/factory/SpaceFactoryInit.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// helpers

contract DeploySpaceFactoryInit is Deployer, FacetHelper {
  constructor() {
    addSelector(SpaceFactoryInit.initialize.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return SpaceFactoryInit.initialize.selector;
  }

  function makeInitData(
    address _proxyInitializer
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), _proxyInitializer);
  }

  function versionName() public pure override returns (string memory) {
    return "spaceFactoryInit";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    SpaceFactoryInit spaceFactoryInit = new SpaceFactoryInit();
    vm.stopBroadcast();
    return address(spaceFactoryInit);
  }
}
