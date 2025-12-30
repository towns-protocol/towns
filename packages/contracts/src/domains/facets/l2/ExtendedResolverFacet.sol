// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IExtendedResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IExtendedResolver.sol";

// libraries

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title ExtendedResolverFacet
/// @notice Implements EIP-3668 (CCIP Read) resolve function for on-chain resolution without offchain lookup
/// @dev Executes the encoded resolver call directly via staticcall and returns the result or propagates revert
contract ExtendedResolverFacet is IExtendedResolver, Facet {
    /// @notice Initializes the facet by registering the IExtendedResolver interface
    function __ExtendedResolverFacet_init() external onlyInitializing {
        _addInterface(type(IExtendedResolver).interfaceId);
    }

    /// @notice Resolves ENS data by executing the encoded call directly on this contract
    /// @param data The encoded resolver function call (e.g., addr(bytes32), text(bytes32,string))
    /// @return The result of the resolver call
    function resolve(
        bytes memory /* name */,
        bytes memory data
    ) external view returns (bytes memory) {
        (bool success, bytes memory result) = address(this).staticcall(data);
        if (success) {
            return result;
        } else {
            // Revert with the reason provided by the call
            assembly {
                revert(add(result, 0x20), mload(result))
            }
        }
    }
}
