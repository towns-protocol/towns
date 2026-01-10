// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {INameWrapper} from "@ensdomains/ens-contracts/wrapper/INameWrapper.sol";
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IL1ResolverService} from "./IL1ResolverService.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";
import {LibString} from "solady/utils/LibString.sol";
import {OffchainLookup} from "@ensdomains/ens-contracts/ccipRead/EIP3668.sol";
import {SignatureCheckerLib} from "solady/utils/SignatureCheckerLib.sol";

// contracts
import {ENS} from "@ensdomains/ens-contracts/registry/ENS.sol";

library L1ResolverMod {
    using CustomRevert for bytes4;
    using LibString for string;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice L2 registry information
    /// @param chainId The chain ID of the L2 registry
    /// @param registryAddress The address of the L2 registry
    struct L2Registry {
        uint64 chainId;
        address registryAddress;
    }

    /// @notice Storage layout for the L1Resolver
    /// @param gatewayUrl The URL of the CCIP gateway
    /// @param gatewaySigner The address of the gateway signer
    /// @param nameWrapper The name wrapper contract
    /// @param registryByNode Mapping of node to L2 registry information
    struct Layout {
        string gatewayUrl;
        address gatewaySigner;
        INameWrapper nameWrapper;
        mapping(bytes32 node => L2Registry l2Registry) registryByNode;
    }

    // keccak256(abi.encode(uint256(keccak256("towns.domains.resolver.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xad5af01a9aec1f0fbc422f62e21406a58de498f1c0ee36ca202bc49bd857fd00;

    // ENS protocol address
    ENS internal constant ens = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

    // ENS name wrapper node
    bytes32 internal constant NAME_WRAPPER_NODE =
        0xdee478ba2734e34d81c6adc77a32d75b29007895efa2fe60921f1c315e1ec7d9; // namewrapper.eth

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event GatewayURLSet(string gatewayUrl);
    event GatewaySignerSet(address gatewaySigner);
    event L2RegistrySet(
        bytes32 indexed node,
        uint64 indexed chainId,
        address indexed registryAddress
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error L1Resolver__InvalidGatewayURL();
    error L1Resolver__InvalidGatewaySigner();
    error L1Resolver__InvalidL2Registry();
    error L1Resolver__InvalidName();
    error L1Resolver__InvalidNameWrapper();
    error L1Resolver__InvalidNode();
    error L1Resolver__InvalidChainId();
    error L1Resolver__InvalidOwner();
    error L1Resolver__SignatureExpired();
    error L1Resolver__InvalidSignature();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setGatewayURL(Layout storage $, string calldata gatewayUrl) internal {
        if (bytes(gatewayUrl).length == 0) L1Resolver__InvalidGatewayURL.selector.revertWith();
        $.gatewayUrl = gatewayUrl;
        emit GatewayURLSet(gatewayUrl);
    }

    function setGatewaySigner(Layout storage $, address gatewaySigner) internal {
        if (gatewaySigner == address(0)) L1Resolver__InvalidGatewaySigner.selector.revertWith();
        $.gatewaySigner = gatewaySigner;
        emit GatewaySignerSet(gatewaySigner);
    }

    function setNameWrapper(Layout storage $) internal {
        address wrapperResolver = ens.resolver(NAME_WRAPPER_NODE);
        if (wrapperResolver == address(0)) L1Resolver__InvalidNameWrapper.selector.revertWith();
        address wrapperAddress = IAddrResolver(wrapperResolver).addr(NAME_WRAPPER_NODE);
        if (wrapperAddress == address(0)) L1Resolver__InvalidNameWrapper.selector.revertWith();
        $.nameWrapper = INameWrapper(wrapperAddress);
    }

    function setL2Registry(
        Layout storage $,
        bytes32 node,
        uint64 chainId,
        address registryAddress
    ) internal {
        if (node == bytes32(0)) L1Resolver__InvalidNode.selector.revertWith();
        if (chainId == 0) L1Resolver__InvalidChainId.selector.revertWith();
        if (registryAddress == address(0)) L1Resolver__InvalidL2Registry.selector.revertWith();

        address owner = ens.owner(node);

        if (owner == address($.nameWrapper)) {
            owner = $.nameWrapper.ownerOf(uint256(node));
        }

        if (owner != msg.sender) L1Resolver__InvalidOwner.selector.revertWith();

        $.registryByNode[node] = L2Registry(chainId, registryAddress);
        emit L2RegistrySet(node, chainId, registryAddress);
    }

    /// @notice Resolve a name via CCIP-Read
    /// @dev Always reverts with OffchainLookup to trigger CCIP-Read flow
    /// @param $ The storage layout
    /// @param name The DNS-encoded name to resolve
    /// @param data The resolution data (e.g., addr(bytes32) calldata)
    /// @param callbackSelector The selector for the callback function (resolveWithProof)
    /// @return This function always reverts, return type is for interface compatibility
    function resolve(
        Layout storage $,
        bytes calldata name,
        bytes calldata data,
        bytes4 callbackSelector
    ) internal view returns (bytes memory) {
        string memory decodedName = NameCoder.decode(name); // 'sub.name.eth'
        string[] memory parts = LibString.split(decodedName, ".");

        // Require at least 2 parts (2LD + TLD)
        if (parts.length < 2) L1Resolver__InvalidName.selector.revertWith();

        // get the 2LD + TLD (final 2 parts), regardless of how many labels the name has
        string memory parentName = string.concat(
            parts[parts.length - 2],
            ".",
            parts[parts.length - 1]
        );

        bytes memory parentDnsName = NameCoder.encode(parentName);
        bytes32 parentNode = NameCoder.namehash(parentDnsName, 0);

        L2Registry memory registry = $.registryByNode[parentNode];
        if (registry.registryAddress == address(0)) {
            L1Resolver__InvalidL2Registry.selector.revertWith();
        }

        // Build callData for the gateway
        bytes memory callData = abi.encodeCall(
            IL1ResolverService.stuffedResolveCall,
            (name, data, registry.chainId, registry.registryAddress)
        );

        // Build the gateway URL array
        string[] memory urls = new string[](1);
        urls[0] = $.gatewayUrl;

        // Revert with OffchainLookup to trigger CCIP-Read
        revert OffchainLookup(
            address(this),
            urls,
            callData,
            callbackSelector,
            callData // extraData same as callData for verification
        );
    }

    /// @notice Verifies the gateway response and returns the resolved data
    /// @param $ The storage layout
    /// @param response The gateway response (result, expires, sig)
    /// @param extraData The original request data for signature verification
    /// @return result The verified result data
    function resolveWithProof(
        Layout storage $,
        bytes calldata response,
        bytes calldata extraData
    ) internal view returns (bytes memory result) {
        address signer = $.gatewaySigner;
        if (signer == address(0)) L1Resolver__InvalidGatewaySigner.selector.revertWith();

        // Decode the gateway response
        uint64 expires;
        bytes memory sig;
        (result, expires, sig) = abi.decode(response, (bytes, uint64, bytes));

        // Check expiration
        if (block.timestamp > expires) {
            L1Resolver__SignatureExpired.selector.revertWith();
        }

        // Create the signature hash (matching the gateway's signing format)
        bytes32 hash = _makeSignatureHash(
            address(this),
            expires,
            keccak256(extraData),
            keccak256(result)
        );

        // Verify signature using SignatureCheckerLib
        // Supports both EOA (ECDSA) and smart contract wallets (ERC-1271)
        if (!SignatureCheckerLib.isValidSignatureNow(signer, hash, sig)) {
            L1Resolver__InvalidSignature.selector.revertWith();
        }
    }

    /// @notice Returns the storage layout for the L1Resolver
    /// @return $ The storage layout
    /// @custom:storage-location erc7201:towns.domains.resolver.storage
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /// @dev Generates a hash for signing/verifying gateway responses
    /// @param target The address the signature is for (this contract)
    /// @param expires The expiration timestamp
    /// @param request The original request data
    /// @param result The result data from the gateway
    /// @return The hash to be signed/verified
    function _makeSignatureHash(
        address target,
        uint64 expires,
        bytes32 request,
        bytes32 result
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(hex"1900", target, expires, request, result));
    }
}
