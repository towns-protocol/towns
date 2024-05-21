// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ILockBase} from "contracts/src/tokens/lock/ILock.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

//libraries

//contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract RiverBaseTest is BaseSetup, ILockBase, IOwnableBase {
  /// @dev `keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")`.
  bytes32 private constant _PERMIT_TYPEHASH =
    0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

  River riverFacet;
  uint256 stakeRequirement;

  function setUp() public override {
    super.setUp();
    riverFacet = River(riverToken);
    stakeRequirement = riverFacet.MIN_TOKEN_THRESHOLD();
  }

  function test_init() external {
    assertEq(riverFacet.name(), "River");
    assertEq(riverFacet.symbol(), "RVR");
    assertEq(riverFacet.decimals(), 18);
    assertTrue(riverFacet.supportsInterface(type(IERC20).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IERC20Permit).interfaceId));
    assertTrue(riverFacet.supportsInterface(type(IERC20Metadata).interfaceId));
  }

  modifier givenCallerHasBridgedTokens(address caller, uint256 amount) {
    vm.assume(caller != address(0));
    vm.assume(amount >= stakeRequirement && amount <= stakeRequirement * 10);

    vm.prank(bridge);
    riverFacet.mint(caller, amount);
    _;
  }

  // Permit and Permit with Signature
  function test_allowance(
    address alice,
    uint256 amount,
    address bob
  ) external givenCallerHasBridgedTokens(alice, amount) {
    vm.assume(bob != address(0));

    assertEq(riverFacet.allowance(alice, bob), 0);

    vm.prank(alice);
    riverFacet.approve(bob, amount);

    assertEq(riverFacet.allowance(alice, bob), amount);
  }

  function test_permit(uint256 amount, address bob) external {
    vm.assume(bob != address(0));
    vm.assume(amount > 0 && amount <= 1000);

    uint256 alicePrivateKey = _randomUint256();
    address alice = vm.addr(alicePrivateKey);

    vm.prank(bridge);
    riverFacet.mint(alice, amount);

    vm.warp(block.timestamp + 100);

    uint256 deadline = block.timestamp + 100;
    (uint8 v, bytes32 r, bytes32 s) = _signPermit(
      alicePrivateKey,
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

  function test_revertWhen_permitDeadlineExpired(
    uint256 amount,
    address bob
  ) external {
    vm.assume(bob != address(0));
    vm.assume(amount > 0 && amount <= 1000);

    uint256 alicePrivateKey = _randomUint256();
    address alice = vm.addr(alicePrivateKey);

    vm.prank(bridge);
    riverFacet.mint(alice, amount);

    uint256 deadline = block.timestamp + 100;
    (uint8 v, bytes32 r, bytes32 s) = _signPermit(
      alicePrivateKey,
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
    vm.prank(caller);
    riverFacet.delegate(space);
    _;
  }

  modifier whenCallerDelegatesToAnOperator(address caller, address operator) {
    vm.assume(operator != address(0));
    vm.prank(caller);
    riverFacet.delegate(operator);
    _;
  }

  function test_delegateToZeroAddress(
    address alice,
    uint256 amount
  ) external givenCallerHasBridgedTokens(alice, amount) {
    vm.prank(alice);
    vm.expectRevert(River.River__DelegateeSameAsCurrent.selector);
    riverFacet.delegate(address(0));
    assertEq(riverFacet.delegates(alice), address(0));
  }

  // Locking
  function test_enableLock(
    address alice,
    uint256 amount
  )
    external
    givenCallerHasBridgedTokens(alice, amount)
    whenCallerDelegatesToASpace(alice)
  {
    assertEq(riverFacet.isLockEnabled(alice), true);

    vm.prank(alice);
    riverFacet.delegate(address(0));

    assertEq(riverFacet.isLockEnabled(alice), true);

    uint256 lockCooldown = riverFacet.lockCooldown(alice);

    vm.warp(block.timestamp + lockCooldown + 1);

    assertEq(riverFacet.isLockEnabled(alice), false);
  }

  function test_revertWhen_transferringWhileLockEnabled(
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

  // =============================================================
  //                           Helpers
  // =============================================================

  function _signPermit(
    uint256 privateKey,
    address owner,
    address spender,
    uint256 value,
    uint256 deadline
  ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
    bytes32 domainSeparator = riverFacet.DOMAIN_SEPARATOR();
    uint256 nonces = riverFacet.nonces(owner);

    bytes32 structHash = keccak256(
      abi.encode(_PERMIT_TYPEHASH, owner, spender, value, nonces, deadline)
    );

    bytes32 typeDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (v, r, s) = vm.sign(privateKey, typeDataHash);
  }
}
