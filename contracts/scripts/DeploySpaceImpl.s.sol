// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {Deployer} from "./common/Deployer.s.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract DeploySpaceImpl is Deployer {
  function versionName() public pure override returns (string memory) {
    return "spaceImpl";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new Space());
  }
}
