// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {StreamRegistry} from "contracts/src/river/registry/StreamRegistry.sol";

contract DeployStreamRegistry is Deployer {
  function versionName() public pure override returns (string memory) {
    return "streamRegistry";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new StreamRegistry());
  }
}
