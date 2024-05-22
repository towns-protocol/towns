// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "../common/Deployer.s.sol";

import {UserEntitlement} from "contracts/src/spaces/entitlements/user/UserEntitlement.sol";

contract DeployUserEntitlement is Deployer {
  function versionName() public pure override returns (string memory) {
    return "userEntitlement";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new UserEntitlement());
  }
}
