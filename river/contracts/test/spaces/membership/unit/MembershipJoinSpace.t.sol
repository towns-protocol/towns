// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IEntitlementGated} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementCheckerBase} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";

//libraries
import {Vm} from "forge-std/Test.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

//contracts
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";
import {MockLegacyMembership} from "contracts/test/mocks/legacy/membership/MockLegacyMembership.sol";
import {EntitlementTestUtils} from "contracts/test/utils/EntitlementTestUtils.sol";

contract MembershipJoinSpaceTest is
  MembershipBaseSetup,
  EntitlementTestUtils,
  IEntitlementCheckerBase,
  IEntitlementGatedBase
{
  function test_joinSpaceOnly() external givenAliceHasMintedMembership {
    assertEq(membershipToken.balanceOf(alice), 1);
  }

  function test_joinDynamicSpace() external {
    uint256 membershipFee = platformReqs.getMembershipFee();

    vm.deal(alice, membershipFee);
    vm.startPrank(alice);
    MembershipFacet(dynamicSpace).joinSpace{value: membershipFee}(alice);
    vm.stopPrank();
  }

  function test_joinSpaceMultipleTimes()
    external
    givenAliceHasMintedMembership
    givenAliceHasMintedMembership
  {
    assertEq(membershipToken.balanceOf(alice), 2);
  }

  // alice is entitled, see MembershipBaseSetup.sol
  function test_joinPaidSpace() external givenMembershipHasPrice {
    vm.deal(alice, MEMBERSHIP_PRICE);
    vm.prank(alice);
    membership.joinSpace{value: MEMBERSHIP_PRICE}(alice);

    assertEq(membershipToken.balanceOf(alice), 1);
    assertEq(alice.balance, 0);
  }

  /// @dev Test that a user can join a space with an entitled root wallet as the signer
  function test_joinSpaceWithEntitledRootWallet()
    external
    givenWalletIsLinked(aliceWallet, bobWallet)
  {
    vm.prank(bobWallet.addr);
    membership.joinSpace(bobWallet.addr);
    assertEq(membershipToken.balanceOf(bobWallet.addr), 1);
  }

  /// @dev Test that a user can join a space with a linked wallet as the signer but the linked wallet is entitled
  function test_joinSpaceWithEntitledLinkedWallet()
    external
    givenWalletIsLinked(bobWallet, aliceWallet)
  {
    vm.prank(bobWallet.addr);
    membership.joinSpace(bobWallet.addr);
    assertEq(membershipToken.balanceOf(bobWallet.addr), 1);
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
      ,
      ,
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestV2EventData(requestLogs);
    uint256 numCheckRequests = _getRequestV2EventCount(requestLogs);

    assertEq(numCheckRequests, 3);
    assertEq(membershipToken.balanceOf(bob), 0);

    uint256 quorum = selectedNodes.length / 2;
    uint256 nextTokenId = membershipToken.totalSupply();
    IEntitlementGated _entitlementGated = IEntitlementGated(resolverAddress);

    for (uint256 i = 0; i < selectedNodes.length; i++) {
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
      vm.expectRevert(
        EntitlementGated_TransactionCheckAlreadyCompleted.selector
      );
      _entitlementGated.postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    assertEq(membershipToken.balanceOf(bob), 1);
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

    uint256 numCheckRequests = _getRequestV2EventCount(requestLogs);

    // Validate that a check requested event was emitted and no tokens were minted.
    assertEq(numCheckRequests, 3);
    assertEq(membershipToken.balanceOf(bob), 0);

    EntitlementCheckRequestEvent[]
      memory entitlementCheckRequests = _getRequestV2Events(requestLogs);

    EntitlementCheckRequestEvent memory firstRequest = entitlementCheckRequests[
      0
    ];

    vm.recordLogs();
    for (uint256 j = 0; j < firstRequest.randomNodes.length; j++) {
      IEntitlementGatedBase.NodeVoteStatus status = IEntitlementGatedBase
        .NodeVoteStatus
        .PASSED;
      // Send a few failures to exercise quorum code, this should result in a pass.
      if (j % 2 == 1) {
        status = IEntitlementGatedBase.NodeVoteStatus.FAILED;
      }
      vm.prank(firstRequest.randomNodes[j]);
      IEntitlementGated(firstRequest.resolverAddress)
        .postEntitlementCheckResult(
          firstRequest.transactionId,
          firstRequest.requestId,
          status
        );
    }

    Vm.Log[] memory resultLogs = vm.getRecordedLogs(); // Retrieve the recorded logs
    // Check for posted result, and the emitted token mint event.
    bool resultPosted = false;
    bool tokenEmitted = false;
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
        IEntitlementGatedBase
          .EntitlementGated_TransactionCheckAlreadyCompleted
          .selector
      )
    );
    EntitlementCheckRequestEvent memory finalRequest = entitlementCheckRequests[
      2
    ];
    (bool success, ) = address(finalRequest.resolverAddress).call(
      abi.encodeWithSelector(
        IEntitlementGated(finalRequest.resolverAddress)
          .postEntitlementCheckResult
          .selector,
        finalRequest.transactionId,
        finalRequest.requestId,
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
      ,
      ,
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestV2EventData(requestLogs);

    // Validate that a check requested event was emitted and no tokens were minted.
    assertEq(membershipToken.balanceOf(bob), 0);

    uint256 quorum = selectedNodes.length / 2;

    // All checks fail, should result in no token mint.
    for (uint256 i = 0; i < selectedNodes.length; i++) {
      if (i <= quorum) {
        vm.prank(selectedNodes[i]);
        IEntitlementGated(resolverAddress).postEntitlementCheckResult(
          transactionId,
          roleId,
          IEntitlementGatedBase.NodeVoteStatus.FAILED
        );
        continue;
      }

      vm.prank(selectedNodes[i]);
      vm.expectRevert(
        EntitlementGated_TransactionCheckAlreadyCompleted.selector
      );
      IEntitlementGated(resolverAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    // Validate that a check requested event was emitted and no tokens were minted.
    assertEq(membershipToken.balanceOf(bob), 0);
  }

  function test_joinPaidSpaceRefund() external givenMembershipHasPrice {
    vm.deal(bob, MEMBERSHIP_PRICE);

    vm.recordLogs();
    vm.prank(bob);
    membership.joinSpace{value: MEMBERSHIP_PRICE}(bob);
    Vm.Log[] memory logs = vm.getRecordedLogs();

    (
      ,
      ,
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestV2EventData(logs);

    for (uint256 i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      IEntitlementGated(resolverAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.FAILED
      );
    }

    assertEq(membershipToken.balanceOf(bob), 0);
    assertEq(bob.balance, MEMBERSHIP_PRICE);
  }

  function test_revertWhen_joinSpaceWithZeroAddress() external {
    vm.prank(alice);
    vm.expectRevert(Membership__InvalidAddress.selector);
    membership.joinSpace(address(0));
  }

  function test_joinSpaceAsFounder() external {
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
      ,
      ,
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestV2EventData(requestLogs);

    for (uint256 k = 0; k < 3; k++) {
      if (k == 2) {
        vm.recordLogs(); // Start recording logs
      }

      address currentNode = selectedNodes[k];

      vm.prank(currentNode);
      IEntitlementGated(resolverAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );

      if (k == 2) {
        Vm.Log[] memory resultLogs = vm.getRecordedLogs(); // Retrieve the recorded logs
        for (uint256 l; l < resultLogs.length; l++) {
          if (resultLogs[l].topics[0] == RESULT_POSTED) {
            checkRequestedMatched = true;
          }
        }
      }
    }

    assertTrue(checkRequestedMatched);
  }

  function test_reverWhen_joinSpaceLimitReached() external {
    vm.prank(founder);
    membership.setMembershipLimit(1);

    assertTrue(membership.getMembershipLimit() == 1);

    vm.prank(alice);
    vm.expectRevert(Membership__MaxSupplyReached.selector);
    membership.joinSpace(alice);
  }

  function test_revertWhen_setMembershipLimitToLowerThanCurrentBalance()
    external
  {
    vm.prank(founder);
    membership.setMembershipLimit(2);

    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidMaxSupply.selector);
    membership.setMembershipLimit(1);
  }

  function test_joinSpace_withValueAndFreeAllocation() external {
    uint256 value = membership.getMembershipPrice();

    // assert there are freeAllocations available
    vm.prank(founder);
    membership.setMembershipFreeAllocation(1000);
    uint256 freeAlloc = membership.getMembershipFreeAllocation();
    assertTrue(freeAlloc > 0);

    vm.prank(alice);
    vm.deal(alice, value);
    membership.joinSpace{value: value}(alice);

    // alice gets a refund
    assertTrue(address(membership).balance == 0);
    assertTrue(alice.balance == value);

    // Attempt to withdraw
    address withdrawAddress = _randomAddress();
    vm.prank(founder);
    vm.expectRevert(Membership__InsufficientPayment.selector);
    membership.withdraw(withdrawAddress);

    // withdraw address balance is 0
    assertEq(withdrawAddress.balance, 0);
    assertEq(address(membership).balance, 0);
  }

  function test_joinSpace_priceChangesMidTransaction()
    external
    givenMembershipHasPrice
  {
    vm.deal(bob, MEMBERSHIP_PRICE);

    vm.recordLogs();
    vm.prank(bob);
    membership.joinSpace{value: MEMBERSHIP_PRICE}(bob);
    Vm.Log[] memory logs = vm.getRecordedLogs();

    (
      ,
      ,
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestV2EventData(logs);

    for (uint256 i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      IEntitlementGated(resolverAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.FAILED
      );
    }

    assertEq(membershipToken.balanceOf(bob), 0);
    assertEq(bob.balance, MEMBERSHIP_PRICE);
  }

  // utils

  function test_joinSpacePriceChangesMidTransaction()
    external
    givenMembershipHasPrice
  {
    vm.deal(bob, MEMBERSHIP_PRICE);

    assertEq(membershipToken.balanceOf(bob), 0);

    vm.recordLogs();
    vm.prank(bob);
    membership.joinSpace{value: MEMBERSHIP_PRICE}(bob);
    Vm.Log[] memory logs = vm.getRecordedLogs();

    vm.prank(founder);
    membership.setMembershipPrice(MEMBERSHIP_PRICE * 2);

    (
      ,
      ,
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestV2EventData(logs);

    for (uint256 i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      IEntitlementGated(resolverAddress).postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    assertEq(membershipToken.balanceOf(bob), 1);
    assertTrue(address(membership).balance > 0);
  }

  function test_joinSpaceWithInitialFreeAllocation() external {
    address[] memory allowedUsers = new address[](2);
    allowedUsers[0] = alice;
    allowedUsers[1] = bob;

    IArchitectBase.SpaceInfo memory freeAllocationInfo = _createUserSpaceInfo(
      "FreeAllocationSpace",
      allowedUsers
    );
    freeAllocationInfo.membership.settings.pricingModule = fixedPricingModule;
    freeAllocationInfo.membership.settings.freeAllocation = 1;

    vm.prank(founder);
    address freeAllocationSpace = ICreateSpace(spaceFactory).createSpace(
      freeAllocationInfo
    );

    MembershipFacet freeAllocationMembership = MembershipFacet(
      freeAllocationSpace
    );

    vm.prank(bob);
    vm.expectRevert(Membership__InsufficientPayment.selector);
    freeAllocationMembership.joinSpace(bob);
  }

  function test_joinSpace_withFeeOnlyPrice() external {
    uint256 fee = platformReqs.getMembershipFee();

    vm.prank(founder);
    membership.setMembershipPrice(fee);

    vm.deal(alice, fee);
    vm.prank(alice);
    membership.joinSpace{value: fee}(alice);

    assertEq(membershipToken.balanceOf(alice), 1);
  }

  function test_getProtocolFee() external view {
    uint256 protocolFee = membership.getProtocolFee();
    uint256 fee = platformReqs.getMembershipFee();
    assertEq(protocolFee, fee);
  }

  function test_getProtocolFee_withPriceAboveMinPrice() external {
    vm.prank(founder);
    membership.setMembershipPrice(1 ether);

    uint256 price = membership.getMembershipPrice();
    uint256 protocolFee = membership.getProtocolFee();

    assertEq(
      protocolFee,
      BasisPoints.calculate(price, platformReqs.getMembershipBps())
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           LEGACY                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_joinSpaceWithLegacyMembership() external {
    MockLegacyMembership(address(membership)).joinSpaceLegacy(alice);

    assertEq(membershipToken.balanceOf(alice), 1);
    assertEq(alice.balance, 0);
  }

  function test_joinSpaceWithLegacyMembership_withEntitlementCheck()
    external
    givenJoinspaceHasAdditionalCrosschainEntitlements
  {
    MockLegacyMembership legacyMembership = MockLegacyMembership(
      address(membership)
    );

    vm.recordLogs();
    vm.prank(bob);
    legacyMembership.joinSpaceLegacy(bob);
    Vm.Log[] memory logs = vm.getRecordedLogs();

    (
      address resolverAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    ) = _getRequestV1EventData(logs);

    // posting to space
    IEntitlementGated entitlementGated = IEntitlementGated(resolverAddress);

    for (uint256 i = 0; i < 3; i++) {
      vm.prank(selectedNodes[i]);
      entitlementGated.postEntitlementCheckResult(
        transactionId,
        roleId,
        IEntitlementGatedBase.NodeVoteStatus.PASSED
      );
    }

    assertEq(membershipToken.balanceOf(bob), 1);
  }
}
