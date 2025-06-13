// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IXChain} from "./IXChain.sol";
import {IEntitlementGated} from "src/spaces/facets/gated/IEntitlementGated.sol";

// libraries
import {XChainLib} from "./XChainLib.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts

import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {EntitlementGated} from "src/spaces/facets/gated/EntitlementGated.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract XChain is IXChain, ReentrancyGuard, OwnableBase, Facet {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

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
            revert EntitlementGated_TransactionCheckAlreadyCompleted();
        }

        XChainLib.Request storage request = XChainLib.layout().requests[transactionId];

        if (request.completed) {
            revert EntitlementGated_TransactionCheckAlreadyCompleted();
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

        // Transfer ETH from this contract (EntitlementChecker) to the receiver
        // Since this function is called on the BaseRegistry but ETH is stored here,
        // we need to transfer from address(this) which is the diamond contract
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

        if (request.completed) {
            revert EntitlementGated_TransactionCheckAlreadyCompleted();
        }

        XChainLib.Check storage check = XChainLib.layout().checks[transactionId];

        if (!check.requestIds.contains(requestId)) {
            CustomRevert.revertWith(EntitlementGated_RequestIdNotFound.selector);
        }

        if (!check.nodes[requestId].contains(msg.sender)) {
            CustomRevert.revertWith(EntitlementGated_NodeNotFound.selector);
        }

        if (check.voteCompleted[requestId]) {
            CustomRevert.revertWith(EntitlementGated_TransactionCheckAlreadyCompleted.selector);
        }

        bool found;
        uint256 passed = 0;
        uint256 failed = 0;

        uint256 transactionNodesLength = check.nodes[requestId].length();

        for (uint256 i; i < transactionNodesLength; ++i) {
            NodeVote storage currentVote = check.votes[requestId][i];

            // Update vote if not yet voted
            if (currentVote.node == msg.sender) {
                if (currentVote.vote != NodeVoteStatus.NOT_VOTED) {
                    revert EntitlementGated_NodeAlreadyVoted();
                }
                currentVote.vote = result;
                found = true;
            }

            unchecked {
                if (currentVote.vote == NodeVoteStatus.PASSED) {
                    ++passed;
                } else if (currentVote.vote == NodeVoteStatus.FAILED) {
                    ++failed;
                }
            }
        }

        if (!found) {
            revert EntitlementGated_NodeNotFound();
        }

        if (passed > transactionNodesLength / 2 || failed > transactionNodesLength / 2) {
            check.voteCompleted[requestId] = true;
            NodeVoteStatus finalStatusForRole = passed > failed
                ? NodeVoteStatus.PASSED
                : NodeVoteStatus.FAILED;

            bool allRoleIdsCompleted = _checkAllRequestsCompleted(transactionId);

            if (finalStatusForRole == NodeVoteStatus.PASSED || allRoleIdsCompleted) {
                request.completed = true;
                XChainLib.layout().requestsBySender[request.caller].remove(transactionId);
                EntitlementGated(request.caller).postEntitlementCheckResultV2{value: request.value}(
                    transactionId,
                    0,
                    finalStatusForRole
                );
            }
        }
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
