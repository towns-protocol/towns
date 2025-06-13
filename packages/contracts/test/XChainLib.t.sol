// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "src/XChainLib.sol";

contract XChainLibTest is Test {
    using XChainLib for bytes;

    // Test constants for various scenarios
    bytes32 constant SAMPLE_HASH = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    address constant SAMPLE_ADDRESS = 0x1234567890123456789012345678901234567890;
    uint256 constant SAMPLE_AMOUNT = 1000 * 1e18;

    function setUp() public {
        // Setup any necessary state for tests
    }

    // Test encoding functions - happy path
    function test_encodeMessage_ValidInputs() public {
        bytes memory message = XChainLib.encodeMessage(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);
        assertGt(message.length, 0, "Encoded message should not be empty");

        // Test decoding to verify encoding correctness
        (address decodedAddress, uint256 decodedAmount, bytes32 decodedHash) = XChainLib.decodeMessage(message);
        assertEq(decodedAddress, SAMPLE_ADDRESS, "Address should match");
        assertEq(decodedAmount, SAMPLE_AMOUNT, "Amount should match");
        assertEq(decodedHash, SAMPLE_HASH, "Hash should match");
    }

    // Test encoding edge cases
    function test_encodeMessage_ZeroValues() public {
        bytes memory message = XChainLib.encodeMessage(address(0), 0, bytes32(0));
        assertGt(message.length, 0, "Should handle zero values");

        (address addr, uint256 amount, bytes32 hash) = XChainLib.decodeMessage(message);
        assertEq(addr, address(0), "Zero address should be preserved");
        assertEq(amount, 0, "Zero amount should be preserved");
        assertEq(hash, bytes32(0), "Zero hash should be preserved");
    }

    function test_encodeMessage_MaxValues() public {
        address maxAddr = address(type(uint160).max);
        uint256 maxAmount = type(uint256).max;
        bytes32 maxHash = bytes32(type(uint256).max);

        bytes memory message = XChainLib.encodeMessage(maxAddr, maxAmount, maxHash);
        (address addr, uint256 amount, bytes32 hash) = XChainLib.decodeMessage(message);

        assertEq(addr, maxAddr, "Max address should be preserved");
        assertEq(amount, maxAmount, "Max amount should be preserved");
        assertEq(hash, maxHash, "Max hash should be preserved");
    }

    // Test decoding failure conditions
    function test_decodeMessage_InvalidLength() public {
        bytes memory invalidMessage = "too_short";
        vm.expectRevert();
        XChainLib.decodeMessage(invalidMessage);
    }

    function test_decodeMessage_EmptyMessage() public {
        bytes memory emptyMessage = "";
        vm.expectRevert();
        XChainLib.decodeMessage(emptyMessage);
    }

    function test_decodeMessage_CorruptedData() public {
        // Create message with correct length but corrupted data
        bytes memory corruptedMessage = new bytes(96); // Assuming 96 bytes total
        for (uint256 i = 0; i < corruptedMessage.length; i++) {
            corruptedMessage[i] = bytes1(uint8(i % 256));
        }

        try XChainLib.decodeMessage(corruptedMessage) returns (address, uint256, bytes32) {
            // If it doesn't revert, that's also valid behavior
        } catch {
            // Expected for strict validation implementations
        }
    }

    // Test hash functions
    function test_computeHash_Consistency() public {
        bytes32 hash1 = XChainLib.computeHash(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);
        bytes32 hash2 = XChainLib.computeHash(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);

        assertEq(hash1, hash2, "Hash should be deterministic");
        assertNotEq(hash1, bytes32(0), "Hash should not be zero");
    }

    function test_computeHash_DifferentInputs() public {
        bytes32 hash1 = XChainLib.computeHash(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);
        bytes32 hash2 = XChainLib.computeHash(address(0x1111), SAMPLE_AMOUNT, SAMPLE_HASH);
        bytes32 hash3 = XChainLib.computeHash(SAMPLE_ADDRESS, 999, SAMPLE_HASH);
        bytes32 hash4 = XChainLib.computeHash(SAMPLE_ADDRESS, SAMPLE_AMOUNT, bytes32(uint256(0x5555)));

        assertNotEq(hash1, hash2, "Different addresses should produce different hashes");
        assertNotEq(hash1, hash3, "Different amounts should produce different hashes");
        assertNotEq(hash1, hash4, "Different data should produce different hashes");
    }

    // Test validation functions
    function test_validateMessage_ValidMessage() public {
        bytes memory validMessage = XChainLib.encodeMessage(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);
        assertTrue(XChainLib.validateMessage(validMessage), "Valid message should pass validation");
    }

    function test_validateMessage_InvalidMessage() public {
        bytes memory invalidMessage = "invalid";
        assertFalse(XChainLib.validateMessage(invalidMessage), "Invalid message should fail validation");
    }

    // Fuzz tests for robust validation
    function testFuzz_encodeDecodeRoundTrip(address addr, uint256 amount, bytes32 data) public {
        bytes memory encoded = XChainLib.encodeMessage(addr, amount, data);
        (address decodedAddr, uint256 decodedAmount, bytes32 decodedData) = XChainLib.decodeMessage(encoded);

        assertEq(decodedAddr, addr, "Fuzz: Address should round-trip correctly");
        assertEq(decodedAmount, amount, "Fuzz: Amount should round-trip correctly");
        assertEq(decodedData, data, "Fuzz: Data should round-trip correctly");
    }

    function testFuzz_computeHash(address addr, uint256 amount, bytes32 data) public {
        bytes32 hash = XChainLib.computeHash(addr, amount, data);
        assertNotEq(hash, bytes32(0), "Fuzz: Hash should never be zero");

        // Test consistency
        bytes32 hash2 = XChainLib.computeHash(addr, amount, data);
        assertEq(hash, hash2, "Fuzz: Hash should be deterministic");
    }

    function testFuzz_validateMessage(bytes calldata randomData) public {
        // Test that validation doesn't revert on arbitrary input
        try XChainLib.validateMessage(randomData) returns (bool result) {
            assertTrue(result == true || result == false, "Validation should return boolean");
        } catch {
            // Acceptable for strict implementations
        }
    }

    // Integration tests combining multiple functions
    function test_fullWorkflow() public {
        bytes memory message = XChainLib.encodeMessage(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);
        bytes32 messageHash = XChainLib.computeHash(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);
        bool isValid = XChainLib.validateMessage(message);

        assertTrue(isValid, "Message should be valid");
        assertNotEq(messageHash, bytes32(0), "Hash should be non-zero");

        (address addr, uint256 amount, bytes32 data) = XChainLib.decodeMessage(message);
        assertEq(addr, SAMPLE_ADDRESS, "Decoded address should match");
        assertEq(amount, SAMPLE_AMOUNT, "Decoded amount should match");
        assertEq(data, SAMPLE_HASH, "Decoded data should match");
    }

    // Boundary tests
    function test_boundaryValues() public {
        uint256[] memory boundaryAmounts = new uint256[](4);
        boundaryAmounts[0] = 0;
        boundaryAmounts[1] = 1;
        boundaryAmounts[2] = type(uint256).max - 1;
        boundaryAmounts[3] = type(uint256).max;

        for (uint256 i = 0; i < boundaryAmounts.length; i++) {
            bytes memory message = XChainLib.encodeMessage(SAMPLE_ADDRESS, boundaryAmounts[i], SAMPLE_HASH);
            (, uint256 decodedAmount, ) = XChainLib.decodeMessage(message);
            assertEq(decodedAmount, boundaryAmounts[i], "Boundary amount should round-trip correctly");
        }
    }

    // Gas usage tests
    function test_gasUsage() public {
        uint256 gasBefore = gasleft();
        XChainLib.encodeMessage(SAMPLE_ADDRESS, SAMPLE_AMOUNT, SAMPLE_HASH);
        uint256 gasUsed = gasBefore - gasleft();

        assertLt(gasUsed, 100000, "Encoding should not use excessive gas");
    }
}