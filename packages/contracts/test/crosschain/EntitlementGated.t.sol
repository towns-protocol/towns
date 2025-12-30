// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Vm} from "forge-std/Vm.sol";
import {IEntitlementCheckerBase} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IRuleEntitlement} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IEntitlementGatedBase} from "src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementGated} from "src/spaces/facets/gated/IEntitlementGated.sol";

// libraries
import {RuleEntitlementUtil} from "./RuleEntitlementUtil.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {MockEntitlementGated} from "test/mocks/MockEntitlementGated.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {EntitlementTestUtils} from "test/utils/EntitlementTestUtils.sol";

contract EntitlementGatedTest is
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
    /*                 Request Entitlement Check V2               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_requestEntitlementCheckV2RuleDataV2(address caller) external {
        vm.assume(caller != address(0));
        bytes32 transactionHash = keccak256(abi.encodePacked(tx.origin, block.number));

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        deal(caller, 1 ether);

        vm.recordLogs();
        vm.prank(caller);
        bytes32 realRequestId = gated.requestEntitlementCheckV2RuleDataV2{value: 1 ether}(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );
        Vm.Log[] memory requestLogs = vm.getRecordedLogs();
        (
            address walletAddress,
            address spaceAddress,
            address resolverAddress,
            bytes32 transactionId,
            uint256 roleId,
            address[] memory selectedNodes
        ) = _getRequestV2EventData(requestLogs);

        assertEq(walletAddress, caller);
        assertEq(realRequestId, transactionHash);
        assertEq(spaceAddress, address(gated));
        assertEq(resolverAddress, address(entitlementChecker));

        IEntitlementGated _entitlementGated = IEntitlementGated(resolverAddress);

        for (uint256 i; i < 3; ++i) {
            vm.startPrank(selectedNodes[i]);
            if (i == 2) {
                vm.expectEmit(address(spaceAddress));
                emit EntitlementCheckResultPosted(transactionId, NodeVoteStatus.PASSED);
            }
            _entitlementGated.postEntitlementCheckResult(
                transactionId,
                roleId,
                NodeVoteStatus.PASSED
            );
            vm.stopPrank();
        }

        assertEq(address(gated).balance, 1 ether);
    }

    function test_requestEntitlementCheckV2RuleDataV1(address caller) external {
        vm.assume(caller != address(0));
        bytes32 transactionHash = keccak256(abi.encodePacked(tx.origin, block.number));

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        deal(caller, 1 ether);

        vm.recordLogs();
        vm.prank(caller);
        bytes32 realRequestId = gated.requestEntitlementCheckV2RuleDataV1{value: 1 ether}(
            roleIds,
            RuleEntitlementUtil.getLegacyNoopRuleData()
        );
        Vm.Log[] memory requestLogs = vm.getRecordedLogs();

        (
            address walletAddress,
            address spaceAddress,
            address resolverAddress,
            bytes32 transactionId,
            uint256 roleId,
            address[] memory selectedNodes
        ) = _getRequestV2EventData(requestLogs);

        assertEq(walletAddress, caller);
        assertEq(realRequestId, transactionHash);
        assertEq(spaceAddress, address(gated));
        assertEq(resolverAddress, address(entitlementChecker));

        IEntitlementGated _entitlementGated = IEntitlementGated(resolverAddress);

        for (uint256 i; i < 3; ++i) {
            vm.startPrank(selectedNodes[i]);
            if (i == 2) {
                vm.expectEmit(address(spaceAddress));
                emit EntitlementCheckResultPosted(transactionId, NodeVoteStatus.PASSED);
            }
            _entitlementGated.postEntitlementCheckResult(
                transactionId,
                roleId,
                NodeVoteStatus.PASSED
            );
            vm.stopPrank();
        }

        assertEq(address(gated).balance, 1 ether);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                Request Entitlement Check V1                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_requestEntitlementCheckV1RuleDataV2() external {
        vm.prank(address(gated));
        address[] memory nodes = entitlementChecker.getRandomNodes(5);

        bytes32 transactionHash = keccak256(abi.encodePacked(tx.origin, block.number));

        vm.expectEmit(address(entitlementChecker));
        emit EntitlementCheckRequested(address(this), address(gated), transactionHash, 0, nodes);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        bytes32 realRequestId = gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        assertEq(realRequestId, transactionHash);
    }

    function test_requestEntitlementCheckV1RuleDataV2_revertWhen_alreadyRegistered() external {
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.expectRevert(EntitlementGated_TransactionCheckAlreadyRegistered.selector);
        gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );
    }

    // =============================================================
    //                 Post Entitlement Check Result
    // =============================================================
    function test_postEntitlementCheckV1ResultRuleDataV2(bool pass) external {
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(address(gated));
        address[] memory nodes = entitlementChecker.getRandomNodes(5);
        bytes32 requestId = gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        _nodeVotes(requestId, 0, nodes, pass ? NodeVoteStatus.PASSED : NodeVoteStatus.FAILED);
    }

    function test_postEntitlementCheckV1ResultRuleDataV2_revert_transactionNotRegistered(
        bytes32 requestId,
        address node
    ) external {
        vm.prank(node);
        vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
        gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
    }

    function test_postEntitlementCheckV1ResultRuleDataV2_revert_nodeAlreadyVoted() external {
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        vm.prank(address(gated));
        address[] memory nodes = entitlementChecker.getRandomNodes(5);

        bytes32 requestId = gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.startPrank(nodes[0]);
        gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);

        vm.expectRevert(EntitlementGated_NodeAlreadyVoted.selector);
        gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
    }

    function test_postEntitlementCheckV1ResultRuleDataV2_revert_nodeNotFound(
        address node
    ) external {
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        uint256 nodeCount = nodes.length;
        for (uint256 i; i < nodeCount; ++i) {
            vm.assume(node != nodes[i]);
        }

        bytes32 requestId = gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        vm.prank(node);
        vm.expectRevert(EntitlementGated_NodeNotFound.selector);
        gated.postEntitlementCheckResult(requestId, 0, NodeVoteStatus.PASSED);
    }

    function test_legacy_postEntitlementCheckV1ResultRuleDataV2_multipleRoleIds() external {
        uint256[] memory roleIds = new uint256[](2);
        roleIds[0] = 0;
        roleIds[1] = 1;

        vm.recordLogs();

        bytes32 requestId = gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        // get the nodes that were selected
        (, , , address[] memory nodes) = _getRequestV1EventData(vm.getRecordedLogs());

        // first roleId is not entitled
        for (uint256 i; i < 3; ++i) {
            vm.prank(nodes[i]);
            gated.postEntitlementCheckResult(requestId, roleIds[0], NodeVoteStatus.FAILED);
        }

        // second roleId is not entitled
        for (uint256 i; i < 3; ++i) {
            vm.prank(nodes[i]);

            // if on last node, expect the event to be emitted
            if (i == 2) {
                vm.expectEmit(address(gated));
                emit EntitlementCheckResultPosted(requestId, NodeVoteStatus.FAILED);
            }

            gated.postEntitlementCheckResult(requestId, roleIds[1], NodeVoteStatus.FAILED);
        }
    }

    function test_postEntitlementCheckResultRuleDataV2_immediatelyCompleted() external {
        uint256[] memory roleIds = new uint256[](2);
        roleIds[0] = 0;
        roleIds[1] = 1;

        vm.prank(address(gated));
        address[] memory nodes = entitlementChecker.getRandomNodes(5);

        bytes32 requestId = gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        for (uint256 i; i < 3; ++i) {
            vm.prank(nodes[i]);

            // if on the last node, expect the event to be emitted
            if (i == 2) {
                vm.expectEmit(address(gated));
                emit EntitlementCheckResultPosted(requestId, NodeVoteStatus.PASSED);
            }

            gated.postEntitlementCheckResult(requestId, roleIds[0], NodeVoteStatus.PASSED);
        }
    }

    // =============================================================
    //                       Get Encoded Rule Data
    // =============================================================

    function test_getEncodedRuleData() external {
        IRuleEntitlement.RuleDataV2 memory expected = RuleEntitlementUtil.getMockERC721RuleData();
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;
        gated.requestEntitlementCheckV1RuleDataV2(roleIds, expected);
        assertEq(abi.encode(gated.getRuleDataV2(0)), abi.encode(expected));
    }

    // =============================================================
    //                        Delete Transaction
    // =============================================================

    function test_deleteTransaction() external {
        vm.prank(address(gated));
        address[] memory nodes = entitlementChecker.getRandomNodes(5);

        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = 0;

        bytes32 requestId = gated.requestEntitlementCheckV1RuleDataV2(
            roleIds,
            RuleEntitlementUtil.getMockERC721RuleData()
        );

        for (uint256 i; i < 3; ++i) {
            vm.prank(nodes[i]);
            gated.postEntitlementCheckResult(requestId, roleIds[0], NodeVoteStatus.PASSED);
        }

        vm.prank(nodes[3]);
        vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
        gated.postEntitlementCheckResult(requestId, roleIds[0], NodeVoteStatus.PASSED);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              Unified requestEntitlementCheck               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_requestEntitlementCheck_revertWhen_duplicateRequestId(
        address caller,
        bytes32 transactionId
    ) external {
        vm.assume(caller != address(0));
        deal(address(gated), 2 ether);

        uint256 requestId = 0;
        address currency = CurrencyTransfer.NATIVE_TOKEN;
        uint256 amount = 1 ether;
        bytes memory data = abi.encode(caller, transactionId, requestId, currency, amount, caller);

        vm.startPrank(address(gated));

        // First request succeeds
        entitlementChecker.requestEntitlementCheck{value: 1 ether}(CheckType.V3, data);

        // Second request with same transactionId + requestId should revert
        vm.expectRevert(EntitlementChecker_DuplicateRequestId.selector);
        entitlementChecker.requestEntitlementCheck(CheckType.V3, data);

        vm.stopPrank();
    }

    function test_requestEntitlementCheck_revertWhen_ethAmountMismatch(
        address caller,
        bytes32 transactionId
    ) external {
        vm.assume(caller != address(0));
        deal(address(gated), 2 ether);
        uint256 requestId = 0;
        address currency = CurrencyTransfer.NATIVE_TOKEN;
        uint256 amount = 1 ether;
        bytes memory data = abi.encode(caller, transactionId, requestId, currency, amount, caller);

        vm.prank(address(gated));
        // Send 0.5 ether but encode 1 ether - should revert
        vm.expectRevert(EntitlementChecker_InvalidValue.selector);
        entitlementChecker.requestEntitlementCheck{value: 0.5 ether}(CheckType.V3, data);
    }

    function test_requestEntitlementCheck_unifiedV1(
        address walletAddress,
        bytes32 transactionId
    ) external {
        vm.assume(walletAddress != address(0));

        vm.prank(address(gated));
        address[] memory selectedNodes = entitlementChecker.getRandomNodes(5);
        uint256 roleId = 0;

        bytes memory data = abi.encode(walletAddress, transactionId, roleId, selectedNodes);

        vm.expectEmit(address(entitlementChecker));
        emit EntitlementCheckRequested(
            walletAddress,
            address(this),
            transactionId,
            roleId,
            selectedNodes
        );

        entitlementChecker.requestEntitlementCheck(CheckType.V1, data);
    }

    function test_requestEntitlementCheck_unifiedV2(
        address caller,
        bytes32 transactionId
    ) external {
        vm.assume(caller != address(0));
        deal(address(gated), 1 ether);
        uint256 requestId = 0;
        bytes memory extraData = abi.encode(caller);
        bytes memory data = abi.encode(caller, transactionId, requestId, extraData);

        vm.recordLogs();
        vm.prank(address(gated));
        entitlementChecker.requestEntitlementCheck{value: 1 ether}(CheckType.V2, data);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        (address walletAddress, , , , , ) = _getRequestV2EventData(logs);
        assertEq(walletAddress, caller);
    }

    function test_requestEntitlementCheck_unifiedV3(
        address caller,
        bytes32 transactionId
    ) external {
        vm.assume(caller != address(0));
        deal(address(gated), 1 ether);
        uint256 requestId = 0;
        address currency = CurrencyTransfer.NATIVE_TOKEN;
        uint256 amount = 1 ether;
        bytes memory data = abi.encode(caller, transactionId, requestId, currency, amount, caller);

        vm.recordLogs();
        vm.prank(address(gated));
        entitlementChecker.requestEntitlementCheck{value: 1 ether}(CheckType.V3, data);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        (address walletAddress, , , , , ) = _getRequestV2EventData(logs);
        assertEq(walletAddress, caller);
    }

    function test_requestEntitlementCheck_revertWhen_v1WithEth(
        address walletAddress,
        bytes32 transactionId
    ) external {
        vm.assume(walletAddress != address(0));
        deal(address(this), 1 ether);

        address[] memory selectedNodes = entitlementChecker.getRandomNodes(5);
        uint256 roleId = 0;
        bytes memory data = abi.encode(walletAddress, transactionId, roleId, selectedNodes);

        // V1 should not accept ETH
        vm.expectRevert(EntitlementChecker_InvalidValue.selector);
        entitlementChecker.requestEntitlementCheck{value: 1 ether}(CheckType.V1, data);
    }

    function test_requestEntitlementCheck_revertWhen_erc20WithEth(
        address caller,
        bytes32 transactionId
    ) external {
        vm.assume(caller != address(0));
        deal(address(gated), 1 ether);

        uint256 requestId = 0;
        address currency = address(0x1234); // Non-native token
        uint256 amount = 0; // No ERC20 amount
        bytes memory data = abi.encode(caller, transactionId, requestId, currency, amount, caller);

        vm.prank(address(gated));
        // V3 with ERC20 currency should not accept ETH
        vm.expectRevert(EntitlementChecker_InvalidValue.selector);
        entitlementChecker.requestEntitlementCheck{value: 1 ether}(CheckType.V3, data);
    }

    // =============================================================
    //                           Internal
    // =============================================================
    function _nodeVotes(
        bytes32 requestId,
        uint256 roleId,
        address[] memory nodes,
        NodeVoteStatus vote
    ) internal {
        uint256 halfNodes = nodes.length / 2;
        bool eventEmitted = false;

        for (uint256 i; i < nodes.length; ++i) {
            vm.startPrank(nodes[i]);

            // if more than half voted, revert with already completed
            if (i <= halfNodes) {
                // if on the last voting node, expect the event to be emitted
                if (i == halfNodes + 1) {
                    vm.expectEmit(address(gated));
                    emit EntitlementCheckResultPosted(requestId, vote);
                    gated.postEntitlementCheckResult(requestId, roleId, vote);
                    eventEmitted = true;
                } else {
                    gated.postEntitlementCheckResult(requestId, roleId, vote);
                }
            } else {
                vm.expectRevert(EntitlementGated_TransactionNotRegistered.selector);
                gated.postEntitlementCheckResult(requestId, roleId, vote);
            }

            vm.stopPrank();
        }
    }
}
