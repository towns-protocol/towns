// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
  function getEntitlementOperations() external view returns (bytes memory);

  function requestEntitlementCheck() external;

  function postEntitlementCheckResult(
    bytes32 transactionId,
    NodeVoteStatus result
  ) external;

  function removeTransaction(bytes32 transactionId) external;
}
