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

contract L2RegistryFacet is IERC721A, Facet {
    using L2RegistryMod for L2RegistryMod.Layout;
    using ERC721Lib for MinimalERC721Storage;

    function __L2RegistryFacet_init(
        string calldata domain,
        address admin
    ) external onlyInitializing {
        L2RegistryMod.getStorage().createDomain(domain, admin);
    }

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

    function addRegistrar(address registrar) external {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        $.onlyOwner();
        $.addRegistrar(registrar);
    }

    function removeRegistrar(address registrar) external {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        $.onlyOwner();
        $.removeRegistrar(registrar);
    }

    function domainOwner() external view returns (address) {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        return $.token.ownerOf(uint256($.baseNode));
    }

    function subdomainOwner(bytes32 nameHash) external view returns (address) {
        L2RegistryMod.Layout storage $ = L2RegistryMod.getStorage();
        return $.token.ownerOf(uint256(nameHash));
    }

    function namehash(string calldata node) external pure returns (bytes32) {
        bytes memory dnsEncodedName = NameCoder.encode(node);
        return NameCoder.namehash(dnsEncodedName, 0);
    }

    function decodeName(bytes calldata node) external pure returns (string memory) {
        return NameCoder.decode(node);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IERC721 FUNCTIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function totalSupply() external view returns (uint256) {
        return L2RegistryMod.getStorage().token.totalSupply;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return L2RegistryMod.getStorage().token.balanceOf(owner);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return L2RegistryMod.getStorage().token.ownerOf(tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) external payable {
        L2RegistryMod.getStorage().token.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external payable {
        L2RegistryMod.getStorage().token.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external payable {
        L2RegistryMod.getStorage().token.safeTransferFrom(from, to, tokenId, data);
    }

    function approve(address to, uint256 tokenId) external payable {
        L2RegistryMod.getStorage().token.approve(to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        L2RegistryMod.getStorage().token.setApprovalForAll(operator, approved);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        return L2RegistryMod.getStorage().token.getApproved(tokenId);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return L2RegistryMod.getStorage().token.isApprovedForAll(owner, operator);
    }

    function name() external pure returns (string memory) {
        return "Towns Domain";
    }

    function symbol() external pure returns (string memory) {
        return "TD";
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return L2RegistryMod.getStorage().tokenURI(tokenId);
    }
}
