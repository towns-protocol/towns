// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";

contract DeployProxyManager is Deployer, FacetHelper {
  constructor() {
    addSelector(ProxyManager.getImplementation.selector);
    addSelector(ProxyManager.setImplementation.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return ProxyManager.__ProxyManager_init.selector;
  }

  function makeInitData(
    address implementation
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        ProxyManager.__ProxyManager_init.selector,
        implementation
      );
  }

  function versionName() public pure override returns (string memory) {
    return "proxyManagerFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    ProxyManager facet = new ProxyManager();
    vm.stopBroadcast();
    return address(facet);
  }
}
