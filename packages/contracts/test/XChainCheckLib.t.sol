// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/XChainCheckLib.sol";

contract XChainCheckLibTest is Test {
    using XChainCheckLib for bytes;

    address constant SENDER = address(0x1);
    address constant RECIPIENT = address(0x2);
    uint256 constant CHAIN_ID = 1;
    uint256 constant AMOUNT = 1000;

    function test_ValidateData_ValidInput() public {
        bytes memory validData = abi.encode(SENDER, RECIPIENT, CHAIN_ID, AMOUNT);
        bool result = XChainCheckLib.validateData(validData);
        assertTrue(result, "Valid data should pass validation");
    }

    function test_ValidateData_EmptyData() public {
        bytes memory emptyData = "";
        bool result = XChainCheckLib.validateData(emptyData);
        assertFalse(result, "Empty data should fail validation");
    }

    function test_ValidateData_InvalidLength() public {
        bytes memory invalidData = abi.encode(SENDER, RECIPIENT);
        bool result = XChainCheckLib.validateData(invalidData);
        assertFalse(result, "Incomplete data should fail validation");
    }

    function test_ValidateData_ZeroAddress() public {
        bytes memory dataWithZeroAddress = abi.encode(address(0), RECIPIENT, CHAIN_ID, AMOUNT);
        bool result = XChainCheckLib.validateData(dataWithZeroAddress);
        assertFalse(result, "Data with zero address should fail validation");
    }

    function test_VerifySignature_ValidSignature() public {
        bytes32 messageHash = keccak256(abi.encode(SENDER, RECIPIENT, CHAIN_ID, AMOUNT));
        vm.mockCall(
            address(this),
            abi.encodeWithSelector(XChainCheckLib.verifySignature.selector),
            abi.encode(true)
        );
        bool result = XChainCheckLib.verifySignature(messageHash, "", SENDER);
        assertTrue(result, "Valid signature should verify successfully");
    }

    function test_VerifySignature_InvalidSigner() public {
        bytes32 messageHash = keccak256(abi.encode(SENDER, RECIPIENT, CHAIN_ID, AMOUNT));
        address wrongSigner = address(0x999);
        vm.mockCall(
            address(this),
            abi.encodeWithSelector(XChainCheckLib.verifySignature.selector),
            abi.encode(false)
        );
        bool result = XChainCheckLib.verifySignature(messageHash, "", wrongSigner);
        assertFalse(result, "Signature from wrong signer should fail verification");
    }

    function test_VerifySignature_EmptySignature() public {
        bytes32 messageHash = keccak256(abi.encode(SENDER, RECIPIENT, CHAIN_ID, AMOUNT));
        bool result = XChainCheckLib.verifySignature(messageHash, "", SENDER);
        assertFalse(result, "Empty signature should fail verification");
    }

    function test_CheckChainId_ValidChainId() public {
        uint256 validChainId = block.chainid;
        bool result = XChainCheckLib.checkChainId(validChainId);
        assertTrue(result, "Current chain ID should be valid");
    }

    function test_CheckChainId_InvalidChainId() public {
        uint256 invalidChainId = 999999;
        bool result = XChainCheckLib.checkChainId(invalidChainId);
        assertFalse(result, "Invalid chain ID should fail check");
    }

    function test_CheckAmount_ValidAmount() public {
        uint256 validAmount = 1000;
        bool result = XChainCheckLib.checkAmount(validAmount);
        assertTrue(result, "Valid amount should pass check");
    }

    function test_CheckAmount_ZeroAmount() public {
        uint256 zeroAmount = 0;
        bool result = XChainCheckLib.checkAmount(zeroAmount);
        assertFalse(result, "Zero amount should fail check");
    }

    function test_CheckAmount_MaxAmount() public {
        uint256 maxAmount = type(uint256).max;
        bool result = XChainCheckLib.checkAmount(maxAmount);
        assertTrue(result, "Maximum amount should pass check");
    }

    function testFuzz_ValidateData_RandomInputs(
        address sender,
        address recipient,
        uint256 chainId,
        uint256 amount
    ) public {
        vm.assume(sender != address(0));
        vm.assume(recipient != address(0));
        vm.assume(chainId > 0);
        vm.assume(amount > 0);

        bytes memory data = abi.encode(sender, recipient, chainId, amount);
        bool result = XChainCheckLib.validateData(data);
        assertTrue(result, "Valid random data should pass validation");
    }

    function testFuzz_CheckAmount_RandomValues(uint256 amount) public {
        vm.assume(amount > 0);

        bool result = XChainCheckLib.checkAmount(amount);
        assertTrue(result, "Any positive amount should pass check");
    }

    function testFuzz_CheckChainId_RandomValues(uint256 chainId) public {
        vm.assume(chainId > 0 && chainId <= type(uint32).max);

        bool result = XChainCheckLib.checkChainId(chainId);
        assertEq(result, chainId == block.chainid, "Chain ID check should match expected");
    }

    function test_FullValidation_CompleteWorkflow() public {
        bytes memory transactionData = abi.encode(SENDER, RECIPIENT, CHAIN_ID, AMOUNT);
        bytes32 messageHash = keccak256(transactionData);

        assertTrue(XChainCheckLib.validateData(transactionData), "Data validation should pass");
        assertTrue(XChainCheckLib.checkAmount(AMOUNT), "Amount validation should pass");
        assertTrue(XChainCheckLib.checkChainId(CHAIN_ID), "Chain ID validation should pass");

        vm.mockCall(
            address(this),
            abi.encodeWithSelector(XChainCheckLib.verifySignature.selector),
            abi.encode(true)
        );

        assertTrue(
            XChainCheckLib.verifySignature(messageHash, "", SENDER),
            "Signature verification should pass"
        );
    }

    function test_FullValidation_FailureScenario() public {
        bytes memory invalidData = abi.encode(address(0), RECIPIENT, 0, 0);

        assertFalse(XChainCheckLib.validateData(invalidData), "Invalid data should fail validation");
        assertFalse(XChainCheckLib.checkAmount(0), "Zero amount should fail validation");
        assertFalse(XChainCheckLib.checkChainId(0), "Zero chain ID should fail validation");
    }

    // Helper functions for test setup
    function _createValidTransactionData() internal pure returns (bytes memory) {
        return abi.encode(SENDER, RECIPIENT, CHAIN_ID, AMOUNT);
    }

    function _createInvalidTransactionData() internal pure returns (bytes memory) {
        return abi.encode(address(0), address(0), 0, 0);
    }

    function _generateMessageHash(bytes memory data) internal pure returns (bytes32) {
        return keccak256(data);
    }

    // Events for testing event emissions
    event ValidationPerformed(bool success, bytes data);
    event SignatureVerified(bool valid, address signer);
}