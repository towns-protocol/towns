// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {IntrospectionController} from "contracts/src/diamond/extensions/introspection/IntrospectionController.sol";

contract IntrospectionTest is TestUtils {
  address internal deployer;
  MockIntrospection internal introspection;

  function setUp() public {
    deployer = _randomAddress();

    vm.startPrank(deployer);
    introspection = new MockIntrospection();
  }

  function test_addInterface(bytes4 interfaceId) external {
    introspection.addInterface(interfaceId);
    assertTrue(introspection.supportsInterface(interfaceId));
  }

  function test_removeInterface(bytes4 interfaceId) external {
    introspection.addInterface(interfaceId);
    introspection.removeInterface(interfaceId);
    assertFalse(introspection.supportsInterface(interfaceId));
  }

  function test_supportsInterface(bytes4 interfaceId) external {
    introspection.addInterface(interfaceId);
    assertTrue(introspection.supportsInterface(interfaceId));
  }
}

contract MockIntrospection is IntrospectionController {
  function supportsInterface(bytes4 interfaceId) external view returns (bool) {
    return _supportsInterface(interfaceId);
  }

  function addInterface(bytes4 interfaceId) external {
    _addInterface(interfaceId);
  }

  function removeInterface(bytes4 interfaceId) external {
    _removeInterface(interfaceId);
  }
}
