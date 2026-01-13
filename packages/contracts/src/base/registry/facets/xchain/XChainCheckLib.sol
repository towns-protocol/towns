// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "../../../../spaces/facets/gated/IEntitlementGated.sol";
import {VoteResults, VotingContext} from "./IXChain.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {XChainLib} from "./XChainLib.sol";

library XChainCheckLib {
    using CustomRevert for bytes4;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    function validateVotingEligibility(
        XChainLib.Check storage self,
        XChainLib.Request storage request,
        bytes32 transactionId,
        uint256 requestId
    ) internal view returns (VotingContext memory context) {
        if (request.completed) {
            IEntitlementGatedBase
                .EntitlementGated_TransactionCheckAlreadyCompleted
                .selector
                .revertWith();
        }

        if (!self.requestIds.contains(requestId)) {
            IEntitlementGatedBase.EntitlementGated_RequestIdNotFound.selector.revertWith();
        }

        if (!self.nodes[requestId].contains(msg.sender)) {
            IEntitlementGatedBase.EntitlementGated_NodeNotFound.selector.revertWith();
        }

        if (self.voteCompleted[requestId]) {
            IEntitlementGatedBase
                .EntitlementGated_TransactionCheckAlreadyCompleted
                .selector
                .revertWith();
        }

        // Populate context with needed data
        context.transactionId = transactionId;
        context.caller = request.caller;
        context.value = request.value;
        context.completed = request.completed;
        // normalize address(0) to NATIVE_TOKEN for pre-upgrade requests
        address currency = request.currency;
        context.currency = currency == address(0) ? CurrencyTransfer.NATIVE_TOKEN : currency;
    }

    function processNodeVote(
        XChainLib.Check storage self,
        uint256 requestId,
        IEntitlementGatedBase.NodeVoteStatus result
    ) internal {
        uint256 voteCount = self.votes[requestId].length;
        bool voteRecorded = false;

        for (uint256 i; i < voteCount; ++i) {
            IEntitlementGatedBase.NodeVote storage currentVote = self.votes[requestId][i];

            if (currentVote.node == msg.sender) {
                if (currentVote.vote != IEntitlementGatedBase.NodeVoteStatus.NOT_VOTED) {
                    IEntitlementGatedBase.EntitlementGated_NodeAlreadyVoted.selector.revertWith();
                }
                currentVote.vote = result;
                voteRecorded = true;
                break; // Exit early once vote is recorded
            }
        }

        if (!voteRecorded) {
            IEntitlementGatedBase.EntitlementGated_NodeNotFound.selector.revertWith();
        }
    }

    function calculateVoteResults(
        XChainLib.Check storage self,
        uint256 requestId
    ) internal view returns (VoteResults memory results) {
        uint256 voteCount = self.votes[requestId].length;
        results.totalNodes = self.nodes[requestId].length();

        for (uint256 i; i < voteCount; ++i) {
            IEntitlementGatedBase.NodeVote storage vote = self.votes[requestId][i];

            if (vote.vote == IEntitlementGatedBase.NodeVoteStatus.PASSED) {
                unchecked {
                    ++results.passed;
                }
            } else if (vote.vote == IEntitlementGatedBase.NodeVoteStatus.FAILED) {
                unchecked {
                    ++results.failed;
                }
            }
        }

        results.finalStatus = results.passed > results.failed
            ? IEntitlementGatedBase.NodeVoteStatus.PASSED
            : IEntitlementGatedBase.NodeVoteStatus.FAILED;
    }
}
