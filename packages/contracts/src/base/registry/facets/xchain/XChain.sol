// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGated} from "../../../../spaces/facets/gated/IEntitlementGated.sol";
import {IXChain, VotingContext, VoteResults} from "./IXChain.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {XChainCheckLib} from "./XChainCheckLib.sol";
import {XChainLib} from "./XChainLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

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
    function provideXChainRefund(address senderAddress, bytes32 transactionId) external onlyOwner {
        XChainLib.Layout storage layout = XChainLib.layout();

        if (!layout.requestsBySender[senderAddress].remove(transactionId)) {
            EntitlementGated_TransactionCheckAlreadyCompleted.selector.revertWith();
        }

        XChainLib.Request storage request = layout.requests[transactionId];

        if (request.completed) {
            EntitlementGated_TransactionCheckAlreadyCompleted.selector.revertWith();
        }

        if (request.value == 0) {
            EntitlementGated_InvalidValue.selector.revertWith();
        }

        request.completed = true;

        XChainLib.Check storage check = layout.checks[transactionId];

        // clean up checks if any
        uint256[] memory requestIds = check.requestIds.values();
        for (uint256 i; i < requestIds.length; ++i) {
            check.voteCompleted[requestIds[i]] = true;
        }

        // normalize address(0) to NATIVE_TOKEN for pre-upgrade requests
        address currency = request.currency;
        currency = currency == address(0) ? CurrencyTransfer.NATIVE_TOKEN : currency;
        // refund escrowed amount
        CurrencyTransfer.transferCurrency(currency, address(this), senderAddress, request.value);
    }

    /// @inheritdoc IXChain
    function postEntitlementCheckResult(
        bytes32 transactionId,
        uint256 requestId,
        NodeVoteStatus result
    ) external nonReentrant {
        XChainLib.Layout storage layout = XChainLib.layout();
        XChainLib.Request storage request = layout.requests[transactionId];
        XChainLib.Check storage check = layout.checks[transactionId];

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

    /// @inheritdoc IXChain
    function isCheckCompleted(
        bytes32 transactionId,
        uint256 requestId
    ) external view returns (bool) {
        return XChainLib.layout().checks[transactionId].voteCompleted[requestId];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
        XChainLib.Layout storage layout = XChainLib.layout();
        layout.requests[context.transactionId].completed = true;
        layout.requestsBySender[context.caller].remove(context.transactionId);

        // return escrowed funds to Space, then callback
        CurrencyTransfer.transferCurrency(
            context.currency,
            address(this),
            context.caller,
            context.value
        );
        IEntitlementGated(context.caller).postEntitlementCheckResultV2(
            context.transactionId,
            0,
            finalStatus
        );
    }

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

    /// @notice Checks if quorum has been reached (more than half voted the same way)
    /// @param results The vote counting results
    /// @return hasQuorum True if quorum is reached
    function _hasReachedQuorum(VoteResults memory results) internal pure returns (bool hasQuorum) {
        uint256 quorumThreshold = results.totalNodes / 2;
        return results.passed > quorumThreshold || results.failed > quorumThreshold;
    }
}
