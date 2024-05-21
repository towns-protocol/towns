// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {RiverConfig} from "contracts/src/river/registry/facets/config/RiverConfig.sol";
import {RiverConfigHelper} from "contracts/test/river/registry/RiverConfigHelper.sol";

contract DeployRiverConfig is Deployer {
  RiverConfigHelper internal configHelper = new RiverConfigHelper();

  function versionName() public pure override returns (string memory) {
    return "riverConfigFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    RiverConfig riverConfig = new RiverConfig();
    vm.stopBroadcast();
    return address(riverConfig);
  }
}
