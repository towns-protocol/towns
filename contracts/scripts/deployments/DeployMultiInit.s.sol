// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployMultiInit is Deployer {
  function versionName() public pure override returns (string memory) {
    return "multiInit";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new MultiInit());
  }
}
