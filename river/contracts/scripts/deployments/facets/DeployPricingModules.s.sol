// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {PricingModulesFacet} from "contracts/src/factory/facets/architect/pricing/PricingModulesFacet.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployPricingModules is FacetHelper, Deployer {
  constructor() {
    addSelector(PricingModulesFacet.addPricingModule.selector);
    addSelector(PricingModulesFacet.isPricingModule.selector);
    addSelector(PricingModulesFacet.removePricingModule.selector);
    addSelector(PricingModulesFacet.listPricingModules.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return PricingModulesFacet.__PricingModulesFacet_init.selector;
  }

  function makeInitData(
    address[] memory pricingModules
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), pricingModules);
  }

  function versionName() public pure override returns (string memory) {
    return "pricingModulesFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    PricingModulesFacet pricingModules = new PricingModulesFacet();
    vm.stopBroadcast();
    return address(pricingModules);
  }
}
