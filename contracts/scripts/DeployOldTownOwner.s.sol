// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import "./common/Deployer.s.sol";

import {TownOwnerV1} from "contracts/src/tokens/TownOwnerV1.sol";

contract DeployOldTownOwner is Deployer {
  function versionName() public pure override returns (string memory) {
    return "spaceToken";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return
      address(new TownOwnerV1("TownOwner", "TOWN", vm.addr(deployerPK), 0));
  }
}
