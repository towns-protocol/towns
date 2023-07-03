// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces

//libraries

//contracts
import {TownFactoryInit} from "contracts/src/towns/initializers/TownFactoryInit.sol";

contract TownFactoryInitTest is TestUtils {
  TownFactoryInit internal townFactoryInit;

  function setUp() external {
    townFactoryInit = new TownFactoryInit();
  }

  function test_init() external {
    TownFactoryInit.Args memory args = TownFactoryInit.Args({
      proxyImplementation: address(this),
      townToken: address(this),
      userEntitlementImplementation: address(this),
      tokenEntitlementImplementation: address(this)
    });

    townFactoryInit.init(args);
  }
}
