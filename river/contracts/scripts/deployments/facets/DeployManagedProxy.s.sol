// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {ManagedProxyFacet} from "contracts/src/diamond/proxy/managed/ManagedProxyFacet.sol";

contract DeployManagedProxy is FacetHelper, Deployer {
  constructor() {
    addSelector(ManagedProxyFacet.getManager.selector);
    addSelector(ManagedProxyFacet.setManager.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return ManagedProxyFacet.__ManagedProxy_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "managedProxyFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    ManagedProxyFacet facet = new ManagedProxyFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
