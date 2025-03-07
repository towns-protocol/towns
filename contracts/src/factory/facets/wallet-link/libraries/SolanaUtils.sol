// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {LibString} from "solady/utils/LibString.sol";
import {LibBit} from "solady/utils/LibBit.sol";
/**
 * @dev Utility library for Solana address and public key operations
 */
library SolanaUtils {
  // Constants for Base58 encoding
  bytes constant ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  // Precomputed bitmask for Base58 allowed characters
  // prettier-ignore
  uint256 constant internal BASE58_MAP =
      // Digits: '1'-'9' (ASCII 49-57)
      (1 << 49) | (1 << 50) | (1 << 51) | (1 << 52) | (1 << 53) | (1 << 54) | (1 << 55) | (1 << 56) | (1 << 57)
      // Uppercase letters: 'A'-'H', 'J'-'N', 'P'-'Z' (ASCII 65-72, 74-78, 80-90)
      | (1 << 65) | (1 << 66) | (1 << 67) | (1 << 68) | (1 << 69) | (1 << 70) | (1 << 71) | (1 << 72)
      | (1 << 74) | (1 << 75) | (1 << 76) | (1 << 77) | (1 << 78)
      | (1 << 80) | (1 << 81) | (1 << 82) | (1 << 83) | (1 << 84) | (1 << 85) | (1 << 86) | (1 << 87) | (1 << 88) | (1 << 89) | (1 << 90)
      // Lowercase letters: 'a'-'k', 'm'-'z' (ASCII 97-107, 109-122)
      | (1 << 97) | (1 << 98) | (1 << 99) | (1 << 100) | (1 << 101) | (1 << 102) | (1 << 103) | (1 << 104)
      | (1 << 105) | (1 << 106) | (1 << 107)
      | (1 << 109) | (1 << 110) | (1 << 111) | (1 << 112) | (1 << 113) | (1 << 114) | (1 << 115) | (1 << 116) | (1 << 117) | (1 << 118) | (1 << 119) | (1 << 120) | (1 << 121) | (1 << 122);

  /**
   * @dev Get the compressed public key from an extended public key array
   * @param pubkey The extended public key array (5 elements)
   * @return The compressed public key as bytes32
   */
  function getCompressedPublicKey(
    uint256[5] memory pubkey
  ) internal pure returns (bytes32) {
    return bytes32(pubkey[4]);
  }

  /**
   * @dev Convert bytes32 to a Base58 encoded string
   * @param data The bytes32 data to encode
   * @return The Base58 encoded string
   */
  function toBase58String(bytes32 data) internal pure returns (string memory) {
    // Count leading zeros using Solady's LibBit.clz
    uint256 value = uint256(data);
    uint256 zeros = LibBit.clz(value) >> 3; // Divide by 8 to convert bits to bytes

    // Calculate the maximum possible length of the result
    uint8 resultSize = 44; // Max size of a base58 encoded 32 byte value

    // Prepare the resulting bytes
    bytes memory result = new bytes(resultSize);
    uint resultLen = resultSize;

    // Perform base58 encoding
    while (value > 0) {
      uint remainder = value % 58;
      value = value / 58;
      result[--resultLen] = ALPHABET[remainder];
    }

    // Create the final string with the correct length
    bytes memory finalResult;

    // Add leading '1's for each leading zero byte
    assembly ("memory-safe") {
      mstore(
        add(result, resultLen),
        0x3131313131313131313131313131313131313131313131313131313131313131
      )
      resultLen := sub(resultLen, zeros)
      finalResult := add(result, resultLen)
      mstore(finalResult, sub(resultSize, resultLen))
    }

    return string(finalResult);
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
    return
      LibString.eq(
        solanaAddress,
        getSolanaAddressFromFixedExtPubKey(extPubKey)
      );
  }

  /**
   * @dev Validates if a string is a valid Solana address (basic validation only)
   * @param solanaAddress The address string to validate
   * @return True if the address has valid format, false otherwise
   */
  function isValidSolanaAddress(
    string memory solanaAddress
  ) internal pure returns (bool) {
    bytes memory addressBytes = bytes(solanaAddress);
    uint256 len = addressBytes.length;

    // Solana addresses are between 32-44 characters
    if (len < 32 || len > 44) {
      return false;
    }

    bool isValid = true;
    assembly ("memory-safe") {
      // Load BASE58_MAP once
      let map := BASE58_MAP

      for {
        let i := 0
      } lt(i, len) {
        i := add(i, 1)
      } {
        let char := byte(0, mload(add(add(addressBytes, 0x20), i)))

        // Check if the character is valid using the bitmask
        // If the bit at position 'char' is not set in the map, the character is invalid
        if iszero(and(shr(char, map), 1)) {
          isValid := false
          break
        }
      }
    }

    return isValid;
  }
}
