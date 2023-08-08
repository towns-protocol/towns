// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";

// libraries

// contracts
import {IntrospectionSetup} from "./IntrospectionSetup.sol";

contract IntrospectionTest is IntrospectionSetup {
  function test_supportsInterface() external {
    assertTrue(introspection.supportsInterface(type(IERC165).interfaceId));
  }
}
