// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {DeployFacet} from "scripts/common/DeployFacet.s.sol";
import {DeployDiamond} from "@towns-protocol/diamond/scripts/deployments/diamonds/DeployDiamond.s.sol";
import {DeployExecutorFacet} from "scripts/deployments/facets/DeployExecutorFacet.s.sol";

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IExecutorBase} from "src/spaces/facets/executor/IExecutor.sol";

// libraries
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// contracts
import {ExecutorFacet} from "src/spaces/facets/executor/ExecutorFacet.sol";
import {MockERC721} from "test/mocks/MockERC721.sol";

contract ExecutorTest is IOwnableBase, TestUtils, IDiamond {
    ExecutorFacet internal executor;
    MockERC721 internal mockERC721;

    DeployDiamond private diamondHelper = new DeployDiamond();
    DeployFacet private facetHelper = new DeployFacet();

    address internal founder;

    function setUp() public {
        founder = _randomAddress();

        mockERC721 = new MockERC721();

        // Add the Executor facet to the diamond
        address facet = facetHelper.deploy("ExecutorFacet", founder);
        diamondHelper.addCut(DeployExecutorFacet.makeCut(facet, IDiamond.FacetCutAction.Add));

        executor = ExecutorFacet(diamondHelper.deploy(founder));
    }

    modifier givenHasAccess(bytes32 groupId, address account, uint32 delay) {
        (bool isMember, , ) = executor.hasAccess(groupId, account);
        vm.assume(!isMember);

        uint48 since = Time.timestamp() + executor.getGroupDelay(groupId);

        vm.prank(founder);
        vm.expectEmit(address(executor));
        emit IExecutorBase.GroupAccessGranted(groupId, account, delay, since, true);
        bool newMember = executor.grantAccess(groupId, account, delay);
        assertEq(newMember, true);
        _;
    }

    function test_grantAccess() external {
        bytes32 groupId = _randomBytes32();
        address account = _randomAddress();
        // execution delay is the delay at which any execution for this group will take effect
        uint32 executionDelay = 100;
        // group delay is the delay at which the group permission will take effect
        uint48 lastAccess = Time.timestamp() + executor.getGroupDelay(groupId);

        vm.prank(founder);
        vm.expectEmit(address(executor));
        emit IExecutorBase.GroupAccessGranted(groupId, account, executionDelay, lastAccess, true);
        executor.grantAccess(groupId, account, executionDelay);
    }

    function test_grantAccess_newMember(
        bytes32 groupId,
        address account,
        uint32 delay
    ) external givenHasAccess(groupId, account, delay) {
        (bool isMember, uint32 executionDelay, ) = executor.hasAccess(groupId, account);
        assertEq(isMember, true);
        assertEq(executionDelay, delay);
    }

    function test_grantAccess_existingMember(
        bytes32 groupId,
        address account,
        uint32 delay
    ) external givenHasAccess(groupId, account, delay) {
        vm.prank(founder);
        bool newMember = executor.grantAccess(groupId, account, delay);
        assertEq(newMember, false);
    }

    function test_revertWhen_grantAccess_callerIsNotFounder(
        address caller,
        bytes32 groupId,
        address account,
        uint32 delay
    ) external {
        vm.assume(caller != founder);
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, caller));
        executor.grantAccess(groupId, account, delay);
    }

    // execute
    function test_execute() external {
        bytes32 groupId = _randomBytes32();
        address bot = _randomAddress();
        address receiver = _randomAddress();
        uint32 delay = 100;

        vm.startPrank(founder);
        // Grant access to the bot for the specified group with a delay
        executor.grantAccess(groupId, bot, delay);

        // Configure which function the group has access to by setting the target function group
        // This allows members of groupId to call mintWithPayment() on the mockERC721 contract
        executor.setTargetFunctionGroup(
            address(mockERC721),
            mockERC721.mintWithPayment.selector,
            groupId
        );
        vm.stopPrank();

        // This will revert because the bot does not have access to the mint function
        vm.prank(bot);
        vm.expectRevert(IExecutorBase.UnauthorizedCall.selector);
        executor.execute(address(mockERC721), 0, abi.encodeCall(mockERC721.mint, (receiver, 1)));

        bytes memory mintWithPayment = abi.encodeCall(mockERC721.mintWithPayment, receiver);
        bytes32 expectedOperationId = executor.hashOperation(
            bot,
            address(mockERC721),
            mintWithPayment
        );

        vm.prank(bot);
        vm.expectRevert(IExecutorBase.NotScheduled.selector);
        executor.execute(address(mockERC721), 0, mintWithPayment);

        // Schedule the operation with the group delay
        vm.prank(bot);
        (bytes32 operationId, ) = executor.scheduleOperation(
            address(mockERC721),
            mintWithPayment,
            Time.timestamp() + delay
        );
        assertEq(operationId, expectedOperationId);

        // Deal the bot some funds
        vm.deal(address(bot), 1 ether);

        // Warp to the delay
        vm.warp(Time.timestamp() + delay + 1);

        // Execute the operation
        vm.deal(address(bot), 1 ether);
        vm.prank(bot);
        executor.execute{value: 1 ether}(address(mockERC721), 1 ether, mintWithPayment);

        // Assert that the receiver received the token
        assertEq(mockERC721.balanceOf(receiver), 1);
    }

    function test_grantAccessWithExpiration() external {
        bytes32 groupId = _randomBytes32();
        address account = _randomAddress();
        uint32 executionDelay = 100;
        uint48 expiration = uint48(block.timestamp + 1 days);
        uint48 lastAccess = Time.timestamp() + executor.getGroupDelay(groupId);

        vm.prank(founder);
        vm.expectEmit(address(executor));
        emit IExecutorBase.GroupAccessGranted(groupId, account, executionDelay, lastAccess, true);
        bool newMember = executor.grantAccessWithExpiration(
            groupId,
            account,
            executionDelay,
            expiration
        );
        assertEq(newMember, true);

        // Check access is granted
        (bool isMember, uint32 delay, bool active) = executor.hasAccess(groupId, account);
        assertEq(isMember, true);
        assertEq(delay, executionDelay);
        assertEq(active, true);

        // Warp past expiration
        vm.warp(block.timestamp + 2 days);

        // Check access is expired
        (isMember, delay, active) = executor.hasAccess(groupId, account);
        assertEq(isMember, true);
        assertEq(delay, executionDelay);
        assertEq(active, false);
    }

    function test_revertWhen_grantAccessWithExpiration_invalidExpiration() external {
        bytes32 groupId = _randomBytes32();
        address account = _randomAddress();
        uint32 executionDelay = 100;
        uint48 expiration = uint48(block.timestamp - 1); // Past expiration

        vm.prank(founder);
        vm.expectRevert(IExecutorBase.InvalidExpiration.selector);
        executor.grantAccessWithExpiration(groupId, account, executionDelay, expiration);
    }

    function test_extendExpiration() external {
        bytes32 groupId = _randomBytes32();
        address account = _randomAddress();
        uint32 executionDelay = 100;
        uint48 initialExpiration = uint48(block.timestamp + 1 days);
        uint48 newExpiration = uint48(block.timestamp + 2 days);

        // Grant initial access with expiration
        vm.startPrank(founder);
        executor.grantAccessWithExpiration(groupId, account, executionDelay, initialExpiration);

        // Extend expiration
        vm.expectEmit(address(executor));
        emit IExecutorBase.GroupExpirationSet(groupId, newExpiration);
        executor.setGroupExpiration(groupId, newExpiration);
        vm.stopPrank();

        // Warp past initial expiration but before new expiration
        vm.warp(block.timestamp + 1.5 days);

        // Check access is still active
        (, , bool active) = executor.hasAccess(groupId, account);
        assertEq(active, true);
    }

    function test_reactivateExpiredGroup() external {
        bytes32 groupId = _randomBytes32();
        address account = _randomAddress();
        uint32 executionDelay = 100;
        uint48 initialExpiration = uint48(block.timestamp + 1 days);
        uint48 newExpiration = uint48(block.timestamp + 3 days);

        // Grant initial access with expiration
        vm.startPrank(founder);
        executor.grantAccessWithExpiration(groupId, account, executionDelay, initialExpiration);

        // Warp past expiration
        vm.warp(block.timestamp + 2 days);

        // Check access is expired
        (, , bool active) = executor.hasAccess(groupId, account);
        assertEq(active, false);

        // Reactivate with new expiration
        executor.grantAccessWithExpiration(groupId, account, executionDelay, newExpiration);

        // Check access is active again
        (, , active) = executor.hasAccess(groupId, account);
        assertEq(active, true);
        vm.stopPrank();
    }

    function test_onExecution() external {
        address caller = _randomAddress();
        bytes32 groupId = _randomBytes32();

        TargetA groupMock = new TargetA(executor, new TargetB(executor));

        vm.startPrank(founder);
        executor.grantAccess(groupId, caller, 0);
        executor.setTargetFunctionGroup(
            address(groupMock),
            groupMock.callExecutor.selector,
            groupId
        );
        vm.stopPrank();

        assertEq(executor.onExecution(address(groupMock)), false);

        vm.prank(caller);
        executor.execute(address(groupMock), 0, abi.encodeCall(groupMock.callExecutor, ()));

        assertEq(executor.onExecution(address(groupMock)), false);
    }

    function test_onExecution_targetB() external {
        address caller = _randomAddress();
        bytes32 groupId = _randomBytes32();

        TargetB targetB = new TargetB(executor);
        TargetA targetA = new TargetA(executor, targetB);

        vm.startPrank(founder);
        executor.grantAccess(groupId, caller, 0);
        executor.grantAccess(groupId, address(targetB), 0);
        executor.setTargetFunctionGroup(address(targetA), targetA.callTargetB.selector, groupId);
        executor.setTargetFunctionGroup(address(targetB), targetB.someFunction.selector, groupId);
        executor.setTargetFunctionGroup(address(targetB), targetB.foo.selector, groupId);
        vm.stopPrank();

        assertEq(executor.onExecution(address(targetB)), false);

        vm.prank(caller);
        executor.execute(address(targetA), 0, abi.encodeCall(targetA.callTargetB, ()));
    }
}

contract TargetB {
    ExecutorFacet internal executor;

    constructor(ExecutorFacet executor_) {
        executor = executor_;
    }

    function someFunction() external {
        executor.execute(address(this), 0, abi.encodeWithSelector(this.foo.selector));
    }

    function foo() external view returns (bool) {
        if (!executor.onExecution(address(this))) {
            revert();
        }

        return true;
    }
}

contract TargetA {
    ExecutorFacet internal executor;
    TargetB internal targetB;

    constructor(ExecutorFacet executor_, TargetB targetB_) {
        executor = executor_;
        targetB = targetB_;
    }

    function callExecutor() external view returns (bool) {
        if (!executor.onExecution(address(this))) {
            revert();
        }

        return true;
    }

    function callTargetB() external {
        LibCall.callContract(address(targetB), 0, abi.encodeCall(targetB.someFunction, ()));
    }
}
