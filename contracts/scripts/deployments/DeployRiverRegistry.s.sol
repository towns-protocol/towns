// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Deployer} from "../common/Deployer.s.sol";
import {RiverRegistry} from "contracts/src/river/registry/RiverRegistry.sol";

contract DeployRiverRegistry is Deployer {
  function versionName() public pure override returns (string memory) {
    return "riverRegistry";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new RiverRegistry());
  }
}
