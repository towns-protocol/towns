// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IERC721A} from "../../../diamond/facets/token/ERC721A/IERC721A.sol";

// libraries
import {L2RegistryMod} from "./modules/L2RegistryMod.sol";
import {MinimalERC721Storage, ERC721Lib} from "@towns-protocol/diamond/src/primitive/ERC721.sol";
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title L2RegistryFacet
/// @notice L2 ENS-compatible domain registry that mints subdomains as NFTs
/// @dev Manages a single root domain (e.g., "towns.eth") and its subdomains; each subdomain is an ERC721 token
contract L2RegistryFacet is IERC721A, Facet {
    using L2RegistryMod for L2RegistryMod.Layout;
    using ERC721Lib for MinimalERC721Storage;

    /// @notice Initializes the registry with a root domain and mints it to the admin
    /// @param domain The full domain name (e.g., "towns.eth")
    /// @param admin The address that will own the root domain NFT
    function __L2RegistryFacet_init(
        string calldata domain,
        address admin
    ) external onlyInitializing {
        L2RegistryMod.getStorage().createDomain(domain, admin);
    }

    /// @notice Creates a subdomain under an existing domain and optionally sets resolver records
    /// @param domainHash The parent domain's namehash
    /// @param subdomain The subdomain label (e.g., "alice" for "alice.towns.eth")
    /// @param owner The address that will own the subdomain NFT
    /// @param records Encoded resolver calls to set initial records (addr, text, etc.)
    function createSubdomain(
        bytes32 domainHash,
        string calldata subdomain,
        address owner,
        bytes[] calldata records
    ) external {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        $.onlyOwnerOrRegistrar(domainHash);
        $.createSubdomain(domainHash, subdomain, owner, records);
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

    /// @notice Returns the owner of the root domain
    function domainOwner() external view returns (address) {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        return $.token.ownerOf(uint256($.baseNode));
    }

    /// @notice Returns the owner of a subdomain by its namehash
    /// @param nameHash The namehash of the subdomain
    function subdomainOwner(bytes32 nameHash) external view returns (address) {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        return $.token.ownerOf(uint256(nameHash));
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
        return "Towns Domain";
    }

    /// @inheritdoc IERC721A
    function symbol() external pure returns (string memory) {
        return "TD";
    }

    /// @inheritdoc IERC721A
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return L2RegistryMod.getStorage().tokenURI(tokenId);
    }
}
