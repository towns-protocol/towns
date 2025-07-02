// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IXChain, VotingContext, VoteResults} from "./IXChain.sol";
import {IEntitlementGated} from "src/spaces/facets/gated/IEntitlementGated.sol";

// libraries
import {XChainLib} from "./XChainLib.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {XChainCheckLib} from "./XChainCheckLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {EntitlementGated} from "src/spaces/facets/gated/EntitlementGated.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract XChain is IXChain, ReentrancyGuard, OwnableBase, Facet {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using CustomRevert for bytes4;
    using XChainCheckLib for XChainLib.Check;

    function __XChain_init() external onlyInitializing {
        _addInterface(type(IEntitlementGated).interfaceId);
    }

    /// @inheritdoc IXChain
    function isCheckCompleted(
        bytes32 transactionId,
        uint256 requestId
    ) external view returns (bool) {
        return XChainLib.layout().checks[transactionId].voteCompleted[requestId];
    }

    /// @inheritdoc IXChain
    function provideXChainRefund(address senderAddress, bytes32 transactionId) external onlyOwner {
        if (!XChainLib.layout().requestsBySender[senderAddress].remove(transactionId)) {
            EntitlementGated_TransactionCheckAlreadyCompleted.selector.revertWith();
        }

        XChainLib.Request storage request = XChainLib.layout().requests[transactionId];

        if (request.completed) {
            EntitlementGated_TransactionCheckAlreadyCompleted.selector.revertWith();
        }

        if (request.value == 0) {
            EntitlementGated_InvalidValue.selector.revertWith();
        }

        request.completed = true;

        XChainLib.Check storage check = XChainLib.layout().checks[transactionId];

        // clean up checks if any
        uint256 requestIdsLength = check.requestIds.length();
        if (requestIdsLength > 0) {
            for (uint256 i; i < requestIdsLength; ++i) {
                uint256 requestId = check.requestIds.at(i);
                check.voteCompleted[requestId] = true;
            }
        }

        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            address(this),
            senderAddress,
            request.value
        );
    }

    /// @inheritdoc IXChain
    function postEntitlementCheckResult(
        bytes32 transactionId,
        uint256 requestId,
        NodeVoteStatus result
    ) external nonReentrant {
        XChainLib.Request storage request = XChainLib.layout().requests[transactionId];
        XChainLib.Check storage check = XChainLib.layout().checks[transactionId];

        VotingContext memory context = check.validateVotingEligibility(
            request,
            transactionId,
            requestId
        );

        check.processNodeVote(requestId, result);
        VoteResults memory voteResults = check.calculateVoteResults(requestId);

        if (_hasReachedQuorum(voteResults)) {
            _completeVotingForRequest(context, requestId, voteResults.finalStatus);
        }
    }

    /// @notice Checks if quorum has been reached (more than half voted the same way)
    /// @param results The vote counting results
    /// @return hasQuorum True if quorum is reached
    function _hasReachedQuorum(VoteResults memory results) internal pure returns (bool hasQuorum) {
        uint256 quorumThreshold = results.totalNodes / 2;
        return results.passed > quorumThreshold || results.failed > quorumThreshold;
    }

    /// @notice Completes the voting for a specific request and finalizes the transaction
    /// @param context The voting context
    /// @param requestId The request identifier
    /// @param finalStatus The final voting status for this request
    function _completeVotingForRequest(
        VotingContext memory context,
        uint256 requestId,
        NodeVoteStatus finalStatus
    ) internal {
        // Mark this specific request as completed
        XChainLib.layout().checks[context.transactionId].voteCompleted[requestId] = true;

        // In V2, each entitlement check is independent - finalize immediately when voting completes
        _finalizeTransaction(context, finalStatus);
    }

    /// @notice Finalizes the transaction and calls back to the original caller
    /// @param context The voting context
    /// @param finalStatus The final status to report
    function _finalizeTransaction(
        VotingContext memory context,
        NodeVoteStatus finalStatus
    ) internal {
        // Mark transaction as completed and clean up
        XChainLib.layout().requests[context.transactionId].completed = true;
        XChainLib.layout().requestsBySender[context.caller].remove(context.transactionId);

        // Call back to the original caller with the result
        EntitlementGated(context.caller).postEntitlementCheckResultV2{value: context.value}(
            context.transactionId,
            0,
            finalStatus
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _checkAllRequestsCompleted(bytes32 transactionId) internal view returns (bool) {
        XChainLib.Check storage check = XChainLib.layout().checks[transactionId];

        uint256 requestIdsLength = check.requestIds.length();
        for (uint256 i; i < requestIdsLength; ++i) {
            if (!check.voteCompleted[check.requestIds.at(i)]) {
                return false;
            }
        }
        return true;
    }
}
