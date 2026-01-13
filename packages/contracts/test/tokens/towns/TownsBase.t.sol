// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// interfaces
import {ILockBase} from "src/tokens/lock/ILock.sol";

// libraries
import {EIP712Utils} from "@towns-protocol/diamond/test/facets/signature/EIP712Utils.sol";

import {LockStorage} from "src/tokens/lock/LockStorage.sol";
import {TownsLib} from "src/tokens/towns/base/TownsLib.sol";

// contracts
import {DeployTownsBase} from "scripts/deployments/utils/DeployTownsBase.s.sol";
import {Towns} from "src/tokens/towns/base/Towns.sol";
import {TownsV2} from "src/tokens/towns/base/versions/TownsV2.sol";
import {ERC20} from "solady/tokens/ERC20.sol";
import {ERC20Votes} from "solady/tokens/ERC20Votes.sol";

contract TownsBaseTest is TestUtils, EIP712Utils, ILockBase {
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    DeployTownsBase internal deployTownsBase = new DeployTownsBase();
    Towns towns;

    address internal deployer;
    address internal bridge;

    function setUp() external {
        deployer = getDeployer();
        towns = Towns(deployTownsBase.deploy(deployer));
        bridge = TownsLib.L2_STANDARD_BRIDGE;
    }

    modifier givenCallerHasBridgedTokens(address caller, uint256 amount) {
        vm.assume(caller != address(0));
        amount = bound(amount, 0, type(uint208).max);

        vm.prank(bridge);
        towns.mint(caller, amount);
        _;
    }

    modifier givenCallerDelegates(address caller, address delegate) {
        vm.assume(delegate != address(0));

        vm.prank(caller);
        towns.delegate(delegate);
        _;
    }

    function test_init() external view {
        assertEq(towns.owner(), address(deployer));
        assertEq(towns.name(), "Towns");
        assertEq(towns.symbol(), "TOWNS");
        assertEq(towns.decimals(), 18);
    }

    function test_storageSlot() public pure {
        bytes32 slot = keccak256("river.tokens.lock.storage");
        assertEq(slot, LockStorage.STORAGE_SLOT, "slot");
    }

    // Permit and Permit with Signature
    function test_allowance(
        address alice,
        uint256 amount,
        address bob
    ) public givenCallerHasBridgedTokens(alice, amount) {
        vm.assume(bob != address(0));
        vm.assume(bob != ZERO_SENTINEL);
        vm.assume(alice != bob);

        vm.assume(towns.allowance(alice, bob) == 0);

        vm.prank(alice);
        towns.approve(bob, amount);

        assertEq(towns.allowance(alice, bob), amount);
    }

    function test_permit(uint256 alicePrivateKey, uint256 amount, address bob) public {
        vm.assume(bob != address(0));
        vm.assume(bob != address(towns));
        vm.assume(bob != ZERO_SENTINEL);

        amount = bound(amount, 1, type(uint208).max);

        alicePrivateKey = boundPrivateKey(alicePrivateKey);

        address alice = vm.addr(alicePrivateKey);

        vm.assume(towns.delegates(alice) == address(0));
        vm.assume(towns.allowance(alice, bob) == 0);

        vm.prank(bridge);
        towns.mint(alice, amount);

        vm.warp(block.timestamp + 100);

        uint256 deadline = block.timestamp + 100;
        (uint8 v, bytes32 r, bytes32 s) = signPermit(
            alicePrivateKey,
            address(towns),
            alice,
            bob,
            amount,
            deadline
        );

        assertEq(towns.allowance(alice, bob), 0);

        vm.prank(bob);
        towns.permit(alice, bob, amount, deadline, v, r, s);

        assertEq(towns.allowance(alice, bob), amount);
    }

    function test_revertWhen_permit_deadlineExpired(
        uint256 alicePrivateKey,
        uint256 amount,
        address bob
    ) external {
        vm.assume(bob != address(0));
        vm.assume(bob != PERMIT2);

        alicePrivateKey = boundPrivateKey(alicePrivateKey);
        amount = bound(amount, 1, type(uint208).max);

        address alice = vm.addr(alicePrivateKey);

        vm.prank(bridge);
        towns.mint(alice, amount);

        uint256 deadline = block.timestamp + 100;
        (uint8 v, bytes32 r, bytes32 s) = signPermit(
            alicePrivateKey,
            address(towns),
            alice,
            bob,
            amount,
            deadline
        );

        vm.warp(deadline + 1);

        vm.prank(bob);
        vm.expectRevert(ERC20.PermitExpired.selector);
        towns.permit(alice, bob, amount, deadline, v, r, s);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Delegating                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_delegate_enableLock(
        address alice,
        address space,
        uint256 amount
    ) public givenCallerHasBridgedTokens(alice, amount) givenCallerDelegates(alice, space) {
        assertEq(towns.isLockActive(alice), true);

        vm.expectEmit(address(towns));
        emit LockUpdated(alice, false, block.timestamp + 30 days);

        vm.prank(alice);
        towns.delegate(address(0));

        assertEq(towns.isLockActive(alice), true);

        uint256 cd = towns.lockExpiration(alice);
        vm.warp(cd);

        assertEq(towns.isLockActive(alice), false);
    }

    function test_revertWhen_delegateToZeroAddress(address alice) external {
        vm.prank(alice);
        vm.expectRevert(Towns.DelegateeSameAsCurrent.selector);
        towns.delegate(address(0));
        assertEq(towns.delegates(alice), address(0));
    }

    function test_revertWhen_undelegate_twice(
        address alice,
        address space,
        uint256 amount
    ) external givenCallerHasBridgedTokens(alice, amount) givenCallerDelegates(alice, space) {
        vm.startPrank(alice);
        towns.delegate(address(0));
        vm.expectRevert(Towns.DelegateeSameAsCurrent.selector);
        towns.delegate(address(0));
    }

    function test_delegate_redelegate(
        address alice,
        address bob,
        address space,
        uint256 amount
    ) external givenCallerHasBridgedTokens(alice, amount) givenCallerDelegates(alice, space) {
        vm.assume(bob != address(0) && bob != space);

        vm.startPrank(alice);
        towns.delegate(bob);
        towns.delegate(address(0));
        towns.delegate(bob);
        vm.stopPrank();
    }

    function test_revertWhen_transfer_lockEnabled(
        address alice,
        address space,
        uint256 amount,
        address bob
    ) external givenCallerHasBridgedTokens(alice, amount) givenCallerDelegates(alice, space) {
        vm.assume(bob != address(0));
        vm.prank(alice);
        vm.expectRevert(Towns.TransferLockEnabled.selector);
        towns.transfer(bob, amount);
    }

    function test_revertWhen_transfer_delegating(
        address alice,
        address space,
        uint256 amount,
        address bob
    ) external givenCallerHasBridgedTokens(alice, amount) givenCallerDelegates(alice, space) {
        amount = bound(amount, 0, type(uint208).max);
        vm.assume(bob != address(0));

        vm.startPrank(alice);
        towns.delegate(address(0));

        assertEq(towns.isLockActive(alice), true);

        towns.delegate(space);

        uint256 cd = towns.lockExpiration(alice);
        vm.warp(cd);

        vm.expectRevert(Towns.TransferLockEnabled.selector);
        towns.transfer(bob, amount);
    }

    function test_transfer_delegateVotesIsCorrect(
        address alice,
        address space,
        uint256 amountA,
        address bob,
        uint256 amountB
    ) public {
        vm.assume(alice != bob);
        vm.assume(alice != address(0));
        vm.assume(bob != address(0));
        vm.assume(space != address(0));

        amountA = bound(amountA, 1, type(uint208).max - 1);
        amountB = bound(amountB, 1, type(uint208).max - amountA);

        vm.prank(bridge);
        towns.mint(alice, amountA);

        vm.prank(bridge);
        towns.mint(bob, amountB);

        vm.expectEmit(address(towns));
        emit ERC20Votes.DelegateVotesChanged(space, 0, amountB);
        emit LockUpdated(bob, true, 0);

        vm.prank(bob);
        towns.delegate(space);

        uint256 timestamp = block.timestamp;
        vm.warp(timestamp + 1);
        assertEq(towns.getVotes(space), towns.getPastVotes(space, timestamp));
        assertEq(towns.getVotes(space), amountB);

        vm.expectEmit(address(towns));
        emit ERC20Votes.DelegateVotesChanged(space, amountB, amountA + amountB);

        vm.prank(alice);
        towns.transfer(bob, amountA);

        assertEq(towns.getVotes(space), amountA + amountB);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Upgrades                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_upgrade() external {
        address impl = address(new TownsV2());

        vm.prank(address(deployer));
        TownsV2(address(towns)).upgradeToAndCall(
            impl,
            abi.encodeCall(TownsV2.updateCoolDown, (100)) // Function call on the new impl
        );
    }

    function test_enabledLockUpdated(
        address alice,
        address space,
        uint256 amount
    ) external givenCallerHasBridgedTokens(alice, amount) {
        vm.assume(space != address(0));

        address impl = address(new TownsV2());
        uint256 cooldown = 300; // 5 mins

        // upgrade and call updateCoolDown on the new impl
        vm.prank(address(deployer));
        TownsV2(address(towns)).upgradeToAndCall(
            impl,
            abi.encodeCall(TownsV2.updateCoolDown, (cooldown)) // Function call on the new impl
        );

        vm.startPrank(alice);
        vm.expectEmit(address(towns));
        emit LockUpdated(alice, true, 0);
        towns.delegate(space);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectEmit(address(towns));
        emit LockUpdated(alice, false, block.timestamp + cooldown);
        towns.delegate(address(0));
    }
}
