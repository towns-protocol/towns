// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "./IEntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IImplementationRegistry} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";

// libraries
import {EntitlementGatedStorage} from "./EntitlementGatedStorage.sol";
import {MembershipStorage} from "contracts/src/spaces/facets/membership/MembershipStorage.sol";

abstract contract EntitlementGatedBase is IEntitlementGatedBase {
  // Function to convert the first four bytes of bytes32 to a hex string of 8 characters
  /*
  function bytes32ToHexStringFirst8(
    bytes32 _data
  ) public pure returns (string memory) {
    bytes memory alphabet = "0123456789abcdef";
    bytes memory str = new bytes(8); // Since we need only the first 8 hex characters

    for (uint256 i = 0; i < 4; i++) {
      // Loop only through the first 4 bytes
      str[i * 2] = alphabet[uint256(uint8(_data[i] >> 4))];
      str[1 + i * 2] = alphabet[uint256(uint8(_data[i] & 0x0f))];
    }

    return string(str);
  }
  */

  function _setEntitlementChecker(
    IEntitlementChecker entitlementChecker
  ) internal {
    EntitlementGatedStorage.layout().entitlementChecker = entitlementChecker;
  }

  function _requestEntitlementCheck(
    bytes32 transactionId,
    IRuleEntitlement entitlement,
    uint256 roleId
  ) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    if (transaction.hasBenSet == true) {
      for (uint256 i = 0; i < transaction.roleIds.length; i++) {
        if (transaction.roleIds[i] == roleId) {
          revert EntitlementGated_TransactionCheckAlreadyRegistered();
        }
      }
    }

    // if the entitlement checker has not been set, set it
    if (address(ds.entitlementChecker) == address(0)) {
      _setFallbackEntitlementChecker();
    }

    address[] memory selectedNodes = ds.entitlementChecker.getRandomNodes(5);

    if (!transaction.hasBenSet) {
      transaction.hasBenSet = true;
      transaction.entitlement = entitlement;
      transaction.clientAddress = msg.sender;
    }

    transaction.roleIds.push(roleId);

    for (uint256 i = 0; i < selectedNodes.length; i++) {
      transaction.nodeVotesArray[roleId].push(
        NodeVote({node: selectedNodes[i], vote: NodeVoteStatus.NOT_VOTED})
      );
    }

    ds.entitlementChecker.requestEntitlementCheck(
      msg.sender,
      transactionId,
      roleId,
      selectedNodes
    );
  }

  function _postEntitlementCheckResult(
    bytes32 transactionId,
    uint256 roleId,
    NodeVoteStatus result
  ) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();
    Transaction storage transaction = ds.transactions[transactionId];

    if (
      transaction.clientAddress == address(0) || transaction.hasBenSet == false
    ) {
      revert EntitlementGated_TransactionNotRegistered();
    }

    if (transaction.isCompleted[roleId]) {
      revert EntitlementGated_TransactionCheckAlreadyCompleted();
    }

    // Find node in the array and update the vote, revert if node was not found.
    bool found;

    // count the votes
    uint256 passed = 0;
    uint256 failed = 0;

    uint256 transactionNodesLength = transaction.nodeVotesArray[roleId].length;

    for (uint256 i = 0; i < transactionNodesLength; i++) {
      NodeVote storage tempVote = transaction.nodeVotesArray[roleId][i];

      // Update vote if not yet voted
      if (tempVote.node == msg.sender) {
        if (tempVote.vote != NodeVoteStatus.NOT_VOTED) {
          revert EntitlementGated_NodeAlreadyVoted();
        }
        tempVote.vote = result;
        found = true;
      }

      // Count votes
      if (tempVote.vote == NodeVoteStatus.PASSED) {
        passed++;
      } else if (tempVote.vote == NodeVoteStatus.FAILED) {
        failed++;
      }
    }

    if (!found) {
      revert EntitlementGated_NodeNotFound();
    }

    if (
      passed > transactionNodesLength / 2 || failed > transactionNodesLength / 2
    ) {
      transaction.isCompleted[roleId] = true;
      NodeVoteStatus finalStatus = passed > failed
        ? NodeVoteStatus.PASSED
        : NodeVoteStatus.FAILED;
      _onEntitlementCheckResultPosted(transactionId, finalStatus);
      emit EntitlementCheckResultPosted(transactionId, finalStatus);
      _removeTransaction(transactionId);
    }
  }

  function _removeTransaction(bytes32 transactionId) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];
    for (uint256 i = 0; i < transaction.roleIds.length; i++) {
      delete transaction.nodeVotesArray[transaction.roleIds[i]];
    }
    delete transaction.roleIds;
    delete ds.transactions[transactionId];
  }

  function _getRuleData(
    bytes32 transactionId,
    uint256 roleId
  ) internal view returns (IRuleEntitlement.RuleData memory) {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    if (transaction.hasBenSet == false) {
      revert EntitlementGated_TransactionNotRegistered();
    }

    IRuleEntitlement re = IRuleEntitlement(address(transaction.entitlement));
    IRuleEntitlement.RuleData memory ruleData = re.getRuleData(roleId);

    return ruleData;
  }

  function _onEntitlementCheckResultPosted(
    bytes32 transactionId,
    NodeVoteStatus result
  ) internal virtual {}

  // TODO: This should be removed in the future when we wipe data
  function _setFallbackEntitlementChecker() internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();
    address entitlementChecker = IImplementationRegistry(
      MembershipStorage.layout().spaceFactory
    ).getLatestImplementation("SpaceOperator");
    ds.entitlementChecker = IEntitlementChecker(entitlementChecker);
  }
}
