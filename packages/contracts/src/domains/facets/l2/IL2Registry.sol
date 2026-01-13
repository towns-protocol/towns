// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IERC721A} from "../../../diamond/facets/token/ERC721A/IERC721A.sol";

// libraries

// contracts

/// @title IL2Registry
/// @notice Interface for L2 ENS-compatible domain registry that mints subdomains as NFTs
/// @dev Extends IERC721A to provide ERC721 functionality and adds domain-specific operations
interface IL2Registry is IERC721A {
    /// @notice Creates a subdomain under an existing domain and optionally sets resolver records
    /// @param domainHash The parent domain's namehash
    /// @param subdomain The subdomain label (e.g., "alice" for "alice.towns.eth")
    /// @param owner The address that will own the subdomain NFT
    /// @param records Encoded resolver calls to set initial records (addr, text, etc.)
    /// @param metadata Arbitrary bytes for registrar use (e.g., expiration, tier, etc.)
    function createSubdomain(
        bytes32 domainHash,
        string calldata subdomain,
        address owner,
        bytes[] calldata records,
        bytes calldata metadata
    ) external;

    /// @notice Adds an address as an approved registrar that can mint subdomains
    /// @param registrar The address to approve as a registrar
    function addRegistrar(address registrar) external;

    /// @notice Removes an address from the approved registrars list
    /// @param registrar The address to remove
    function removeRegistrar(address registrar) external;

    /// @notice Sets or updates the metadata for a subdomain (registrar only)
    /// @dev Metadata is arbitrary bytes that the registrar can interpret (e.g., expiration, tier, etc.)
    /// @param node The namehash of the subdomain
    /// @param data The metadata bytes to store
    function setMetadata(bytes32 node, bytes calldata data) external;

    /// @notice Returns the metadata bytes for a subdomain
    /// @param node The namehash of the subdomain
    /// @return The metadata bytes (empty if not set)
    function getMetadata(bytes32 node) external view returns (bytes memory);

    /// @notice Returns the owner of the root domain
    /// @return The address that owns the root domain NFT
    function domainOwner() external view returns (address);

    /// @notice Returns the owner of a subdomain by its namehash
    /// @param nameHash The namehash of the subdomain
    /// @return The address that owns the subdomain NFT
    function subdomainOwner(bytes32 nameHash) external view returns (address);

    /// @notice Returns the namehash of the base domain
    /// @return The namehash of the base domain
    function baseDomainHash() external view returns (bytes32);

    /// @notice Computes the namehash of a domain name
    /// @param node The domain name (e.g., "alice.towns.eth")
    /// @return The namehash (bytes32)
    function namehash(string calldata node) external pure returns (bytes32);

    /// @notice Decodes a DNS-encoded name to a human-readable string
    /// @param node The DNS-encoded name bytes
    /// @return The decoded domain name
    function decodeName(bytes calldata node) external pure returns (string memory);

    /// @notice Helper to derive a node from a parent node and label
    /// @param domainHash The namehash of the domain, e.g. `namehash("name.eth")` for "name.eth"
    /// @param subdomain The label of the subnode, e.g. "x" for "x.name.eth"
    /// @return The resulting subnode, e.g. `namehash("x.name.eth")` for "x.name.eth"
    function encodeSubdomain(
        bytes32 domainHash,
        string calldata subdomain
    ) external pure returns (bytes32);
}
