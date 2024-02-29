// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {EntitlementChecker} from "contracts/src/crosschain/checker/EntitlementChecker.sol";

contract DeployEntitlementChecker is Deployer {
  function versionName() public pure override returns (string memory) {
    return "entitlementChecker";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new EntitlementChecker());
  }
}
