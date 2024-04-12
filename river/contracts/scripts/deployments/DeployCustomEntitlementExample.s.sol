// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MockCustomEntitlement} from "contracts/test/mocks/MockCustomEntitlement.sol";

contract DeployCustomEntitlementExample is Deployer {
  function versionName() public pure override returns (string memory) {
    return "customEntitlementExample";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new MockCustomEntitlement());
  }
}
