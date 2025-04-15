// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {SolanaUtils} from "src/factory/facets/wallet-link/libraries/SolanaUtils.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {SCL_EIP6565_UTILS} from "crypto-lib/lib/libSCL_eddsaUtils.sol";
import {LibBytes} from "solady/utils/LibBytes.sol";

contract SolanaUtilsTest is TestUtils {
    // Test data
    uint256[5] internal validExtPubKey;
    bytes32 internal validCompressedKey;

    // Reference values for testing
    string internal knownBase58ForZero;
    bytes32 internal knownBytes;
    string internal knownBase58ForKnownBytes;

    function setUp() public {
        // Set up test data with known values
        // This is a sample extended public key (5 elements)
        (validExtPubKey, ) = SCL_EIP6565_UTILS.SetKey(_randomUint256());

        // The compressed key is the 5th element of the extended key
        validCompressedKey = bytes32(validExtPubKey[4]);

        // Set up reference values for testing
        knownBase58ForZero = "11111111111111111111111111111111";

        // Known input bytes and their expected Base58 encoding
        knownBytes = bytes32(
            uint256(0x850f2d6e02a47af824d09ab69dc42d70cb28cbfa249fb7ee57b9d256c12762ef)
        );
        // This is the actual Base58 encoding of knownBytes, computed externally
        knownBase58ForKnownBytes = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
    }

    function test_fuzz_isBase58(bytes1 char) public pure {
        assertEq(
            (SolanaUtils.BASE58_MAP >> uint8(char)) & 1 != 0,
            LibBytes.contains(SolanaUtils.ALPHABET, bytes.concat(char))
        );
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
        // Test with zero value
        bytes32 zeroBytes = bytes32(0);
        string memory zeroResult = this.callToBase58String(zeroBytes);

        assertEq(
            zeroResult,
            knownBase58ForZero,
            "Base58 encoding of zero should be '11111111111111111111111111111111'"
        );

        // Test with a known value and its pre-computed Base58 encoding
        string memory knownResult = this.callToBase58String(knownBytes);
        assertEq(
            knownResult,
            knownBase58ForKnownBytes,
            "Base58 encoding should match the pre-computed value"
        );
    }

    // Test getCompressedPublicKeyAsString
    function testGetCompressedPublicKeyAsString() public view {
        string memory result = this.callGetCompressedPublicKeyAsString(validExtPubKey);

        // Verify that the result matches what we'd get from the direct method
        string memory directResult = this.callToBase58String(validCompressedKey);
        assertEq(
            result,
            directResult,
            "getCompressedPublicKeyAsString should match direct Base58 encoding of the compressed key"
        );
    }

    // Test getSolanaAddressFromCompressedKey
    function testGetSolanaAddressFromCompressedKey() public view {
        string memory result = this.callGetSolanaAddressFromCompressedKey(validExtPubKey[4]);

        // Verify that the result matches what we'd get from the direct method
        string memory directResult = this.callToBase58String(validCompressedKey);
        assertEq(
            result,
            directResult,
            "getSolanaAddressFromCompressedKey should match direct Base58 encoding of the compressed key"
        );
    }

    // Test getSolanaAddressFromFixedExtPubKey
    function testGetSolanaAddressFromFixedExtPubKey() public view {
        string memory result = this.callGetSolanaAddressFromFixedExtPubKey(validExtPubKey);

        // Verify that the result matches what we'd get from the direct method
        string memory directResult = this.callToBase58String(validCompressedKey);
        assertEq(
            result,
            directResult,
            "getSolanaAddressFromFixedExtPubKey should match direct Base58 encoding of the compressed key"
        );
    }

    // Test isValidSolanaAddress with pubkey
    function testIsValidSolanaAddressWithPubkey() public view {
        // Generate the Solana address directly
        string memory expectedAddress = this.callToBase58String(validCompressedKey);

        bool result = this.callIsValidSolanaAddress(expectedAddress, validExtPubKey);
        assertTrue(result, "Valid Solana address should be validated against matching pubkey");

        // Test with incorrect address
        string memory incorrectAddress = "3Myn3St4YQgL4WQvZxPdMaBWH1EvkzzpkLX8oVK3c7T4"; // Random
        // valid-looking address
        bool incorrectResult = this.callIsValidSolanaAddress(incorrectAddress, validExtPubKey);
        assertFalse(incorrectResult, "Incorrect Solana address should not validate against pubkey");
    }

    // Test isValidSolanaAddress (string only)
    function testIsValidSolanaAddress() external view {
        // Generate a valid Solana address
        string memory validSolanaAddress = this.callToBase58String(validCompressedKey);

        // Test with valid address format
        bool result = this.callIsValidSolanaAddress(validSolanaAddress);
        assertTrue(result, "Valid Solana address format should be validated");

        // Test with another valid-looking address
        string memory anotherValidAddress = "3Myn3St4YQgL4WQvZxPdMaBWH1EvkzzpkLX8oVK3c7T4";
        bool anotherResult = this.callIsValidSolanaAddress(anotherValidAddress);
        assertTrue(anotherResult, "Another valid Solana address format should be validated");

        // Test with invalid addresses

        // Too short
        string memory tooShortAddress = "3Myn3St4YQg";
        bool tooShortResult = this.callIsValidSolanaAddress(tooShortAddress);
        assertFalse(tooShortResult, "Too short address should not be validated");

        // Too long
        string memory tooLongAddress = "3Myn3St4YQgL4WQvZxPdMaBWH1EvkzzpkLX8oVK3c7T4ABCDEFGHIJKLMN";
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

        uint256 len = realAddresses.length;
        for (uint256 i; i < len; ++i) {
            bool result = this.callIsValidSolanaAddress(realAddresses[i]);
            assertTrue(result, "Real-world Solana address should be validated");
        }
    }

    // Test with edge cases for Base58 encoding
    function testBase58EdgeCases() public view {
        // Test with leading zeros
        bytes32 leadingZeros = bytes32(
            uint256(0x0000000000000000000000000000000000000000000000000000000000000123)
        );
        string memory leadingZerosResult = this.callToBase58String(leadingZeros);

        // Expected result for leading zeros (computed externally)
        string memory expectedLeadingZerosResult = "11111111111111111111111111111162";
        assertEq(
            leadingZerosResult,
            expectedLeadingZerosResult,
            "Base58 encoding with leading zeros should match expected value"
        );

        // Test with all zeros
        bytes32 allZeros = bytes32(0);
        string memory allZerosResult = this.callToBase58String(allZeros);
        assertEq(
            allZerosResult,
            knownBase58ForZero,
            "Base58 encoding of all zeros should match expected value"
        );

        // Test with max value
        bytes32 maxValue = bytes32(type(uint256).max);
        string memory maxValueResult = this.callToBase58String(maxValue);

        // Expected result for max value (computed externally)
        string memory expectedMaxValueResult = "JEKNVnkbo3jma5nREBBJCDoXFVeKkD56V3xKrvRmWxFG";
        assertEq(
            maxValueResult,
            expectedMaxValueResult,
            "Base58 encoding of max value should match expected value"
        );
    }

    // Test consistency between different methods
    function testConsistencyBetweenMethods() public view {
        string memory method1 = this.callGetCompressedPublicKeyAsString(validExtPubKey);
        string memory method2 = this.callGetSolanaAddressFromCompressedKey(validExtPubKey[4]);
        string memory method3 = this.callGetSolanaAddressFromFixedExtPubKey(validExtPubKey);

        assertEq(method1, method2, "Different methods should produce consistent results");
        assertEq(method2, method3, "Different methods should produce consistent results");
    }

    // Add a separate test for invalid characters in Solana addresses
    function testInvalidCharactersInSolanaAddress() public view {
        // Create a test for a clearly invalid address with special characters
        string memory invalidAddress1 = "!@#$%^&*()";
        bool result1 = this.callIsValidSolanaAddress(invalidAddress1);
        assertFalse(result1, "Address with special characters should not be validated");

        // Try another approach with a mix of valid and invalid characters
        string memory invalidAddress2 = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin!";
        bool result2 = this.callIsValidSolanaAddress(invalidAddress2);
        assertFalse(result2, "Address with trailing invalid character should not be validated");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Helpers                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    // Helper function to call the internal toBase58String function
    function callToBase58String(bytes32 data) external pure returns (string memory) {
        return SolanaUtils.toBase58String(data);
    }

    // Helper function to call the internal getCompressedPublicKey function
    function callGetCompressedPublicKey(uint256[5] memory pubkey) external pure returns (bytes32) {
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
    function callIsValidSolanaAddress(string memory solanaAddress) external pure returns (bool) {
        return SolanaUtils.isValidSolanaAddress(solanaAddress);
    }
}
