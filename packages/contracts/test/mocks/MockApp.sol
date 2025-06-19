// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EIP712} from "solady/utils/EIP712.sol";

contract MockApp is EIP712 {
    // EIP-712 type hash for Mail struct
    bytes32 public constant MAIL_TYPEHASH = keccak256("Mail(address to,string contents)");

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
}
