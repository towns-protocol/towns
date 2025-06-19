// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EIP712} from "solady/utils/EIP712.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract MockApp is EIP712 {
    // EIP-712 type hash for Mail struct
    bytes32 public constant MAIL_TYPEHASH = keccak256("Mail(address to,string contents)");

    // ERC1271 magic value
    bytes4 private constant MAGICVALUE = 0x1626ba7e;

    constructor() {}

    /// @dev Returns the EIP-712 domain name.
    function _domainNameAndVersion() internal pure override returns (string memory, string memory) {
        return ("MockApp", "1");
    }

    /// @dev Creates an EIP-712 hash for a Mail struct
    function createMailHash(address to, string memory contents) external view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(MAIL_TYPEHASH, to, keccak256(bytes(contents))));
        return _hashTypedData(structHash);
    }

    /// @dev Returns the struct hash for a Mail struct (without domain separator)
    function getMailStructHash(address to, string memory contents) external pure returns (bytes32) {
        return keccak256(abi.encode(MAIL_TYPEHASH, to, keccak256(bytes(contents))));
    }

    /// @dev Returns the domain separator for this contract
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparator();
    }

    /// @dev Validates a mail signature through an ERC1271 contract
    /// This simulates a real-world use case where an app validates user signatures
    function validateMailSignature(
        address erc1271Contract,
        address to,
        string memory contents,
        bytes calldata signature
    ) external view returns (bool) {
        // Create the EIP-712 hash that this app would create
        bytes32 mailHash = this.createMailHash(to, contents);

        // Call isValidSignature on the ERC1271 contract
        // Handle potential reverts for invalid signatures
        try IERC1271(erc1271Contract).isValidSignature(mailHash, signature) returns (
            bytes4 result
        ) {
            return result == MAGICVALUE;
        } catch {
            // If the call reverts, the signature is invalid
            return false;
        }
    }

    /// @dev Helper function to get the signature data needed for ERC1271
    /// Returns the hash and signature components for testing
    function getSignatureData(
        address to,
        string memory contents
    ) external view returns (bytes32 mailHash, bytes32 structHash, bytes32 domainSeparator) {
        structHash = this.getMailStructHash(to, contents);
        domainSeparator = this.getDomainSeparator();
        mailHash = this.createMailHash(to, contents);
    }
}
