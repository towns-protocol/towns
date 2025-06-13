// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IEntitlementCheckerBase} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {NodeOperatorStatus} from "src/base/registry/facets/operator/NodeOperatorStorage.sol";

//libraries

//contracts
import {EntitlementChecker} from "src/base/registry/facets/checker/EntitlementChecker.sol";

contract EntitlementCheckerTest is BaseSetup, IEntitlementCheckerBase {
    function setUp() public override {
        super.setUp();
        _registerOperators();
        _registerNodes();
    }

    // =============================================================
    //                           Modifiers
    // =============================================================
    modifier givenOperatorIsRegistered(address operator) {
        vm.assume(operator != address(0));
        vm.assume(!nodeOperator.isOperator(operator));

        vm.prank(operator);
        nodeOperator.registerOperator(operator);
        _;
    }

    modifier givenOperatorIsApproved(address operator) {
        vm.prank(deployer);
        nodeOperator.setOperatorStatus(operator, NodeOperatorStatus.Approved);
        _;
    }

    modifier givenNodeIsRegistered(address operator, address node) {
        vm.assume(node != address(0));
        vm.assume(!entitlementChecker.isValidNode(node));

        vm.prank(operator);
        vm.expectEmit(address(nodeOperator));
        emit NodeRegistered(node);
        entitlementChecker.registerNode(node);
        _;
    }

    modifier givenNodeIsNotRegistered(address operator, address node) {
        vm.prank(operator);
        vm.expectEmit(address(entitlementChecker));
        emit NodeUnregistered(node);
        entitlementChecker.unregisterNode(node);
        _;
    }

    // =============================================================
    //                           Register
    // =============================================================

    function test_registerNode(
        address operator,
        address node
    )
        external
        givenOperatorIsRegistered(operator)
        givenOperatorIsApproved(operator)
        givenNodeIsRegistered(operator, node)
    {
        assertTrue(entitlementChecker.isValidNode(node));
    }

    function test_registerNode_revertWhen_nodeAlreadyRegistered(
        address operator,
        address node
    )
        external
        givenOperatorIsRegistered(operator)
        givenOperatorIsApproved(operator)
        givenNodeIsRegistered(operator, node)
    {
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_NodeAlreadyRegistered.selector);
        entitlementChecker.registerNode(node);
    }

    // =============================================================
    //                           Unregister
    // =============================================================
    function test_unregisterNode(
        address operator,
        address node
    )
        external
        givenOperatorIsRegistered(operator)
        givenOperatorIsApproved(operator)
        givenNodeIsRegistered(operator, node)
        givenNodeIsNotRegistered(operator, node)
    {
        assertFalse(entitlementChecker.isValidNode(node));
    }

    function test_unregisterNode_revert_nodeNotRegistered(
        address operator,
        address node
    ) external givenOperatorIsRegistered(operator) givenOperatorIsApproved(operator) {
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_InvalidNodeOperator.selector);
        entitlementChecker.unregisterNode(node);
    }

    // =============================================================
    //                        Random Nodes
    // =============================================================
    function test_getRandomNodes() external view {
        address[] memory nodes = entitlementChecker.getRandomNodes(5);
        uint256 nodeLen = nodes.length;

        // validate no nodes are repeating
        for (uint256 i = 0; i < nodeLen; i++) {
            for (uint256 j = i + 1; j < nodeLen; j++) {
                assertNotEq(nodes[i], nodes[j]);
            }
        }
    }

    function test_getRandomNodes_revert_insufficientNumberOfNodes() external {
        vm.expectRevert(EntitlementChecker_InsufficientNumberOfNodes.selector);
        entitlementChecker.getRandomNodes(26);
    }

    // =============================================================
    //                        Nodes by Operator
    // =============================================================

    function test_getNodesByOperator() external {
        for (uint256 i = 0; i < operators.length; i++) {
            uint256 totalNodes = 0;

            address[] memory nodes = entitlementChecker.getNodesByOperator(operators[i]);
            uint256 nodeLen = nodes.length;

            for (uint256 j = 0; j < nodeLen; j++) {
                vm.prank(operators[i]);
                assertTrue(entitlementChecker.isValidNode(nodes[j]));
                totalNodes++;
            }
            assertEq(totalNodes, nodes.length);
        }
    // =============================================================
    //                       Additional Tests
    // =============================================================

    // Register exactly 25 nodes and verify count; attempt 26th should revert
    function test_registerNode_limitOf25(address operator) external givenOperatorIsRegistered(operator) givenOperatorIsApproved(operator) {
        // register 25 unique nodes
        for (uint256 i = 0; i < 25; i++) {
            address node = address(uint160(uint256(keccak256(abi.encode(i, operator)))));
            vm.prank(operator);
            entitlementChecker.registerNode(node);
        }
        assertEq(entitlementChecker.totalNodes(), 25);

        // 26th registration should revert with limit error
        address extraNode = address(uint160(uint256(keccak256("extraNode"))));
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_MaximumNodesReached.selector);
        entitlementChecker.registerNode(extraNode);
    }

    // Revert when operator not approved tries to register
    function test_registerNode_revertWhen_operatorNotApproved(address operator, address node) external givenOperatorIsRegistered(operator) {
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_InvalidNodeOperator.selector);
        entitlementChecker.registerNode(node);
    }

    // Revert when unregisterNode is invoked by non-operator
    function test_unregisterNode_revertWhen_callerNotOperator(address operator, address node, address attacker)
        external
        givenOperatorIsRegistered(operator)
        givenOperatorIsApproved(operator)
        givenNodeIsRegistered(operator, node)
    {
        vm.assume(attacker != operator && attacker != address(0));
        vm.prank(attacker);
        vm.expectRevert(EntitlementChecker_InvalidNodeOperator.selector);
        entitlementChecker.unregisterNode(node);
    }

    // Ensure getRandomNodes returns exact number requested when possible
    function test_getRandomNodes_exactCount() external {
        uint256 count = entitlementChecker.totalNodes();
        uint256 request = count > 5 ? 5 : count;
        address[] memory nodes = entitlementChecker.getRandomNodes(request);
        assertEq(nodes.length, request);
    }

    // Fuzz: multiple random calls should never return duplicates within a single array
    function testFuzz_getRandomNodes_noDuplicates(uint8 request) external {
        uint256 total = entitlementChecker.totalNodes();
        request = uint8(bound(request, 1, total == 0 ? 1 : uint8(total)));
        address[] memory nodes = entitlementChecker.getRandomNodes(request);
        for (uint256 i = 0; i < nodes.length; i++) {
            for (uint256 j = i + 1; j < nodes.length; j++) {
                assertNotEq(nodes[i], nodes[j]);
            }
        }
    }
    }
// =============================================================
//     Invariant: totalNodes never exceeds 25
// =============================================================
contract EntitlementCheckerInvariant is BaseSetup {
    function invariant_totalNodesBounded() public {
        uint256 total = entitlementChecker.totalNodes();
        assertLe(total, 25);
    }
}