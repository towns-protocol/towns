// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IReputationRegistryBase} from "./IReputationRegistry.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {ReputationRegistryStorage} from "./ReputationRegistryStorage.sol";
import {SignatureCheckerLib} from "solady/utils/SignatureCheckerLib.sol";
import {AttestationRequest, RevocationRequestData, Attestation} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {AttestationBase} from "../attest/AttestationBase.sol";

abstract contract ReputationRegistryBase is IReputationRegistryBase, ERC721ABase, AttestationBase {
    using CustomRevert for bytes4;
    using ReputationRegistryStorage for ReputationRegistryStorage.Layout;
    using SignatureCheckerLib for address;
    using SignatureCheckerLib for bytes32;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    struct CachedFeedback {
        address client;
        uint8 rating;
        bool revoked;
        bytes32 tag1;
        bytes32 tag2;
    }

    struct AllFeedback {
        address[] clients;
        uint8[] scores;
        bytes32[] tag1s;
        bytes32[] tag2s;
        bool[] revokedStatuses;
    }

    bytes32 constant EMPTY_TAG = bytes32(0);

    error Reputation__InvalidScore();
    error Reputation__AgentNotExists();
    error Reputation__SelfFeedbackNotAllowed();
    error Reputation__InvalidSignature();
    error Reputation__InvalidSignerAddress();
    error Reputation__InvalidFeedbackIndex();

    function _giveFeedback(uint256 agentId, Feedback memory feedback) internal {
        if (feedback.rating > 100) Reputation__InvalidScore.selector.revertWith();
        if (!_exists(agentId)) Reputation__AgentNotExists.selector.revertWith();

        address agentAddress = _ownerOf(agentId);
        _verifyNotSelfFeedback(agentAddress, agentId);

        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();
        uint64 currentIndex = $.lastIndex[agentId][msg.sender] + 1;
        $.lastIndex[agentId][msg.sender] = currentIndex;
        $.clients[agentId].add(msg.sender);

        bytes32 attestationId = _createAttestation($.feedbackSchemaId, agentAddress, feedback);
        $.feedback[agentId][msg.sender][currentIndex] = attestationId;
    }

    /// @notice Revokes a feedback
    /// @param agentId The ID of the agent
    /// @param feedbackIndex The index of the feedback
    function _revokeFeedback(uint256 agentId, uint64 feedbackIndex) internal {
        if (feedbackIndex == 0) Reputation__InvalidFeedbackIndex.selector.revertWith();
        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();
        if (feedbackIndex > $.lastIndex[agentId][msg.sender])
            Reputation__InvalidFeedbackIndex.selector.revertWith();

        bytes32 attestationId = $.feedback[agentId][msg.sender][feedbackIndex];
        if (attestationId == EMPTY_UID) Reputation__InvalidFeedbackIndex.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = attestationId;

        _revoke($.feedbackSchemaId, request, msg.sender, 0, true);

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /// @notice Appends a response to a feedback
    /// @param agentId The ID of the agent
    /// @param reviewerAddress The address of the feedback reviewer
    /// @param feedbackIndex The index of the feedback
    /// @param comment The comment of the response
    /// @param commentHash The hash of the comment
    function _appendResponse(
        uint256 agentId,
        address reviewerAddress,
        uint64 feedbackIndex,
        string calldata comment,
        bytes32 commentHash
    ) internal {
        if (feedbackIndex == 0) Reputation__InvalidFeedbackIndex.selector.revertWith();

        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();
        if (feedbackIndex > $.lastIndex[agentId][reviewerAddress])
            Reputation__InvalidFeedbackIndex.selector.revertWith();

        bytes32 attestationId = $.feedback[agentId][reviewerAddress][feedbackIndex];
        if (attestationId == EMPTY_UID) Reputation__InvalidFeedbackIndex.selector.revertWith();

        $.responders[agentId][reviewerAddress][feedbackIndex].add(msg.sender);
        $.responseCount[agentId][reviewerAddress][feedbackIndex][msg.sender]++;

        emit ResponseAppended(
            agentId,
            reviewerAddress,
            feedbackIndex,
            msg.sender,
            comment,
            commentHash
        );
    }

    function _createAttestation(
        bytes32 schemaId,
        address recipient,
        Feedback memory feedback
    ) internal returns (bytes32 attestationId) {
        AttestationRequest memory request;
        request.schema = schemaId;
        request.data.recipient = recipient;
        request.data.revocable = true;
        request.data.refUID = EMPTY_UID;
        request.data.data = abi.encode(feedback);
        return _attest(msg.sender, 0, request).uid;
    }

    function _getLastIndex(
        uint256 agentId,
        address reviewerAddress
    ) internal view returns (uint64) {
        return ReputationRegistryStorage.getLayout().lastIndex[agentId][reviewerAddress];
    }

    function _readFeedback(
        uint256 agentId,
        address reviewerAddress,
        uint64 feedbackIndex
    ) internal view returns (Feedback memory feedback, bool isRevoked) {
        if (feedbackIndex == 0) Reputation__InvalidFeedbackIndex.selector.revertWith();

        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();
        if (feedbackIndex > $.lastIndex[agentId][reviewerAddress])
            Reputation__InvalidFeedbackIndex.selector.revertWith();

        bytes32 attestationId = $.feedback[agentId][reviewerAddress][feedbackIndex];
        if (attestationId == EMPTY_UID) Reputation__InvalidFeedbackIndex.selector.revertWith();

        Attestation memory attestation = _getAttestation(attestationId);
        feedback = abi.decode(attestation.data, (Feedback));
        return (feedback, attestation.revocationTime != 0);
    }

    function _getSummary(
        uint256 agentId,
        address[] calldata reviewers,
        bytes32 tag1,
        bytes32 tag2
    ) internal view returns (uint64 count, uint8 averageRating) {
        address[] memory clients;

        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();

        if (reviewers.length > 0) clients = reviewers;
        else clients = $.clients[agentId].values();

        uint256 totalRating;
        for (uint256 i; i < clients.length; ++i) {
            uint64 lastIndex = $.lastIndex[agentId][clients[i]];
            for (uint64 j = 1; j <= lastIndex; ++j) {
                bytes32 attestationId = $.feedback[agentId][clients[i]][j];
                if (attestationId == EMPTY_UID) continue;
                Attestation memory attestation = _getAttestation(attestationId);
                if (attestation.revocationTime != 0) continue;

                Feedback memory feedback = abi.decode(attestation.data, (Feedback));
                if (tag1 != EMPTY_TAG && feedback.tag1 != tag1) continue;
                if (tag2 != EMPTY_TAG && feedback.tag2 != tag2) continue;
                totalRating += feedback.rating;
                count++;
            }
        }

        averageRating = count > 0 ? uint8(totalRating / count) : 0;
    }

    function _readAllFeedback(
        uint256 agentId,
        address[] calldata reviewers,
        bytes32 tag1,
        bytes32 tag2,
        bool includeRevoked
    ) internal view returns (AllFeedback memory allFeedback) {
        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();
        address[] memory clientList = reviewers.length > 0
            ? reviewers
            : $.clients[agentId].values();

        uint256 maxCount = _estimateMaxFeedback(agentId, clientList, $);
        CachedFeedback[] memory cache = new CachedFeedback[](maxCount);

        uint256 totalCount = _populateCache(
            cache,
            agentId,
            clientList,
            tag1,
            tag2,
            includeRevoked,
            $
        );

        allFeedback.clients = new address[](totalCount);
        allFeedback.scores = new uint8[](totalCount);
        allFeedback.tag1s = new bytes32[](totalCount);
        allFeedback.tag2s = new bytes32[](totalCount);
        allFeedback.revokedStatuses = new bool[](totalCount);

        for (uint256 i; i < totalCount; ++i) {
            allFeedback.clients[i] = cache[i].client;
            allFeedback.scores[i] = cache[i].rating;
            allFeedback.tag1s[i] = cache[i].tag1;
            allFeedback.tag2s[i] = cache[i].tag2;
            allFeedback.revokedStatuses[i] = cache[i].revoked;
        }
    }

    function _getResponseCount(
        uint256 agentId,
        address reviewerAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) internal view returns (uint256 count) {
        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();

        if (reviewerAddress == address(0)) {
            return _countAllClientsResponses(agentId, responders, $);
        }

        if (feedbackIndex == 0) {
            return _countReviewerAllFeedback(agentId, reviewerAddress, responders, $);
        }

        return _countSingleFeedback(agentId, reviewerAddress, feedbackIndex, responders, $);
    }

    function _getClients(uint256 agentId) internal view returns (address[] memory) {
        return ReputationRegistryStorage.getLayout().clients[agentId].values();
    }

    function _verifyNotSelfFeedback(address agent, uint256 agentId) internal view {
        if (
            msg.sender == agent ||
            _isApprovedForAll(agent, msg.sender) ||
            _getApproved(agentId) == msg.sender
        ) {
            Reputation__SelfFeedbackNotAllowed.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Private Functions                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _populateCache(
        CachedFeedback[] memory cache,
        uint256 agentId,
        address[] memory clientList,
        bytes32 tag1,
        bytes32 tag2,
        bool includeRevoked,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 count) {
        uint256 clientListLength = clientList.length;

        for (uint256 i; i < clientListLength; ++i) {
            count = _processFeedbackForClient(
                cache,
                count,
                agentId,
                clientList[i],
                tag1,
                tag2,
                includeRevoked,
                $
            );
        }
    }

    function _processFeedbackForClient(
        CachedFeedback[] memory cache,
        uint256 currentCount,
        uint256 agentId,
        address client,
        bytes32 tag1,
        bytes32 tag2,
        bool includeRevoked,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 newCount) {
        newCount = currentCount;
        uint64 lastIndex = $.lastIndex[agentId][client];

        for (uint64 j = 1; j <= lastIndex; ++j) {
            bytes32 attestationId = $.feedback[agentId][client][j];

            if (attestationId != EMPTY_UID) {
                Attestation memory att = _getAttestation(attestationId);

                if (includeRevoked || att.revocationTime == 0) {
                    Feedback memory fdbk = abi.decode(att.data, (Feedback));

                    if (
                        (tag1 == EMPTY_TAG || fdbk.tag1 == tag1) &&
                        (tag2 == EMPTY_TAG || fdbk.tag2 == tag2)
                    ) {
                        cache[newCount] = CachedFeedback({
                            client: client,
                            rating: fdbk.rating,
                            tag1: fdbk.tag1,
                            tag2: fdbk.tag2,
                            revoked: att.revocationTime != 0
                        });
                        ++newCount;
                    }
                }
            }
        }
    }

    function _countAllClientsResponses(
        uint256 agentId,
        address[] calldata responders,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 count) {
        address[] memory clients = $.clients[agentId].values();
        uint256 clientsLength = clients.length;

        if (responders.length == 0) {
            for (uint256 i; i < clientsLength; ++i) {
                count += _countClientAllResponses(agentId, clients[i], $);
            }
        } else {
            for (uint256 i; i < clientsLength; ++i) {
                count += _countClientSpecificResponders(agentId, clients[i], responders, $);
            }
        }
    }

    function _countClientAllResponses(
        uint256 agentId,
        address client,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 count) {
        uint64 lastIdx = $.lastIndex[agentId][client];

        for (uint64 j = 1; j <= lastIdx; ++j) {
            address[] memory allResponders = $.responders[agentId][client][j].values();
            uint256 respondersLength = allResponders.length;

            for (uint256 k; k < respondersLength; ++k) {
                count += $.responseCount[agentId][client][j][allResponders[k]];
            }
        }
    }

    function _countClientSpecificResponders(
        uint256 agentId,
        address client,
        address[] calldata responders,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 count) {
        uint64 lastIdx = $.lastIndex[agentId][client];
        uint256 respondersLength = responders.length;

        for (uint64 j = 1; j <= lastIdx; ++j) {
            for (uint256 k; k < respondersLength; ++k) {
                count += $.responseCount[agentId][client][j][responders[k]];
            }
        }
    }

    function _countReviewerAllFeedback(
        uint256 agentId,
        address reviewerAddress,
        address[] calldata responders,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 count) {
        uint64 lastIdx = $.lastIndex[agentId][reviewerAddress];

        if (responders.length == 0) {
            for (uint64 j = 1; j <= lastIdx; ++j) {
                address[] memory allResponders = $.responders[agentId][reviewerAddress][j].values();
                uint256 respondersLength = allResponders.length;

                for (uint256 k; k < respondersLength; ++k) {
                    count += $.responseCount[agentId][reviewerAddress][j][allResponders[k]];
                }
            }
        } else {
            uint256 respondersLength = responders.length;

            for (uint64 j = 1; j <= lastIdx; ++j) {
                for (uint256 k; k < respondersLength; ++k) {
                    count += $.responseCount[agentId][reviewerAddress][j][responders[k]];
                }
            }
        }
    }

    function _countSingleFeedback(
        uint256 agentId,
        address reviewerAddress,
        uint64 feedbackIndex,
        address[] calldata responders,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 count) {
        if (responders.length == 0) {
            address[] memory allResponders = $
            .responders[agentId][reviewerAddress][feedbackIndex].values();
            uint256 respondersLength = allResponders.length;

            for (uint256 k; k < respondersLength; ++k) {
                count += $.responseCount[agentId][reviewerAddress][feedbackIndex][allResponders[k]];
            }
        } else {
            uint256 respondersLength = responders.length;

            for (uint256 k; k < respondersLength; ++k) {
                count += $.responseCount[agentId][reviewerAddress][feedbackIndex][responders[k]];
            }
        }
    }

    function _estimateMaxFeedback(
        uint256 agentId,
        address[] memory clientList,
        ReputationRegistryStorage.Layout storage $
    ) private view returns (uint256 maxCount) {
        for (uint256 i; i < clientList.length; ++i) {
            maxCount += $.lastIndex[agentId][clientList[i]];
        }
    }
}
