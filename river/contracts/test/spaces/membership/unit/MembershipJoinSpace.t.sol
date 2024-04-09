// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {console2} from "forge-std/console2.sol";

//interfaces
import {IEntitlementGated} from "contracts/src/crosschain/IEntitlementGated.sol";
import {IEntitlementGatedBase} from "contracts/src/crosschain/IEntitlementGated.sol";
//libraries
import {Vm} from "forge-std/Test.sol";

//contracts

contract MembershipJoinSpace is MembershipBaseSetup {
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

  function test_revertWhen_CallerIsAlreadyMember() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(alice); // alice is the caller
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(bob);
  }

  function test_revertWhen_ReceiverIsAlreadyMember() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(charlie);
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(alice);
  }

  function test_joinSpace_pass_crossChain() external {
    vm.prank(bob);

    bytes32 checkRequested = keccak256(
      "EntitlementCheckRequested(address,bytes32,address[],address)"
    );

    bytes32 resultPosted = keccak256(
      "EntitlementCheckResultPosted(bytes32,uint8)"
    );

    vm.recordLogs(); // Start recording logs
    membership.joinSpace(bob);
    Vm.Log[] memory requestLogs = vm.getRecordedLogs(); // Retrieve the recorded logs

    console2.log("requestLogs", requestLogs.length);
    bool checkRequestedMatched = false;

    // Assuming you want to check the logs contain your event and capture the parameters
    for (uint i = 0; i < requestLogs.length; i++) {
      console2.log(
        "checkRequested",
        bytes32ToString(checkRequested),
        bytes32ToString(requestLogs[i].topics[0]),
        requestLogs[i].topics[0] == checkRequested
      );
      // Compare the event signature to find your event
      if (requestLogs[i].topics[0] == checkRequested) {
        console2.log("checkRequested matched", bytes32ToString(checkRequested));
        /*
        // Decode indexed parameters from topics
        address callerAddress = address(
          uint160(uint256(requestLogs[i].topics[1]))
        );
        */
        // Decode non-indexed parameters from data
        (
          bytes32 transactionId,
          address[] memory selectedNodes,
          address contractAddress
        ) = abi.decode(requestLogs[i].data, (bytes32, address[], address));
        console2.log(
          "checkRequested contractAddress",
          contractAddress,
          bytes32ToString(transactionId)
        );

        console2.log("selectedNodes", selectedNodes.length);

        for (uint k = 0; k < 3; k++) {
          vm.prank(selectedNodes[k]);

          if (k == 2) {
            vm.recordLogs(); // Start recording logs

            //vm.expectEmit();
          }
          IEntitlementGated(contractAddress).postEntitlementCheckResult(
            transactionId,
            IEntitlementGatedBase.NodeVoteStatus.PASSED
          );
          if (k == 2) {
            Vm.Log[] memory resultLogs = vm.getRecordedLogs(); // Retrieve the recorded logs
            for (uint l = 0; l < resultLogs.length; l++) {
              // Compare the event signature to find your event
              if (resultLogs[l].topics[0] == resultPosted) {
                bytes32 transactionIdPosted = resultLogs[l].topics[1];
                console2.log(
                  "resultPosted",
                  bytes32ToString(transactionIdPosted),
                  bytes32ToString(transactionId)
                );
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

  function test_joinSpace_revert_already_member() external {
    vm.prank(alice);
    membership.joinSpace(alice);

    vm.prank(alice);
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinSpace(bob);
  }
}
