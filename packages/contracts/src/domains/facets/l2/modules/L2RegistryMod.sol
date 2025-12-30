// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {MinimalERC721Storage, ERC721Lib} from "@towns-protocol/diamond/src/primitive/ERC721.sol";
import {NameCoder} from "@ensdomains/ens-contracts/utils/NameCoder.sol";
import {Base64} from "solady/utils/Base64.sol";

library L2RegistryMod {
    using CustomRevert for bytes4;
    using ERC721Lib for MinimalERC721Storage;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("towns.domains.facets.l2.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0xd006f5666f0513641f83237d8fe37b671902940d193477fdbf21bf0fa624e400;

    struct Layout {
        bytes32 baseNode;
        mapping(bytes32 node => bytes name) names;
        mapping(address registrar => bool approved) registrars;
        MinimalERC721Storage token;
    }

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
    /// @return subDomainHash The resulting subdomain hash, e.g. `namehash("x.name.eth")` for "x.name.eth"
    function createSubdomain(
        Layout storage $,
        bytes32 domainHash,
        string calldata subdomain,
        address owner,
        bytes[] calldata records
    ) internal returns (bytes32 subDomainHash) {
        subDomainHash = encodeNode(domainHash, subdomain);
        bytes32 labelhash = keccak256(bytes(subdomain));
        bytes memory dnsEncodedName = encodeName(subdomain, $.names[domainHash]);
        uint256 subnodeId = uint256(subDomainHash);

        if ($.token.ownerOf(subnodeId) != address(0))
            L2RegistryMod_NotAvailable.selector.revertWith();

        $.token.mint(owner, subnodeId);
        setRecords(subDomainHash, records);
        $.names[subDomainHash] = dnsEncodedName;

        emit NewOwner(domainHash, labelhash, owner);
        emit SubnodeCreated(subDomainHash, dnsEncodedName, owner);
    }

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

    function addRegistrar(Layout storage $, address registrar) internal {
        $.registrars[registrar] = true;
        emit RegistrarAdded(registrar);
    }

    function removeRegistrar(Layout storage $, address registrar) internal {
        $.registrars[registrar] = false;
        emit RegistrarRemoved(registrar);
    }

    function setBaseNode(Layout storage $, bytes32 baseNode) internal {
        $.baseNode = baseNode;
        emit BaseNodeUpdated(baseNode);
    }

    function isRegistrar(Layout storage $, address registrar) internal view returns (bool) {
        return $.registrars[registrar];
    }

    function tokenURI(Layout storage $, uint256 tokenId) internal view returns (string memory) {
        if ($.token.ownerOf(tokenId) == address(0)) L2RegistryMod_NotOwner.selector.revertWith();

        string memory json = string.concat(
            '{"name": "',
            NameCoder.decode($.names[bytes32(tokenId)]),
            '"}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function encodeNode(bytes32 parentNode, string calldata label) internal pure returns (bytes32) {
        bytes32 labelhash = keccak256(bytes(label));
        return keccak256(abi.encodePacked(parentNode, labelhash));
    }

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

    function onlyOwnerOrRegistrar(Layout storage $, bytes32 node) internal view {
        if ($.token.ownerOf(uint256(node)) != msg.sender && !$.registrars[msg.sender]) {
            revert L2RegistryMod_NotOwnerOrRegistrar();
        }
    }

    function onlyOwner(Layout storage $) internal view {
        if ($.token.ownerOf(uint256($.baseNode)) != msg.sender) {
            revert L2RegistryMod_NotOwner();
        }
    }

    function onlyAuthorized(bytes32 node) internal view {
        if (!isAuthorized(node)) L2RegistryMod_NotAuthorized.selector.revertWith();
    }

    function isAuthorized(bytes32 node) internal view returns (bool) {
        return isAuthorizedForAddress(getStorage(), msg.sender, node);
    }

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
