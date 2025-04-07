// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ExecutorTypes} from "contracts/src/spaces/facets/executor/libraries/ExecutorTypes.sol";

// types
import {ExecutionManifest} from
    "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//libraries
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

//contracts
import {ModularAccount} from "contracts/src/spaces/facets/executor/ModularAccount.sol";

// mocks
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {MockModule} from "contracts/test/mocks/MockModule.sol";

contract ModularAccountTest is BaseSetup, IOwnableBase {
    bytes32 public constant MODULE_GROUP_ID = "MODULE_GROUP_ID";

    ModularAccount internal modularAccount;
    MockERC721 internal mockERC721;
    MockModule internal mockModule;

    function setUp() public override {
        super.setUp();
        modularAccount = ModularAccount(everyoneSpace);
        mockERC721 = new MockERC721();
        mockModule = new MockModule(false);
    }

    function test_installExecution() external {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        bytes memory installData = abi.encode("test installation data");

        // Install the module
        vm.prank(founder);
        modularAccount.installExecution(address(mockModule), manifest, installData);

        bytes32 expectedGroupId = keccak256(abi.encode(MODULE_GROUP_ID, address(mockModule)));

        // Assert that the module was installed
        (bool hasAccess, uint32 executionDelay) =
            modularAccount.hasGroupAccess(expectedGroupId, address(mockModule));
        assertEq(hasAccess, true);
        assertEq(executionDelay, 0);

        // Execute some code
        vm.prank(address(mockModule));
        vm.expectEmit(address(mockModule));
        emit MockModule.MockFunctionCalled(address(modularAccount), 0);
        modularAccount.execute(
            address(mockModule), 0, abi.encodeWithSelector(mockModule.mockFunction.selector)
        );
    }

    // modifier givenHasAccess(bytes32 groupId, address account, uint32 delay) {
    //     (bool isMember,) = executor.hasAccess(groupId, account);
    //     vm.assume(!isMember);

    //     uint48 since = Time.timestamp() + executor.getGroupDelay(groupId);

    //     vm.prank(founder);
    //     vm.expectEmit(address(executor));
    //     emit ExecutorTypes.GroupAccessGranted(groupId, account, delay, since, true);
    //     bool newMember = executor.grantAccess(groupId, account, delay);
    //     assertEq(newMember, true);
    //     _;
    // }

    // function test_nofuzz_grantAccess() external {
    //     bytes32 groupId = _randomBytes32();
    //     address account = _randomAddress();
    //     // execution delay is the delay at which any execution for this group will take effect
    //     uint32 executionDelay = 100;
    //     // group delay is the delay at which the group permission will take effect
    //     uint48 lastAccess = Time.timestamp() + executor.getGroupDelay(groupId);

    //     vm.prank(founder);
    //     vm.expectEmit(address(executor));
    //     emit ExecutorTypes.GroupAccessGranted(groupId, account, executionDelay, lastAccess,
    // true);
    //     executor.grantAccess(groupId, account, executionDelay);
    // }

    // execute
    // function test_execute() external {
    //     bytes32 groupId = _randomBytes32();
    //     address bot = _randomAddress();
    //     address receiver = _randomAddress();
    //     uint32 delay = 100;

    //     vm.startPrank(founder);
    //     // Grant access to the bot for the specified group with a delay
    //     executor.grantAccess(groupId, bot, delay);

    //     // Configure which function the group has access to by setting the target function group
    //     // This allows members of groupId to call mintWithPayment() on the mockERC721 contract
    //     executor.setTargetFunctionGroup(
    //         address(mockERC721), mockERC721.mintWithPayment.selector, groupId
    //     );
    //     vm.stopPrank();

    //     vm.prank(bot);
    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             ExecutorTypes.UnauthorizedCall.selector,
    //             bot,
    //             address(mockERC721),
    //             mockERC721.mint.selector
    //         )
    //     );

    //     // This will revert because the bot does not have access to the mint function
    //     executor.execute(address(mockERC721), 0, abi.encodeCall(mockERC721.mint, (receiver, 1)));

    //     bytes memory mintWithPayment = abi.encodeCall(mockERC721.mintWithPayment, receiver);

    //     bytes32 operationId = executor.hashOperation(bot, address(mockERC721), mintWithPayment);

    //     vm.prank(bot);
    //     vm.expectRevert(abi.encodeWithSelector(ExecutorTypes.NotScheduled.selector,
    // operationId));
    //     // This will revert because the operation has not been scheduled since the group has a
    // delay
    //     executor.execute(address(mockERC721), 0, mintWithPayment);

    //     // Schedule the operation with the group delay
    //     vm.prank(bot);
    //     executor.scheduleOperation(address(mockERC721), mintWithPayment, Time.timestamp() +
    // delay);

    //     // Deal the bot some funds
    //     vm.deal(address(bot), 1 ether);

    //     // Warp to the delay
    //     vm.warp(Time.timestamp() + delay + 1);

    //     // Execute the operation
    //     vm.prank(bot);
    //     executor.execute{value: 1 ether}(address(mockERC721), 1 ether, mintWithPayment);

    //     // Assert that the receiver received the token
    //     assertEq(mockERC721.balanceOf(receiver), 1);
    // }
}
