// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {Deployer} from "../common/Deployer.s.sol";

import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";

contract DeployTokenImpl is Deployer {
  function versionName() public pure override returns (string memory) {
    return "tokenEntitlementImpl";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new TokenEntitlement());
  }
}

contract DeployUserImpl is Deployer {
  function versionName() public pure override returns (string memory) {
    return "userEntitlementImpl";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new UserEntitlement());
  }
}
