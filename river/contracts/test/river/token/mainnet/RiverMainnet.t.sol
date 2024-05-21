// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ILockBase} from "contracts/src/tokens/lock/ILock.sol";
import {IRiverBase} from "contracts/src/tokens/river/mainnet/IRiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {DeployRiverMainnet} from "contracts/scripts/deployments/DeployRiverMainnet.s.sol";
import {River} from "contracts/src/tokens/river/mainnet/River.sol";

contract RiverMainnetTest is TestUtils, IRiverBase, ILockBase {
  DeployRiverMainnet internal deployRiverMainnet = new DeployRiverMainnet();

  /// @dev `keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")`.
  bytes32 private constant _PERMIT_TYPEHASH =
    0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

  /// @dev initial supply is 10 billion tokens
  uint256 internal INITIAL_SUPPLY = 10_000_000_000 ether;

  address association;
  address vault;

  River river;
  InflationConfig internal inflation;

  function setUp() public {
    river = River(deployRiverMainnet.deploy());
    association = deployRiverMainnet.association();
    vault = deployRiverMainnet.vault();
    (, , inflation) = deployRiverMainnet.config();
  }

  function test_init() external {
    assertEq(river.name(), "River");
    assertEq(river.symbol(), "RVR");
    assertEq(river.decimals(), 18);
    assertTrue(river.supportsInterface(type(IERC20).interfaceId));
    assertTrue(river.supportsInterface(type(IERC20Permit).interfaceId));
    assertTrue(river.supportsInterface(type(IERC20Metadata).interfaceId));
    assertEq(river.totalSupply(), INITIAL_SUPPLY);
  }

  modifier givenCallerHasTokens(address caller) {
    vm.assume(caller != address(0));
    vm.prank(deployRiverMainnet.vault());
    river.transfer(caller, 100);
    _;
  }

  // Permit and Permit with Signature
  function test_allowance(
    address alice,
    address bob
  ) external givenCallerHasTokens(alice) {
    vm.assume(bob != address(0));

    assertEq(river.allowance(alice, bob), 0);

    vm.prank(alice);
    river.approve(bob, 50);

    assertEq(river.allowance(alice, bob), 50);
  }

  function test_permit(address bob) external {
    vm.assume(bob != address(0));

    uint256 alicePrivateKey = _randomUint256();
    address alice = vm.addr(alicePrivateKey);

    vm.prank(deployRiverMainnet.vault());
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

  // =============================================================
  //                           Delegation
  // =============================================================

  modifier givenCallerHasDelegated(address caller, address delegatee) {
    vm.assume(river.delegates(caller) != delegatee);

    vm.prank(caller);
    river.delegate(delegatee);
    assertEq(river.delegates(caller), delegatee);
    _;
  }

  function test_revertWhen_delegateToZeroAddress(
    address alice
  ) external givenCallerHasTokens(alice) {
    vm.prank(alice);
    vm.expectRevert(River__DelegateeSameAsCurrent.selector);
    river.delegate(address(0));
    assertEq(river.delegates(alice), address(0));
  }

  function test_delegateToAddress(
    address delegator,
    address delegatee
  )
    external
    givenCallerHasTokens(delegator)
    givenCallerHasDelegated(delegator, delegatee)
  {
    assertEq(river.delegates(delegator), delegatee);
    assertTrue(river.isLockEnabled(delegator));

    address[] memory delegators = river.getDelegators();
    assertEq(delegators.length, 1);

    address found;
    for (uint256 i = 0; i < delegators.length; i++) {
      if (delegators[i] == delegator) {
        found = delegators[i];
        break;
      }
    }

    assertEq(found, delegator);
  }

  modifier givenAssociationUpdatedCooldown() {
    vm.prank(association);
    river.setLockCooldown(2 days);
    _;
  }

  // Locking
  function test_enableLock(
    address delegator,
    address delegatee
  )
    external
    givenCallerHasTokens(delegator)
    givenCallerHasDelegated(delegator, delegatee)
    givenAssociationUpdatedCooldown
  {
    vm.assume(delegatee != address(0));

    vm.prank(delegator);
    river.delegate(address(0));

    assertEq(river.isLockEnabled(delegator), true);

    uint256 lockCooldown = river.lockCooldown(delegator);
    vm.warp(block.timestamp + lockCooldown + 1);

    assertEq(river.isLockEnabled(delegator), false);
  }

  function test_enableLock_revert_LockEnabled(
    address delegator,
    address delegatee
  )
    external
    givenCallerHasTokens(delegator)
    givenCallerHasDelegated(delegator, delegatee)
    givenAssociationUpdatedCooldown
  {
    uint256 amount = 100;

    vm.prank(delegator);
    vm.expectRevert(River__TransferLockEnabled.selector);
    river.transfer(delegatee, amount);
  }

  function test_revertWhen_disableLockOverrideToNotDisable(
    address delegator,
    address delegatee
  )
    external
    givenCallerHasTokens(delegator)
    givenCallerHasDelegated(delegator, delegatee)
  {
    uint256 amount = 100;

    vm.prank(association);
    river.disableLock(delegator);

    vm.prank(delegator);
    vm.expectRevert(River__TransferLockEnabled.selector);
    river.transfer(delegatee, amount);
  }

  // =============================================================
  //                        createInflation
  // =============================================================

  function test_revertWhen_createInflationIsCalledByOwnerTooSoon() external {
    // wait 5 days
    vm.warp(block.timestamp + 5 days);

    vm.prank(association);
    vm.expectRevert(River__MintingTooSoon.selector);
    river.createInflation(vault);
  }

  function test_createInflation_isCalledByOwnerAfterOneYear() external {
    uint256 deployedAt = block.timestamp;

    // wait 365 days
    vm.warp(block.timestamp + 365 days);

    uint256 inflationAmount = _getCurrentInflationAmount(
      deployedAt,
      river.totalSupply()
    );

    uint256 expectedSupply = river.totalSupply() + inflationAmount;

    vm.prank(association);
    river.createInflation(vault);

    assertEq(river.totalSupply(), expectedSupply);
  }

  function test_createInflation_isCalledByOwnerAfter20Years() external {
    uint256 deployedAt = block.timestamp;

    // wait 365 days
    vm.warp(deployedAt + 7300 days);

    uint256 inflationAmount = _getCurrentInflationAmount(
      deployedAt,
      river.totalSupply()
    );

    uint256 expectedSupply = river.totalSupply() + inflationAmount;

    vm.prank(association);
    river.createInflation(vault);

    assertEq(river.totalSupply(), expectedSupply);
  }

  function test_revertWhen_createInflationIsCalledByNotOwner(
    address notOwner
  ) external {
    vm.assume(notOwner != association);

    // wait 365 days
    vm.warp(block.timestamp + 365 days);

    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(
        Ownable.OwnableUnauthorizedAccount.selector,
        notOwner
      )
    );
    river.createInflation(vault);
  }

  function test_revertWhen_createInflationIsCalledWithAddressZero() external {
    vm.prank(association);
    vm.expectRevert(River__InvalidAddress.selector);
    river.createInflation(address(0));
  }

  // =============================================================
  //                       Override Inflation
  // =============================================================
  function test_overrideInflation() external {
    // set to 1.5%
    uint256 overrideInflationRateBPS = 130;

    vm.prank(deployRiverMainnet.association());
    river.setOverrideInflation(true, overrideInflationRateBPS);

    assertEq(river.overrideInflationRate(), overrideInflationRateBPS);

    uint256 deployedAt = block.timestamp;

    // wait 365 days
    vm.warp(deployedAt + 365 days);

    uint256 inflationAmount = (river.totalSupply() * overrideInflationRateBPS) /
      10000;

    uint256 expectedSupply = river.totalSupply() + inflationAmount;

    vm.prank(deployRiverMainnet.association());
    river.createInflation(vault);

    assertEq(river.totalSupply(), expectedSupply);
  }

  function test_revertWhen_overrideInflationRateIsGreaterThanFinalInflationRate()
    external
  {
    vm.prank(deployRiverMainnet.association());
    vm.expectRevert(River__InvalidInflationRate.selector);
    river.setOverrideInflation(true, inflation.finalInflationRate + 1);
  }

  function test_revertWhen_overrideInflationIsCalledByNotOwner(
    address notOwner
  ) external {
    vm.assume(notOwner != association);

    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(
        Ownable.OwnableUnauthorizedAccount.selector,
        notOwner
      )
    );
    river.setOverrideInflation(true, 100);
  }

  function test_setOverrideInflation_isSetToFalse() external {
    uint256 deployedAt = block.timestamp;

    vm.prank(association);
    river.setOverrideInflation(true, 100);

    vm.prank(association);
    river.setOverrideInflation(false, 0);

    // wait 365 days
    vm.warp(deployedAt + 365 days);

    uint256 inflationAmount = _getCurrentInflationAmount(
      deployedAt,
      river.totalSupply()
    );

    uint256 expectedSupply = river.totalSupply() + inflationAmount;

    vm.prank(association);
    river.createInflation(vault);

    assertEq(river.totalSupply(), expectedSupply);
  }

  function _getCurrentInflationAmount(
    uint256 deployedAt,
    uint256 totalSupply
  ) internal view returns (uint256) {
    uint256 inflationRate = _getCurrentInflationRate(deployedAt);
    return (totalSupply * inflationRate) / 10000;
  }

  function _getCurrentInflationRate(
    uint256 deployedAt
  ) internal view returns (uint256) {
    uint256 yearsSinceDeployment = (block.timestamp - deployedAt) / 365 days;
    if (yearsSinceDeployment >= inflation.inflationDecreaseInterval)
      return inflation.finalInflationRate; // 2% final inflation rate
    uint256 decreatePerYear = inflation.inflationDecreaseRate /
      inflation.inflationDecreaseInterval;
    return
      inflation.initialInflationRate - (yearsSinceDeployment * decreatePerYear);
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
