// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title IL2Registrar
/// @notice Interface for the L2 subdomain registrar
/// @dev Handles subdomain registration with label validation for Towns domains
interface IL2Registrar {
    /// @notice Registers a new subdomain
    /// @dev Only callable by authorized parties. Validates label format before registration.
    /// @param label The subdomain label to register (e.g., "alice" for "alice.towns.eth")
    /// @param owner The address that will own the subdomain NFT
    function register(string calldata label, address owner) external;

    /// @notice Checks if a label is available for registration
    /// @dev Returns false if label is invalid OR already registered
    /// @param label The subdomain label to check (e.g., "alice")
    /// @return True if the label can be registered, false otherwise
    function available(string calldata label) external view returns (bool);

    /// @notice Checks if a label format is valid (without checking availability)
    /// @dev Validates: length (3-63), allowed chars (a-z, 0-9, hyphen), no leading/trailing hyphen
    /// @param label The subdomain label to validate
    /// @return True if the label format is valid
    function isValidLabel(string calldata label) external pure returns (bool);

    /// @notice Returns the registry address this registrar points to
    /// @return The address of the L2Registry diamond contract
    function getRegistry() external view returns (address);

    /// @notice Returns the coinType used for address resolution
    /// @dev Computed as 0x80000000 | chainId per ENSIP-11
    /// @return The ENSIP-11 compliant coinType for this chain
    function getCoinType() external view returns (uint256);
}
