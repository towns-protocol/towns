// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IExtendedResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IExtendedResolver.sol";

// libraries
import {L1ResolverMod} from "./L1ResolverMod.sol";

// contracts
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract L1ResolverFacet is IExtendedResolver, OwnableBase, Facet {
    using L1ResolverMod for L1ResolverMod.Layout;

    /// @notice Initializes the resolver with a gateway URL and signer
    /// @param gatewayUrl The URL of the CCIP gateway
    /// @param gatewaySigner The address of the gateway signer
    function __L1Resolver_init(
        string calldata gatewayUrl,
        address gatewaySigner
    ) external onlyInitializing {
        _addInterface(type(IExtendedResolver).interfaceId);
        __L1Resolver_init_unchained(gatewayUrl, gatewaySigner);
    }

    /// @notice Sets the L2 registry for a given node
    /// @param node The node to set the L2 registry for
    /// @param chainId The chain ID of the L2 registry
    /// @param registryAddress The address of the L2 registry
    function setL2Registry(bytes32 node, uint64 chainId, address registryAddress) external {
        L1ResolverMod.getStorage().setL2Registry(node, chainId, registryAddress);
    }

    /// @notice Sets the gateway URL
    /// @param gatewayUrl The URL of the CCIP gateway
    function setGatewayURL(string calldata gatewayUrl) external onlyOwner {
        L1ResolverMod.getStorage().setGatewayURL(gatewayUrl);
    }

    /// @notice Sets the gateway signer
    /// @param gatewaySigner The address of the gateway signer
    function setGatewaySigner(address gatewaySigner) external onlyOwner {
        L1ResolverMod.getStorage().setGatewaySigner(gatewaySigner);
    }

    /// @inheritdoc IExtendedResolver
    /// @dev Always reverts with OffchainLookup to trigger CCIP-Read
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory) {
        return L1ResolverMod.getStorage().resolve(name, data, this.resolveWithProof.selector);
    }

    /// @notice Callback for CCIP-Read to verify and return the resolved data
    /// @param response The response from the gateway (result, expires, sig)
    /// @param extraData The original request data for signature verification
    /// @return The verified resolved data
    function resolveWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        return L1ResolverMod.getStorage().resolveWithProof(response, extraData);
    }

    /// @notice Returns the L2 registry for a given node
    /// @param node The node to get the L2 registry for
    /// @return chainId The chain ID of the L2 registry
    /// @return registryAddress The address of the L2 registry
    function getL2Registry(
        bytes32 node
    ) external view returns (uint64 chainId, address registryAddress) {
        L1ResolverMod.L2Registry memory registry = L1ResolverMod.getStorage().registryByNode[node];
        return (registry.chainId, registry.registryAddress);
    }

    /// @notice Returns the gateway signer address
    /// @return The address of the gateway signer
    function getGatewaySigner() external view returns (address) {
        return L1ResolverMod.getStorage().gatewaySigner;
    }

    /// @notice Returns the gateway URL
    /// @return The URL of the CCIP gateway
    function getGatewayURL() external view returns (string memory) {
        return L1ResolverMod.getStorage().gatewayUrl;
    }

    function __L1Resolver_init_unchained(
        string calldata gatewayUrl,
        address gatewaySigner
    ) internal {
        L1ResolverMod.Layout storage $ = L1ResolverMod.getStorage();
        $.setGatewayURL(gatewayUrl);
        $.setGatewaySigner(gatewaySigner);
        $.setNameWrapper();
    }
}
