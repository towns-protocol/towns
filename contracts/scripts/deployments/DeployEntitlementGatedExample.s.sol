// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import {console2} from "forge-std/Script.sol";

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {EntitlementGatedExample} from "contracts/src/crosschain/example/EntitlementGatedExample.sol";
import {IEntitlementChecker} from "contracts/src/crosschain/IEntitlementChecker.sol";
import {DeployEntitlementChecker} from "contracts/scripts/deployments/DeployEntitlementChecker.s.sol";

contract DeployEntitlementGatedExample is Deployer {
  function versionName() public pure override returns (string memory) {
    return "entitlementGatedExample";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    DeployEntitlementChecker deployEntitlementChecker = new DeployEntitlementChecker();
    IEntitlementChecker entitlementCheckerImpl = IEntitlementChecker(
      deployEntitlementChecker.deploy()
    );

    console2.log(
      string.concat(
        unicode"Deploying EntitlementGatedExample using \n\t📜 ",
        "IEntitlementChecker",
        unicode"\n\t⚡️ from ",
        vm.toString(address(entitlementCheckerImpl))
      )
    );

    vm.broadcast(deployerPK);

    return address(new EntitlementGatedExample(entitlementCheckerImpl));
  }
}
