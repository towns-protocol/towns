// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts
import {BaseRegistryTest} from "./BaseRegistry.t.sol";

contract MainnetDelegationTest is BaseRegistryTest, IMainnetDelegationBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  EnumerableSet.AddressSet internal delegatorSet;
  EnumerableSet.AddressSet internal operatorSet;

  function setUp() public override {
    super.setUp();

    // the first staking cannot be from mainnet
    bridgeTokensForUser(address(this), 1 ether);
    river.approve(address(rewardsDistributionFacet), 1 ether);
    rewardsDistributionFacet.stake(1 ether, OPERATOR, _randomAddress());
    totalStaked = 1 ether;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       SET DELEGATION                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_initiateWithdraw_revertIf_mainnetDelegator() public {
    uint256 depositId = test_setDelegation();

    vm.expectRevert(RewardsDistribution__NotDepositOwner.selector);
    rewardsDistributionFacet.initiateWithdraw(depositId);
  }

  function test_withdraw_revertIf_mainnetDelegator() public {
    uint256 depositId = test_setDelegation();

    vm.expectRevert(RewardsDistribution__NotDepositOwner.selector);
    rewardsDistributionFacet.withdraw(depositId);
  }

  function test_setDelegation() public returns (uint256 depositId) {
    return test_fuzz_setDelegation(address(this), 1 ether, OPERATOR, 0);
  }

  function test_fuzz_setDelegation(
    address delegator,
    uint96 amount,
    address operator,
    uint256 commissionRate
  ) public givenOperator(operator, commissionRate) returns (uint256 depositId) {
    vm.assume(delegator != baseRegistry);
    vm.assume(delegator != address(0) && delegator != operator);
    amount = uint96(bound(amount, 1, type(uint96).max - totalStaked));
    commissionRate = bound(commissionRate, 0, 10000);

    vm.expectEmit(baseRegistry);
    emit DelegationSet(delegator, operator, amount);

    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegation(delegator, operator, amount);
    totalStaked += amount;

    depositId = mainnetDelegationFacet.getDepositIdByDelegator(delegator);
    uint256[] memory deposits = rewardsDistributionFacet.getDepositsByDepositor(
      baseRegistry
    );
    assertEq(deposits.length, 1);
    assertEq(deposits[0], depositId);
    verifyDelegation(depositId, delegator, operator, amount, commissionRate);
  }

  function test_setDelegation_zeroAmount() public givenOperator(OPERATOR, 0) {
    address delegator = makeAddr("DELEGATOR");

    vm.expectEmit(baseRegistry);
    emit DelegationRemoved(delegator);

    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegation(delegator, OPERATOR, 0);
  }

  function test_fuzz_setDelegation_remove(
    address delegator,
    uint96 amount,
    address operator,
    uint256 commissionRate
  ) public {
    amount = uint96(bound(amount, 1, type(uint96).max - totalStaked));
    commissionRate = bound(commissionRate, 0, 10000);

    uint256 depositId = test_fuzz_setDelegation(
      delegator,
      amount,
      operator,
      commissionRate
    );

    vm.expectEmit(baseRegistry);
    emit DelegationRemoved(delegator);

    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegation(delegator, address(0), 0);
    totalStaked -= amount;

    verifyRemoval(delegator, depositId);

    // test remove then add again
    vm.expectEmit(baseRegistry);
    emit DelegationSet(delegator, operator, amount);

    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegation(delegator, operator, amount);
    totalStaked += amount;

    uint256 newDepositId = mainnetDelegationFacet.getDepositIdByDelegator(
      delegator
    );
    assertEq(newDepositId, depositId);

    uint256[] memory deposits = rewardsDistributionFacet.getDepositsByDepositor(
      baseRegistry
    );
    assertEq(deposits.length, 1);
    assertEq(deposits[0], depositId);

    verifyDelegation(depositId, delegator, operator, amount, commissionRate);
  }

  function test_fuzz_setDelegation_replace(
    address delegator,
    uint96[2] memory amounts,
    address[2] memory operators,
    uint256[2] memory commissionRates
  ) public givenOperator(operators[1], commissionRates[1]) {
    vm.assume(operators[0] != operators[1]);
    vm.assume(delegator != operators[1]);
    amounts[0] = uint96(
      bound(amounts[0], 1, type(uint96).max - totalStaked - 1)
    );
    amounts[1] = uint96(
      bound(amounts[1], 1, type(uint96).max - totalStaked - amounts[0])
    );
    commissionRates[1] = bound(commissionRates[1], 0, 10000);

    uint256 depositId = test_fuzz_setDelegation(
      delegator,
      amounts[0],
      operators[0],
      commissionRates[0]
    );

    vm.warp(_randomUint256());

    vm.expectEmit(baseRegistry);
    emit DelegationSet(delegator, operators[1], amounts[1]);

    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegation(delegator, operators[1], amounts[1]);
    totalStaked = totalStaked - amounts[0] + amounts[1];

    uint256[] memory deposits = rewardsDistributionFacet.getDepositsByDepositor(
      baseRegistry
    );
    assertEq(deposits.length, 1);
    assertEq(deposits[0], depositId);

    verifyDelegation(
      depositId,
      delegator,
      operators[1],
      amounts[1],
      commissionRates[1]
    );
  }

  function test_fuzz_claimReward(
    address delegator,
    uint96 amount,
    address operator,
    uint256 commissionRate,
    address claimer,
    uint256 rewardAmount,
    uint256 timeLapse
  ) public {
    vm.assume(
      claimer != address(0) &&
        claimer != delegator &&
        claimer != address(rewardsDistributionFacet)
    );
    vm.assume(river.balanceOf(claimer) == 0);
    rewardAmount = bound(rewardAmount, rewardDuration, 1e27);
    timeLapse = bound(timeLapse, 0, rewardDuration);

    test_fuzz_setDelegation(delegator, amount, operator, commissionRate);

    vm.expectEmit(baseRegistry);
    emit ClaimerSet(delegator, claimer);

    vm.prank(address(messenger));
    mainnetDelegationFacet.setAuthorizedClaimer(delegator, claimer);

    deal(address(river), address(rewardsDistributionFacet), rewardAmount, true);

    vm.prank(NOTIFIER);
    rewardsDistributionFacet.notifyRewardAmount(rewardAmount);

    skip(timeLapse);

    uint256 currentReward = rewardsDistributionFacet.currentReward(delegator);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit ClaimReward(delegator, claimer, currentReward);

    vm.prank(claimer);
    uint256 reward = rewardsDistributionFacet.claimReward(delegator, claimer);

    verifyClaim(delegator, claimer, reward, currentReward, timeLapse);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                    SET BATCH DELEGATION                    */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_setBatchDelegation(
    address[32] memory delegators,
    address[32] memory claimers,
    uint256[32] memory quantities,
    address[32] memory operators,
    uint256[32] memory commissionRates
  ) public {
    sanitizeAmounts(quantities);

    for (uint256 i; i < 32; ++i) {
      // ensure delegators and operators are unique
      if (delegators[i] == address(0) || delegatorSet.contains(delegators[i])) {
        delegators[i] = _randomAddress();
      }
      delegatorSet.add(delegators[i]);
    }
    for (uint256 i; i < 32; ++i) {
      if (
        operators[i] == address(0) ||
        operators[i] == OPERATOR ||
        operatorSet.contains(operators[i]) ||
        delegatorSet.contains(operators[i])
      ) {
        operators[i] = _randomAddress();
      }
      operatorSet.add(operators[i]);
      commissionRates[i] = bound(commissionRates[i], 0, 10000);
      setOperator(operators[i], commissionRates[i]);
    }

    address[] memory _delegators = toDyn(delegators);
    address[] memory _operators = toDyn(operators);
    address[] memory _claimers = toDyn(claimers);
    uint256[] memory _quantities = toDyn(quantities);

    vm.prank(address(messenger));
    mainnetDelegationFacet.setBatchDelegation(
      _delegators,
      _operators,
      _claimers,
      _quantities
    );

    verifyBatch(
      _delegators,
      _claimers,
      _quantities,
      _operators,
      toDyn(commissionRates)
    );
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_setBatchDelegation_replace(
    address[32] memory delegators,
    address[32] memory claimers,
    uint256[32] memory quantities,
    address[32] memory operators,
    uint256[32] memory commissionRates
  ) public {
    test_fuzz_setBatchDelegation(
      delegators,
      claimers,
      quantities,
      operators,
      commissionRates
    );

    address[] memory _delegators = toDyn(delegators);
    address[] memory _operators = toDyn(operators);
    address[] memory _claimers = toDyn(claimers);

    uint256[] memory _quantities = new uint256[](32);
    for (uint256 i; i < 32; ++i) {
      totalStaked -= uint96(quantities[i]);
      _quantities[i] = bound(
        _randomUint256(),
        1,
        type(uint96).max - totalStaked
      );
      totalStaked += uint96(_quantities[i]);
    }

    vm.prank(address(messenger));
    mainnetDelegationFacet.setBatchDelegation(
      _delegators,
      _operators,
      _claimers,
      _quantities
    );

    verifyBatch(
      _delegators,
      _claimers,
      _quantities,
      _operators,
      toDyn(commissionRates)
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     REMOVE DELEGATION                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_removeDelegations(
    address[32] memory delegators,
    address[32] memory claimers,
    uint256[32] memory quantities,
    address[32] memory operators,
    uint256[32] memory commissionRates
  ) public {
    test_fuzz_setBatchDelegation(
      delegators,
      claimers,
      quantities,
      operators,
      commissionRates
    );

    vm.startPrank(address(messenger));
    mainnetDelegationFacet.removeDelegations(toDyn(delegators));

    totalStaked = 1 ether;

    for (uint256 i; i < 32; ++i) {
      uint256 depositId = mainnetDelegationFacet.getDepositIdByDelegator(
        delegators[i]
      );
      verifyRemoval(delegators[i], depositId);
    }
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           HELPER                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function verifyDelegation(
    uint256 depositId,
    address delegator,
    address operator,
    uint96 quantity,
    uint256 commissionRate
  ) internal view {
    Delegation memory delegation = mainnetDelegationFacet
      .getDelegationByDelegator(delegator);
    assertEq(delegation.operator, operator);
    assertEq(delegation.quantity, quantity);
    assertEq(delegation.delegator, delegator);
    assertEq(delegation.delegationTime, block.timestamp);

    uint256 mainnetStake = rewardsDistributionFacet.stakedByDepositor(
      address(rewardsDistributionFacet)
    );
    assertEq(mainnetStake, totalStaked - 1 ether, "mainnetStake");

    verifyStake(
      baseRegistry,
      depositId,
      quantity,
      operator,
      commissionRate,
      delegator
    );
  }

  function verifyRemoval(address delegator, uint256 depositId) internal view {
    Delegation memory delegation = mainnetDelegationFacet
      .getDelegationByDelegator(delegator);
    assertEq(delegation.operator, address(0));
    assertEq(delegation.quantity, 0);
    assertEq(delegation.delegator, address(0));
    assertEq(delegation.delegationTime, 0);

    uint256 mainnetStake = rewardsDistributionFacet.stakedByDepositor(
      address(rewardsDistributionFacet)
    );
    assertEq(mainnetStake, totalStaked - 1 ether, "mainnetStake");

    verifyStake(baseRegistry, depositId, 0, address(0), 0, delegator);
  }

  function verifyBatch(
    address[] memory delegators,
    address[] memory claimers,
    uint256[] memory quantities,
    address[] memory operators,
    uint256[] memory commissionRates
  ) internal view {
    uint256 len = delegators.length;
    uint256[] memory deposits = rewardsDistributionFacet.getDepositsByDepositor(
      baseRegistry
    );
    assertEq(deposits.length, len);

    for (uint256 i; i < len; ++i) {
      uint256 depositId = mainnetDelegationFacet.getDepositIdByDelegator(
        delegators[i]
      );
      assertEq(deposits[i], depositId);
      verifyDelegation(
        depositId,
        delegators[i],
        operators[i],
        uint96(quantities[i]),
        commissionRates[i]
      );
      assertEq(
        mainnetDelegationFacet.getAuthorizedClaimer(delegators[i]),
        claimers[i]
      );
    }
  }
}
