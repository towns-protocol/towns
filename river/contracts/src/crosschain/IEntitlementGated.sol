// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IEntitlementGatedBase {
  enum NodeVoteStatus {
    NOT_VOTED,
    PASSED,
    FAILED
  }

  struct NodeVote {
    address node;
    NodeVoteStatus vote;
  }

  struct Transaction {
    bool hasBenSet;
    address clientAddress;
    NodeVoteStatus checkResult;
    bool isCompleted;
    NodeVote[] nodeVotesArray;
    bytes encodedRuleData;
  }

  error EntitlementGated_InvalidAddress();
  error EntitlementGated_TransactionAlreadyRegistered();
  error EntitlementGated_TransactionNotRegistered();
  error EntitlementGated_TransactionAlreadyCompleted();
  error EntitlementGated_NodeNotFound();
  error EntitlementGated_NodeAlreadyVoted();

  event EntitlementCheckResultPosted(
    bytes32 indexed transactionId,
    NodeVoteStatus result
  );
}

interface IEntitlementGated is IEntitlementGatedBase {
  function postEntitlementCheckResult(
    bytes32 transactionId,
    NodeVoteStatus result
  ) external;

  // For testing purposes
  function requestEntitlementCheck() external returns (bytes32);
}
