// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

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
    mapping(uint256 => NodeVote[]) nodeVotesArray;
    mapping(uint256 => bool) isCompleted;
    IRuleEntitlement entitlement;
    uint256[] roleIds;
  }

  error EntitlementGated_InvalidAddress();
  error EntitlementGated_TransactionCheckAlreadyRegistered();
  error EntitlementGated_TransactionCheckAlreadyCompleted();
  error EntitlementGated_TransactionNotRegistered();
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
    uint256 roleId,
    NodeVoteStatus result
  ) external;

  function getRuleData(
    bytes32 transactionId,
    uint256 roleId
  ) external view returns (IRuleEntitlement.RuleData memory);
}
