// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IEntitlementGatedBase} from "./IEntitlementGated.sol";
import {IEntitlementChecker} from "./checker/IEntitlementChecker.sol";

// libraries
import {EntitlementGatedStorage} from "./EntitlementGatedStorage.sol";

// contracts

abstract contract EntitlementGatedBase is IEntitlementGatedBase {
  IEntitlementChecker internal entitlementChecker;

  modifier onlyEntitled() {
    require(true, "Not entitled to perform this operation");
    _;
  }

  function __EntitlementGatedBase_init(address checker) internal {
    if (checker == address(0)) {
      revert EntitlementGated_InvalidAddress();
    }

    entitlementChecker = IEntitlementChecker(checker);
  }

  function _requestEntitlementCheck() internal {
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );

    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    if (transaction.hasBenSet == true) {
      revert EntitlementGated_TransactionAlreadyRegistered();
    }

    address[] memory selectedNodes = entitlementChecker.getRandomNodes(
      5,
      address(this)
    );

    transaction.hasBenSet = true;
    transaction.clientAddress = msg.sender;
    transaction.checkResult = NodeVoteStatus.NOT_VOTED;
    transaction.isCompleted = false;

    for (uint256 i = 0; i < selectedNodes.length; i++) {
      transaction.nodeVotesArray.push(
        NodeVote({node: selectedNodes[i], vote: NodeVoteStatus.NOT_VOTED})
      );
    }

    entitlementChecker.emitEntitlementCheckRequested(
      transactionId,
      selectedNodes
    );
  }

  function _postEntitlementCheckResult(
    bytes32 transactionId,
    NodeVoteStatus result
  ) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    if (transaction.hasBenSet == false) {
      revert EntitlementGated_TransactionNotRegistered();
    }

    if (transaction.checkResult != NodeVoteStatus.NOT_VOTED) {
      revert EntitlementGated_TransactionAlreadyCompleted();
    }

    // find node in the array and update the vote, revert if node was not found
    bool found;

    for (uint256 i = 0; i < transaction.nodeVotesArray.length; i++) {
      NodeVote storage tempVote = transaction.nodeVotesArray[i];

      if (tempVote.node == msg.sender) {
        if (tempVote.vote != NodeVoteStatus.NOT_VOTED) {
          revert EntitlementGated_NodeAlreadyVoted();
        }
        found = true;
        tempVote.vote = result;
        break;
      }
    }

    if (found == false) {
      revert EntitlementGated_NodeNotFound();
    }

    // count the votes
    uint256 passed = 0;
    uint256 failed = 0;

    for (uint256 i = 0; i < transaction.nodeVotesArray.length; i++) {
      NodeVote storage tempVote = transaction.nodeVotesArray[i];

      if (tempVote.vote == NodeVoteStatus.PASSED) {
        passed++;
      } else if (tempVote.vote == NodeVoteStatus.FAILED) {
        failed++;
      }
    }

    if (!transaction.isCompleted) {
      if (passed > transaction.nodeVotesArray.length / 2) {
        transaction.isCompleted = true;
        transaction.checkResult = NodeVoteStatus.PASSED;
        emit EntitlementCheckResultPosted(transactionId, NodeVoteStatus.PASSED);
      } else if (failed > transaction.nodeVotesArray.length / 2) {
        transaction.checkResult = NodeVoteStatus.FAILED;
        transaction.isCompleted = true;
        emit EntitlementCheckResultPosted(transactionId, NodeVoteStatus.FAILED);
      }
    }
  }

  function _removeTransaction(bytes32 transactionId) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    delete ds.transactions[transactionId];
  }
}
