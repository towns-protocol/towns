// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ILockBase} from "contracts/src/tokens/lock/ILock.sol";
import {IRiverBase} from "contracts/src/river/token/IRiver.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

//libraries

//contracts
import {River} from "contracts/src/river/token/River.sol";
import {BaseSetup} from "contracts/test/towns/BaseSetup.sol";

contract RiverTest is BaseSetup, IRiverBase, ILockBase {
  /// @dev `keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")`.
  bytes32 private constant _PERMIT_TYPEHASH =
    0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

  /// @dev initial supply is 10 billion tokens
  uint256 internal INITIAL_SUPPLY = 10_000_000_000 ether;

  address dao;
  address hnt;
  address assoc;

  River river;

  function setUp() public override {
    super.setUp();

    hnt = _randomAddress();
    assoc = _randomAddress();
    dao = _randomAddress();

    RiverConfig memory config = RiverConfig({
      registry: ITownArchitect(townFactory),
      team: hnt,
      association: assoc,
      dao: dao
    });

    river = new River(config);
  }

  function test_name() external {
    assertEq(river.name(), "River");
  }

  function test_symbol() external {
    assertEq(river.symbol(), "RVR");
  }

  function test_decimals() external {
    assertEq(river.decimals(), 18);
  }

  function test_supportsInterface() external {
    assertTrue(river.supportsInterface(type(IERC20).interfaceId));
    assertTrue(river.supportsInterface(type(IERC20Permit).interfaceId));
    assertTrue(river.supportsInterface(type(IERC20Metadata).interfaceId));
  }

  function test_totalSupply() external {
    assertEq(river.totalSupply(), INITIAL_SUPPLY);
    assertEq(river.balanceOf(hnt), (INITIAL_SUPPLY / 100) * 40);
    assertEq(river.balanceOf(assoc), (INITIAL_SUPPLY / 100) * 60);
  }

  // Permit
  function test_allowance() external {
    address alice = _randomAddress();
    address bob = _randomAddress();

    assertEq(river.allowance(alice, bob), 0);

    vm.prank(hnt);
    river.transfer(alice, 100);

    assertEq(river.allowance(alice, bob), 0);

    vm.prank(alice);
    river.approve(bob, 50);

    assertEq(river.allowance(alice, bob), 50);
  }

  function test_permit() external {
    uint256 alicePrivateKey = _randomUint256();
    address alice = vm.addr(alicePrivateKey);
    address bob = _randomAddress();

    vm.prank(hnt);
    river.transfer(alice, 100);

    vm.warp(block.timestamp + 100);

    uint256 deadline = block.timestamp + 100;
    (uint8 v, bytes32 r, bytes32 s) = _signPermit(
      alicePrivateKey,
      alice,
      bob,
      50,
      deadline
    );

    assertEq(river.allowance(alice, bob), 0);

    vm.prank(bob);
    river.permit(alice, bob, 50, deadline, v, r, s);

    assertEq(river.allowance(alice, bob), 50);
  }

  // Delegation
  function test_delegate() external {
    address alice = _randomAddress();

    vm.prank(hnt);
    river.transfer(alice, 100);

    assertEq(river.delegates(alice), address(0));

    vm.prank(alice);
    river.delegate(space);

    assertEq(river.delegates(alice), space);
    assertEq(river.getVotes(space), 100);

    vm.prank(alice);
    river.delegate(address(0));

    assertEq(river.delegates(alice), address(0));
    assertEq(river.getVotes(space), 0);
  }

  function test_delegate_revert_when_invalid_delegatee() external {
    address alice = _randomAddress();

    vm.prank(hnt);
    river.transfer(alice, 100);

    vm.prank(alice);
    vm.expectRevert(River__InvalidDelegatee.selector);
    river.delegate(_randomAddress());
  }

  // Locking
  function test_enableLock() external {
    address alice = _randomAddress();

    vm.prank(hnt);
    river.transfer(alice, 100);

    vm.prank(alice);
    river.delegate(space);

    assertEq(river.isLockEnabled(alice), true);

    vm.prank(alice);
    river.delegate(address(0));

    assertEq(river.isLockEnabled(alice), true);

    vm.warp(block.timestamp + 60 days);

    assertEq(river.isLockEnabled(alice), false);
  }

  function test_enableLock_revert_LockEnabled() external {
    address alice = _randomAddress();
    address bob = _randomAddress();
    uint256 amount = 100;

    vm.prank(hnt);
    river.transfer(alice, amount);

    vm.prank(alice);
    river.delegate(space);

    vm.prank(alice);
    vm.expectRevert(River__TransferLockEnabled.selector);
    river.transfer(bob, amount);
  }

  // Inflation
  function test_createInflation_revert_when_too_soon() external {
    address alice = _randomAddress();

    // wait 5 days
    vm.warp(block.timestamp + 5 days);

    vm.prank(dao);
    vm.expectRevert(River__MintingTooSoon.selector);
    river.createInflation(alice);
  }

  function test_createInflation() external {
    address alice = _randomAddress();

    uint256 inflationAmount = _getCurrentInflationAmount(
      block.timestamp,
      river.totalSupply()
    );

    // wait 365 days
    vm.warp(block.timestamp + 365 days);

    vm.prank(dao);
    river.createInflation(alice);

    assertEq(river.balanceOf(alice), inflationAmount);
  }

  function test_createInflation_after_20_years() external {
    address alice = _randomAddress();

    uint256 deployedAt = block.timestamp;

    // wait 20 years
    vm.warp(block.timestamp + 7300 days);

    uint256 inflationAmount = _getCurrentInflationAmount(
      deployedAt,
      river.totalSupply()
    );

    vm.prank(dao);
    river.createInflation(alice);

    assertEq(river.balanceOf(alice), inflationAmount);
  }

  // =============================================================
  //                           Helpers
  // =============================================================
  function _getCurrentInflationAmount(
    uint256 deployedAt,
    uint256 totalSupply
  ) internal view returns (uint256) {
    uint256 inflationRate = _getCurrentInflationRate(deployedAt);
    return (totalSupply * inflationRate) / 100;
  }

  function _getCurrentInflationRate(
    uint256 deployedAt
  ) internal view returns (uint256) {
    uint256 yearsSinceDeployment = (block.timestamp - deployedAt) / 365 days;
    if (yearsSinceDeployment >= 20) return 2; // 2% final inflation rate
    return 8 - ((yearsSinceDeployment * 6) / 20); // linear decrease from 8% to 2% over 20 years
  }

  function _signPermit(
    uint256 privateKey,
    address owner,
    address spender,
    uint256 value,
    uint256 deadline
  ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
    bytes32 domainSeparator = river.DOMAIN_SEPARATOR();
    uint256 nonces = river.nonces(owner);

    bytes32 structHash = keccak256(
      abi.encode(_PERMIT_TYPEHASH, owner, spender, value, nonces, deadline)
    );

    bytes32 typeDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (v, r, s) = vm.sign(privateKey, typeDataHash);
  }
}
