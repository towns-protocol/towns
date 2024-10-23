// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IEntitlementCheckerBase} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

//libraries
import {RuleEntitlementUtil} from "./RuleEntitlementUtil.sol";

//contracts
import {MockEntitlementGated} from "contracts/test/mocks/MockEntitlementGated.sol";
import {EntitlementTestUtils} from "contracts/test/utils/EntitlementTestUtils.sol";
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract EntitlementGatedTest is
  EntitlementTestUtils,
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

    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;

    bytes32 realRequestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    assertEq(realRequestId, transactionHash);
  }

  function test_requestEntitlementCheck_revertWhen_alreadyRegistered()
    external
  {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;

    gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    vm.expectRevert(
      EntitlementGated_TransactionCheckAlreadyRegistered.selector
    );
    gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );
  }

  // =============================================================
  //                 Post Entitlement Check Result
  // =============================================================
  function test_postEntitlementCheckResult_passing() external {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;

    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);
    bytes32 requestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    _nodeVotes(requestId, 0, nodes, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_failing() external {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;

    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    bytes32 requestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    _nodeVotes(requestId, 0, nodes, NodeVoteStatus.FAILED);
  }

  function test_fuzz_postEntitlementCheckResult_revert_transactionNotRegistered(
    bytes32 requestId,
    address node
  ) external {
    vm.prank(node);
    vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_revert_nodeAlreadyVoted() external {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;

    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    bytes32 requestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    vm.startPrank(nodes[0]);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);

    vm.expectRevert(EntitlementGated_NodeAlreadyVoted.selector);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_revert_nodeNotFound(
    address node
  ) external {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;

    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    for (uint256 i; i < nodes.length; ++i) {
      vm.assume(node != nodes[i]);
    }

    bytes32 requestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    vm.prank(node);
    vm.expectRevert(EntitlementGated_NodeNotFound.selector);
    gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
  }

  function test_postEntitlementCheckResult_multipleRoleIds() external {
    uint256[] memory roleIds = new uint256[](2);
    roleIds[0] = 0;
    roleIds[1] = 1;

    vm.recordLogs();

    bytes32 requestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    // get the nodes that were selected
    (, , , address[] memory nodes) = _getRequestedEntitlementData(
      vm.getRecordedLogs()
    );

    // first roleId is not entitled
    for (uint256 i; i < 3; ++i) {
      vm.prank(nodes[i]);
      gated.postEntitlementCheckResult(
        requestId,
        roleIds[0],
        NodeVoteStatus.FAILED
      );
    }

    // second roleId is not entitled
    for (uint256 i; i < 3; ++i) {
      vm.prank(nodes[i]);

      // if on last node, expect the event to be emitted
      if (i == 2) {
        vm.expectEmit(address(gated));
        emit EntitlementCheckResultPosted(requestId, NodeVoteStatus.FAILED);
      }

      gated.postEntitlementCheckResult(
        requestId,
        roleIds[1],
        NodeVoteStatus.FAILED
      );
    }
  }

  function test_postEntitlementCheckResult_immediatelyCompleted() external {
    uint256[] memory roleIds = new uint256[](2);
    roleIds[0] = 0;
    roleIds[1] = 1;

    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    bytes32 requestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    for (uint256 i; i < 3; ++i) {
      vm.prank(nodes[i]);

      // if on the last node, expect the event to be emitted
      if (i == 2) {
        vm.expectEmit(address(gated));
        emit EntitlementCheckResultPosted(requestId, NodeVoteStatus.PASSED);
      }

      gated.postEntitlementCheckResult(
        requestId,
        roleIds[0],
        NodeVoteStatus.PASSED
      );
    }
  }

  // =============================================================
  //                       Get Encoded Rule Data
  // =============================================================

  function test_getEncodedRuleData() external {
    IRuleEntitlement.RuleDataV2 memory expected = RuleEntitlementUtil
      .getMockERC721RuleData();
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;
    gated.requestEntitlementCheckV2(roleIds, expected);
    assertEq(abi.encode(gated.getRuleDataV2(0)), abi.encode(expected));
  }

  // =============================================================
  //                        Delete Transaction
  // =============================================================

  function test_deleteTransaction() external {
    vm.prank(address(gated));
    address[] memory nodes = entitlementChecker.getRandomNodes(5);

    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = 0;

    bytes32 requestId = gated.requestEntitlementCheckV2(
      roleIds,
      RuleEntitlementUtil.getMockERC721RuleData()
    );

    for (uint256 i; i < 3; ++i) {
      vm.prank(nodes[i]);
      gated.postEntitlementCheckResult(
        requestId,
        roleIds[0],
        NodeVoteStatus.PASSED
      );
    }

    vm.prank(nodes[3]);
    vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
    gated.postEntitlementCheckResult(
      requestId,
      roleIds[0],
      NodeVoteStatus.PASSED
    );
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _nodeVotes(
    bytes32 requestId,
    uint256 roleId,
    address[] memory nodes,
    NodeVoteStatus vote
  ) internal {
    uint256 halfNodes = nodes.length / 2;
    bool eventEmitted = false;

    for (uint256 i; i < nodes.length; ++i) {
      vm.startPrank(nodes[i]);

      // if more than half voted, revert with already completed
      if (i <= halfNodes) {
        // if on the last voting node, expect the event to be emitted
        if (i == halfNodes + 1) {
          vm.expectEmit(address(gated));
          emit EntitlementCheckResultPosted(requestId, vote);
          gated.postEntitlementCheckResult(requestId, roleId, vote);
          eventEmitted = true;
        } else {
          gated.postEntitlementCheckResult(requestId, roleId, vote);
        }
      } else {
        vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
        gated.postEntitlementCheckResult(requestId, roleId, vote);
      }

      vm.stopPrank();
    }
  }
}
