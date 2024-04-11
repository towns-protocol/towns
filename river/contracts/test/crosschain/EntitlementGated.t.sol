// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IEntitlementChecker} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";
import {IEntitlementCheckerBase} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";
import {IEntitlementGated} from "contracts/src/crosschain/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/crosschain/IEntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";

//libraries

//contracts
import {EntitlementChecker} from "contracts/src/crosschain/checker/EntitlementChecker.sol";
import {MockEntitlementGated} from "contracts/test/mocks/MockEntitlementGated.sol";
import {RuleEntitlementUtil} from "contracts/src/crosschain/RuleEntitlementUtil.sol";

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
    gated = new MockEntitlementGated(checker);
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
    bytes32 generatedTxId = gated.requestEntitlementCheck();
    assertEq(generatedTxId, transactionId);
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
    bytes32 transactionId = gated.requestEntitlementCheck();

    _nodeVotes(transactionId, nodes, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_failing() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5, address(gated));

    bytes32 transactionId = gated.requestEntitlementCheck();

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

    bytes32 transactionId = gated.requestEntitlementCheck();

    vm.prank(nodes[0]);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);

    vm.prank(nodes[0]);
    vm.expectRevert(EntitlementGated_NodeAlreadyVoted.selector);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_revert_nodeNotFound() external {
    _registerNodes();

    bytes32 transactionId = gated.requestEntitlementCheck();

    vm.prank(_randomAddress());
    vm.expectRevert(EntitlementGated_NodeNotFound.selector);
    gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
  }

  // =============================================================
  //                       Get Encoded Rule Data
  // =============================================================

  function assertRuleDatasEqual(
    IRuleEntitlement.RuleData memory actual,
    IRuleEntitlement.RuleData memory expected
  ) internal {
    assert(actual.checkOperations.length == expected.checkOperations.length);
    assert(
      actual.logicalOperations.length == expected.logicalOperations.length
    );
    assert(actual.operations.length == expected.operations.length);

    for (uint256 i = 0; i < actual.checkOperations.length; i++) {
      assert(
        actual.checkOperations[i].opType == expected.checkOperations[i].opType
      );
      assert(
        actual.checkOperations[i].chainId == expected.checkOperations[i].chainId
      );
      assert(
        actual.checkOperations[i].contractAddress ==
          expected.checkOperations[i].contractAddress
      );
      assert(
        actual.checkOperations[i].threshold ==
          expected.checkOperations[i].threshold
      );
    }

    for (uint256 i = 0; i < actual.logicalOperations.length; i++) {
      assert(
        actual.logicalOperations[i].logOpType ==
          expected.logicalOperations[i].logOpType
      );
      assert(
        actual.logicalOperations[i].leftOperationIndex ==
          expected.logicalOperations[i].leftOperationIndex
      );
      assert(
        actual.logicalOperations[i].rightOperationIndex ==
          expected.logicalOperations[i].rightOperationIndex
      );
    }

    for (uint256 i = 0; i < actual.operations.length; i++) {
      assert(actual.operations[i].opType == expected.operations[i].opType);
      assert(actual.operations[i].index == expected.operations[i].index);
    }
  }

  function test_getEncodedRuleData() external {
    _registerNodes();
    bytes32 transactionId = gated.requestEntitlementCheck();
    IRuleEntitlement.RuleData memory ruleData = gated.getRuleData(
      transactionId
    );
    assertRuleDatasEqual(ruleData, RuleEntitlementUtil.getMockERC721RuleData());
  }

  // =============================================================
  //                        Delete Transaction
  // =============================================================

  function test_deleteTransaction() external {
    _registerNodes();

    address[] memory nodes = checker.getRandomNodes(5, address(gated));

    bytes32 transactionId = gated.requestEntitlementCheck();

    for (uint256 i = 0; i < 3; i++) {
      vm.startPrank(nodes[i]);
      gated.postEntitlementCheckResult(transactionId, NodeVoteStatus.PASSED);
      vm.stopPrank();
    }

    vm.prank(nodes[3]);
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
    bool eventEmitted = false;

    for (uint256 i = 0; i < nodes.length; i++) {
      vm.startPrank(nodes[i]);

      // if more than half voted, revert with already completed
      if (i <= halfNodes) {
        // if on the last voting node, expect the event to be emitted
        if (i == halfNodes + 1) {
          vm.expectEmit(true, true, true, true);
          emit EntitlementCheckResultPosted(transactionId, vote);
          gated.postEntitlementCheckResult(transactionId, vote);
          eventEmitted = true;
        } else {
          gated.postEntitlementCheckResult(transactionId, vote);
        }
      } else {
        vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
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
