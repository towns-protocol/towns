// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IReputationRegistryBase} from "../../src/apps/facets/reputation/IReputationRegistry.sol";

// contracts
import {AppRegistryBaseTest} from "./AppRegistryBase.t.sol";

contract ReputationRegistryTest is AppRegistryBaseTest, IReputationRegistryBase {
    uint8 internal DEFAULT_RATING = 100;
    bytes32 internal DEFAULT_TAG1 = bytes32("moderation");
    bytes32 internal DEFAULT_TAG2 = bytes32("performance");
    string internal DEFAULT_COMMENT = "A great app!";
    bytes32 internal DEFAULT_COMMENT_HASH = bytes32(keccak256(abi.encodePacked(DEFAULT_COMMENT)));

    modifier givenFeedbackIsGiven() {
        uint256 agentId = simpleApp.getAgentId();

        vm.startPrank(founder);
        vm.expectEmit(address(reputationRegistry));
        emit NewFeedback(
            agentId,
            founder,
            DEFAULT_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );
        reputationRegistry.giveFeedback(
            agentId,
            DEFAULT_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );
        vm.stopPrank();

        _;
    }

    function test_getIdentityRegistry() external view {
        assertEq(
            address(identityRegistry),
            reputationRegistry.getIdentityRegistry(),
            "Identity registry should be the same as the app registry"
        );
    }

    function test_giveFeedback()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenFeedbackIsGiven
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        (
            uint8 ratingResponse,
            bytes32 tag1Response,
            bytes32 tag2Response,
            bool isRevoked
        ) = reputationRegistry.readFeedback(agentId, founder, feedbackIndex);

        address[] memory clients = reputationRegistry.getClients(agentId);

        assertEq(ratingResponse, DEFAULT_RATING, "Rating should be 100");
        assertEq(tag1Response, DEFAULT_TAG1, "Tag1 should be moderation");
        assertEq(tag2Response, DEFAULT_TAG2, "Tag2 should be performance");
        assertEq(isRevoked, false, "Feedback should not be revoked");
        assertContains(clients, founder);
    }

    function test_revokeFeedback()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenFeedbackIsGiven
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        vm.prank(founder);
        reputationRegistry.revokeFeedback(agentId, feedbackIndex);

        (, , , bool isRevokedResponse) = reputationRegistry.readFeedback(
            agentId,
            founder,
            feedbackIndex
        );
        assertEq(isRevokedResponse, true, "Feedback should be revoked");
    }

    function test_appendResponse()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenFeedbackIsGiven
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        string memory response = "Thank you for your feedback!";
        bytes32 responseHash = bytes32(keccak256(abi.encodePacked(response)));

        vm.prank(DEFAULT_DEV);
        vm.expectEmit(address(reputationRegistry));
        emit ResponseAppended(agentId, founder, feedbackIndex, DEFAULT_DEV, response, responseHash);
        reputationRegistry.appendResponse(agentId, founder, feedbackIndex, response, responseHash);
    }
}
