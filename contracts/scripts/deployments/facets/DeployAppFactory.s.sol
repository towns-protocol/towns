// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {AppFactory} from "contracts/src/app/facets/AppFactory.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployAppFactory is FacetHelper, Deployer {
  constructor() {
    addSelector(AppFactory.createApp.selector);
    addSelector(AppFactory.updateApp.selector);
    addSelector(AppFactory.setAppStatus.selector);
    addSelector(AppFactory.getApp.selector);
    addSelector(AppFactory.getAppByAddress.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "appFactoryFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return AppFactory.__AppFactory_init.selector;
  }

  function makeInitData(
    uint256 maxPermissions
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), maxPermissions);
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    AppFactory appFactory = new AppFactory();
    vm.stopBroadcast();
    return address(appFactory);
  }
}
