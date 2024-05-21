// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MockEntitlementGated} from "contracts/test/mocks/MockEntitlementGated.sol";

contract DeployEntitlementGatedExample is Deployer {
  function versionName() public pure override returns (string memory) {
    return "entitlementGatedExample";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return
      address(
        new MockEntitlementGated(
          IEntitlementChecker(getDeployment("baseRegistry"))
        )
      );
  }
}
