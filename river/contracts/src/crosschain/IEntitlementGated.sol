// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";

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

  function getRuleData(
    bytes32 transactionId
  ) external view returns (IRuleEntitlement.RuleData memory);
}
