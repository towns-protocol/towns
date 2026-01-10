// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/// @title Reputation Registry Base - ERC-8004 Data Structures
/// @notice Core data structures and events for the ERC-8004 reputation system
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
        address indexed reviewerAddress,
        uint8 score,
        bytes32 indexed tag1,
        bytes32 tag2,
        string feedbackUri,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed reviewerAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed reviewerAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseUri,
        bytes32 responseHash
    );
}

/// @title Reputation Registry - ERC-8004 Implementation
/// @notice A reputation system for AI agents enabling feedback collection, scoring, and trust establishment
/// @dev This contract implements the ERC-8004 Reputation Registry specification, which enables
///      discovering and trusting agents across organizational boundaries through reputation signals.
interface IReputationRegistry is IReputationRegistryBase {
    /// @notice Posts feedback for an agent after completing a task or interaction
    /// @param agentId The NFT token ID of the agent being reviewed
    /// @param score The rating from 0 (worst) to 100 (best)
    /// @param tag1 First tag for categorization and filtering (use bytes32(0) for none)
    /// @param tag2 Second tag for categorization and filtering (use bytes32(0) for none)
    /// @param feedbackUri URI pointing to detailed off-chain feedback data (IPFS recommended)
    /// @param feedbackHash KECCAK-256 hash of off-chain data for integrity verification
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackUri,
        bytes32 feedbackHash
    ) external;

    /// @notice Revokes previously submitted feedback
    /// @dev Only the original reviewer can revoke their feedback. Revoked feedback is excluded
    ///      from getSummary() calculations but remains visible in readAllFeedback() with the
    ///      revoked status flag. This maintains audit trail integrity per ERC-8004 principles.
    /// @param agentId The NFT token ID of the agent
    /// @param feedbackIndex The 1-based index of the feedback to revoke (must be > 0)
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    /// @notice Appends a response to existing feedback
    /// @param agentId The NFT token ID of the agent
    /// @param reviewerAddress The address that gave the original feedback
    /// @param feedbackIndex The 1-based index of the feedback being responded to
    /// @param responseUri URI pointing to the response content (IPFS recommended)
    /// @param responseHash KECCAK-256 hash of response data for integrity verification
    function appendResponse(
        uint256 agentId,
        address reviewerAddress,
        uint64 feedbackIndex,
        string calldata responseUri,
        bytes32 responseHash
    ) external;

    /// @notice Returns the address of the identity registry where agents are registered as NFTs
    /// @dev The identity registry is an ERC-721 contract where each agent has a unique token ID.
    ///      This registry links reputation data to agent identities defined in the ERC-8004 Identity Registry.
    /// @return The address of the identity registry contract
    function getIdentityRegistry() external view returns (address);

    /// @notice Retrieves aggregated reputation statistics for an agent with optional filtering
    /// @param agentId The NFT token ID of the agent
    /// @param clientAddresses Optional filter for specific reviewers (empty = all reviewers)
    /// @param tag1 Optional filter for first tag (bytes32(0) = no filter)
    /// @param tag2 Optional filter for second tag (bytes32(0) = no filter)
    /// @return count Number of matching feedback entries (excludes revoked)
    /// @return averageScore Mean score 0-100 (returns 0 if no feedback matches)
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore);

    /// @notice Reads a specific feedback entry by agent, reviewer, and index
    /// @param agentId The NFT token ID of the agent
    /// @param reviewerAddress The address that gave the feedback
    /// @param index The 1-based feedback index (must be > 0 and <= lastIndex)
    /// @return score The rating from 0 to 100
    /// @return tag1 The first categorization tag
    /// @return tag2 The second categorization tag
    /// @return isRevoked True if feedback has been revoked, false otherwise
    function readFeedback(
        uint256 agentId,
        address reviewerAddress,
        uint64 index
    ) external view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked);

    /// @notice Reads all feedback for an agent with flexible filtering options
    /// @param agentId The NFT token ID of the agent
    /// @param clientAddresses Optional filter for specific reviewers (empty = all reviewers)
    /// @param tag1 Optional filter for first tag (bytes32(0) = no filter)
    /// @param tag2 Optional filter for second tag (bytes32(0) = no filter)
    /// @param includeRevoked Whether to include revoked feedback in results
    /// @return clients Array of reviewer addresses (one per feedback entry)
    /// @return scores Array of ratings 0-100 (parallel to clients array)
    /// @return tag1s Array of first tags (parallel to clients array)
    /// @return tag2s Array of second tags (parallel to clients array)
    /// @return revokedStatuses Array of revocation flags (parallel to clients array)
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

    /// @notice Gets the total count of responses with flexible filtering
    /// @param agentId The NFT token ID of the agent
    /// @param reviewerAddress Filter by reviewer (address(0) = all reviewers)
    /// @param feedbackIndex Filter by specific feedback index (0 = all feedback)
    /// @param responders Filter by specific responders (empty = all responders)
    /// @return Total count of responses matching the filter criteria
    function getResponseCount(
        uint256 agentId,
        address reviewerAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view returns (uint256);

    /// @notice Returns all addresses that have given feedback to this agent
    /// @param agentId The NFT token ID of the agent
    /// @return clients Array of all reviewer addresses (in order of first feedback)
    function getClients(uint256 agentId) external view returns (address[] memory clients);

    /// @notice Gets the highest feedback index for a specific reviewer-agent pair
    /// @param agentId The NFT token ID of the agent
    /// @param reviewerAddress The address of the reviewer
    /// @return lastIndex The highest assigned index (0 if no feedback exists)
    function getLastIndex(
        uint256 agentId,
        address reviewerAddress
    ) external view returns (uint64 lastIndex);
}
