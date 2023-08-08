// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {Deployer} from "./common/Deployer.s.sol";
import {Pioneer} from "contracts/src/tokens/Pioneer.sol";

contract DeployPioneer is Deployer {
  function versionName() public pure override returns (string memory) {
    return "pioneerToken";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new Pioneer("Pioneer", "PIONEER", ""));
  }
}
