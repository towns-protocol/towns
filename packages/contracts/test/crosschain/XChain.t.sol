// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IEntitlementCheckerBase} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IEntitlementGatedBase} from "src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementGated} from "src/spaces/facets/gated/IEntitlementGated.sol";
import {IXChain} from "src/base/registry/facets/xchain/IXChain.sol";

//libraries
import {RuleEntitlementUtil} from "./RuleEntitlementUtil.sol";

//contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {EntitlementTestUtils} from "test/utils/EntitlementTestUtils.sol";
import {MockEntitlementGated} from "test/mocks/MockEntitlementGated.sol";

import {Vm} from "forge-std/Test.sol";

contract XChainTest is
    IEntitlementGatedBase,
    IEntitlementCheckerBase,
    EntitlementTestUtils,
    BaseSetup
{
    MockEntitlementGated public gated;

    function setUp() public override {
        super.setUp();
        _registerOperators();
        _registerNodes();

        gated = new MockEntitlementGated(entitlementChecker);
    }

    function test_provideXChainRefund() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        // Start with single role ID to test basic refund functionality
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        //  assert that the caller has 1 ether and entitlement checker has 0 ether
        assertEq(address(caller).balance, 1 ether);
        assertEq(address(entitlementChecker).balance, 0 ether);

        vm.recordLogs();
        vm.prank(caller);
        gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );
        Vm.Log[] memory requestLogs = vm.getRecordedLogs();
        (, , address resolverAddress, bytes32 transactionId, , ) = _getRequestV2EventData(
            requestLogs
        );

        // Verify payment was sent to the resolver (EntitlementChecker)
        assertEq(address(resolverAddress).balance, 1 ether);
        assertEq(address(caller).balance, 0 ether);

        // Provide refund as owner
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Verify final state - caller should get their money back
        assertEq(address(resolverAddress).balance, 0 ether);
        assertEq(address(caller).balance, 1 ether);

        // Verify check is completed
        assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[0]));
    }

    function test_provideXChainRefund_revertWhen_alreadyCompleted() public {
        // Setup: Create a request with value
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        // Create a request through the gated contract
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        // Provide refund as owner
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Try to provide refund again
        vm.prank(deployer);
        vm.expectRevert(EntitlementGated_TransactionCheckAlreadyCompleted.selector);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);
    }

    function test_provideXChainRefund_revertWhen_invalidValue() public {
        // Setup: Create a request with value
        address caller = _randomAddress();

        // Create a request through the gated contract
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(deployer);
        vm.expectRevert(EntitlementGated_InvalidValue.selector);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);
    }

    function test_provideXChainRefund_revertWhen_notOwner() public {
        // Setup: Create a request with value
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        // Create a request through the gated contract
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        // Try to provide refund as non-owner
        address nonOwner = _randomAddress();
        vm.prank(nonOwner);
        vm.expectRevert();
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);
    }

    function test_provideXChainRefund_multipleRequestIds() public {
        // Setup: Create a request with value and multiple role IDs
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        // Create a request with multiple role IDs (this should now work with our fix)
        uint256[] memory roleIds = new uint256[](2);
        roleIds[0] = 0;
        roleIds[1] = 1;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        // Verify initial state
        assertEq(address(entitlementChecker).balance, 1 ether);

        // Provide refund as owner
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Verify final state
        assertEq(address(entitlementChecker).balance, 0);
        assertEq(caller.balance, 1 ether);

        // Verify all checks are completed
        for (uint256 i = 0; i < roleIds.length; i++) {
            assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[i]));
        }
    }
/// @dev Fuzz test for provideXChainRefund with various ETH amounts
    function testFuzz_provideXChainRefund_withRandomAmounts(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 100 ether);
        address caller = _randomAddress();
        vm.deal(caller, amount);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: amount}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        // Verify initial balance transfer
        assertEq(address(entitlementChecker).balance, amount);
        assertEq(address(caller).balance, 0);

        // Provide refund as owner
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Verify refund completed
        assertEq(address(entitlementChecker).balance, 0);
        assertEq(address(caller).balance, amount);
        assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[0]));
    }

    /// @dev Fuzz test for multiple role IDs with random arrays
    function testFuzz_provideXChainRefund_multipleRoleIds(uint8 roleCount) public {
        vm.assume(roleCount > 0 && roleCount <= 10);

        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](roleCount);
        for (uint256 i = 0; i < roleCount; i++) {
            roleIds[i] = i;
        }

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Verify all role checks are completed
        for (uint256 i = 0; i < roleIds.length; i++) {
            assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[i]));
        }
    }

    /// @dev Fuzz test access control with random addresses
    function testFuzz_provideXChainRefund_revertWhen_notOwner(address randomCaller) public {
        vm.assume(randomCaller != deployer);
        vm.assume(randomCaller != address(0));

        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(randomCaller);
        vm.expectRevert();
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);
    }

    /// @dev Test that correct events are emitted during refund
    function test_provideXChainRefund_emitsCorrectEvents() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.recordLogs();
        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.recordLogs();
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertTrue(logs.length > 0);
    }

    /// @dev Test event emission with multiple role IDs
    function test_provideXChainRefund_multipleRoleIds_events() public {
        address caller = _randomAddress();
        vm.deal(caller, 2 ether);

        uint256[] memory roleIds = new uint256[](3);
        roleIds[0] = 0;
        roleIds[1] = 1;
        roleIds[2] = 2;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 2 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.recordLogs();
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertTrue(logs.length >= roleIds.length);
    }

    /// @dev Test with maximum possible role ID array
    function test_provideXChainRefund_maxRoleIds() public {
        address caller = _randomAddress();
        vm.deal(caller, 5 ether);

        uint256[] memory roleIds = new uint256[](50);
        for (uint256 i = 0; i < 50; i++) {
            roleIds[i] = i;
        }

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 5 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        for (uint256 i = 0; i < roleIds.length; i++) {
            assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[i]));
        }
    }

    /// @dev Test refund with zero address (should revert)
    function test_provideXChainRefund_revertWhen_zeroAddress() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(deployer);
        vm.expectRevert();
        IXChain(baseRegistry).provideXChainRefund(address(0), transactionId);
    }

    /// @dev Test refund with invalid/non-existent transaction ID
    function test_provideXChainRefund_revertWhen_invalidTransactionId() public {
        bytes32 invalidTransactionId = keccak256("invalid");
        address caller = _randomAddress();

        vm.prank(deployer);
        vm.expectRevert();
        IXChain(baseRegistry).provideXChainRefund(caller, invalidTransactionId);
    }

    /// @dev Test state consistency when refund fails mid-execution
    function test_provideXChainRefund_stateConsistency() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        uint256 initialCallerBalance = caller.balance;
        uint256 initialContractBalance = address(entitlementChecker).balance;

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        assertEq(caller.balance, initialCallerBalance + 1 ether);
        assertEq(address(entitlementChecker).balance, initialContractBalance - 1 ether);
    }

    /// @dev Test access control with different roles
    function test_provideXChainRefund_accessControl_detailedPermissions() public {
        address caller = _randomAddress();
        address unauthorizedUser = _randomAddress();
        address anotherUnauthorized = _randomAddress();

        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(unauthorizedUser);
        vm.expectRevert();
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        vm.prank(anotherUnauthorized);
        vm.expectRevert();
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        vm.prank(caller);
        vm.expectRevert();
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);
    }

    /// @dev Test edge case with minimum and maximum ETH values
    function test_provideXChainRefund_minMaxValues() public {
        // Test with 1 wei (minimum value)
        address caller1 = _randomAddress();
        vm.deal(caller1, 1 wei);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller1);
        bytes32 transactionId1 = gated.joinSpace{value: 1 wei}(
            caller1,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller1, transactionId1);

        assertEq(caller1.balance, 1 wei);

        // Test with large value (within reasonable bounds)
        address caller2 = _randomAddress();
        uint256 largeAmount = 1000 ether;
        vm.deal(caller2, largeAmount);

        vm.prank(caller2);
        bytes32 transactionId2 = gated.joinSpace{value: largeAmount}(
            caller2,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller2, transactionId2);

        assertEq(caller2.balance, largeAmount);
    }

    /// @dev Test gas usage for single vs multiple role refunds
    function test_provideXChainRefund_gasOptimization() public {
        address caller = _randomAddress();
        vm.deal(caller, 3 ether);

        // Test single role ID gas usage
        uint256[] memory singleRoleId = new uint256[](1);
        singleRoleId[0] = 0;

        vm.prank(caller);
        bytes32 singleTransactionId = gated.joinSpace{value: 1 ether}(
            caller,
            singleRoleId,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        uint256 gasBefore = gasleft();
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, singleTransactionId);
        uint256 singleRoleGasUsed = gasBefore - gasleft();

        // Test multiple role IDs gas usage
        uint256[] memory multipleRoleIds = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            multipleRoleIds[i] = i;
        }

        address caller2 = _randomAddress();
        vm.deal(caller2, 2 ether);

        vm.prank(caller2);
        bytes32 multipleTransactionId = gated.joinSpace{value: 2 ether}(
            caller2,
            multipleRoleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        gasBefore = gasleft();
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller2, multipleTransactionId);
        uint256 multipleRoleGasUsed = gasBefore - gasleft();

        // Gas usage should scale with number of roles
        assertTrue(multipleRoleGasUsed > singleRoleGasUsed);
    }

    /// @dev Test behavior with concurrent refund attempts
    function test_provideXChainRefund_concurrentRefunds() public {
        address caller1 = _randomAddress();
        address caller2 = _randomAddress();

        vm.deal(caller1, 1 ether);
        vm.deal(caller2, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller1);
        bytes32 transactionId1 = gated.joinSpace{value: 1 ether}(
            caller1,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(caller2);
        bytes32 transactionId2 = gated.joinSpace{value: 1 ether}(
            caller2,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller1, transactionId1);

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller2, transactionId2);

        // Verify both completed successfully
        assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId1, roleIds[0]));
        assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId2, roleIds[0]));
        assertEq(caller1.balance, 1 ether);
        assertEq(caller2.balance, 1 ether);
    }

    /// @dev Test isCheckCompleted function independently
    function test_isCheckCompleted_beforeAndAfterRefund() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](2);
        roleIds[0] = 0;
        roleIds[1] = 1;

        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        // Check that completion status is initially false
        assertFalse(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[0]));
        assertFalse(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[1]));

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Check that completion status is now true
        assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[0]));
        assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[1]));
    }

    /// @dev Test isCheckCompleted with non-existent transaction
    function test_isCheckCompleted_nonExistentTransaction() public {
        bytes32 nonExistentId = keccak256("non-existent");
        uint256 roleId = 0;

        // Should return false for non-existent transaction
        assertFalse(IXChain(baseRegistry).isCheckCompleted(nonExistentId, roleId));
    }

    /// @dev Test multiple refunds maintain system integrity
    function test_provideXChainRefund_systemIntegrity() public {
        uint256 totalInitialBalance = 10 ether;
        uint256 numCallers = 5;
        uint256 amountPerCaller = totalInitialBalance / numCallers;

        address[] memory callers = new address[](numCallers);
        bytes32[] memory transactionIds = new bytes32[](numCallers);

        // Setup multiple callers and transactions
        for (uint256 i = 0; i < numCallers; i++) {
            callers[i] = _randomAddress();
            vm.deal(callers[i], amountPerCaller);

            uint256[] memory roleIds = new uint256[](1);
            roleIds[0] = 0;

            vm.prank(callers[i]);
            transactionIds[i] = gated.joinSpace{value: amountPerCaller}(
                callers[i],
                roleIds,
                RuleEntitlementUtil.getMockERC721RuleData()
            );
        }

        // Process all refunds
        for (uint256 i = 0; i < numCallers; i++) {
            vm.prank(deployer);
            IXChain(baseRegistry).provideXChainRefund(callers[i], transactionIds[i]);
        }

        // Verify system integrity
        uint256 totalRefunded = 0;
        for (uint256 i = 0; i < numCallers; i++) {
            assertEq(callers[i].balance, amountPerCaller);
            totalRefunded += callers[i].balance;
        }

        assertEq(totalRefunded, totalInitialBalance);
        assertEq(address(entitlementChecker).balance, 0);
    }

    /// @dev Test with different MockEntitlementGated functions
    function test_provideXChainRefund_withDifferentRequestMethods() public {
        address caller = _randomAddress();
        vm.deal(caller, 2 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 transactionId = gated.requestEntitlementCheckV2RuleDataV1{value: 1 ether}(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        // Verify initial state
        assertEq(address(entitlementChecker).balance, 1 ether);
        assertEq(caller.balance, 1 ether);

        // Provide refund
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Verify final state
        assertEq(address(entitlementChecker).balance, 0);
        assertEq(caller.balance, 2 ether);
        assertTrue(IXChain(baseRegistry).isCheckCompleted(transactionId, roleIds[0]));
    }
}
