// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {console2} from "forge-std/console2.sol";

import {IEntitlementChecker} from "./IEntitlementChecker.sol";
import {IEntitlementCheckerEvents} from "./IEntitlementCheckerEvents.sol";
import {IEntitlementGated} from "./IEntitlementGated.sol";

import {EntitlementChecker} from "./EntitlementChecker.sol";
import {Bytes32ToHexString} from "../utils/Bytes32ToHexString.sol";

abstract contract EntitlementGated is
  IEntitlementGated,
  IEntitlementCheckerEvents
{
  constructor(IEntitlementChecker assignedEntitlementChecker) {
    require(
      address(assignedEntitlementChecker) != address(0),
      "EntitlementChecker address cannot be 0"
    );
    entitlementChecker = assignedEntitlementChecker;
  }

  IEntitlementChecker private entitlementChecker;
  modifier onlyEntitled() {
    require(true, "Not entitled to perform this operation");
    _;
  }

  // getEntitlementOperations returns the entitlement operations for this contract
  function getEntitlementOperations()
    public
    view
    virtual
    returns (bytes memory);

  struct NodeVote {
    address node;
    IEntitlementCheckerEvents.NodeVoteStatus vote;
  }

  struct Transaction {
    bool hasBenSet;
    address clientAddress;
    IEntitlementCheckerEvents.NodeVoteStatus checkResult;
    bool isCompleted;
    NodeVote[] nodeVotesArray;
  }

  mapping(bytes32 => Transaction) public transactions;

  function requestEntitlementCheck() external returns (bool) {
    // Caller may only make one request per block, per contract
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );
    Transaction storage transaction = transactions[transactionId];

    require(transaction.hasBenSet == false, "Transaction already registered");

    address[] memory selectedNodes = entitlementChecker.getRandomNodes(
      5,
      address(this)
    );

    transaction.hasBenSet = true;
    transaction.clientAddress = msg.sender;
    transaction.checkResult = IEntitlementCheckerEvents
      .NodeVoteStatus
      .NOT_VOTED;
    transaction.isCompleted = false;

    for (uint256 i = 0; i < selectedNodes.length; i++) {
      transaction.nodeVotesArray.push(
        NodeVote({
          node: selectedNodes[i],
          vote: IEntitlementCheckerEvents.NodeVoteStatus.NOT_VOTED
        })
      );
    }

    entitlementChecker.emitEntitlementCheckRequested(
      transactionId,
      selectedNodes
    );

    console2.log(
      "requestEntitlementCheck created",
      Bytes32ToHexString.bytes32ToHexString(transactionId)
    );

    return true;
  }

  function postEntitlementCheckResult(
    bytes32 transactionId,
    IEntitlementCheckerEvents.NodeVoteStatus result
  ) external returns (bool) {
    Transaction storage transaction = transactions[transactionId];
    require(transaction.hasBenSet == true, "Transaction not registered");

    if (result == IEntitlementCheckerEvents.NodeVoteStatus.NOT_VOTED) {
      revert("Invalid vote");
    }

    int256 found = -1;
    // find the index of the node and update the vote
    for (uint256 i = 0; i < transaction.nodeVotesArray.length; i++) {
      NodeVote storage tempVote = transaction.nodeVotesArray[i];

      if (tempVote.node == msg.sender) {
        if (
          tempVote.vote != IEntitlementCheckerEvents.NodeVoteStatus.NOT_VOTED
        ) {
          revert("Node already voted");
        }
        found = int256(i);
        tempVote.vote = result;
        break;
      }
    }
    require(found > -1, "postEntitlementCheckResult Node not found");

    uint pass = 0;
    uint fail = 0;
    for (uint256 i = 0; i < transaction.nodeVotesArray.length; i++) {
      NodeVote memory vote = transaction.nodeVotesArray[i];

      if (vote.vote == IEntitlementCheckerEvents.NodeVoteStatus.PASSED) {
        ++pass;
      } else if (vote.vote == IEntitlementCheckerEvents.NodeVoteStatus.FAILED) {
        ++fail;
      } else {}
    }

    if (!transaction.isCompleted) {
      if (pass > transaction.nodeVotesArray.length / 2) {
        transaction.isCompleted = true;
        transaction.checkResult = IEntitlementCheckerEvents
          .NodeVoteStatus
          .PASSED;
        console2.log(
          "postEntitlementCheckResult result emit EntitlementCheckResultPosted PASSED",
          Bytes32ToHexString.bytes32ToHexString(transactionId),
          block.number
        );
        // Emit the event to notify that the result has been posted
        emit IEntitlementCheckerEvents.EntitlementCheckResultPosted(
          transactionId,
          transaction.checkResult
        );
      }
      if (fail > transaction.nodeVotesArray.length / 2) {
        transaction.isCompleted = true;
        transaction.checkResult = IEntitlementCheckerEvents
          .NodeVoteStatus
          .FAILED;

        console2.log(
          "postEntitlementCheckResult result emit EntitlementCheckResultPosted FAILED",
          Bytes32ToHexString.bytes32ToHexString(transactionId),
          block.number
        );
        // Emit the event to notify that the result has been posted
        emit IEntitlementCheckerEvents.EntitlementCheckResultPosted(
          transactionId,
          transaction.checkResult
        );
      }
    }

    return true;
  }

  function deleteTransaction(bytes32 transactionId) external returns (bool) {
    require(
      transactions[transactionId].clientAddress != address(0),
      "Transaction does not exist"
    );

    delete transactions[transactionId];

    return true;
  }
}
