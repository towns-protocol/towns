// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @notice Interface for the resolver service
interface IL1ResolverService {
    /// @notice Resolves a name on the L1 registry
    /// @param name The name to resolve
    /// @param data The data to resolve
    /// @param targetChainId The chain ID of the target registry
    /// @param targetRegistryAddress The address of the target registry
    /// @return result The result of the resolve
    /// @return expires The expiration time of the resolve
    /// @return sig The signature of the resolve
    function stuffedResolveCall(
        bytes calldata name,
        bytes calldata data,
        uint64 targetChainId,
        address targetRegistryAddress
    ) external view returns (bytes memory result, uint64 expires, bytes memory sig);
}
