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
}
