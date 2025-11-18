// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

/// @title IValidationRegistryBase
/// @notice Base interface for validation registry events
/// @dev Implements ERC-8004 validation event standards for trustless agent verification
interface IValidationRegistryBase {
    /// @notice Emitted when an agent requests validation from a validator
    /// @dev This event is emitted by validationRequest() and enables tracking of all validation requests
    /// @param validatorAddress The address of the validator smart contract that will perform the validation
    /// @param agentId The unique identifier of the agent requesting validation (ERC-721 tokenId from Identity Registry)
    /// @param requestUri The URI pointing to off-chain data containing inputs, outputs, and all information needed for validation
    /// @param requestHash The KECCAK-256 commitment hash of the request data (optional if requestUri is IPFS)
    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestUri,
        bytes32 indexed requestHash
    );

    /// @notice Emitted when a validator responds to a validation request
    /// @dev This event can be emitted multiple times for the same requestHash to support progressive validation states
    /// @param validatorAddress The address of the validator providing the response
    /// @param agentId The unique identifier of the agent being validated
    /// @param requestHash The hash of the original validation request being responded to
    /// @param response The validation result (0-100 scale: 0=failed, 100=passed, or intermediate values for spectrum outcomes)
    /// @param responseUri The URI pointing to off-chain evidence or audit trail of the validation (optional)
    /// @param responseHash The KECCAK-256 hash of the response data (optional if responseUri is IPFS, use bytes32(0) if not provided)
    /// @param tag Custom categorization or additional metadata for the validation (optional, e.g., "soft-finality", "hard-finality")
    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseUri,
        bytes32 responseHash,
        bytes32 tag
    );
}

/// @title IValidationRegistry
/// @notice Interface for the ERC-8004 Validation Registry enabling trustless agent verification
/// @dev This registry enables agents to request verification of their work through various trust models:
///      stake-secured inference re-execution, zkML verifiers, TEE oracles, or trusted judges.
///      The identityRegistry address is set at deployment and accessible via getIdentityRegistry().
///      All validation data is stored on-chain for composability and transparency.
interface IValidationRegistry is IValidationRegistryBase {
    /// @notice Request validation of agent work from a validator smart contract
    /// @dev MUST be called by the owner or operator of the agentId.
    ///      The requestUri should contain all information needed for validation including inputs and outputs.
    ///      The requestHash is a KECCAK-256 commitment to the request data (optional if requestUri is IPFS).
    ///      Emits a ValidationRequest event upon success.
    /// @param validatorAddress The address of the validator smart contract that will perform the validation (mandatory)
    /// @param agentId The unique identifier of the agent requesting validation (mandatory, must be validly registered)
    /// @param requestUri The URI pointing to off-chain validation data (mandatory)
    /// @param requestHash The KECCAK-256 hash of the request data (mandatory unless requestUri is content-addressable like IPFS)
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) external;

    /// @notice Submit a validation response for a previously requested validation
    /// @dev MUST be called by the validatorAddress specified in the original ValidationRequest.
    ///      Can be called multiple times for the same requestHash to support use cases like
    ///      progressive validation states or updates to validation status.
    ///      Stores requestHash, validatorAddress, agentId, response, lastUpdate, and tag on-chain.
    ///      Emits a ValidationResponse event upon success.
    /// @param requestHash The hash of the validation request being responded to (mandatory)
    /// @param response The validation result on a 0-100 scale where 0=failed, 100=passed, or intermediate values (mandatory)
    /// @param responseUri The URI pointing to off-chain evidence or audit trail (optional, use empty string if not provided)
    /// @param responseHash The KECCAK-256 hash of the response data (optional if responseUri is IPFS, use bytes32(0) if not provided)
    /// @param tag Custom categorization or metadata for this validation response (optional, use bytes32(0) if not provided)
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) external;

    /// @notice Retrieve the current validation status for a specific request
    /// @dev Returns the stored validation data for the given requestHash.
    ///      If no validation exists, returns zero values.
    /// @param requestHash The hash of the validation request to query
    /// @return validatorAddress The address of the validator that provided the response
    /// @return agentId The unique identifier of the agent that was validated
    /// @return response The validation result (0-100 scale)
    /// @return tag The custom tag associated with this validation response
    /// @return lastUpdate The timestamp of the last validation response update
    function getValidationStatus(
        bytes32 requestHash
    )
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        );

    /// @notice Returns aggregated validation statistics for an agent
    /// @dev Provides on-chain composable reputation metrics. The agentId parameter is mandatory;
    ///      validatorAddresses and tag are optional filters to narrow results.
    ///      Use empty array for validatorAddresses and bytes32(0) for tag to include all validations.
    /// @param agentId The agent ID to get statistics for (mandatory)
    /// @param validatorAddresses Array of validator addresses to filter by (optional, use empty array for no filter)
    /// @param tag The tag to filter by (optional, use bytes32(0) for no filter)
    /// @return count The total number of validations matching the filters
    /// @return avgResponse The average validation response across all matching validations (0-100 scale)
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        bytes32 tag
    ) external view returns (uint64 count, uint8 avgResponse);

    /// @notice Returns all validation request hashes for a specific agent
    /// @dev Useful for discovering the complete validation history of an agent.
    ///      The returned hashes can be used with getValidationStatus() to retrieve full details.
    /// @param agentId The agent ID to query validation requests for
    /// @return requestHashes Array of all validation request hashes associated with this agent
    function getAgentValidations(
        uint256 agentId
    ) external view returns (bytes32[] memory requestHashes);

    /// @notice Returns all validation request hashes handled by a specific validator
    /// @dev Useful for discovering all validations performed by a validator contract.
    ///      The returned hashes can be used with getValidationStatus() to retrieve full details.
    /// @param validatorAddress The validator address to query validation requests for
    /// @return requestHashes Array of all validation request hashes handled by this validator
    function getValidatorRequests(
        address validatorAddress
    ) external view returns (bytes32[] memory requestHashes);
}
