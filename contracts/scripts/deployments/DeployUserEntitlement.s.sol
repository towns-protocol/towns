// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

import {Deployer} from "../common/Deployer.s.sol";

import {UserEntitlement} from "contracts/src/spaces/entitlements/user/UserEntitlement.sol";

contract DeployUserEntitlement is Deployer {
  function versionName() public pure override returns (string memory) {
    return "userEntitlement";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new UserEntitlement());
  }
}
