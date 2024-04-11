// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {PricingModulesFacet} from "contracts/src/factory/facets/architect/pricing/PricingModulesFacet.sol";

contract DeployPricingModules is Deployer {
  function versionName() public pure override returns (string memory) {
    return "pricingModulesFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    PricingModulesFacet pricingModules = new PricingModulesFacet();
    vm.stopBroadcast();
    return address(pricingModules);
  }
}
