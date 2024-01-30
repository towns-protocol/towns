// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IEntitlementChecker} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";
import {IEntitlementCheckerBase} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";
import {IEntitlementGated} from "contracts/src/crosschain/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/crosschain/IEntitlementGated.sol";

//libraries

//contracts
import {EntitlementChecker} from "contracts/src/crosschain/checker/EntitlementChecker.sol";
import {MockEntitlementGated} from "contracts/test/mocks/MockEntitlementGated.sol";

contract EntitlementGatedTest is
  TestUtils,
  IEntitlementGatedBase,
  IEntitlementCheckerBase
{
  IEntitlementChecker public checker;
  MockEntitlementGated public gated;

  mapping(address => string) public nodeKeys;

  function setUp() external {
    checker = new EntitlementChecker();
    gated = new MockEntitlementGated(address(checker));
  }

  // =============================================================
  //                  Request Entitlement Check
  // =============================================================
  function test_requestEntitlementCheck() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5, address(gated));

    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    vm.expectEmit(true, true, true, true);
    emit EntitlementCheckRequested(
      tx.origin,
      transactionId,
      nodes,
      address(gated)
    );
    gated.requestEntitlementCheck();
  }

  function test_requestEntitlementCheck_revert_alreadyRegistered() external {
    _registerNodes();

    gated.requestEntitlementCheck();

    vm.expectRevert(EntitlementGated_TransactionAlreadyRegistered.selector);
    gated.requestEntitlementCheck();
  }

  // =============================================================
  //                 Post Entitlement Check Result
  // =============================================================
  function test_postEntitlementCheckResult_passing() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5, address(gated));
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    gated.requestEntitlementCheck();

    _nodeVotes(transactionId, nodes, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_failing() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5, address(gated));
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    gated.requestEntitlementCheck();

    _nodeVotes(transactionId, nodes, NodeVoteStatus.FAILED);
  }

  function test_postEntitlementCheckResult_revert_transactionNotRegistered()
    external
  {
    bytes32 transactionId = _randomBytes32();

    vm.prank(_randomAddress());
    vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_revert_nodeAlreadyVoted() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5, address(gated));
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    gated.requestEntitlementCheck();

    vm.prank(nodes[0]);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);

    vm.prank(nodes[0]);
    vm.expectRevert(EntitlementGated_NodeAlreadyVoted.selector);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_revert_nodeNotFound() external {
    _registerNodes();

    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    gated.requestEntitlementCheck();

    vm.prank(_randomAddress());
    vm.expectRevert(EntitlementGated_NodeNotFound.selector);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
  }

  // =============================================================
  //                        Delete Transaction
  // =============================================================

  function test_deleteTransaction() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5, address(gated));

    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    gated.requestEntitlementCheck();
    gated.removeTransaction(transactionId);

    vm.prank(nodes[0]);
    vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _nodeVotes(
    bytes32 transactionId,
    address[] memory nodes,
    NodeVoteStatus vote
  ) internal {
    uint256 halfNodes = nodes.length / 2;

    for (uint256 i = 0; i < nodes.length; i++) {
      vm.startPrank(nodes[i]);

      // if more than half voted, revert with already completed
      if (i <= halfNodes) {
        // if on the last voting node, expect the event to be emitted
        if (i == halfNodes + 1) {
          vm.expectEmit(true, true, true, true);
          emit EntitlementCheckResultPosted(transactionId, vote);
        }

        gated.postEntitlementCheckResult(transactionId, vote);
      } else {
        gated.postEntitlementCheckResult(transactionId, vote);
      }

      vm.stopPrank();
    }
  }

  function _registerNodes() internal {
    for (uint256 i = 0; i < 25; i++) {
      address node = _randomAddress();
      nodeKeys[node] = string(abi.encodePacked("node", vm.toString(i)));

      vm.prank(node);
      checker.registerNode();
    }

    uint256 len = checker.nodeCount();
    assertEq(len, 25);
  }
}
