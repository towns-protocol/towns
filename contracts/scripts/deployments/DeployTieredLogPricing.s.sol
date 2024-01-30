// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {TieredLogPricingOracle} from "contracts/src/towns/facets/membership/pricing/TieredLogPricingOracle.sol";

contract DeployTieredLogPricing is Deployer {
  address BASE_GOERLI_ORACLE = 0xcD2A119bD1F7DF95d706DE6F2057fDD45A0503E2;

  function versionName() public pure override returns (string memory) {
    return "tieredLogPricing";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new TieredLogPricingOracle(BASE_GOERLI_ORACLE));
  }
}
