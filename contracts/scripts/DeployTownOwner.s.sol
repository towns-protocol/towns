// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import "./common/Deployer.s.sol";

import {TownOwner} from "contracts/src/tokens/TownOwner.sol";

contract DeployTownOwner is Deployer {
  function versionName() public pure override returns (string memory) {
    return "spaceToken";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new TownOwner("TownOwner", "TOWN", vm.addr(deployerPK), 0));
  }
}
