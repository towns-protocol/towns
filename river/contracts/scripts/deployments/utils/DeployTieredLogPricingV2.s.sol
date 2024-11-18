// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts

import {TieredLogPricingOracleV2} from "contracts/src/spaces/facets/membership/pricing/tiered/TieredLogPricingOracleV2.sol";
import {TieredLogPricing} from "contracts/scripts/deployments/utils/pricing/TieredLogPricing.s.sol";

contract DeployTieredLogPricingV2 is TieredLogPricing {
  function versionName() public pure override returns (string memory) {
    return "tieredLogPricingV2";
  }

  function __deploy(address deployer) public override returns (address) {
    address oracle = isAnvil()
      ? _setupLocalOracle(deployer)
      : _getOracleAddress();

    vm.broadcast(deployer);
    return address(new TieredLogPricingOracleV2(oracle));
  }
}
