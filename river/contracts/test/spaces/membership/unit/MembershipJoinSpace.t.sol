// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {console2} from "forge-std/console2.sol";

//interfaces
import {IEntitlementGated} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";

//libraries
import {Vm} from "forge-std/Test.sol";

//contracts

contract MembershipJoinSpace is MembershipBaseSetup {
  mapping(address => bool) public postedResult;

  function toHexChar(uint8 _value) internal pure returns (bytes1) {
    return _value < 10 ? bytes1(_value + 48) : bytes1(_value + 87);
  }

  function bytes32ToString(
    bytes32 _bytes32
  ) public pure returns (string memory) {
    bytes memory buffer = new bytes(64);
    for (uint256 i = 0; i < 32; i++) {
      bytes1 currentByte = bytes1(_bytes32 << (i * 8));
      buffer[i * 2] = toHexChar(uint8(currentByte) / 16);
      buffer[i * 2 + 1] = toHexChar(uint8(currentByte) % 16);
    }
    return string(buffer);
  }

  function test_joinSpace() external givenAliceHasMintedMembership {
    assertEq(membership.balanceOf(alice), 1);
  }

  function test_revertWhen_joinSpaceWithZeroAddress() external {
    vm.prank(alice);
    vm.expectRevert(Membership__InvalidAddress.selector);
    membership.joinSpace(address(0));
  }

  function test_joinSpace_passWhen_CallerIsAlreadyMember() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(alice); // alice is the caller
    membership.joinSpace(bob);
  }

  function test_joinSpace_passWhen_CallerIsFounder() external {
    vm.prank(founder);
    membership.joinSpace(bob);
  }

  function test_joinSpace_revertWhen_ReceiverIsAlreadyMember() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(charlie);
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(alice);
  }

  function test_joinSpace_revertWhen_ReceiverIsCallerAndMember() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(alice);
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(alice);
  }

  function test_joinSpace_pass_crossChain() external {
    vm.prank(bob);

    bytes32 checkRequested = keccak256(
      "EntitlementCheckRequested(address,address,bytes32,address[])"
    );

    bytes32 resultPosted = keccak256(
      "EntitlementCheckResultPosted(bytes32,uint8)"
    );

    vm.recordLogs(); // Start recording logs
    membership.joinSpace(bob);
    Vm.Log[] memory requestLogs = vm.getRecordedLogs(); // Retrieve the recorded logs

    bool checkRequestedMatched = false;

    // Assuming you want to check the logs contain your event and capture the parameters
    for (uint i = 0; i < requestLogs.length; i++) {
      if (requestLogs[i].topics[0] == checkRequested) {
        (
          address callerAddress,
          address contractAddress,
          bytes32 transactionId,
          address[] memory selectedNodes
        ) = abi.decode(
            requestLogs[i].data,
            (address, address, bytes32, address[])
          );

        for (uint k = 0; k < 3; k++) {
          if (k == 2) {
            vm.recordLogs(); // Start recording logs
          }

          address currentNode = selectedNodes[k];

          vm.prank(currentNode);
          IEntitlementGated(contractAddress).postEntitlementCheckResult(
            transactionId,
            IEntitlementGatedBase.NodeVoteStatus.PASSED
          );
          postedResult[currentNode] = true;

          if (k == 2) {
            Vm.Log[] memory resultLogs = vm.getRecordedLogs(); // Retrieve the recorded logs
            for (uint l = 0; l < resultLogs.length; l++) {
              if (resultLogs[l].topics[0] == resultPosted) {
                checkRequestedMatched = true;
              }
            }
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
}
