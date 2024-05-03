// SPDX-License-Identifier: Apache-2.0
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
    bytes memory encodedRuleData
  ) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    if (transaction.hasBenSet == true) {
      revert EntitlementGated_TransactionAlreadyRegistered();
    }

    // if the entitlement checker has not been set, set it
    if (address(ds.entitlementChecker) == address(0)) {
      _setFallbackEntitlementChecker();
    }

    address[] memory selectedNodes = ds.entitlementChecker.getRandomNodes(5);

    transaction.hasBenSet = true;
    transaction.clientAddress = msg.sender;
    transaction.isCompleted = false;
    transaction.encodedRuleData = encodedRuleData;

    for (uint256 i = 0; i < selectedNodes.length; i++) {
      transaction.nodeVotesArray.push(
        NodeVote({node: selectedNodes[i], vote: NodeVoteStatus.NOT_VOTED})
      );
    }

    ds.entitlementChecker.requestEntitlementCheck(
      msg.sender,
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

    if (transaction.clientAddress == address(0)) {
      revert EntitlementGated_TransactionNotRegistered();
    }

    if (transaction.isCompleted) {
      revert EntitlementGated_TransactionAlreadyCompleted();
    }

    if (transaction.hasBenSet == false) {
      revert EntitlementGated_TransactionNotRegistered();
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

    if (passed > transaction.nodeVotesArray.length / 2) {
      transaction.isCompleted = true;
      _onEntitlementCheckResultPosted(transactionId, NodeVoteStatus.PASSED);
      emit EntitlementCheckResultPosted(transactionId, NodeVoteStatus.PASSED);
      _removeTransaction(transactionId);
    } else if (failed > transaction.nodeVotesArray.length / 2) {
      transaction.isCompleted = true;
      _onEntitlementCheckResultPosted(transactionId, NodeVoteStatus.FAILED);
      emit EntitlementCheckResultPosted(transactionId, NodeVoteStatus.FAILED);
      _removeTransaction(transactionId);
    }
  }

  function _removeTransaction(bytes32 transactionId) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    delete transaction.nodeVotesArray;
    delete transaction.encodedRuleData;
    delete ds.transactions[transactionId];
  }

  function _getRuleData(
    bytes32 transactionId
  ) internal view returns (IRuleEntitlement.RuleData memory) {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    if (transaction.hasBenSet == false) {
      revert EntitlementGated_TransactionNotRegistered();
    }

    return abi.decode(transaction.encodedRuleData, (IRuleEntitlement.RuleData));
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
