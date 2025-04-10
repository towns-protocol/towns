// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {LibBit} from "solady/utils/LibBit.sol";
import {LibString} from "solady/utils/LibString.sol";

/**
 * @dev Utility library for Solana address and public key operations
 */
library SolanaUtils {
    /// @notice Character set for Base58 encoding
    bytes internal constant ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    /// @notice Lookup table for the first 32 characters of the Base58 alphabet
    uint256 internal constant ALPHABET0 =
        0x31323334353637383941424344454647484a4b4c4d4e50515253545556575859;
    /// @notice Lookup table for the last 26 characters of the Base58 alphabet
    uint256 internal constant ALPHABET1 =
        0x5a6162636465666768696a6b6d6e6f707172737475767778797a000000000000;
    /// @notice XOR mask for the Base58 alphabet to handle both halves
    uint256 internal constant XOR_ALPHABET =
        0x31323334353637383941424344454647484a4b4c4d4e50515253545556575859 ^
            0x5a6162636465666768696a6b6d6e6f707172737475767778797a000000000000;

    /// @notice Precomputed bitmask for Base58 allowed characters
    uint256 internal constant BASE58_MAP = 0x07ffeffe07ff7dfe03fe000000000000;

    /**
     * @dev Get the compressed public key from an extended public key array
     * @param pubkey The extended public key array (5 elements)
     * @return The compressed public key as bytes32
     */
    function getCompressedPublicKey(uint256[5] memory pubkey) internal pure returns (bytes32) {
        return bytes32(pubkey[4]);
    }

    /**
     * @dev Convert bytes32 to a Base58 encoded string
     * @param data The bytes32 data to encode
     * @return finalResult The Base58 encoded string
     */
    function toBase58String(bytes32 data) internal pure returns (string memory finalResult) {
        // Count leading zeros using Solady's LibBit.clz
        uint256 value = uint256(data);
        uint256 zeros = LibBit.clz(value) >> 3; // Divide by 8 to convert bits to bytes

        // Calculate the maximum possible length of the result
        uint8 resultSize = 44; // Max size of a base58 encoded 32 byte value

        // Perform base58 encoding
        assembly ("memory-safe") {
            let result := mload(0x40)
            mstore(result, resultSize)
            mstore(0x40, add(result, 0x60))
            // pointer to the last byte of the result, 0x4c = 32 + 44
            let end := add(result, 0x4c)
            let ptr := end
            // encode from the end of the result array
            for {} 1 {} {
                if iszero(value) {
                    break
                }
                let remainder := mod(value, 58)
                value := div(value, 58)
                // equivalent: table = remainder < 32 ? ALPHABET0 : ALPHABET1
                let table := xor(ALPHABET1, mul(lt(remainder, 32), XOR_ALPHABET))
                ptr := sub(ptr, 1)
                mstore8(ptr, byte(and(remainder, 0x1f), table))
            }
            // Add leading '1's for each leading zero byte
            mstore(
                sub(ptr, 0x20),
                0x3131313131313131313131313131313131313131313131313131313131313131
            )
            // starting offset of the result
            ptr := sub(ptr, zeros)
            // Create the final string with the correct length
            finalResult := sub(ptr, 0x20)
            mstore(finalResult, sub(end, ptr))
        }
    }

    /**
     * @dev Get the Solana address as a string from the extended public key
     * @param pubkey The extended public key array (5 elements)
     * @return The Base58 encoded Solana address string
     */
    function getCompressedPublicKeyAsString(
        uint256[5] memory pubkey
    ) internal pure returns (string memory) {
        bytes32 compressedKey = getCompressedPublicKey(pubkey);
        return toBase58String(compressedKey);
    }

    /**
     * @dev Get Solana address string directly from a compressed public key
     * @param compressedPubkey The compressed public key (typically extPubKey[4])
     * @return The Base58 encoded Solana address
     */
    function getSolanaAddressFromCompressedKey(
        uint256 compressedPubkey
    ) internal pure returns (string memory) {
        return toBase58String(bytes32(compressedPubkey));
    }

    /**
     * @dev Safely extracts the Solana address from a fixed-size extPubKey array
     * @param extPubKey The extended public key fixed array
     * @return The Base58 encoded Solana address string
     */
    function getSolanaAddressFromFixedExtPubKey(
        uint256[5] memory extPubKey
    ) internal pure returns (string memory) {
        return toBase58String(bytes32(extPubKey[4]));
    }

    /**
     * @dev Validates if a string matches the Solana address derived from the given public key
     * @param solanaAddress The address string to validate
     * @param extPubKey The extended public key array
     * @return True if the address matches the derived address from the public key
     */
    function isValidSolanaAddress(
        string memory solanaAddress,
        uint256[5] memory extPubKey
    ) internal pure returns (bool) {
        return LibString.eq(solanaAddress, getSolanaAddressFromFixedExtPubKey(extPubKey));
    }

    /**
     * @dev Validates if a string is a valid Solana address (basic validation only)
     * @param solanaAddress The address string to validate
     * @return True if the address has valid format, false otherwise
     */
    function isValidSolanaAddress(string memory solanaAddress) internal pure returns (bool) {
        uint256 len = bytes(solanaAddress).length;

        // Solana addresses are between 32-44 characters
        if (len < 32 || len > 44) {
            return false;
        }

        bool isValid = true;
        assembly ("memory-safe") {
            let ptr := add(solanaAddress, 0x20)
            let end := add(ptr, len)
            for {} lt(ptr, end) {} {
                let char := byte(0, mload(ptr))
                // Check if the character is valid using the bitmask
                // If the bit at position 'char' is not set in the map, the character is invalid
                if iszero(and(shr(char, BASE58_MAP), 1)) {
                    isValid := false
                    break
                }
                ptr := add(ptr, 1)
            }
        }
        return isValid;
    }
}
