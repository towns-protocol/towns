// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IAppRegistry} from "contracts/src/factory/facets/app/IAppRegistry.sol";
//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {AppRegistry} from "contracts/src/factory/facets/app/AppRegistry.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";

contract DeployAppRegistry is FacetHelper, Deployer {
  constructor() {
    addSelector(IAppRegistry.registerSchema.selector);
    addSelector(IAppRegistry.getSchema.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return AppRegistry.__AppRegistry_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "facets/appRegistryFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    AppRegistry appRegistry = new AppRegistry();
    vm.stopBroadcast();
    return address(appRegistry);
  }
}
