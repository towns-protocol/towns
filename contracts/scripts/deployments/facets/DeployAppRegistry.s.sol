// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {AppRegistry} from "contracts/src/app/facets/AppRegistry.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployAppRegistry is FacetHelper, Deployer {
  constructor() {
    addSelector(AppRegistry.register.selector);
    addSelector(AppRegistry.isRegistered.selector);
    addSelector(AppRegistry.updateRegistration.selector);
    addSelector(AppRegistry.getRegistration.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "appRegistryFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return AppRegistry.__AppRegistry_init.selector;
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    AppRegistry appRegistry = new AppRegistry();
    vm.stopBroadcast();
    return address(appRegistry);
  }
}
