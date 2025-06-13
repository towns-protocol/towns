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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           TESTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

        vm.recordLogs();
        vm.prank(caller);
        bytes32 transactionId = gated.joinSpace{value: 1 ether}(
            caller,
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );
        Vm.Log[] memory requestLogs = vm.getRecordedLogs();

        // Provide refund as owner
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, transactionId);

        // Try to provide refund again
        vm.prank(deployer);
        vm.expectRevert(EntitlementGated_TransactionCheckAlreadyCompleted.selector);
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

        /* ------------------------------------------------------------- *
        *                ADDITIONAL EDGE-CASE UNIT TESTS                *
        * ------------------------------------------------------------- */

        // Happy path where the caller joins twice generating two txIds;
        // refunding only the second should leave the first still pending.
        function test_provideXChainRefund_onlyAffectsChosenTxId() public {
        address caller = _randomAddress();
        vm.deal(caller, 2 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 firstTx = gated.joinSpace{value: 1 ether}(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        vm.prank(caller);
        bytes32 secondTx = gated.joinSpace{value: 1 ether}(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        // balances: entitlementChecker holds 2 ether
        assertEq(address(entitlementChecker).balance, 2 ether);

        // refund only secondTx
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, secondTx);

        // entitlementChecker should still hold 1 ether for firstTx
        assertEq(address(entitlementChecker).balance, 1 ether);
        assertTrue(IXChain(baseRegistry).isCheckCompleted(secondTx, roleIds[0]));
        assertFalse(IXChain(baseRegistry).isCheckCompleted(firstTx, roleIds[0]));
        }

        // Revert when trying to refund to an address different from original caller
        function test_provideXChainRefund_revertWhen_wrongRecipient() public {
        address caller = _randomAddress();
        address wrongRecipient = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 txId = gated.joinSpace{value: 1 ether}(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        vm.prank(deployer);
        vm.expectRevert(IXChain.InvalidRefundRecipient.selector);
        IXChain(baseRegistry).provideXChainRefund(wrongRecipient, txId);
        }

        // Revert when caller address is zero (defensive check)
        function test_provideXChainRefund_revertWhen_zeroAddress() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 txId = gated.joinSpace{value: 1 ether}(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        vm.prank(deployer);
        vm.expectRevert(IXChain.ZeroAddress.selector);
        IXChain(baseRegistry).provideXChainRefund(address(0), txId);
        }

        // Gas-stipend edge case: refund should succeed even with 2300 gas stipend (simulated)
        function test_provideXChainRefund_lowGasStipend() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 txId = gated.joinSpace{value: 1 ether}(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        // simulate low-gas context
        vm.prank(deployer, 2300);
        IXChain(baseRegistry).provideXChainRefund(caller, txId);

        assertEq(caller.balance, 1 ether);
        assertTrue(IXChain(baseRegistry).isCheckCompleted(txId, roleIds[0]));
        }

        // Concurrent refunds: ensure two different owners can refund different callers without interference.
        function test_provideXChainRefund_concurrentDifferentCallers() public {
        address caller1 = _randomAddress();
        address caller2 = _randomAddress();
        vm.deal(caller1, 1 ether);
        vm.deal(caller2, 1 ether);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller1);
        bytes32 tx1 = gated.joinSpace{value: 1 ether}(caller1, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        vm.prank(caller2);
        bytes32 tx2 = gated.joinSpace{value: 1 ether}(caller2, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        vm.startPrank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller1, tx1);
        IXChain(baseRegistry).provideXChainRefund(caller2, tx2);
        vm.stopPrank();

        assertEq(caller1.balance, 1 ether);
        assertEq(caller2.balance, 1 ether);
        assertTrue(IXChain(baseRegistry).isCheckCompleted(tx1, roleIds[0]));
        assertTrue(IXChain(baseRegistry).isCheckCompleted(tx2, roleIds[0]));
        }
        }
// ─────────────────────────────────────────────────────────────────────────────
    // Additional unit tests – Framework: Foundry (forge-std)
    // ─────────────────────────────────────────────────────────────────────────────

    function test_provideXChainRefund_revertWhen_unknownTxId() public {
        bytes32 bogusTxId = keccak256("bogus");
        vm.prank(deployer);
        vm.expectRevert(XChain.UnknownTransaction.selector);
        IXChain(baseRegistry).provideXChainRefund(_randomAddress(), bogusTxId);
    }

    function test_provideXChainRefund_revertWhen_zeroValue() public {
        address caller = _randomAddress();
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        // joinSpace with no ETH
        vm.prank(caller);
        bytes32 txId = gated.joinSpace(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        // entitlementChecker balance should be 0 → refund should revert
        vm.prank(deployer);
        vm.expectRevert(XChain.NoFundsToRefund.selector);
        IXChain(baseRegistry).provideXChainRefund(caller, txId);
    }

    function test_provideXChainRefund_emitsEvent() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 txId = gated.joinSpace{value: 1 ether}(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        // Expect event
        vm.expectEmit(true, true, false, true);
        emit XChain.XChainRefundProvided(caller, txId, 1 ether);

        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, txId);
    }

    function test_isCheckCompleted_falseBeforeRefund() public {
        address caller = _randomAddress();
        vm.deal(caller, 1 ether);
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(caller);
        bytes32 txId = gated.joinSpace{value: 1 ether}(caller, roleIds, RuleEntitlementUtil.getMockERC721RuleData());

        // Before refund
        assertFalse(IXChain(baseRegistry).isCheckCompleted(txId, roleIds[0]));

        // Refund by owner
        vm.prank(deployer);
        IXChain(baseRegistry).provideXChainRefund(caller, txId);

        // After refund
        assertTrue(IXChain(baseRegistry).isCheckCompleted(txId, roleIds[0]));
    }