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
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

abstract contract EntitlementGatedBase is IEntitlementGatedBase {
  modifier onlyEntitlementChecker() {
    if (
      msg.sender != address(EntitlementGatedStorage.layout().entitlementChecker)
    ) {
      CustomRevert.revertWith(EntitlementGated_OnlyEntitlementChecker.selector);
    }
    _;
  }

  function _setEntitlementChecker(
    IEntitlementChecker entitlementChecker
  ) internal {
    EntitlementGatedStorage.layout().entitlementChecker = entitlementChecker;
  }

  function _requestEntitlementCheck(
    address callerAddress,
    bytes32 transactionId,
    IRuleEntitlement entitlement,
    uint256 roleId
  ) internal {
    if (callerAddress == address(0))
      CustomRevert.revertWith(EntitlementGated_InvalidAddress.selector);

    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();
    Transaction storage transaction = ds.transactions[transactionId];
    if (transaction.finalized) {
      uint256 _length = transaction.roleIds.length;
      for (uint256 i; i < _length; ++i) {
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

    if (!transaction.finalized) {
      transaction.finalized = true;
      transaction.entitlement = entitlement;
      transaction.clientAddress = callerAddress;
    }

    transaction.roleIds.push(roleId);

    uint256 length = selectedNodes.length;
    NodeVote[] storage nodeVotesForRole = transaction.nodeVotesArray[roleId];
    for (uint256 i; i < length; ++i) {
      nodeVotesForRole.push(
        NodeVote({node: selectedNodes[i], vote: NodeVoteStatus.NOT_VOTED})
      );
    }

    ds.entitlementChecker.requestEntitlementCheck(
      callerAddress,
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
      transaction.clientAddress == address(0) || transaction.finalized == false
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

    NodeVote[] storage nodeVotesForRole = transaction.nodeVotesArray[roleId];
    uint256 transactionNodesLength = nodeVotesForRole.length;

    for (uint256 i; i < transactionNodesLength; ++i) {
      NodeVote storage currentVote = nodeVotesForRole[i];

      // Update vote if not yet voted
      if (currentVote.node == msg.sender) {
        if (currentVote.vote != NodeVoteStatus.NOT_VOTED) {
          revert EntitlementGated_NodeAlreadyVoted();
        }
        currentVote.vote = result;
        found = true;
      }

      unchecked {
        NodeVoteStatus currentStatus = currentVote.vote;
        // Count votes
        if (currentStatus == NodeVoteStatus.PASSED) {
          ++passed;
        } else if (currentStatus == NodeVoteStatus.FAILED) {
          ++failed;
        }
      }
    }

    if (!found) {
      revert EntitlementGated_NodeNotFound();
    }

    if (
      passed > transactionNodesLength / 2 || failed > transactionNodesLength / 2
    ) {
      transaction.isCompleted[roleId] = true;
      NodeVoteStatus finalStatusForRole = passed > failed
        ? NodeVoteStatus.PASSED
        : NodeVoteStatus.FAILED;

      bool allRoleIdsCompleted = _checkAllRoleIdsCompleted(transactionId);

      if (finalStatusForRole == NodeVoteStatus.PASSED || allRoleIdsCompleted) {
        _onEntitlementCheckResultPosted(transactionId, finalStatusForRole);
        emit EntitlementCheckResultPosted(transactionId, finalStatusForRole);
      }

      if (allRoleIdsCompleted) {
        _removeTransaction(transactionId);
      }
    }
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           V2                               */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function _requestEntitlementCheckV2(
    address walletAddress,
    address senderAddress,
    bytes32 transactionId,
    IRuleEntitlement entitlement,
    uint256 requestId
  ) internal {
    if (walletAddress == address(0))
      CustomRevert.revertWith(EntitlementGated_InvalidAddress.selector);
    if (address(entitlement) == address(0))
      CustomRevert.revertWith(EntitlementGated_InvalidEntitlement.selector);

    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();
    Transaction storage transaction = ds.transactions[transactionId];

    transaction.finalized = true;
    transaction.entitlement = entitlement;

    bytes memory extraData = abi.encode(senderAddress);

    ds.entitlementChecker.requestEntitlementCheckV2{value: msg.value}(
      walletAddress,
      transactionId,
      requestId,
      extraData
    );
  }

  function _postEntitlementCheckResultV2(
    bytes32 transactionId,
    uint256,
    NodeVoteStatus result
  ) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();
    Transaction storage transaction = ds.transactions[transactionId];

    if (!transaction.finalized) {
      CustomRevert.revertWith(
        EntitlementGated_TransactionNotRegistered.selector
      );
    }

    emit EntitlementCheckResultPosted(transactionId, result);
    _onEntitlementCheckResultPosted(transactionId, result);
    _removeTransaction(transactionId);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Helpers                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _checkAllRoleIdsCompleted(
    bytes32 transactionId
  ) internal view returns (bool) {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];
    uint256 roleIdsLength = transaction.roleIds.length;
    for (uint256 i; i < roleIdsLength; ++i) {
      if (!transaction.isCompleted[transaction.roleIds[i]]) {
        return false;
      }
    }
    return true;
  }

  function _removeTransaction(bytes32 transactionId) internal {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];
    uint256 length = transaction.roleIds.length;
    for (uint256 i; i < length; ++i) {
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

    if (!transaction.finalized) {
      revert EntitlementGated_TransactionNotRegistered();
    }

    IRuleEntitlement re = IRuleEntitlement(address(transaction.entitlement));
    return re.getRuleData(roleId);
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
