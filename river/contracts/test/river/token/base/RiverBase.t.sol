// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {ILockBase} from "contracts/src/tokens/lock/ILock.sol";
import {IOwnableBase} from "@river-build/diamond/src/facets/ownable/IERC173.sol";

//libraries

//contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {EIP712Utils} from "contracts/test/utils/EIP712Utils.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract RiverBaseTest is BaseSetup, EIP712Utils, ILockBase, IOwnableBase {
  address internal ALICE = makeAddr("ALICE");
  address internal BOB = makeAddr("BOB");
  River internal riverFacet;

  function setUp() public override {
    super.setUp();
    riverFacet = River(riverToken);
  }

  function test_init() external view {
    assertEq(riverFacet.name(), "River");
    assertEq(riverFacet.symbol(), "RVR");
    assertEq(riverFacet.decimals(), 18);
    assertTrue(riverFacet.supportsInterface(type(IERC20).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IERC20Metadata).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IERC20Permit).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IERC165).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IERC5267).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IERC6372).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IVotes).interfaceId));
  }

  modifier givenCallerHasBridgedTokens(address caller, uint256 amount) {
    vm.assume(caller != address(0));
    amount = bound(amount, 0, type(uint208).max);
    vm.assume(caller != ZERO_SENTINEL);

    vm.prank(bridge);
    riverFacet.mint(caller, amount);
    _;
  }

  function test_allowance() public {
    test_fuzz_allowance(ALICE, 1 ether, BOB);
  }

  // Permit and Permit with Signature
  function test_fuzz_allowance(
    address alice,
    uint256 amount,
    address bob
  ) public givenCallerHasBridgedTokens(alice, amount) {
    vm.assume(bob != address(0));

    assertEq(riverFacet.allowance(alice, bob), 0);

    vm.prank(alice);
    riverFacet.approve(bob, amount);

    assertEq(riverFacet.allowance(alice, bob), amount);
  }

  function test_permit() public {
    test_fuzz_permit(makeAccount("ALICE").key, 1 ether, BOB);
  }

  function test_fuzz_permit(
    uint256 alicePrivateKey,
    uint256 amount,
    address bob
  ) public {
    alicePrivateKey = boundPrivateKey(alicePrivateKey);
    vm.assume(bob != address(0));
    amount = bound(amount, 1, type(uint208).max);

    address alice = vm.addr(alicePrivateKey);

    vm.prank(bridge);
    riverFacet.mint(alice, amount);

    vm.warp(block.timestamp + 100);

    uint256 deadline = block.timestamp + 100;
    (uint8 v, bytes32 r, bytes32 s) = signPermit(
      alicePrivateKey,
      riverToken,
      alice,
      bob,
      amount,
      deadline
    );

    assertEq(riverFacet.allowance(alice, bob), 0);

    vm.prank(bob);
    riverFacet.permit(alice, bob, amount, deadline, v, r, s);

    assertEq(riverFacet.allowance(alice, bob), amount);
  }

  function test_fuzz_permit_revertWhen_deadlineExpired(
    uint256 alicePrivateKey,
    uint256 amount,
    address bob
  ) external {
    alicePrivateKey = boundPrivateKey(alicePrivateKey);
    vm.assume(bob != address(0));
    amount = bound(amount, 1, type(uint208).max);

    address alice = vm.addr(alicePrivateKey);

    vm.prank(bridge);
    riverFacet.mint(alice, amount);

    uint256 deadline = block.timestamp + 100;
    (uint8 v, bytes32 r, bytes32 s) = signPermit(
      alicePrivateKey,
      riverToken,
      alice,
      bob,
      amount,
      deadline
    );

    vm.warp(deadline + 1);

    vm.prank(bob);
    vm.expectRevert(
      abi.encodeWithSelector(
        ERC20Permit.ERC2612ExpiredSignature.selector,
        deadline
      )
    );
    riverFacet.permit(alice, bob, amount, deadline, v, r, s);
  }

  // =============================================================
  //                           Delegation
  // =============================================================

  modifier whenCallerDelegatesToASpace(address caller) {
    vm.assume(caller != ZERO_SENTINEL);
    vm.prank(caller);
    riverFacet.delegate(space);
    _;
  }

  modifier whenCallerDelegatesToAnOperator(address caller, address operator) {
    vm.assume(operator != address(0));
    vm.assume(operator != ZERO_SENTINEL);
    vm.assume(caller != operator);
    vm.assume(caller != space);

    vm.prank(caller);
    riverFacet.delegate(operator);
    _;
  }

  function test_fuzz_delegate_revertWhen_delegateToZeroAddress(
    address alice
  ) external {
    vm.prank(alice);
    vm.expectRevert(River.River__DelegateeSameAsCurrent.selector);
    riverFacet.delegate(address(0));
    assertEq(riverFacet.delegates(alice), address(0));
  }

  function test_delegate_enableLock() public {
    test_fuzz_delegate_enableLock(ALICE, 1 ether);
  }

  function test_fuzz_delegate_enableLock(
    address alice,
    uint256 amount
  )
    public
    givenCallerHasBridgedTokens(alice, amount)
    whenCallerDelegatesToASpace(alice)
  {
    assertEq(riverFacet.isLockEnabled(alice), true);

    vm.expectEmit(riverToken);
    emit LockUpdated(alice, false, block.timestamp + 30 days);

    vm.prank(alice);
    riverFacet.delegate(address(0));

    assertEq(riverFacet.isLockEnabled(alice), true);

    uint256 cd = riverFacet.lockCooldown(alice);
    vm.warp(cd);

    assertEq(riverFacet.isLockEnabled(alice), false);
  }

  function test_fuzz_delegate_redelegate(
    address alice,
    uint256 amount,
    address bob
  )
    external
    givenCallerHasBridgedTokens(alice, amount)
    whenCallerDelegatesToASpace(alice)
  {
    vm.assume(bob != address(0) && bob != space);
    vm.assume(bob != alice);

    vm.startPrank(alice);
    riverFacet.delegate(bob);
    riverFacet.delegate(address(0));
    riverFacet.delegate(bob);
  }

  function test_fuzz_transfer_revertWhen_lockEnabled(
    address alice,
    uint256 amount,
    address bob
  )
    external
    givenCallerHasBridgedTokens(alice, amount)
    whenCallerDelegatesToASpace(alice)
  {
    vm.assume(bob != address(0));
    vm.prank(alice);
    vm.expectRevert(River.River__TransferLockEnabled.selector);
    riverFacet.transfer(bob, amount);
  }

  function test_fuzz_transfer_revertWhen_delegating(
    address alice,
    uint256 amount,
    address bob
  )
    external
    givenCallerHasBridgedTokens(alice, amount)
    whenCallerDelegatesToASpace(alice)
  {
    amount = bound(amount, 0, type(uint208).max);
    vm.assume(bob != address(0));

    vm.startPrank(alice);
    riverFacet.delegate(address(0));

    assertEq(riverFacet.isLockEnabled(alice), true);

    riverFacet.delegate(space);

    uint256 cd = riverFacet.lockCooldown(alice);
    vm.warp(cd);

    vm.expectRevert(River.River__TransferLockEnabled.selector);
    riverFacet.transfer(bob, amount);
  }

  function test_transfer_delegateVotesIsCorrect() public {
    test_fuzz_transfer_delegateVotesIsCorrect(ALICE, 1 ether, BOB, 1 ether);
  }

  function test_fuzz_transfer_delegateVotesIsCorrect(
    address alice,
    uint256 amountA,
    address bob,
    uint256 amountB
  ) public {
    vm.assume(alice != bob);
    vm.assume(alice != address(0));
    vm.assume(bob != address(0));
    vm.assume(alice != ZERO_SENTINEL);
    vm.assume(bob != ZERO_SENTINEL);

    amountA = bound(amountA, 1, type(uint208).max - 1);
    amountB = bound(amountB, 1, type(uint208).max - amountA);

    vm.prank(bridge);
    riverFacet.mint(alice, amountA);

    vm.prank(bridge);
    riverFacet.mint(bob, amountB);

    vm.expectEmit(riverToken);
    emit IVotes.DelegateVotesChanged(space, 0, amountB);
    emit LockUpdated(bob, true, 0);

    vm.prank(bob);
    riverFacet.delegate(space);

    uint256 timestamp = block.timestamp;
    vm.warp(timestamp + 1);
    assertEq(
      riverFacet.getVotes(space),
      riverFacet.getPastVotes(space, timestamp)
    );
    assertEq(riverFacet.getVotes(space), amountB);

    vm.expectEmit(riverToken);
    emit IVotes.DelegateVotesChanged(space, amountB, amountA + amountB);

    vm.prank(alice);
    riverFacet.transfer(bob, amountA);

    assertEq(riverFacet.getVotes(space), amountA + amountB);
  }
}
