// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IXChain} from "src/base/registry/facets/xchain/IXChain.sol";
import {MockEntitlementGated} from "test/mocks/MockEntitlementGated.sol";
import {RuleEntitlementUtil} from "./RuleEntitlementUtil.sol";
import {EntitlementTestUtils} from "test/utils/EntitlementTestUtils.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {Vm} from "forge-std/Test.sol";

contract XChain_AdditionalTest is EntitlementTestUtils, BaseSetup {
    MockEntitlementGated public gated;

    function setUp() public virtual override {
        super.setUp();
        _registerOperators();
        _registerNodes();
        gated = new MockEntitlementGated(address(entitlementChecker));
    }

    function testZeroValueRefundReverts() public {
        // Zero-value refunds are disallowed to prevent no-op cycles.
        bytes32 txId = _createRequest(address(this), 0, new uint256[](0));
        vm.expectRevert(EntitlementGated_NoPayment.selector);
        entitlementChecker.provideXChainRefund(txId);
        assertEq(address(entitlementChecker).balance, 0);
        assertFalse(entitlementChecker.isCheckCompleted(txId));
    }

    function testInsufficientResolverBalanceRefundReverts() public {
        // Resolver funded with less than the requested refund.
        vm.deal(address(entitlementChecker), 0.1 ether);
        bytes32 txId = _createRequest(address(this), 1 ether, new uint256[](0));
        // Drain most of the resolver’s balance
        vm.prank(address(entitlementChecker));
        payable(address(1)).transfer(address(entitlementChecker).balance - 0.01 ether);
        vm.expectRevert(IXChain_InsufficientResolverBalance.selector);
        entitlementChecker.provideXChainRefund(txId);
        assertEq(address(entitlementChecker).balance, 0.1 ether);
        assertFalse(entitlementChecker.isCheckCompleted(txId));
    }

    function testInvalidTransactionIdRefundReverts() public {
        // Using a bogus transaction ID should revert without side-effects.
        bytes32 bogus = keccak256("bogus");
        vm.expectRevert(EntitlementGated_TransactionNotFound.selector);
        entitlementChecker.provideXChainRefund(bogus);
        assertFalse(entitlementChecker.isCheckCompleted(bogus));
    }

    function testRefundWrongCallerReverts() public {
        // Only the original caller may trigger their own refund.
        address callerA = address(0x1234);
        bytes32 txId = _createRequest(callerA, 1 ether, new uint256[](0));
        // Another address attempts refund
        vm.prank(address(0x5678));
        vm.expectRevert(EntitlementGated_InvalidCaller.selector);
        entitlementChecker.provideXChainRefund(txId);
    }

    function testReentrancyGuardPreventsNestedCalls() public {
        // Ensure reentrancy guard blocks nested refund calls.
        uint256 amount = 1 ether;
        ReentrantRefunder reentranter = new ReentrantRefunder(
            IXChain(address(entitlementChecker))
        );
        bytes32 txId = _createRequest(address(reentranter), amount, new uint256[](0));
        vm.expectRevert(); // ReentrancyGuard should revert
        reentranter.attack(txId);
        assertEq(address(entitlementChecker).balance, 0);
        assertTrue(entitlementChecker.isCheckCompleted(txId));
    }

    function testRefundEventEmitted() public {
        // Confirm the XChainRefundProvided event fires with correct args.
        uint256 amount = 1 ether;
        bytes32 txId = _createRequest(address(this), amount, new uint256[](0));
        vm.expectEmit(true, true, false, true);
        emit XChainRefundProvided(address(this), txId, amount);
        entitlementChecker.provideXChainRefund(txId);
    }

    /// @dev Helper to DRY up joinSpace requests.
    function _createRequest(
        address caller,
        uint256 value,
        uint256[] memory roleIds
    ) internal returns (bytes32) {
        vm.prank(caller);
        return gated.joinSpace{value: value}(roleIds);
    }
}

/// @dev Malicious contract to test reentrancy protection on provideXChainRefund.
contract ReentrantRefunder {
    IXChain public entitlement;
    bytes32 public txId;

    constructor(IXChain _entitlement) {
        entitlement = _entitlement;
    }

    fallback() external payable {
        // Attempt nested refund during ETH transfer
        entitlement.provideXChainRefund(txId);
    }

    function attack(bytes32 _txId) external {
        txId = _txId;
        entitlement.provideXChainRefund(_txId);
    }
}