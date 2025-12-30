// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddressResolver.sol";

// libraries
import {AddrResolverMod} from "./modules/AddrResolverMod.sol";
import {L2RegistryMod} from "./modules/L2RegistryMod.sol";
import {VersionRecordMod} from "./modules/VersionRecordMod.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title AddrResolverFacet
/// @notice ENS address resolver facet for storing and retrieving blockchain addresses on L2
/// @dev Implements IAddrResolver (ETH only) and IAddressResolver (multi-coin) with versioned records
contract AddrResolverFacet is IAddrResolver, IAddressResolver, Facet {
    using AddrResolverMod for AddrResolverMod.Layout;
    using VersionRecordMod for VersionRecordMod.Layout;

    /// @notice Initializes the facet by registering resolver interfaces
    function __AddrResolverFacet_init() external onlyInitializing {
        _addInterface(type(IAddrResolver).interfaceId);
        _addInterface(type(IAddressResolver).interfaceId);
    }

    /// @notice Sets the address for a node and coin type (SLIP-44 standard)
    /// @param node The ENS node to update
    /// @param coinType The SLIP-44 coin type (e.g., 60 for ETH, 0 for BTC)
    /// @param a The address bytes to set
    function setAddr(bytes32 node, uint256 coinType, bytes memory a) external {
        L2RegistryMod.onlyAuthorized(node);
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        AddrResolverMod.getStorage().setAddr(version, node, coinType, a);
    }

    /// @notice Sets the Ethereum address (coinType 60) for a node
    /// @param node The ENS node to update
    /// @param a The Ethereum address to set
    function setAddr(bytes32 node, address a) external {
        L2RegistryMod.onlyAuthorized(node);
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        AddrResolverMod.getStorage().setAddr(version, node, a);
    }

    /// @inheritdoc IAddressResolver
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory) {
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        return AddrResolverMod.getStorage().addr(version, node, coinType);
    }

    /// @inheritdoc IAddrResolver
    function addr(bytes32 node) external view returns (address payable) {
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        return AddrResolverMod.getStorage().addr(version, node);
    }
}
