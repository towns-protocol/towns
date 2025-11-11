// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IReputationRegistryBase {
    struct Feedback {
        uint8 rating;
        bytes32 tag1;
        bytes32 tag2;
    }

    struct FeedbackAuth {
        uint256 agentId;
        address reviewerAddress;
        uint64 indexLimit;
        uint256 expiry;
        uint256 chainId;
        address identityRegistry;
        address signerAddress;
    }

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint8 score,
        bytes32 indexed tag1,
        bytes32 tag2,
        string feedbackUri,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseUri,
        bytes32 responseHash
    );
}

interface IReputationRegistry is IReputationRegistryBase {
    /// @notice Returns the address of the identity registry
    /// @return The address of the identity registry
    function getIdentityRegistry() external view returns (address);

    /// @notice Gives feedback to an agent
    /// @param agentId The ID of the agent
    /// @param score The score of the feedback
    /// @param tag1 The first tag of the feedback
    /// @param tag2 The second tag of the feedback
    /// @param feedbackUri The URI of the feedback
    /// @param feedbackHash The hash of the feedback
    /// @param feedbackAuth The authentication of the feedback
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackUri,
        bytes32 feedbackHash,
        bytes calldata feedbackAuth
    ) external;

    /// @notice Revokes a feedback
    /// @param agentId The ID of the agent
    /// @param feedbackIndex The index of the feedback
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    /// @notice Appends a response to a feedback
    /// @param agentId The ID of the agent
    /// @param clientAddress The address of the client
    /// @param feedbackIndex The index of the feedback
    /// @param responseUri The URI of the response
    /// @param responseHash The hash of the response
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseUri,
        bytes32 responseHash
    ) external;

    /// @notice Gets the summary of the feedback
    /// @param agentId The ID of the agent
    /// @param clientAddresses The addresses of the clients
    /// @param tag1 The first tag of the feedback
    /// @param tag2 The second tag of the feedback
    /// @return count The count of the feedback
    /// @return averageScore The average score of the feedback
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore);

    /// @notice Reads a feedback
    /// @param agentId The ID of the agent
    /// @param clientAddress The address of the client
    /// @param index The index of the feedback
    /// @return score The score of the feedback
    /// @return tag1 The first tag of the feedback
    /// @return tag2 The second tag of the feedback
    /// @return isRevoked The revoked status of the feedback
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    ) external view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked);

    /// @notice Reads all feedback
    /// @param agentId The ID of the agent
    /// @param clientAddresses The addresses of the clients
    /// @param tag1 The first tag of the feedback
    /// @param tag2 The second tag of the feedback
    /// @param includeRevoked The include revoked status
    /// @return clients The addresses of the clients
    /// @return scores The scores of the feedback
    /// @return tag1s The first tags of the feedback
    /// @return tag2s The second tags of the feedback
    /// @return revokedStatuses The revoked statuses of the feedback
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
            address[] memory clients,
            uint8[] memory scores,
            bytes32[] memory tag1s,
            bytes32[] memory tag2s,
            bool[] memory revokedStatuses
        );

    /// @notice Gets the response count
    /// @param agentId The ID of the agent
    /// @param clientAddress The address of the client
    /// @param feedbackIndex The index of the feedback
    /// @param responders The addresses of the responders
    /// @return The response count
    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view returns (uint256);

    /// @notice Gets the clients
    /// @param agentId The ID of the agent
    /// @return clients The clients
    function getClients(uint256 agentId) external view returns (address[] memory clients);

    /// @notice Gets the last index
    /// @param agentId The ID of the agent
    /// @param clientAddress The address of the client
    /// @return lastIndex The last index
    function getLastIndex(
        uint256 agentId,
        address clientAddress
    ) external view returns (uint64 lastIndex);
}
