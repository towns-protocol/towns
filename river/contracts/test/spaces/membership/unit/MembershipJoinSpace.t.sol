// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IEntitlementGated} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";

//libraries
import {Vm} from "forge-std/Test.sol";

//contracts

contract MembershipJoinSpace is MembershipBaseSetup {
  bytes32 constant CHECK_REQUESTED =
    keccak256("EntitlementCheckRequested(address,address,bytes32,address[])");
  bytes32 constant RESULT_POSTED =
    keccak256("EntitlementCheckResultPosted(bytes32,uint8)");

  mapping(address => bool) public postedResult;

  function test_joinSpace() external givenAliceHasMintedMembership {
    assertEq(membership.balanceOf(alice), 1);
  }

  function test_multipleJoinSpace()
    external
    givenAliceHasMintedMembership
    givenAliceHasMintedMembership
  {
    assertEq(membership.balanceOf(alice), 2);
  }

  function test_joinPaidSpace() external givenMembershipHasPrice {
    vm.deal(bob, MEMBERSHIP_PRICE);
    vm.prank(bob);

    vm.recordLogs();
    membership.joinSpace{value: MEMBERSHIP_PRICE}(bob);
    Vm.Log[] memory logs = vm.getRecordedLogs();

    (
      address contractAddress,
      bytes32 transactionId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(logs);

    for (uint i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      IEntitlementGated(contractAddress).postEntitlementCheckResult(
        transactionId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    assertEq(membership.balanceOf(bob), 1);
    assertEq(bob.balance, 0);
  }

  function test_joinPaidSpaceRefund() external givenMembershipHasPrice {
    vm.deal(bob, MEMBERSHIP_PRICE);

    assertEq(membership.balanceOf(bob), 0);

    vm.recordLogs();
    vm.prank(bob);
    membership.joinSpace{value: MEMBERSHIP_PRICE}(bob);
    Vm.Log[] memory logs = vm.getRecordedLogs();

    (
      address contractAddress,
      bytes32 transactionId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(logs);

    for (uint i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      IEntitlementGated(contractAddress).postEntitlementCheckResult(
        transactionId,
        IEntitlementGatedBase.NodeVoteStatus.FAILED
      );
    }

    assertEq(membership.balanceOf(bob), 0);
    assertEq(bob.balance, MEMBERSHIP_PRICE);
  }

  function test_revertWhen_joinSpaceWithZeroAddress() external {
    vm.prank(alice);
    vm.expectRevert(Membership__InvalidAddress.selector);
    membership.joinSpace(address(0));
  }

  function test_joinSpace_passWhen_CallerIsFounder() external {
    vm.prank(founder);
    membership.joinSpace(bob);
  }

  function test_joinSpace_pass_crossChain() external {
    vm.recordLogs(); // Start recording logs
    vm.prank(bob);
    membership.joinSpace(bob);
    Vm.Log[] memory requestLogs = vm.getRecordedLogs(); // Retrieve the recorded logs

    bool checkRequestedMatched = false;

    (
      address contractAddress,
      bytes32 transactionId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(requestLogs);

    for (uint k = 0; k < 3; k++) {
      if (k == 2) {
        vm.recordLogs(); // Start recording logs
      }

      address currentNode = selectedNodes[k];

      if (postedResult[currentNode]) {
        continue;
      }

      vm.prank(currentNode);
      IEntitlementGated(contractAddress).postEntitlementCheckResult(
        transactionId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
      postedResult[currentNode] = true;

      if (k == 2) {
        Vm.Log[] memory resultLogs = vm.getRecordedLogs(); // Retrieve the recorded logs
        for (uint l = 0; l < resultLogs.length; l++) {
          if (resultLogs[l].topics[0] == RESULT_POSTED) {
            checkRequestedMatched = true;
          }
        }
      }
    }

    assertTrue(checkRequestedMatched);
  }

  function test_joinSpace_revert_LimitReached() external {
    vm.prank(founder);
    membership.setMembershipLimit(1);

    assertTrue(membership.getMembershipPrice() == 0);
    assertTrue(membership.getMembershipLimit() == 1);

    vm.prank(alice);
    vm.expectRevert(Membership__MaxSupplyReached.selector);
    membership.joinSpace(alice);
  }

  function test_joinSpace_revert_when_updating_maxSupply() external {
    vm.prank(founder);
    membership.setMembershipLimit(2);

    assertTrue(membership.getMembershipPrice() == 0);
    assertTrue(membership.getMembershipLimit() == 2);

    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidMaxSupply.selector);
    membership.setMembershipLimit(1);
  }

  function _getRequestedEntitlementData(
    Vm.Log[] memory requestLogs
  )
    internal
    pure
    returns (
      address contractAddress,
      bytes32 transactionId,
      address[] memory selectedNodes
    )
  {
    for (uint i = 0; i < requestLogs.length; i++) {
      if (requestLogs[i].topics[0] == CHECK_REQUESTED) {
        (, contractAddress, transactionId, selectedNodes) = abi.decode(
          requestLogs[i].data,
          (address, address, bytes32, address[])
        );
      }
    }
  }
}
