// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {LibString} from "solady/utils/LibString.sol";

/**
 * @dev Utility library for Solana address and public key operations
 */
library SolanaUtils {
  // Constants for Base58 encoding
  bytes constant ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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
    // Remove leading zeros
    uint8 zeros = 0;
    uint256 value = uint256(data);

    // Count leading zeros by checking byte by byte
    for (uint i = 0; i < 32; i++) {
      if ((value >> (8 * (31 - i))) & 0xFF != 0) break;
      zeros++;
    }

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

    // Add leading '1's for each leading zero byte
    for (uint i = 0; i < zeros; i++) {
      result[--resultLen] = ALPHABET[0];
    }

    // Create the final string with the correct length
    bytes memory finalResult = new bytes(resultSize - resultLen);
    for (uint i = 0; i < resultSize - resultLen; i++) {
      finalResult[i] = result[resultLen + i];
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

  // validate a string vs a pubkey
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

    // Solana addresses are between 32-44 characters
    if (addressBytes.length < 32 || addressBytes.length > 44) {
      return false;
    }

    // Check if all characters are in the Base58 alphabet
    for (uint i = 0; i < addressBytes.length; i++) {
      bool validChar = false;
      for (uint j = 0; j < ALPHABET.length; j++) {
        if (addressBytes[i] == ALPHABET[j]) {
          validChar = true;
          break;
        }
      }
      if (!validChar) {
        return false;
      }
    }

    return true;
  }
}
