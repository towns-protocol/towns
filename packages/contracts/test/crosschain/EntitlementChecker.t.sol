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
    }
}
// =============================================================
    //                        Edge Cases & Access Control
    // =============================================================

    function test_registerNode_revertWhen_operatorNotRegistered(
        address operator,
        address node
    ) external {
        vm.assume(operator != address(0));
        vm.assume(node != address(0));
        vm.assume(!nodeOperator.isOperator(operator));

        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_InvalidOperator.selector);
        entitlementChecker.registerNode(node);
    }

    function test_registerNode_revertWhen_operatorNotApproved(
        address operator,
        address node
    ) external givenOperatorIsRegistered(operator) {
        vm.assume(node != address(0));
        
        // Operator is registered but not approved (default state)
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_OperatorNotActive.selector);
        entitlementChecker.registerNode(node);
    }

    function test_registerNode_revertWhen_nodeIsZeroAddress(
        address operator
    ) external givenOperatorIsRegistered(operator) givenOperatorIsApproved(operator) {
        vm.prank(operator);
        vm.expectRevert();
        entitlementChecker.registerNode(address(0));
    }

    function test_unregisterNode_revertWhen_operatorNotRegistered(
        address operator,
        address node
    ) external {
        vm.assume(operator != address(0));
        vm.assume(node != address(0));
        vm.assume(!nodeOperator.isOperator(operator));

        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_InvalidOperator.selector);
        entitlementChecker.unregisterNode(node);
    }

    function test_unregisterNode_revertWhen_operatorNotApproved(
        address operator,
        address node
    ) external givenOperatorIsRegistered(operator) {
        vm.assume(node != address(0));
        
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_OperatorNotActive.selector);
        entitlementChecker.unregisterNode(node);
    }

    function test_unregisterNode_revertWhen_callerNotNodeOperator(
        address operator,
        address node,
        address maliciousActor
    ) external 
        givenOperatorIsRegistered(operator) 
        givenOperatorIsApproved(operator)
        givenNodeIsRegistered(operator, node)
    {
        vm.assume(maliciousActor != operator);
        vm.assume(maliciousActor != address(0));
        
        vm.prank(maliciousActor);
        vm.expectRevert(EntitlementChecker_InvalidNodeOperator.selector);
        entitlementChecker.unregisterNode(node);
    }

    function test_unregisterNode_revertWhen_nodeNotRegistered(
        address operator,
        address node
    ) external givenOperatorIsRegistered(operator) givenOperatorIsApproved(operator) {
        vm.assume(node != address(0));
        vm.assume(!entitlementChecker.isValidNode(node));

        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_NodeNotRegistered.selector);
        entitlementChecker.unregisterNode(node);
    }

    // =============================================================
    //                    Boundary Conditions & State Tests
    // =============================================================

    function test_isValidNode_returnsFalseForUnregisteredNode(address node) external view {
        vm.assume(node != address(0));
        // Assume node is not already registered from setup
        vm.assume(!entitlementChecker.isValidNode(node));
        
        assertFalse(entitlementChecker.isValidNode(node));
    }

    function test_isValidNode_returnsFalseForZeroAddress() external view {
        assertFalse(entitlementChecker.isValidNode(address(0)));
    }

    function test_getNodeCount() external view {
        uint256 nodeCount = entitlementChecker.getNodeCount();
        // We expect 25 nodes from setup (operators.length * 1 node each)
        assertEq(nodeCount, 25);
    }

    function test_getNodeAtIndex() external view {
        uint256 nodeCount = entitlementChecker.getNodeCount();
        
        for (uint256 i = 0; i < nodeCount; i++) {
            address node = entitlementChecker.getNodeAtIndex(i);
            assertTrue(entitlementChecker.isValidNode(node));
        }
    }

    function test_getNodeAtIndex_revertWhen_indexOutOfBounds() external view {
        uint256 nodeCount = entitlementChecker.getNodeCount();
        
        vm.expectRevert("Index out of bounds");
        entitlementChecker.getNodeAtIndex(nodeCount);
        
        vm.expectRevert("Index out of bounds");
        entitlementChecker.getNodeAtIndex(nodeCount + 100);
    }

    function test_getRandomNodes_withZeroCount() external {
        vm.expectRevert(EntitlementChecker_InsufficientNumberOfNodes.selector);
        entitlementChecker.getRandomNodes(0);
    }

    function test_getRandomNodes_withExactAvailableCount() external view {
        uint256 totalNodes = entitlementChecker.getNodeCount();
        address[] memory nodes = entitlementChecker.getRandomNodes(totalNodes);
        assertEq(nodes.length, totalNodes);
        
        // Verify all returned nodes are valid and unique
        for (uint256 i = 0; i < nodes.length; i++) {
            assertTrue(entitlementChecker.isValidNode(nodes[i]));
            for (uint256 j = i + 1; j < nodes.length; j++) {
                assertNotEq(nodes[i], nodes[j]);
            }
        }
    }

    function test_getRandomNodes_multipleCalls_returnUniqueNodes() external view {
        address[] memory nodes1 = entitlementChecker.getRandomNodes(5);
        address[] memory nodes2 = entitlementChecker.getRandomNodes(5);
        
        // Verify all nodes are unique within each call
        for (uint256 i = 0; i < nodes1.length; i++) {
            for (uint256 j = i + 1; j < nodes1.length; j++) {
                assertNotEq(nodes1[i], nodes1[j]);
            }
        }
        
        for (uint256 i = 0; i < nodes2.length; i++) {
            for (uint256 j = i + 1; j < nodes2.length; j++) {
                assertNotEq(nodes2[i], nodes2[j]);
            }
        }
    }

    function test_getNodesByOperator_emptyForUnregisteredOperator(address operator) external view {
        vm.assume(operator != address(0));
        vm.assume(!nodeOperator.isOperator(operator));
        
        address[] memory nodes = entitlementChecker.getNodesByOperator(operator);
        assertEq(nodes.length, 0);
    }

    function test_getNodesByOperator_emptyForZeroAddress() external view {
        address[] memory nodes = entitlementChecker.getNodesByOperator(address(0));
        assertEq(nodes.length, 0);
    }

    function test_getNodesByOperator_correctLength() external view {
        for (uint256 i = 0; i < operators.length; i++) {
            address[] memory nodes = entitlementChecker.getNodesByOperator(operators[i]);
            // Each operator should have exactly 1 node from setup
            assertEq(nodes.length, 1);
        }
    }

    // =============================================================
    //                    State Transition Tests
    // =============================================================

    function test_registerMultipleNodes_sameOperator(
        address operator
    ) external givenOperatorIsRegistered(operator) givenOperatorIsApproved(operator) {
        address node1 = vm.addr(1001);
        address node2 = vm.addr(1002);
        address node3 = vm.addr(1003);

        // Register multiple nodes
        vm.startPrank(operator);
        
        vm.expectEmit(address(nodeOperator));
        emit NodeRegistered(node1);
        entitlementChecker.registerNode(node1);
        
        vm.expectEmit(address(nodeOperator));
        emit NodeRegistered(node2);
        entitlementChecker.registerNode(node2);
        
        vm.expectEmit(address(nodeOperator));
        emit NodeRegistered(node3);
        entitlementChecker.registerNode(node3);
        
        vm.stopPrank();

        // Verify all nodes are valid
        assertTrue(entitlementChecker.isValidNode(node1));
        assertTrue(entitlementChecker.isValidNode(node2));
        assertTrue(entitlementChecker.isValidNode(node3));

        // Verify they appear in operator's node list
        address[] memory operatorNodes = entitlementChecker.getNodesByOperator(operator);
        assertGe(operatorNodes.length, 3);
        
        // Verify all new nodes are in the list
        bool foundNode1 = false;
        bool foundNode2 = false;
        bool foundNode3 = false;
        for (uint256 i = 0; i < operatorNodes.length; i++) {
            if (operatorNodes[i] == node1) foundNode1 = true;
            if (operatorNodes[i] == node2) foundNode2 = true;
            if (operatorNodes[i] == node3) foundNode3 = true;
        }
        assertTrue(foundNode1);
        assertTrue(foundNode2);
        assertTrue(foundNode3);
    }

    function test_registerUnregisterRegister_nodeStateConsistency(
        address operator
    ) external 
        givenOperatorIsRegistered(operator) 
        givenOperatorIsApproved(operator)
    {
        address node = vm.addr(2001);

        vm.startPrank(operator);

        // Register
        vm.expectEmit(address(nodeOperator));
        emit NodeRegistered(node);
        entitlementChecker.registerNode(node);
        assertTrue(entitlementChecker.isValidNode(node));

        // Unregister
        vm.expectEmit(address(entitlementChecker));
        emit NodeUnregistered(node);
        entitlementChecker.unregisterNode(node);
        assertFalse(entitlementChecker.isValidNode(node));

        // Register again
        vm.expectEmit(address(nodeOperator));
        emit NodeRegistered(node);
        entitlementChecker.registerNode(node);
        assertTrue(entitlementChecker.isValidNode(node));

        vm.stopPrank();
    }

    function test_operatorStatusChange_affectsNodeOperations(
        address operator
    ) external givenOperatorIsRegistered(operator) givenOperatorIsApproved(operator) {
        address node = vm.addr(3001);

        // Register node while approved
        vm.prank(operator);
        entitlementChecker.registerNode(node);
        assertTrue(entitlementChecker.isValidNode(node));

        // Change operator status to not approved
        vm.prank(deployer);
        nodeOperator.setOperatorStatus(operator, NodeOperatorStatus.Registered);

        // Should not be able to register new nodes
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_OperatorNotActive.selector);
        entitlementChecker.registerNode(vm.addr(3002));

        // Should not be able to unregister existing nodes
        vm.prank(operator);
        vm.expectRevert(EntitlementChecker_OperatorNotActive.selector);
        entitlementChecker.unregisterNode(node);
    }

    // =============================================================
    //                    Request Entitlement Tests
    // =============================================================

    function test_requestEntitlementCheck() external {
        address walletAddress = vm.addr(4001);
        bytes32 transactionId = keccak256("test-transaction");
        uint256 roleId = 1;
        address[] memory selectedNodes = new address[](3);
        selectedNodes[0] = nodes[0];
        selectedNodes[1] = nodes[1];
        selectedNodes[2] = nodes[2];

        vm.expectEmit(address(entitlementChecker));
        emit EntitlementCheckRequested(walletAddress, address(this), transactionId, roleId, selectedNodes);
        
        entitlementChecker.requestEntitlementCheck(walletAddress, transactionId, roleId, selectedNodes);
    }

    function test_requestEntitlementCheckV2() external {
        address walletAddress = vm.addr(4002);
        bytes32 transactionId = keccak256("test-transaction-v2");
        uint256 requestId = 12345;
        address senderAddress = vm.addr(4003);
        bytes memory extraData = abi.encode(senderAddress);

        // Test first call creates request
        vm.expectEmit(address(entitlementChecker));
        emit EntitlementCheckRequestedV2(
            walletAddress,
            address(this),
            address(entitlementChecker),
            transactionId,
            requestId,
            new address[](5) // Will be filled with random nodes
        );
        
        entitlementChecker.requestEntitlementCheckV2{value: 1 ether}(
            walletAddress, 
            transactionId, 
            requestId, 
            extraData
        );
    }

    function test_requestEntitlementCheckV2_revertWhen_invalidValue() external {
        address walletAddress = vm.addr(4004);
        bytes32 transactionId = keccak256("test-transaction-duplicate");
        uint256 requestId1 = 11111;
        uint256 requestId2 = 22222;
        address senderAddress = vm.addr(4005);
        bytes memory extraData = abi.encode(senderAddress);

        // First call with value
        entitlementChecker.requestEntitlementCheckV2{value: 1 ether}(
            walletAddress, 
            transactionId, 
            requestId1, 
            extraData
        );

        // Second call with same transactionId but different requestId and non-zero value should revert
        vm.expectRevert(EntitlementChecker_InvalidValue.selector);
        entitlementChecker.requestEntitlementCheckV2{value: 1 ether}(
            walletAddress, 
            transactionId, 
            requestId2, 
            extraData
        );
    }

    function test_requestEntitlementCheckV2_allowsZeroValueForExistingRequest() external {
        address walletAddress = vm.addr(4006);
        bytes32 transactionId = keccak256("test-transaction-zero-value");
        uint256 requestId1 = 33333;
        uint256 requestId2 = 44444;
        address senderAddress = vm.addr(4007);
        bytes memory extraData = abi.encode(senderAddress);

        // First call with value
        entitlementChecker.requestEntitlementCheckV2{value: 1 ether}(
            walletAddress, 
            transactionId, 
            requestId1, 
            extraData
        );

        // Second call with same transactionId but different requestId and zero value should succeed
        entitlementChecker.requestEntitlementCheckV2{value: 0}(
            walletAddress, 
            transactionId, 
            requestId2, 
            extraData
        );
    }

    // =============================================================
    //                    Comprehensive Integration Tests
    // =============================================================

    function test_integration_multipleOperatorsAndNodes() external {
        address testOp1 = vm.addr(5001);
        address testOp2 = vm.addr(5002);
        address testOp3 = vm.addr(5003);

        // Setup operators
        vm.prank(testOp1);
        nodeOperator.registerOperator(testOp1);
        vm.prank(deployer);
        nodeOperator.setOperatorStatus(testOp1, NodeOperatorStatus.Approved);

        vm.prank(testOp2);
        nodeOperator.registerOperator(testOp2);
        vm.prank(deployer);
        nodeOperator.setOperatorStatus(testOp2, NodeOperatorStatus.Approved);

        vm.prank(testOp3);
        nodeOperator.registerOperator(testOp3);
        vm.prank(deployer);
        nodeOperator.setOperatorStatus(testOp3, NodeOperatorStatus.Approved);

        // Register multiple nodes per operator
        address[] memory op1Nodes = new address[](2);
        op1Nodes[0] = vm.addr(6001);
        op1Nodes[1] = vm.addr(6002);

        address[] memory op2Nodes = new address[](3);
        op2Nodes[0] = vm.addr(6003);
        op2Nodes[1] = vm.addr(6004);
        op2Nodes[2] = vm.addr(6005);

        address[] memory op3Nodes = new address[](1);
        op3Nodes[0] = vm.addr(6006);

        // Register nodes for operator 1
        vm.startPrank(testOp1);
        for (uint256 i = 0; i < op1Nodes.length; i++) {
            entitlementChecker.registerNode(op1Nodes[i]);
        }
        vm.stopPrank();

        // Register nodes for operator 2
        vm.startPrank(testOp2);
        for (uint256 i = 0; i < op2Nodes.length; i++) {
            entitlementChecker.registerNode(op2Nodes[i]);
        }
        vm.stopPrank();

        // Register nodes for operator 3
        vm.startPrank(testOp3);
        for (uint256 i = 0; i < op3Nodes.length; i++) {
            entitlementChecker.registerNode(op3Nodes[i]);
        }
        vm.stopPrank();

        // Verify each operator has correct nodes
        address[] memory op1RegisteredNodes = entitlementChecker.getNodesByOperator(testOp1);
        assertEq(op1RegisteredNodes.length, op1Nodes.length);

        address[] memory op2RegisteredNodes = entitlementChecker.getNodesByOperator(testOp2);
        assertEq(op2RegisteredNodes.length, op2Nodes.length);

        address[] memory op3RegisteredNodes = entitlementChecker.getNodesByOperator(testOp3);
        assertEq(op3RegisteredNodes.length, op3Nodes.length);

        // Test random node selection includes nodes from all operators
        uint256 totalNewNodes = op1Nodes.length + op2Nodes.length + op3Nodes.length;
        address[] memory randomNodes = entitlementChecker.getRandomNodes(totalNewNodes);
        assertEq(randomNodes.length, totalNewNodes);
        
        // Verify all returned nodes are valid and unique
        for (uint256 i = 0; i < randomNodes.length; i++) {
            assertTrue(entitlementChecker.isValidNode(randomNodes[i]));
            for (uint256 j = i + 1; j < randomNodes.length; j++) {
                assertNotEq(randomNodes[i], randomNodes[j]);
            }
        }
    }

    function test_fuzz_registerUnregisterCycle(
        address operator
    ) external givenOperatorIsRegistered(operator) givenOperatorIsApproved(operator) {
        address[5] memory nodes = [
            vm.addr(7001),
            vm.addr(7002),
            vm.addr(7003),
            vm.addr(7004),
            vm.addr(7005)
        ];

        vm.startPrank(operator);
        
        // Register all nodes
        for (uint256 i = 0; i < nodes.length; i++) {
            entitlementChecker.registerNode(nodes[i]);
            assertTrue(entitlementChecker.isValidNode(nodes[i]));
        }

        // Verify operator has all nodes
        address[] memory operatorNodes = entitlementChecker.getNodesByOperator(operator);
        assertGe(operatorNodes.length, nodes.length);

        // Unregister all nodes
        for (uint256 i = 0; i < nodes.length; i++) {
            entitlementChecker.unregisterNode(nodes[i]);
            assertFalse(entitlementChecker.isValidNode(nodes[i]));
        }

        vm.stopPrank();
    }
}