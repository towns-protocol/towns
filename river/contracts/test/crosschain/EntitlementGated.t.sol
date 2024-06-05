// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IEntitlementCheckerBase} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IEntitlementGated} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

//libraries
import {RuleEntitlementUtil} from "./RuleEntitlementUtil.sol";

//contracts
import {EntitlementChecker} from "contracts/src/base/registry/facets/checker/EntitlementChecker.sol";
import {MockEntitlementGated} from "contracts/test/mocks/MockEntitlementGated.sol";

import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract EntitlementGatedTest is
  BaseSetup,
  IEntitlementGatedBase,
  IEntitlementCheckerBase
{
  MockEntitlementGated public gated;

  function setUp() public override {
    super.setUp();
    _registerOperators();
    _registerNodes();

    gated = new MockEntitlementGated(entitlementChecker);
  }

  // =============================================================
  //                  Request Entitlement Check
  // =============================================================
  function test_requestEntitlementCheck() external {
    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    bytes32 transactionHash = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    vm.expectEmit(address(entitlementChecker));
    emit EntitlementCheckRequested(
      address(this),
      address(gated),
      transactionHash,
      0,
      nodes
    );

    bytes32 realRequestId = gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    assertEq(realRequestId, transactionHash);
  }

  function test_requestEntitlementCheck_revertWhen_alreadyRegistered()
    external
  {
    gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    vm.expectRevert(
      EntitlementGated_TransactionCheckAlreadyRegistered.selector
    );
    gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );
  }

  // =============================================================
  //                 Post Entitlement Check Result
  // =============================================================
  function test_postEntitlementCheckResult_passing() external {
    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);
    bytes32 requestId = gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    _nodeVotes(requestId, nodes, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_failing() external {
    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    bytes32 requestId = gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    _nodeVotes(requestId, nodes, NodeVoteStatus.FAILED);
  }

  function test_postEntitlementCheckResult_revert_transactionNotRegistered()
    external
  {
    bytes32 requestId = _randomBytes32();

    vm.prank(_randomAddress());
    vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_revert_nodeAlreadyVoted() external {
    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    bytes32 requestId = gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    vm.prank(nodes[0]);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);

    vm.prank(nodes[0]);
    vm.expectRevert(EntitlementGated_NodeAlreadyVoted.selector);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_revert_nodeNotFound() external {
    bytes32 requestId = gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    vm.prank(_randomAddress());
    vm.expectRevert(EntitlementGated_NodeNotFound.selector);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
  }

  // =============================================================
  //                       Get Encoded Rule Data
  // =============================================================

  function assertRuleDatasEqual(
    IRuleEntitlement.RuleData memory actual,
    IRuleEntitlement.RuleData memory expected
  ) internal pure {
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
    bytes32 requestId = gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );
    IRuleEntitlement.RuleData memory ruleData = gated.getRuleData(requestId, 0);
    assertRuleDatasEqual(ruleData, RuleEntitlementUtil.getMockERC721RuleData());
  }

  // =============================================================
  //                        Delete Transaction
  // =============================================================

  function test_deleteTransaction() external {
    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    bytes32 requestId = gated.requestEntitlementCheck(
      0,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    for (uint256 i = 0; i < 3; i++) {
      vm.startPrank(nodes[i]);
      gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
      vm.stopPrank();
    }

    vm.prank(nodes[3]);
    vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _nodeVotes(
    bytes32 requestId,
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
          emit EntitlementCheckResultPosted(requestId, vote);
          gated.postEntitlementCheckResult(requestId, 0, vote);
          eventEmitted = true;
        } else {
          gated.postEntitlementCheckResult(requestId, 0, vote);
        }
      } else {
        vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
        gated.postEntitlementCheckResult(requestId, 0, vote);
      }

      vm.stopPrank();
    }
  }
}
