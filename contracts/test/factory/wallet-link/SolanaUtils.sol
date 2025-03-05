// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// imports
import {SCL_EIP6565_UTILS} from "crypto-lib/lib/libSCL_eddsaUtils.sol";
import {SCL_EIP6565} from "crypto-lib/lib/libSCL_EIP6565.sol";
import {SCL_sha512} from "crypto-lib/hash/SCL_sha512.sol";
import {p, d, pMINUS_1} from "crypto-lib/fields/SCL_wei25519.sol";

// Structs
/**
 * @dev Solana-specific data for wallet interactions
 */
struct SolanaSpecificData {
  uint256[5] extPubKey;
  bool isProgramDerived; // Whether this is a program derived address (PDA)
  bytes seeds; // Optional: seeds used to derive the PDA
  address programId; // Optional: program that owns this PDA
}

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
  ) public pure returns (bytes32) {
    return bytes32(pubkey[4]);
  }

  /**
   * @dev Convert bytes32 to a Base58 encoded string
   * @param data The bytes32 data to encode
   * @return The Base58 encoded string
   */
  function toBase58String(bytes32 data) public pure returns (string memory) {
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
  ) public pure returns (string memory) {
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
  ) public pure returns (string memory) {
    return toBase58String(bytes32(compressedPubkey));
  }

  /**
   * @dev Extracts the Solana address from a SolanaSpecificData struct
   * @param data The SolanaSpecificData containing the extPubKey
   * @return The Base58 encoded Solana address string
   */
  function getSolanaAddressFromSpecificData(
    SolanaSpecificData memory data
  ) public pure returns (string memory) {
    // Check if extPubKey has at least 5 elements
    if (data.extPubKey.length < 5) {
      return "INVALID_PUBKEY_SIZE";
    }

    return toBase58String(bytes32(data.extPubKey[4]));
  }

  /**
   * @dev Safely extracts the Solana address from an extPubKey array of any size
   * @param extPubKey The extended public key array
   * @return The Base58 encoded Solana address string or an error message
   */
  function getSolanaAddressFromExtPubKey(
    uint256[] memory extPubKey
  ) public pure returns (string memory) {
    if (extPubKey.length < 5) {
      return "INVALID_PUBKEY_SIZE";
    }

    return toBase58String(bytes32(extPubKey[4]));
  }

  /**
   * @dev Safely extracts the Solana address from a fixed-size extPubKey array
   * @param extPubKey The extended public key fixed array
   * @return The Base58 encoded Solana address string
   */
  function getSolanaAddressFromFixedExtPubKey(
    uint256[5] memory extPubKey
  ) public pure returns (string memory) {
    return toBase58String(bytes32(extPubKey[4]));
  }

  /**
   * @dev Safely get the compressed Solana public key as a Base58 string
   * @param pubkey The public key components array (expected to have 5 elements)
   * @return The Base58 encoded Solana address or a fallback address if array is invalid
   */
  function safeGetCompressedPublicKeyAsString(
    uint256[] memory pubkey
  ) public pure returns (string memory) {
    if (pubkey.length < 5) {
      // Return a fallback address for invalid arrays
      return "INVALID";
    }

    uint256[5] memory fixedArray;
    for (uint i = 0; i < 5; i++) {
      fixedArray[i] = pubkey[i];
    }

    bytes32 compressedKey = getCompressedPublicKey(fixedArray);
    return toBase58String(compressedKey);
  }

  /**
   * @dev Validates if a string is a valid Solana address (basic validation only)
   * @param solanaAddress The address string to validate
   * @return True if the address has valid format, false otherwise
   */
  function isValidSolanaAddress(
    string memory solanaAddress
  ) public pure returns (bool) {
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
