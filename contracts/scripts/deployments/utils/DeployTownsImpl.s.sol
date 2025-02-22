// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";

contract DeployTownsImpl is Deployer {
  function versionName() public pure override returns (string memory) {
    return "townsImpl";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    address impl = address(new Towns());
    vm.stopBroadcast();
    return impl;
  }
}
