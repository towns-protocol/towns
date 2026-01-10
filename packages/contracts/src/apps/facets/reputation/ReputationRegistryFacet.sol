// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IReputationRegistry} from "./IReputationRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries
import {ReputationRegistryStorage} from "./ReputationRegistryStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReputationRegistryBase} from "./ReputationRegistryBase.sol";
import {SchemaBase} from "../schema/SchemaBase.sol";

contract ReputationRegistryFacet is IReputationRegistry, ReputationRegistryBase, SchemaBase, Facet {
    function __ReputationRegistry_init(
        string calldata feedbackSchema,
        string calldata responseSchema
    ) external onlyInitializing {
        __ReputationRegistry_init_unchained(feedbackSchema, responseSchema);
    }

    /// @inheritdoc IReputationRegistry
    function giveFeedback(
        uint256 agentId,
        uint8 rating,
        bytes32 tag1,
        bytes32 tag2,
        string calldata comment,
        bytes32 commentHash
    ) external {
        Feedback memory feedback;
        feedback.rating = rating;
        feedback.tag1 = tag1;
        feedback.tag2 = tag2;
        _giveFeedback(agentId, feedback);
        emit NewFeedback(agentId, msg.sender, rating, tag1, tag2, comment, commentHash);
    }

    /// @inheritdoc IReputationRegistry
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        _revokeFeedback(agentId, feedbackIndex);
    }

    /// @inheritdoc IReputationRegistry
    function appendResponse(
        uint256 agentId,
        address reviewerAddress,
        uint64 feedbackIndex,
        string calldata comment,
        bytes32 commentHash
    ) external {
        _appendResponse(agentId, reviewerAddress, feedbackIndex, comment, commentHash);
    }

    /// @inheritdoc IReputationRegistry
    function getIdentityRegistry() external view returns (address) {
        return address(this);
    }

    /// @inheritdoc IReputationRegistry
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore) {
        return _getSummary(agentId, clientAddresses, tag1, tag2);
    }

    /// @inheritdoc IReputationRegistry
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    ) external view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked) {
        (Feedback memory feedback, bool revoked) = _readFeedback(agentId, clientAddress, index);
        return (feedback.rating, feedback.tag1, feedback.tag2, revoked);
    }

    /// @inheritdoc IReputationRegistry
    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2,
        bool includeRevoked
    )
        external
        view
        returns (
            address[] memory,
            uint8[] memory,
            bytes32[] memory,
            bytes32[] memory,
            bool[] memory
        )
    {
        AllFeedback memory allFeedback = _readAllFeedback(
            agentId,
            clientAddresses,
            tag1,
            tag2,
            includeRevoked
        );
        return (
            allFeedback.clients,
            allFeedback.scores,
            allFeedback.tag1s,
            allFeedback.tag2s,
            allFeedback.revokedStatuses
        );
    }

    /// @inheritdoc IReputationRegistry
    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view returns (uint256) {
        return _getResponseCount(agentId, clientAddress, feedbackIndex, responders);
    }

    /// @inheritdoc IReputationRegistry
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _getClients(agentId);
    }

    /// @inheritdoc IReputationRegistry
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return _getLastIndex(agentId, clientAddress);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INTERNAL FUNCTIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __ReputationRegistry_init_unchained(
        string calldata feedbackSchema,
        string calldata responseSchema
    ) internal {
        bytes32 feedbackSchemaId = _registerSchema(
            feedbackSchema,
            ISchemaResolver(address(0)),
            true
        );
        bytes32 responseSchemaId = _registerSchema(
            responseSchema,
            ISchemaResolver(address(0)),
            true
        );

        ReputationRegistryStorage.Layout storage $ = ReputationRegistryStorage.getLayout();
        $.feedbackSchemaId = feedbackSchemaId;
        $.responseSchemaId = responseSchemaId;
    }
}
