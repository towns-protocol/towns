// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/// @title IIdentityRegistryBase
/// @notice Base interface for ERC-8004 compliant agent identity registry
/// @dev Defines core data structures, events, and errors for agent registration and metadata management
interface IIdentityRegistryBase {
    /// @notice Metadata entry for storing additional on-chain agent information
    /// @dev Used in batch metadata operations during agent registration
    struct MetadataEntry {
        /// @notice The metadata key identifier
        string key;
        /// @notice The metadata value stored as bytes for flexibility
        bytes value;
    }

    /// @notice Emitted when a new agent is registered in the identity registry
    /// @param agentId The unique identifier (tokenId) assigned to the agent
    /// @param tokenURI The URI pointing to the agent's registration file
    /// @param owner The address that owns the agent identity
    event Registered(uint256 indexed agentId, string tokenURI, address indexed owner);

    /// @notice Emitted when metadata is set or updated for an agent
    /// @param agentId The unique identifier of the agent
    /// @param indexedKey The metadata key as indexed parameter for efficient filtering
    /// @param key The metadata key as non-indexed parameter for reading
    /// @param value The metadata value stored as bytes
    event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value);

    /// @notice Emitted when an agent's URI is updated
    /// @param agentId The unique identifier of the agent
    /// @param newUri The new URI pointing to the agent's registration file
    /// @param updatedBy The address that performed the update
    event UriUpdated(uint256 indexed agentId, string newUri, address indexed updatedBy);

    /// @notice Thrown when caller is not authorized to perform the operation
    /// @dev Authorization requires being the owner, an approved operator, or approved for the specific token
    error IdentityRegistry__NotAuthorized();

    /// @notice Thrown when attempting to access a token that does not exist
    error IdentityRegistry__TokenDoesNotExist();

    /// @notice Thrown when attempting to register an agent that is not registered
    error IdentityRegistry__AgentNotRegistered();

    /// @notice Thrown when attempting to register an agent that is banned
    error IdentityRegistry__AgentBanned();

    /// @notice Thrown when attempting to register an agent that is already published
    error IdentityRegistry__AgentAlreadyPublished();
}

/// @title IIdentityRegistry
/// @notice ERC-8004 compliant agent identity registry interface
/// @dev Extends ERC-721 with agent registration, metadata management, and URI storage capabilities.
///      Each agent is uniquely identified globally by: namespace (eip155), chainId, identityRegistry address, and agentId.
///      The tokenURI resolves to an agent registration file containing endpoints, capabilities, and trust model information.
interface IIdentityRegistry is IIdentityRegistryBase {
    /// @notice Register a new agent identity without initial URI or metadata
    /// @dev Mints a new ERC-721 token to msg.sender. URI can be set later via setAgentUri.
    /// @return agentId The unique identifier assigned to the newly registered agent
    function register() external returns (uint256 agentId);

    /// @notice Register a new agent identity with a tokenURI
    /// @dev Mints a new ERC-721 token to msg.sender and sets the tokenURI
    /// @param tokenUri The URI pointing to the agent's registration file (e.g., ipfs://cid or https://domain.com/agent.json)
    /// @return agentId The unique identifier assigned to the newly registered agent
    function register(string calldata tokenUri) external returns (uint256 agentId);

    /// @notice Register a new agent identity with tokenURI and metadata
    /// @dev Mints a new ERC-721 token to msg.sender, sets the tokenURI, and stores metadata entries.
    ///      This is the most complete registration method for agents with immediate metadata.
    /// @param tokenUri The URI pointing to the agent's registration file
    /// @param metadata Array of key-value pairs to store as on-chain metadata
    /// @return agentId The unique identifier assigned to the newly registered agent
    function register(
        string calldata tokenUri,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId);

    /// @notice Retrieve metadata value for a specific agent and key
    /// @dev Returns empty bytes if the key does not exist
    /// @param agentId The unique identifier of the agent
    /// @param key The metadata key to retrieve
    /// @return The metadata value stored as bytes
    function getMetadata(uint256 agentId, string memory key) external view returns (bytes memory);

    /// @notice Set or update metadata for a specific agent
    /// @dev Only callable by the agent owner, approved operator, or token-specific approved address.
    ///      Emits MetadataSet event.
    /// @param agentId The unique identifier of the agent
    /// @param key The metadata key to set
    /// @param value The metadata value to store as bytes
    function setMetadata(uint256 agentId, string memory key, bytes memory value) external;

    /// @notice Update the tokenURI for an agent
    /// @dev Only callable by the agent owner, approved operator, or token-specific approved address.
    ///      Emits UriUpdated event. Useful when agent registration data changes.
    /// @param agentId The unique identifier of the agent
    /// @param newUri The new URI pointing to the agent's updated registration file
    function setAgentUri(uint256 agentId, string calldata newUri) external;

    /// @notice Get the tokenURI for an agent
    /// @dev Returns the URI pointing to the agent's registration file.
    ///      Reverts if the token does not exist.
    /// @param tokenId The unique identifier of the agent (ERC-721 tokenId)
    /// @return The URI string pointing to the agent's registration file
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
