// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Deployer} from "../common/Deployer.s.sol";

import {Airdrop} from "contracts/src/utils/Airdrop.sol";

contract DeployAirdrop is Deployer {
  function versionName() public pure override returns (string memory) {
    return "airdrop";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new Airdrop());
  }
}
