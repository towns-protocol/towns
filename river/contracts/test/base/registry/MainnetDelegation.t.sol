// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "contracts/src/base/registry/facets/mainnet/IMainnetDelegation.sol";

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
    towns.approve(address(rewardsDistributionFacet), 1 ether);
    rewardsDistributionFacet.stake(1 ether, OPERATOR, _randomAddress());
    totalStaked = 1 ether;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       SET DELEGATION                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_setDelegationDigest_revertIf_notMessenger() public {
    vm.expectRevert(
      "MainnetDelegation: sender is not the cross-domain messenger"
    );
    mainnetDelegationFacet.setDelegationDigest(_randomBytes32());
  }

  function test_fuzz_setDelegationDigest(bytes32 digest) public {
    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegationDigest(digest);
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
    vm.assume(towns.balanceOf(claimer) == 0);
    rewardAmount = bound(rewardAmount, rewardDuration, 1e27);
    timeLapse = bound(timeLapse, 0, rewardDuration);

    setDelegation(delegator, claimer, amount, operator, commissionRate);

    deal(address(towns), address(rewardsDistributionFacet), rewardAmount, true);

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
  function test_fuzz_relayDelegations(
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
    address[] memory _claimers = toDyn(claimers);
    uint256[] memory _quantities = toDyn(quantities);
    address[] memory _operators = toDyn(operators);
    uint256[] memory _commissionRates = toDyn(commissionRates);

    relayDelegations(_delegators, _claimers, _quantities, _operators);

    verifyBatch(
      _delegators,
      _claimers,
      _quantities,
      _operators,
      _commissionRates
    );
  }

  function relayDelegations(
    address[] memory delegators,
    address[] memory claimers,
    uint256[] memory quantities,
    address[] memory operators
  ) internal {
    uint256 len = delegators.length;
    DelegationMsg[] memory msgs = new DelegationMsg[](len);
    for (uint256 i; i < len; ++i) {
      msgs[i] = DelegationMsg({
        delegator: delegators[i],
        delegatee: operators[i],
        claimer: claimers[i],
        quantity: quantities[i]
      });
    }
    bytes memory encodedMsgs = abi.encode(msgs);
    bytes32 digest = keccak256(abi.encode(keccak256(encodedMsgs)));

    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegationDigest(digest);

    vm.prank(deployer);
    mainnetDelegationFacet.relayDelegations(encodedMsgs);
  }

  function setDelegation(
    address delegator,
    address claimer,
    uint96 amount,
    address operator,
    uint256 commissionRate
  ) internal givenOperator(operator, commissionRate) {
    vm.assume(delegator != baseRegistry);
    vm.assume(delegator != address(0) && delegator != operator);
    amount = uint96(bound(amount, 1, type(uint96).max - totalStaked));
    totalStaked += amount;
    commissionRate = bound(commissionRate, 0, 10000);

    address[] memory delegators = new address[](1);
    delegators[0] = delegator;
    address[] memory claimers = new address[](1);
    claimers[0] = claimer;
    uint256[] memory quantities = new uint256[](1);
    quantities[0] = amount;
    address[] memory operators = new address[](1);
    operators[0] = operator;

    relayDelegations(delegators, claimers, quantities, operators);
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_relayDelegations_replace(
    address[32] memory delegators,
    address[32] memory claimers,
    uint256[32] memory quantities,
    address[32] memory operators,
    uint256[32] memory commissionRates
  ) public {
    test_fuzz_relayDelegations(
      delegators,
      claimers,
      quantities,
      operators,
      commissionRates
    );

    address[] memory _delegators = toDyn(delegators);
    address[] memory _operators = toDyn(operators);
    address[] memory _claimers = toDyn(claimers);
    uint256[] memory _commissionRates = toDyn(commissionRates);

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

    relayDelegations(_delegators, _claimers, _quantities, _operators);

    verifyBatch(
      _delegators,
      _claimers,
      _quantities,
      _operators,
      _commissionRates
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     REMOVE DELEGATION                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_relayDelegations_remove(
    address[32] memory delegators,
    address[32] memory claimers,
    uint256[32] memory quantities,
    address[32] memory operators,
    uint256[32] memory commissionRates
  ) public {
    test_fuzz_relayDelegations(
      delegators,
      claimers,
      quantities,
      operators,
      commissionRates
    );

    relayDelegations(
      toDyn(delegators),
      toDyn(claimers),
      toDyn(quantities),
      new address[](32)
    );

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
