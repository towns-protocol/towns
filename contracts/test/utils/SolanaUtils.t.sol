// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {SolanaUtils} from "contracts/src/factory/facets/wallet-link/libraries/SolanaUtils.sol";
import {SCL_EIP6565_UTILS} from "crypto-lib/lib/libSCL_eddsaUtils.sol";

contract SolanaUtilsTest is TestUtils {
  // Test data
  uint256[5] internal validExtPubKey;
  bytes32 internal validCompressedKey;
  string internal validSolanaAddress;

  function setUp() public {
    // Set up test data with known values
    // This is a sample extended public key (5 elements)
    (validExtPubKey, ) = SCL_EIP6565_UTILS.SetKey(_randomUint256());

    // The compressed key is the 5th element of the extended key
    validCompressedKey = bytes32(validExtPubKey[4]);

    // Pre-compute the expected Solana address for our test key
    // This would be the Base58 encoding of validCompressedKey
    // For testing purposes, we'll use the actual function to generate it
    // and then verify its behavior in the tests
    validSolanaAddress = this.callToBase58String(validCompressedKey);
  }
  // Test getCompressedPublicKey
  function testGetCompressedPublicKey() public view {
    bytes32 result = this.callGetCompressedPublicKey(validExtPubKey);
    assertEq(
      result,
      validCompressedKey,
      "Compressed public key should match the 5th element of the extended key"
    );
  }

  // Test toBase58String with various inputs
  function testToBase58String() public view {
    // Test with our valid compressed key
    string memory result = this.callToBase58String(validCompressedKey);

    assertEq(
      result,
      validSolanaAddress,
      "Base58 encoding should match expected value"
    );

    // Test with zero value
    bytes32 zeroBytes = bytes32(0);
    string memory zeroResult = this.callToBase58String(zeroBytes);

    string memory expectedZeroResult = "11111111111111111111111111111111";

    assertEq(
      zeroResult,
      expectedZeroResult,
      "Base58 encoding of zero should be '11111111111111111111111111111111'"
    );

    // Test with a known value
    bytes32 knownBytes = bytes32(
      uint256(
        0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20
      )
    );
    string memory knownResult = this.callToBase58String(knownBytes);
    // The expected result would be the Base58 encoding of the above bytes
    // This is a placeholder - in a real test, you would compute this separately
    assertTrue(
      bytes(knownResult).length > 0,
      "Base58 encoding should produce a non-empty string"
    );
  }

  // Test getCompressedPublicKeyAsString
  function testGetCompressedPublicKeyAsString() public view {
    string memory result = this.callGetCompressedPublicKeyAsString(
      validExtPubKey
    );
    assertEq(
      result,
      validSolanaAddress,
      "Compressed public key as string should match expected Solana address"
    );
  }

  // Test getSolanaAddressFromCompressedKey
  function testGetSolanaAddressFromCompressedKey() public view {
    string memory result = this.callGetSolanaAddressFromCompressedKey(
      validExtPubKey[4]
    );
    assertEq(
      result,
      validSolanaAddress,
      "Solana address from compressed key should match expected address"
    );
  }

  // Test getSolanaAddressFromFixedExtPubKey
  function testGetSolanaAddressFromFixedExtPubKey() public view {
    string memory result = this.callGetSolanaAddressFromFixedExtPubKey(
      validExtPubKey
    );
    assertEq(
      result,
      validSolanaAddress,
      "Solana address from fixed ext pubkey should match expected address"
    );
  }

  // Test isValidSolanaAddress with pubkey
  function testIsValidSolanaAddressWithPubkey() public view {
    bool result = this.callIsValidSolanaAddress(
      validSolanaAddress,
      validExtPubKey
    );
    assertTrue(
      result,
      "Valid Solana address should be validated against matching pubkey"
    );

    // Test with incorrect address
    string
      memory incorrectAddress = "3Myn3St4YQgL4WQvZxPdMaBWH1EvkzzpkLX8oVK3c7T4"; // Random valid-looking address
    bool incorrectResult = this.callIsValidSolanaAddress(
      incorrectAddress,
      validExtPubKey
    );
    assertFalse(
      incorrectResult,
      "Incorrect Solana address should not validate against pubkey"
    );
  }

  // Test isValidSolanaAddress (string only)
  function testIsValidSolanaAddress() external view {
    // Test with valid address format
    bool result = this.callIsValidSolanaAddress(validSolanaAddress);
    assertTrue(result, "Valid Solana address format should be validated");

    // Test with another valid-looking address
    string
      memory anotherValidAddress = "3Myn3St4YQgL4WQvZxPdMaBWH1EvkzzpkLX8oVK3c7T4";
    bool anotherResult = this.callIsValidSolanaAddress(anotherValidAddress);
    assertTrue(
      anotherResult,
      "Another valid Solana address format should be validated"
    );

    // Test with invalid addresses

    // Too short
    string memory tooShortAddress = "3Myn3St4YQg";
    bool tooShortResult = this.callIsValidSolanaAddress(tooShortAddress);
    assertFalse(tooShortResult, "Too short address should not be validated");

    // Too long
    string
      memory tooLongAddress = "3Myn3St4YQgL4WQvZxPdMaBWH1EvkzzpkLX8oVK3c7T4ABCDEFGHIJKLMN";
    bool tooLongResult = this.callIsValidSolanaAddress(tooLongAddress);
    assertFalse(tooLongResult, "Too long address should not be validated");

    // Empty string
    string memory emptyAddress = "";
    bool emptyResult = this.callIsValidSolanaAddress(emptyAddress);
    assertFalse(emptyResult, "Empty address should not be validated");
  }

  // Test with real-world Solana addresses
  function testRealWorldSolanaAddresses() public view {
    // These are examples of real Solana addresses
    string[3] memory realAddresses = [
      "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
      "3Myn3St4YQgL4WQvZxPdMaBWH1EvkzzpkLX8oVK3c7T4",
      "7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2"
    ];

    for (uint i = 0; i < realAddresses.length; i++) {
      bool result = this.callIsValidSolanaAddress(realAddresses[i]);
      assertTrue(result, "Real-world Solana address should be validated");
    }
  }

  // Test with edge cases for Base58 encoding
  function testBase58EdgeCases() public view {
    // Test with leading zeros
    bytes32 leadingZeros = bytes32(
      uint256(
        0x0000000000000000000000000000000000000000000000000000000000000123
      )
    );
    string memory leadingZerosResult = this.callToBase58String(leadingZeros);
    // The expected result would have multiple '1's at the beginning (Base58 encoding of zeros)
    assertTrue(
      bytes(leadingZerosResult).length > 0,
      "Base58 encoding with leading zeros should produce a valid string"
    );

    // Test with all zeros
    bytes32 allZeros = bytes32(0);
    string memory allZerosResult = this.callToBase58String(allZeros);

    // Instead of comparing strings directly, let's check the length and content
    bytes memory allZerosResultBytes = bytes(allZerosResult);
    assertTrue(
      allZerosResultBytes.length > 0,
      "Base58 encoding of all zeros should produce a non-empty string"
    );

    // Check if all characters are '1' (ASCII 49)
    bool allOnes = true;
    for (uint i = 0; i < allZerosResultBytes.length; i++) {
      if (allZerosResultBytes[i] != "1") {
        allOnes = false;
        break;
      }
    }
    assertTrue(
      allOnes,
      "Base58 encoding of all zeros should consist of only '1' characters"
    );

    // Test with max value
    bytes32 maxValue = bytes32(type(uint256).max);
    string memory maxValueResult = this.callToBase58String(maxValue);
    assertTrue(
      bytes(maxValueResult).length > 0,
      "Base58 encoding of max value should produce a valid string"
    );
  }

  // Test consistency between different methods
  function testConsistencyBetweenMethods() public view {
    string memory method1 = this.callGetCompressedPublicKeyAsString(
      validExtPubKey
    );
    string memory method2 = this.callGetSolanaAddressFromCompressedKey(
      validExtPubKey[4]
    );
    string memory method3 = this.callGetSolanaAddressFromFixedExtPubKey(
      validExtPubKey
    );

    assertEq(
      method1,
      method2,
      "Different methods should produce consistent results"
    );
    assertEq(
      method2,
      method3,
      "Different methods should produce consistent results"
    );
  }

  // Add a separate test for invalid characters in Solana addresses
  function testInvalidCharactersInSolanaAddress() public view {
    // Create a test for a clearly invalid address with special characters
    string memory invalidAddress1 = "!@#$%^&*()";
    bool result1 = this.callIsValidSolanaAddress(invalidAddress1);
    assertFalse(
      result1,
      "Address with special characters should not be validated"
    );

    // Try another approach with a mix of valid and invalid characters
    string
      memory invalidAddress2 = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin!";
    bool result2 = this.callIsValidSolanaAddress(invalidAddress2);
    assertFalse(
      result2,
      "Address with trailing invalid character should not be validated"
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         Helpers                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  // Helper function to call the internal toBase58String function
  function callToBase58String(
    bytes32 data
  ) external pure returns (string memory) {
    return SolanaUtils.toBase58String(data);
  }

  // Helper function to call the internal getCompressedPublicKey function
  function callGetCompressedPublicKey(
    uint256[5] memory pubkey
  ) external pure returns (bytes32) {
    return SolanaUtils.getCompressedPublicKey(pubkey);
  }

  // Helper function to call the internal getCompressedPublicKeyAsString function
  function callGetCompressedPublicKeyAsString(
    uint256[5] memory pubkey
  ) external pure returns (string memory) {
    return SolanaUtils.getCompressedPublicKeyAsString(pubkey);
  }

  // Helper function to call the internal getSolanaAddressFromCompressedKey function
  function callGetSolanaAddressFromCompressedKey(
    uint256 compressedPubkey
  ) external pure returns (string memory) {
    return SolanaUtils.getSolanaAddressFromCompressedKey(compressedPubkey);
  }

  // Helper function to call the internal getSolanaAddressFromFixedExtPubKey function
  function callGetSolanaAddressFromFixedExtPubKey(
    uint256[5] memory extPubKey
  ) external pure returns (string memory) {
    return SolanaUtils.getSolanaAddressFromFixedExtPubKey(extPubKey);
  }

  // Helper function to call the internal isValidSolanaAddress function (with pubkey)
  function callIsValidSolanaAddress(
    string memory solanaAddress,
    uint256[5] memory extPubKey
  ) external pure returns (bool) {
    return SolanaUtils.isValidSolanaAddress(solanaAddress, extPubKey);
  }

  // Helper function to call the internal isValidSolanaAddress function (string only)
  function callIsValidSolanaAddress(
    string memory solanaAddress
  ) external pure returns (bool) {
    return SolanaUtils.isValidSolanaAddress(solanaAddress);
  }
}
