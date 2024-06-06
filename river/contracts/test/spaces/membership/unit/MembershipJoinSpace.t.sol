// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IEntitlementGated} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementCheckerBase} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IWalletLink, IWalletLinkBase} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

//libraries
import {Vm, Test} from "forge-std/Test.sol";

//contracts

contract MembershipJoinSpace is
  MembershipBaseSetup,
  IEntitlementCheckerBase,
  IEntitlementGatedBase,
  IWalletLinkBase
{
  bytes32 constant CHECK_REQUESTED =
    keccak256(
      "EntitlementCheckRequested(address,address,bytes32,uint256,address[])"
    );
  bytes32 constant RESULT_POSTED =
    keccak256("EntitlementCheckResultPosted(bytes32,uint8)");

  bytes32 TOKEN_EMITTED = keccak256("MembershipTokenIssued(address,uint256)");

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
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(logs);

    for (uint i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      IEntitlementGated(contractAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    assertEq(membership.balanceOf(bob), 1);
    assertEq(bob.balance, 0);
  }

  struct EntitlementCheckRequestEvent {
    address callerAddress;
    address contractAddress;
    bytes32 transactionId;
    uint256 roleId;
    address[] selectedNodes;
  }

  function _signMessage(
    uint256 privateKey,
    bytes32 message
  ) internal pure returns (bytes memory) {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      privateKey,
      MessageHashUtils.toEthSignedMessageHash(message)
    );
    return abi.encodePacked(r, s, v);
  }

  function test_joinSpaceWithUserEntitlement_passes() external {
    vm.prank(alice);
    membership.joinSpace(alice);
    assertEq(membership.balanceOf(alice), 1);
  }

  function test_joinSpaceWithRootWalletUserEntitlement_passes() external {
    IWalletLink wl = IWalletLink(spaceFactory);
    Vm.Wallet memory daveWallet = vm.createWallet("dave");

    uint256 nonce = walletLink.getLatestNonceForRootKey(daveWallet.addr);
    bytes32 messageHash = keccak256(abi.encode(daveWallet.addr, nonce));
    bytes memory signature = _signMessage(aliceWallet.privateKey, messageHash);

    vm.startPrank(daveWallet.addr);
    vm.expectEmit(address(wl));
    emit LinkWalletToRootKey(daveWallet.addr, aliceWallet.addr);
    walletLink.linkCallerToRootKey(
      LinkedWallet(aliceWallet.addr, signature),
      nonce
    );

    membership.joinSpace(daveWallet.addr);
    assertEq(membership.balanceOf(daveWallet.addr), 1);
  }

  function test_joinSpaceWithLinkedWalletUserEntitlement_passes() external {
    IWalletLink wl = IWalletLink(spaceFactory);
    Vm.Wallet memory emilyWallet = vm.createWallet("emily");

    uint256 nonce = walletLink.getLatestNonceForRootKey(aliceWallet.addr);
    bytes32 messageHash = keccak256(abi.encode(aliceWallet.addr, nonce));
    bytes memory signature = _signMessage(emilyWallet.privateKey, messageHash);

    vm.startPrank(alice);
    vm.expectEmit(address(wl));
    emit IWalletLinkBase.LinkWalletToRootKey(
      aliceWallet.addr,
      emilyWallet.addr
    );
    walletLink.linkCallerToRootKey(
      IWalletLinkBase.LinkedWallet(emilyWallet.addr, signature),
      nonce
    );
    vm.stopPrank();

    vm.prank(emilyWallet.addr);
    membership.joinSpace(emilyWallet.addr);
    assertEq(membership.balanceOf(emilyWallet.addr), 1);
  }

  function test_joinSpace_multipleCrosschainEntitlementChecks_finalPasses()
    external
    givenJoinspaceHasAdditionalCrosschainEntitlements
  {
    vm.recordLogs(); // Start recording logs
    // Bob's join request should result in 3 entitlement check emissions.
    vm.prank(bob);
    membership.joinSpace(bob);

    Vm.Log[] memory requestLogs = vm.getRecordedLogs(); // Retrieve the recorded logs

    (
      address contractAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(requestLogs);
    uint256 numCheckRequests = _getEntitlementCheckRequestCount(requestLogs);

    assertEq(numCheckRequests, 3);
    assertEq(membership.balanceOf(bob), 0);

    uint256 quorum = selectedNodes.length / 2;
    uint256 nextTokenId = membership.totalSupply();
    IEntitlementGated _entitlementGated = IEntitlementGated(contractAddress);

    for (uint i = 0; i < selectedNodes.length; i++) {
      // First quorum nodes should pass, the rest should fail.
      if (i <= quorum) {
        vm.prank(selectedNodes[i]);
        if (i == quorum) {
          vm.expectEmit(address(membership));
          emit MembershipTokenIssued(bob, nextTokenId);
        }
        _entitlementGated.postEntitlementCheckResult(
          transactionId,
          roleId,
          IEntitlementGatedBase.NodeVoteStatus.PASSED
        );
        continue;
      }

      vm.prank(selectedNodes[i]);
      vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
      _entitlementGated.postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    assertEq(membership.balanceOf(bob), 1);
  }

  function test_joinSpace_multipleCrosschainEntitlementChecks_earlyPass()
    external
    givenJoinspaceHasAdditionalCrosschainEntitlements
  {
    vm.recordLogs(); // Start recording logs

    // Bob's join request should result in 3 entitlement check emissions.
    vm.prank(bob);
    membership.joinSpace(bob);

    Vm.Log[] memory requestLogs = vm.getRecordedLogs(); // Retrieve the recorded logs

    bool tokenEmittedMatched = false;

    EntitlementCheckRequestEvent[]
      memory entitlementCheckRequests = new EntitlementCheckRequestEvent[](3);
    uint256 numCheckRequests = 0;

    // Capture relevant event logs
    for (uint i = 0; i < requestLogs.length; i++) {
      address callerAddress;
      address contractAddress;
      uint256 roleId;
      bytes32 transactionId;
      address[] memory selectedNodes;
      if (requestLogs[i].topics[0] == CHECK_REQUESTED) {
        (, contractAddress, transactionId, roleId, selectedNodes) = abi.decode(
          requestLogs[i].data,
          (address, address, bytes32, uint256, address[])
        );
        entitlementCheckRequests[
          numCheckRequests
        ] = EntitlementCheckRequestEvent({
          callerAddress: callerAddress,
          contractAddress: contractAddress,
          transactionId: transactionId,
          roleId: roleId,
          selectedNodes: selectedNodes
        });
        numCheckRequests++;
      } else if (requestLogs[i].topics[0] == TOKEN_EMITTED) {
        tokenEmittedMatched = true;
      }
    }
    // Validate that a check requested event was emitted and no tokens were minted.
    assertEq(numCheckRequests, 3);
    assertFalse(tokenEmittedMatched);

    vm.recordLogs();
    EntitlementCheckRequestEvent memory firstRequest = entitlementCheckRequests[
      0
    ];
    for (uint j = 0; j < firstRequest.selectedNodes.length; j++) {
      IEntitlementGatedBase.NodeVoteStatus status = IEntitlementGatedBase
        .NodeVoteStatus
        .PASSED;
      // Send a few failures to exercise quorum code, this should result in a pass.
      if (j % 2 == 1) {
        status = IEntitlementGatedBase.NodeVoteStatus.FAILED;
      }
      vm.prank(firstRequest.selectedNodes[j]);
      IEntitlementGated(firstRequest.contractAddress)
        .postEntitlementCheckResult(
          firstRequest.transactionId,
          firstRequest.roleId,
          status
        );
    }

    // Check for posted result, and the emitted token mint event.
    bool resultPosted = false;
    bool tokenEmitted = false;
    Vm.Log[] memory resultLogs = vm.getRecordedLogs(); // Retrieve the recorded logs
    for (uint256 l; l < resultLogs.length; l++) {
      if (resultLogs[l].topics[0] == RESULT_POSTED) {
        resultPosted = true;
      } else if (resultLogs[l].topics[0] == TOKEN_EMITTED) {
        tokenEmitted = true;
      }
    }
    assertTrue(resultPosted);
    assertTrue(tokenEmitted);

    // Further node votes to the terminated transaction should cause reversion due to cleaned up txn.
    vm.expectRevert(
      abi.encodeWithSelector(
        IEntitlementGatedBase.EntitlementGated_TransactionNotRegistered.selector
      )
    );
    EntitlementCheckRequestEvent memory finalRequest = entitlementCheckRequests[
      2
    ];
    (bool success, ) = address(finalRequest.contractAddress).call(
      abi.encodeWithSelector(
        IEntitlementGated(finalRequest.contractAddress)
          .postEntitlementCheckResult
          .selector,
        finalRequest.transactionId,
        finalRequest.roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      )
    );
    assertTrue(success, "postEntitlementCheckResult should have reverted");
  }

  function test_joinSpace_multipleCrosschainEntitlementChecks_allFail()
    external
    givenJoinspaceHasAdditionalCrosschainEntitlements
  {
    vm.recordLogs(); // Start recording logs
    vm.prank(bob); // Bob's join request
    membership.joinSpace(bob);
    Vm.Log[] memory requestLogs = vm.getRecordedLogs(); // Retrieve the recorded logs

    (
      address contractAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(requestLogs);

    // Validate that a check requested event was emitted and no tokens were minted.
    assertEq(membership.balanceOf(bob), 0);

    uint256 quorum = selectedNodes.length / 2;

    // All checks fail, should result in no token mint.
    for (uint i = 0; i < selectedNodes.length; i++) {
      if (i <= quorum) {
        vm.prank(selectedNodes[i]);
        IEntitlementGated(contractAddress).postEntitlementCheckResult(
          transactionId,
          roleId,
          IEntitlementGatedBase.NodeVoteStatus.FAILED
        );
        continue;
      }

      vm.prank(selectedNodes[i]);
      vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
      IEntitlementGated(contractAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    // Validate that a check requested event was emitted and no tokens were minted.
    assertEq(membership.balanceOf(bob), 0);
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
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(logs);

    for (uint i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      IEntitlementGated(contractAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
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
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestedEntitlementData(requestLogs);

    for (uint k = 0; k < 3; k++) {
      if (k == 2) {
        vm.recordLogs(); // Start recording logs
      }

      address currentNode = selectedNodes[k];

      vm.prank(currentNode);
      IEntitlementGated(contractAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );

      if (k == 2) {
        Vm.Log[] memory resultLogs = vm.getRecordedLogs(); // Retrieve the recorded logs
        for (uint l; l < resultLogs.length; l++) {
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

  function _getEntitlementCheckRequestCount(
    Vm.Log[] memory logs
  ) internal pure returns (uint256 count) {
    for (uint i = 0; i < logs.length; i++) {
      if (logs[i].topics[0] == CHECK_REQUESTED) {
        count++;
      }
    }
  }

  function _getRequestedEntitlementData(
    Vm.Log[] memory requestLogs
  )
    internal
    pure
    returns (
      address contractAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    )
  {
    for (uint i = 0; i < requestLogs.length; i++) {
      if (
        requestLogs[i].topics.length > 0 &&
        requestLogs[i].topics[0] == CHECK_REQUESTED
      ) {
        (, contractAddress, transactionId, roleId, selectedNodes) = abi.decode(
          requestLogs[i].data,
          (address, address, bytes32, uint256, address[])
        );
      }
    }
  }
}
