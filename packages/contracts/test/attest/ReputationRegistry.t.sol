// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IReputationRegistryBase} from "../../src/apps/facets/reputation/IReputationRegistry.sol";

// contracts
import {AppRegistryBaseTest} from "./AppRegistryBase.t.sol";
import {ReputationRegistryBase} from "../../src/apps/facets/reputation/ReputationRegistryBase.sol";

contract ReputationRegistryTest is AppRegistryBaseTest, IReputationRegistryBase {
    uint8 internal DEFAULT_RATING = 100;
    bytes32 internal DEFAULT_TAG1 = bytes32("moderation");
    bytes32 internal DEFAULT_TAG2 = bytes32("performance");
    string internal DEFAULT_COMMENT = "A great app!";
    bytes32 internal DEFAULT_COMMENT_HASH = bytes32(keccak256(abi.encodePacked(DEFAULT_COMMENT)));

    uint8 internal HIGH_RATING = 90;
    uint8 internal LOW_RATING = 50;
    bytes32 internal ALTERNATIVE_TAG1 = bytes32("quality");
    bytes32 internal ALTERNATIVE_TAG2 = bytes32("speed");
    bytes32 internal EMPTY_TAG = bytes32(0);

    address internal SECOND_CLIENT;
    address internal THIRD_CLIENT;

    function setUp() public override {
        super.setUp();
        SECOND_CLIENT = _randomAddress();
        THIRD_CLIENT = _randomAddress();
    }

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

    modifier givenMultipleFeedbacksExist() {
        uint256 agentId = simpleApp.getAgentId();

        vm.prank(founder);
        reputationRegistry.giveFeedback(
            agentId,
            HIGH_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );

        vm.prank(founder);
        reputationRegistry.giveFeedback(
            agentId,
            LOW_RATING,
            ALTERNATIVE_TAG1,
            ALTERNATIVE_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );

        vm.prank(SECOND_CLIENT);
        reputationRegistry.giveFeedback(
            agentId,
            DEFAULT_RATING,
            DEFAULT_TAG1,
            ALTERNATIVE_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );

        _;
    }

    modifier givenResponsesExist() {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        vm.prank(DEFAULT_DEV);
        reputationRegistry.appendResponse(
            agentId,
            founder,
            feedbackIndex,
            "Thank you!",
            bytes32(keccak256("Thank you!"))
        );

        vm.prank(DEFAULT_DEV);
        reputationRegistry.appendResponse(
            agentId,
            founder,
            feedbackIndex,
            "Glad to help!",
            bytes32(keccak256("Glad to help!"))
        );

        vm.prank(SECOND_CLIENT);
        reputationRegistry.appendResponse(
            agentId,
            founder,
            feedbackIndex,
            "Great!",
            bytes32(keccak256("Great!"))
        );

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Error Condition Tests                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_giveFeedbackWithScoreAbove100()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
    {
        uint256 agentId = simpleApp.getAgentId();

        vm.prank(founder);
        vm.expectRevert(ReputationRegistryBase.Reputation__InvalidScore.selector);
        reputationRegistry.giveFeedback(
            agentId,
            101,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );
    }

    function test_revertWhen_giveFeedbackToNonExistentAgent() external givenSimpleAppIsRegistered {
        uint256 nonExistentAgentId = 999;

        vm.prank(founder);
        vm.expectRevert(ReputationRegistryBase.Reputation__AgentNotExists.selector);
        reputationRegistry.giveFeedback(
            nonExistentAgentId,
            DEFAULT_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );
    }

    function test_revertWhen_agentGivesFeedbackToSelf()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
    {
        uint256 agentId = simpleApp.getAgentId();

        vm.prank(SIMPLE_APP);
        vm.expectRevert(ReputationRegistryBase.Reputation__SelfFeedbackNotAllowed.selector);
        reputationRegistry.giveFeedback(
            agentId,
            DEFAULT_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );
    }

    function test_revertWhen_revokeFeedbackWithZeroIndex()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenFeedbackIsGiven
    {
        uint256 agentId = simpleApp.getAgentId();

        vm.prank(founder);
        vm.expectRevert(ReputationRegistryBase.Reputation__InvalidFeedbackIndex.selector);
        reputationRegistry.revokeFeedback(agentId, 0);
    }

    function test_revertWhen_revokeFeedbackWithIndexTooHigh()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenFeedbackIsGiven
    {
        uint256 agentId = simpleApp.getAgentId();

        vm.prank(founder);
        vm.expectRevert(ReputationRegistryBase.Reputation__InvalidFeedbackIndex.selector);
        reputationRegistry.revokeFeedback(agentId, 999);
    }

    function test_revertWhen_readFeedbackWithInvalidIndex()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
    {
        uint256 agentId = simpleApp.getAgentId();

        vm.expectRevert(ReputationRegistryBase.Reputation__InvalidFeedbackIndex.selector);
        reputationRegistry.readFeedback(agentId, founder, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    getSummary() Tests                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getSummary_withNoFilters()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyClients = new address[](0);

        (uint64 count, uint8 averageScore) = reputationRegistry.getSummary(
            agentId,
            emptyClients,
            EMPTY_TAG,
            EMPTY_TAG
        );

        assertEq(count, 3, "Should count all 3 feedbacks");
        assertEq(
            averageScore,
            (HIGH_RATING + LOW_RATING + DEFAULT_RATING) / 3,
            "Average should be correct"
        );
    }

    function test_getSummary_withTag1Filter()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyClients = new address[](0);

        (uint64 count, uint8 averageScore) = reputationRegistry.getSummary(
            agentId,
            emptyClients,
            DEFAULT_TAG1,
            EMPTY_TAG
        );

        assertEq(count, 2, "Should count only feedbacks with DEFAULT_TAG1");
        assertEq(
            averageScore,
            (HIGH_RATING + DEFAULT_RATING) / 2,
            "Average should match filtered feedbacks"
        );
    }

    function test_getSummary_withBothTagFilters()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyClients = new address[](0);

        (uint64 count, uint8 averageScore) = reputationRegistry.getSummary(
            agentId,
            emptyClients,
            DEFAULT_TAG1,
            DEFAULT_TAG2
        );

        assertEq(count, 1, "Should count only feedback matching both tags");
        assertEq(
            averageScore,
            HIGH_RATING,
            "Average should be the single matching feedback rating"
        );
    }

    function test_getSummary_excludesRevokedFeedback()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        vm.prank(founder);
        reputationRegistry.revokeFeedback(agentId, feedbackIndex);

        address[] memory emptyClients = new address[](0);
        (uint64 count, uint8 averageScore) = reputationRegistry.getSummary(
            agentId,
            emptyClients,
            EMPTY_TAG,
            EMPTY_TAG
        );

        assertEq(count, 2, "Should exclude revoked feedback");
        assertEq(
            averageScore,
            (HIGH_RATING + DEFAULT_RATING) / 2,
            "Average should exclude revoked"
        );
    }

    function test_getSummary_withSpecificClientAddresses()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory specificClients = new address[](1);
        specificClients[0] = founder;

        (uint64 count, uint8 averageScore) = reputationRegistry.getSummary(
            agentId,
            specificClients,
            EMPTY_TAG,
            EMPTY_TAG
        );

        assertEq(count, 2, "Should count only founder's feedbacks");
        assertEq(
            averageScore,
            (HIGH_RATING + LOW_RATING) / 2,
            "Average should be from founder only"
        );
    }

    function test_getSummary_withNoFeedback()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyClients = new address[](0);

        (uint64 count, uint8 averageScore) = reputationRegistry.getSummary(
            agentId,
            emptyClients,
            EMPTY_TAG,
            EMPTY_TAG
        );

        assertEq(count, 0, "Count should be 0 with no feedback");
        assertEq(averageScore, 0, "Average should be 0 with no feedback");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  readAllFeedback() Tests                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_readAllFeedback_returnsAllFields()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyClients = new address[](0);

        (
            address[] memory clients,
            uint8[] memory scores,
            bytes32[] memory tag1s,
            bytes32[] memory tag2s,
            bool[] memory revokedStatuses
        ) = reputationRegistry.readAllFeedback(agentId, emptyClients, EMPTY_TAG, EMPTY_TAG, false);

        assertEq(clients.length, 3, "Should return all clients");
        assertEq(scores.length, 3, "Should return all scores");
        assertEq(tag1s.length, 3, "Should return all tag1s");
        assertEq(tag2s.length, 3, "Should return all tag2s");
        assertEq(revokedStatuses.length, 3, "Should return all revoked statuses");
    }

    function test_readAllFeedback_withTag1Filter()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyClients = new address[](0);

        (
            address[] memory clients,
            uint8[] memory scores,
            bytes32[] memory tag1s,
            ,

        ) = reputationRegistry.readAllFeedback(
                agentId,
                emptyClients,
                DEFAULT_TAG1,
                EMPTY_TAG,
                false
            );

        assertEq(clients.length, 2, "Should return only feedbacks with DEFAULT_TAG1");
        assertEq(scores[0], HIGH_RATING, "First score should match");
        assertEq(scores[1], DEFAULT_RATING, "Second score should match");
        assertEq(tag1s[0], DEFAULT_TAG1, "Tag1 should match filter");
        assertEq(tag1s[1], DEFAULT_TAG1, "Tag1 should match filter");
    }

    function test_readAllFeedback_includesRevokedWhenTrue()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        vm.prank(founder);
        reputationRegistry.revokeFeedback(agentId, feedbackIndex);

        address[] memory emptyClients = new address[](0);
        (address[] memory clients, , , , bool[] memory revokedStatuses) = reputationRegistry
            .readAllFeedback(agentId, emptyClients, EMPTY_TAG, EMPTY_TAG, true);

        assertEq(clients.length, 3, "Should include all feedbacks including revoked");
        bool foundRevoked = false;
        for (uint256 i = 0; i < revokedStatuses.length; i++) {
            if (revokedStatuses[i]) {
                foundRevoked = true;
                break;
            }
        }
        assertTrue(foundRevoked, "Should have at least one revoked feedback");
    }

    function test_readAllFeedback_excludesRevokedWhenFalse()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        vm.prank(founder);
        reputationRegistry.revokeFeedback(agentId, feedbackIndex);

        address[] memory emptyClients = new address[](0);
        (address[] memory clients, , , , ) = reputationRegistry.readAllFeedback(
            agentId,
            emptyClients,
            EMPTY_TAG,
            EMPTY_TAG,
            false
        );

        assertEq(clients.length, 2, "Should exclude revoked feedback");
    }

    function test_readAllFeedback_withEmptyResult()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyClients = new address[](0);
        bytes32 nonExistentTag = bytes32("nonexistent");

        (address[] memory clients, , , , ) = reputationRegistry.readAllFeedback(
            agentId,
            emptyClients,
            nonExistentTag,
            nonExistentTag,
            false
        );

        assertEq(clients.length, 0, "Should return empty arrays when no matches");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 getResponseCount() Tests                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getResponseCount_forSingleFeedback()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenFeedbackIsGiven
        givenResponsesExist
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);
        address[] memory emptyResponders = new address[](0);

        uint256 count = reputationRegistry.getResponseCount(
            agentId,
            founder,
            feedbackIndex,
            emptyResponders
        );

        assertEq(count, 3, "Should count all 3 responses to this feedback");
    }

    function test_getResponseCount_forAllFeedbackFromReviewer()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
        givenResponsesExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyResponders = new address[](0);

        uint256 count = reputationRegistry.getResponseCount(agentId, founder, 0, emptyResponders);

        assertEq(count, 3, "Should count responses to all feedbacks from founder");
    }

    function test_getResponseCount_forAllClients()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
        givenResponsesExist
    {
        uint256 agentId = simpleApp.getAgentId();
        address[] memory emptyResponders = new address[](0);

        uint256 count = reputationRegistry.getResponseCount(
            agentId,
            address(0),
            0,
            emptyResponders
        );

        assertEq(count, 3, "Should count all responses across all clients");
    }

    function test_getResponseCount_withSpecificResponders()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenFeedbackIsGiven
        givenResponsesExist
    {
        uint256 agentId = simpleApp.getAgentId();
        uint64 feedbackIndex = reputationRegistry.getLastIndex(agentId, founder);

        address[] memory specificResponders = new address[](1);
        specificResponders[0] = DEFAULT_DEV;

        uint256 count = reputationRegistry.getResponseCount(
            agentId,
            founder,
            feedbackIndex,
            specificResponders
        );

        assertEq(count, 2, "Should count only DEFAULT_DEV's responses");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*           getClients() and getLastIndex() Tests            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getClients_returnsAllUniqueClients()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
        givenMultipleFeedbacksExist
    {
        uint256 agentId = simpleApp.getAgentId();

        address[] memory clients = reputationRegistry.getClients(agentId);

        assertEq(clients.length, 2, "Should return 2 unique clients");
        assertContains(clients, founder);
        assertContains(clients, SECOND_CLIENT);
    }

    function test_getLastIndex_incrementsPerFeedback()
        external
        givenSimpleAppIsRegistered
        givenAppIsPromoted
    {
        uint256 agentId = simpleApp.getAgentId();

        uint64 initialIndex = reputationRegistry.getLastIndex(agentId, founder);
        assertEq(initialIndex, 0, "Initial index should be 0");

        vm.prank(founder);
        reputationRegistry.giveFeedback(
            agentId,
            DEFAULT_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );

        uint64 afterFirstFeedback = reputationRegistry.getLastIndex(agentId, founder);
        assertEq(afterFirstFeedback, 1, "Index should be 1 after first feedback");

        vm.prank(founder);
        reputationRegistry.giveFeedback(
            agentId,
            HIGH_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );

        uint64 afterSecondFeedback = reputationRegistry.getLastIndex(agentId, founder);
        assertEq(afterSecondFeedback, 2, "Index should be 2 after second feedback");

        vm.prank(founder);
        reputationRegistry.giveFeedback(
            agentId,
            LOW_RATING,
            DEFAULT_TAG1,
            DEFAULT_TAG2,
            DEFAULT_COMMENT,
            DEFAULT_COMMENT_HASH
        );

        uint64 afterThirdFeedback = reputationRegistry.getLastIndex(agentId, founder);
        assertEq(afterThirdFeedback, 3, "Index should be 3 after third feedback");
    }
}
