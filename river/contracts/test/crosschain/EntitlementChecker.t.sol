// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IEntitlementChecker, IEntitlementCheckerBase} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";

//libraries

//contracts
import {EntitlementChecker} from "contracts/src/base/registry/facets/checker/EntitlementChecker.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract EntitlementCheckerTest is TestUtils, IEntitlementCheckerBase {
  IEntitlementChecker public checker;

  mapping(address => string) public nodeKeys;

  function setUp() external {
    checker = new EntitlementChecker();
  }

  // =============================================================
  //                           Register
  // =============================================================

  function test_registerNode() external {
    address node = _randomAddress();

    vm.prank(node);
    vm.expectEmit(true, true, true, true);
    emit NodeRegistered(node);
    checker.registerNode(node);

    assertEq(checker.getNodeCount(), 1);
  }

  function test_registerNode_revert_nodeAlreadyRegistered() external {
    address node = _randomAddress();

    vm.prank(node);
    checker.registerNode(node);

    vm.prank(node);
    vm.expectRevert(EntitlementChecker_NodeAlreadyRegistered.selector);
    checker.registerNode(node);
  }

  // =============================================================
  //                           Unregister
  // =============================================================
  function test_unregisterNode() external {
    address node = _randomAddress();

    vm.prank(node);
    checker.registerNode(node);

    vm.prank(node);
    vm.expectEmit(true, true, true, true);
    emit NodeUnregistered(node);
    checker.unregisterNode(node);

    assertEq(checker.getNodeCount(), 0);
  }

  function test_unregisterNode_revert_nodeNotRegistered() external {
    address node = _randomAddress();

    vm.prank(node);
    vm.expectRevert(EntitlementChecker_NodeNotRegistered.selector);
    checker.unregisterNode(node);
  }

  // =============================================================
  //                        Random Nodes
  // =============================================================
  function test_getRandomNodes() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5);

    // validate no nodes are repeating
    for (uint256 i = 0; i < nodes.length; i++) {
      for (uint256 j = i + 1; j < nodes.length; j++) {
        assertNotEq(nodes[i], nodes[j]);
      }
    }

    assertEq(nodes.length, 5);
  }

  function test_getRandomNodes_revert_insufficientNumberOfNodes() external {
    vm.expectRevert(EntitlementChecker_InsufficientNumberOfNodes.selector);
    checker.getRandomNodes(26);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _registerNodes() internal {
    for (uint256 i = 0; i < 10; i++) {
      address node = _randomAddress();
      nodeKeys[node] = string(abi.encodePacked("node", vm.toString(i)));

      vm.prank(node);
      checker.registerNode(node);
    }

    uint256 len = checker.getNodeCount();
    assertEq(len, 10);
  }
}
