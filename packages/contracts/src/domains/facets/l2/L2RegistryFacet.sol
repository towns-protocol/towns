// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IERC721A} from "../../../diamond/facets/token/ERC721A/IERC721A.sol";
import {IL2Registry} from "./IL2Registry.sol";

// libraries
import {L2RegistryMod} from "./modules/L2RegistryMod.sol";
import {MinimalERC721Storage, ERC721Lib} from "@towns-protocol/diamond/src/primitive/ERC721.sol";
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title L2RegistryFacet
/// @notice L2 ENS-compatible domain registry that mints subdomains as NFTs
/// @dev Manages a single root domain (e.g., "towns.eth") and its subdomains; each subdomain is an ERC721 token
contract L2RegistryFacet is IL2Registry, Facet {
    using L2RegistryMod for L2RegistryMod.Layout;
    using ERC721Lib for MinimalERC721Storage;

    /// @notice Initializes the registry with a root domain and mints it to the admin
    /// @param domain The full domain name (e.g., "towns.eth")
    /// @param admin The address that will own the root domain NFT
    function __L2RegistryFacet_init(
        string calldata domain,
        address admin
    ) external onlyInitializing {
        _addInterface(type(IL2Registry).interfaceId);
        L2RegistryMod.getStorage().createDomain(domain, admin);
    }

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
    ) external {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        $.onlyOwnerOrRegistrar(domainHash);
        $.createSubdomain(domainHash, subdomain, owner, records, metadata);
    }

    /// @notice Adds an address as an approved registrar that can mint subdomains
    /// @param registrar The address to approve as a registrar
    function addRegistrar(address registrar) external {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        $.onlyOwner();
        $.addRegistrar(registrar);
    }

    /// @notice Removes an address from the approved registrars list
    /// @param registrar The address to remove
    function removeRegistrar(address registrar) external {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        $.onlyOwner();
        $.removeRegistrar(registrar);
    }

    /// @notice Sets or updates the metadata for a subdomain (registrar only)
    /// @dev Metadata is arbitrary bytes that the registrar can interpret (e.g., expiration, tier, etc.)
    /// @param node The namehash of the subdomain
    /// @param data The metadata bytes to store
    function setMetadata(bytes32 node, bytes calldata data) external {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        $.onlyRegistrar();
        $.setMetadata(node, data);
    }

    /// @notice Returns the metadata bytes for a subdomain
    /// @param node The namehash of the subdomain
    /// @return The metadata bytes (empty if not set)
    function getMetadata(bytes32 node) external view returns (bytes memory) {
        return L2RegistryMod.getStorage().getMetadata(node);
    }

    /// @notice Returns the owner of the root domain
    function domainOwner() external view returns (address) {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        return $.token.ownerOf(uint256($.baseNode));
    }

    /// @notice Returns the owner of a subdomain by its namehash
    /// @param nameHash The namehash of the subdomain
    function subdomainOwner(bytes32 nameHash) external view returns (address) {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        return $.token.owners.get(uint256(nameHash));
    }

    /// @notice Returns the namehash of the base domain
    /// @return The namehash of the base domain
    function baseDomainHash() external view returns (bytes32) {
        return L2RegistryMod.getStorage().baseNode;
    }

    /// @notice Computes the namehash of a domain name
    /// @param node The domain name (e.g., "alice.towns.eth")
    /// @return The namehash (bytes32)
    function namehash(string calldata node) external pure returns (bytes32) {
        bytes memory dnsEncodedName = NameCoder.encode(node);
        return NameCoder.namehash(dnsEncodedName, 0);
    }

    /// @notice Decodes a DNS-encoded name to a human-readable string
    /// @param node The DNS-encoded name bytes
    /// @return The decoded domain name
    function decodeName(bytes calldata node) external pure returns (string memory) {
        return NameCoder.decode(node);
    }

    /// @notice Helper to derive a node from a parent node and label
    /// @param domainHash The namehash of the domain, e.g. `namehash("name.eth")` for "name.eth"
    /// @param subdomain The label of the subnode, e.g. "x" for "x.name.eth"
    /// @return The resulting subnode, e.g. `namehash("x.name.eth")` for "x.name.eth"
    function encodeSubdomain(
        bytes32 domainHash,
        string calldata subdomain
    ) external pure returns (bytes32) {
        return L2RegistryMod.encodeNode(domainHash, subdomain);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IERC721 FUNCTIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IERC721A
    function totalSupply() external view returns (uint256) {
        return L2RegistryMod.getStorage().token.totalSupply;
    }

    /// @inheritdoc IERC721A
    function balanceOf(address owner) external view returns (uint256) {
        return L2RegistryMod.getStorage().token.balanceOf(owner);
    }

    /// @inheritdoc IERC721A
    function ownerOf(uint256 tokenId) external view returns (address) {
        return L2RegistryMod.getStorage().token.ownerOf(tokenId);
    }

    /// @inheritdoc IERC721A
    function transferFrom(address from, address to, uint256 tokenId) external payable {
        L2RegistryMod.getStorage().token.transferFrom(from, to, tokenId);
    }

    /// @inheritdoc IERC721A
    function safeTransferFrom(address from, address to, uint256 tokenId) external payable {
        L2RegistryMod.getStorage().token.safeTransferFrom(from, to, tokenId);
    }

    /// @inheritdoc IERC721A
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external payable {
        L2RegistryMod.getStorage().token.safeTransferFrom(from, to, tokenId, data);
    }

    /// @inheritdoc IERC721A
    function approve(address to, uint256 tokenId) external payable {
        L2RegistryMod.getStorage().token.approve(to, tokenId);
    }

    /// @inheritdoc IERC721A
    function setApprovalForAll(address operator, bool approved) external {
        L2RegistryMod.getStorage().token.setApprovalForAll(operator, approved);
    }

    /// @inheritdoc IERC721A
    function getApproved(uint256 tokenId) external view returns (address) {
        return L2RegistryMod.getStorage().token.getApproved(tokenId);
    }

    /// @inheritdoc IERC721A
    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return L2RegistryMod.getStorage().token.isApprovedForAll(owner, operator);
    }

    /// @inheritdoc IERC721A
    function name() external pure returns (string memory) {
        return "Towns Domain Registry";
    }

    /// @inheritdoc IERC721A
    function symbol() external pure returns (string memory) {
        return "TDR";
    }

    /// @inheritdoc IERC721A
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return L2RegistryMod.getStorage().tokenURI(tokenId);
    }
}
