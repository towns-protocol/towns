// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {Deployer} from "./common/Deployer.s.sol";

import {UserEntitlement} from "contracts/src/towns/entitlements/user/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/towns/entitlements/token/TokenEntitlement.sol";

contract DeployTokenEntitlement is Deployer {
  function versionName() public pure override returns (string memory) {
    return "TokenEntitlement";
  }

  function __deploy(uint256 deployerPK) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new TokenEntitlement());
  }
}

contract DeployUserEntitlement is Deployer {
  function versionName() public pure override returns (string memory) {
    return "UserEntitlement";
  }

  function __deploy(uint256 deployerPK) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new UserEntitlement());
  }
}
