// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {MinimalERC721Storage, ERC721Lib} from "@towns-protocol/diamond/src/primitive/ERC721.sol";
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";
import {Base64} from "solady/utils/Base64.sol";

/// @title L2RegistryMod
/// @notice L2 domain registry module for managing ENS-compatible subdomains as NFTs on L2
/// @dev Provides storage and logic for minting subdomains, managing registrars, and storing DNS-encoded names
library L2RegistryMod {
    using CustomRevert for bytes4;
    using ERC721Lib for MinimalERC721Storage;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("towns.domains.facets.l2.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0xd006f5666f0513641f83237d8fe37b671902940d193477fdbf21bf0fa624e400;

    /// @notice Storage layout for the L2 registry
    /// @dev baseNode is the root domain hash (e.g., namehash("towns.eth")), names maps node to DNS-encoded name, registrars are approved minters, token is the ERC721 storage
    struct Layout {
        bytes32 baseNode;
        mapping(bytes32 node => bytes name) names;
        mapping(address registrar => bool approved) registrars;
        MinimalERC721Storage token;
    }

    /// @notice Returns the storage layout for this module
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a name is created at any level
    event SubnodeCreated(bytes32 indexed node, bytes name, address owner);

    /// @notice Emitted when a subnode is registered at any level
    /// @dev Same event signature as the ENS Registry
    event NewOwner(bytes32 indexed parentNode, bytes32 indexed labelhash, address owner);

    /// @notice Emitted when a registrar is added
    event RegistrarAdded(address registrar);

    /// @notice Emitted when a registrar is removed
    event RegistrarRemoved(address registrar);

    /// @notice Emitted when the base node is set
    event BaseNodeUpdated(bytes32 baseNode);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error L2RegistryMod_LabelTooShort();
    error L2RegistryMod_LabelTooLong();
    error L2RegistryMod_NotAvailable();
    error L2RegistryMod_NotOwnerOrRegistrar();
    error L2RegistryMod_SetRecordsFailed();
    error L2RegistryMod_SetRecordsInvalidNamehash();
    error L2RegistryMod_NotOwner();
    error L2RegistryMod_DomainAlreadyExists();
    error L2RegistryMod_NotAuthorized();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates the root domain for this registry (e.g., "towns.eth") and mints it as an NFT to the owner
    /// @dev Can only be called once per registry; sets baseNode and stores the DNS-encoded name
    /// @param domain The full domain name (e.g., "towns.eth")
    /// @param owner The address that will own the root domain NFT
    /// @return domainHash The namehash of the created domain
    function createDomain(
        Layout storage $,
        string calldata domain,
        address owner
    ) internal returns (bytes32 domainHash) {
        bytes memory dnsEncodedName = NameCoder.encode(domain);
        domainHash = NameCoder.namehash(dnsEncodedName, 0);

        if ($.token.ownerOf(uint256(domainHash)) != address(0))
            L2RegistryMod_DomainAlreadyExists.selector.revertWith();

        $.baseNode = domainHash;
        $.names[domainHash] = dnsEncodedName;
        $.token.mint(owner, uint256(domainHash));
    }

    /// @notice Creates a subdomain from a parent domain hash and label
    /// @dev Only callable by the owner of the parent domain hash
    /// @param domainHash The hash of the domain, e.g. `namehash("name.eth")` for "name.eth"
    /// @param subdomain The subdomain of the subdomain, e.g. "x" for "x.name.eth"
    /// @param owner The address that will own the subdomain
    /// @param records The encoded calldata for resolver setters
    /// @return subdomainHash The resulting subdomain hash, e.g. `namehash("x.name.eth")` for "x.name.eth"
    function createSubdomain(
        Layout storage $,
        bytes32 domainHash,
        string calldata subdomain,
        address owner,
        bytes[] calldata records
    ) internal returns (bytes32 subdomainHash) {
        subdomainHash = encodeNode(domainHash, subdomain);
        bytes32 labelhash = keccak256(bytes(subdomain));
        bytes memory dnsEncodedName = encodeName(subdomain, $.names[domainHash]);
        uint256 subnodeId = uint256(subdomainHash);

        if ($.token.ownerOf(subnodeId) != address(0))
            L2RegistryMod_NotAvailable.selector.revertWith();

        $.token.mint(owner, subnodeId);
        setRecords(subdomainHash, records);
        $.names[subdomainHash] = dnsEncodedName;

        emit NewOwner(domainHash, labelhash, owner);
        emit SubnodeCreated(subdomainHash, dnsEncodedName, owner);
    }

    /// @notice Executes multiple resolver record setter calls via delegatecall (multicall pattern)
    /// @dev Each call's first 32 bytes after selector must match subdomainHash to prevent cross-node writes
    /// @param subdomainHash The node hash that all records must belong to (pass bytes32(0) to skip validation)
    /// @param data Array of encoded function calls (e.g., setAddr, setText) to execute
    /// @return results Array of return data from each delegatecall
    function setRecords(
        bytes32 subdomainHash,
        bytes[] calldata data
    ) internal returns (bytes[] memory results) {
        uint256 length = data.length;
        results = new bytes[](length);
        for (uint256 i; i < length; ++i) {
            if (subdomainHash != bytes32(0)) {
                bytes32 txNamehash = bytes32(data[i][4:36]);
                if (txNamehash != subdomainHash)
                    L2RegistryMod_SetRecordsInvalidNamehash.selector.revertWith();
            }
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            if (!success) L2RegistryMod_SetRecordsFailed.selector.revertWith();
            results[i] = result;
        }
        return results;
    }

    /// @notice Adds an address as an approved registrar that can mint subdomains
    function addRegistrar(Layout storage $, address registrar) internal {
        $.registrars[registrar] = true;
        emit RegistrarAdded(registrar);
    }

    /// @notice Removes an address from the approved registrars list
    function removeRegistrar(Layout storage $, address registrar) internal {
        $.registrars[registrar] = false;
        emit RegistrarRemoved(registrar);
    }

    /// @notice Updates the base node (root domain hash) for this registry
    function setBaseNode(Layout storage $, bytes32 baseNode) internal {
        $.baseNode = baseNode;
        emit BaseNodeUpdated(baseNode);
    }

    /// @notice Checks if an address is an approved registrar
    function isRegistrar(Layout storage $, address registrar) internal view returns (bool) {
        return $.registrars[registrar];
    }

    /// @notice Returns the token URI for a domain NFT as a base64-encoded JSON with the decoded domain name
    function tokenURI(Layout storage $, uint256 tokenId) internal view returns (string memory) {
        if ($.token.ownerOf(tokenId) == address(0)) L2RegistryMod_NotOwner.selector.revertWith();

        string memory json = string.concat(
            '{"name": "',
            NameCoder.decode($.names[bytes32(tokenId)]),
            '"}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @notice Computes the namehash of a subdomain from its parent node and label (keccak256(parentNode, keccak256(label)))
    function encodeNode(bytes32 parentNode, string calldata label) internal pure returns (bytes32) {
        bytes32 labelhash = keccak256(bytes(label));
        return keccak256(abi.encodePacked(parentNode, labelhash));
    }

    /// @notice Encodes a label and parent name into DNS wire format (length-prefixed label + parent name bytes)
    function encodeName(
        string memory label,
        bytes memory name
    ) internal pure returns (bytes memory ret) {
        if (bytes(label).length < 1) {
            L2RegistryMod_LabelTooShort.selector.revertWith();
        }
        if (bytes(label).length > 255) {
            L2RegistryMod_LabelTooLong.selector.revertWith();
        }
        return abi.encodePacked(uint8(bytes(label).length), label, name);
    }

    /// @notice Reverts if caller is neither the node owner nor an approved registrar
    function onlyOwnerOrRegistrar(Layout storage $, bytes32 node) internal view {
        if ($.token.ownerOf(uint256(node)) != msg.sender && !$.registrars[msg.sender]) {
            revert L2RegistryMod_NotOwnerOrRegistrar();
        }
    }

    /// @notice Reverts if caller is not the owner of the base (root) node
    function onlyOwner(Layout storage $) internal view {
        if ($.token.ownerOf(uint256($.baseNode)) != msg.sender) {
            revert L2RegistryMod_NotOwner();
        }
    }

    /// @notice Reverts if caller is not authorized to modify the given node
    function onlyAuthorized(bytes32 node) internal view {
        if (!isAuthorized(node)) L2RegistryMod_NotAuthorized.selector.revertWith();
    }

    /// @notice Checks if msg.sender is authorized to modify the given node (owner, approved, or registrar)
    function isAuthorized(bytes32 node) internal view returns (bool) {
        return isAuthorizedForAddress(getStorage(), msg.sender, node);
    }

    /// @notice Checks if an address is authorized to modify a node (registrar, owner, or approved operator)
    function isAuthorizedForAddress(
        Layout storage $,
        address addr,
        bytes32 node
    ) internal view returns (bool) {
        if ($.registrars[addr]) return true;

        uint256 tokenId = uint256(node);
        address owner = $.token.ownerOf(tokenId);

        if ((owner != addr) && ($.token.getApproved(tokenId) != addr)) {
            return false;
        }

        return true;
    }
}
