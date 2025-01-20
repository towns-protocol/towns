// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {DeployBase} from "contracts/scripts/common/DeployBase.s.sol";
import {TestUtils} from "../utils/TestUtils.sol";
import {RewardsVerifier} from "../base/registry/RewardsVerifier.t.sol";
import {DeployRewardsDistributionV2} from "contracts/scripts/deployments/facets/DeployRewardsDistributionV2.s.sol";

//interfaces
import {IDiamondCut} from "@river-build/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "@river-build/diamond/src/facets/loupe/IDiamondLoupe.sol";
import {IDiamond} from "@river-build/diamond/src/Diamond.sol";
import {INodeOperator} from "contracts/src/base/registry/facets/operator/INodeOperator.sol";
import {IMainnetDelegationBase, IMainnetDelegation} from "contracts/src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {ICrossDomainMessenger} from "contracts/src/base/registry/facets/mainnet/ICrossDomainMessenger.sol";

//libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {StakingRewards} from "contracts/src/base/registry/facets/distribution/v2/StakingRewards.sol";

//contracts
import {MainnetDelegation} from "contracts/src/base/registry/facets/mainnet/MainnetDelegation.sol";
import {MockMessenger} from "contracts/test/mocks/MockMessenger.sol";
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {RewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/RewardsDistribution.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";
import {OwnableFacet} from "@river-build/diamond/src/facets/ownable/OwnableFacet.sol";

// deployers
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

contract ForkRewardsDistributionTest is
  DeployBase,
  RewardsVerifier,
  TestUtils,
  IDiamond,
  IMainnetDelegationBase
{
  using FixedPointMathLib for uint256;

  uint256 internal constant rewardDuration = 14 days;
  address internal baseRegistry;
  address internal spaceFactory;
  DeployRewardsDistributionV2 internal distributionV2Helper;
  MockMainnetDelegation internal mockMainnetDelegation =
    new MockMainnetDelegation();
  address internal owner;
  address[] internal activeOperators;

  function setUp() public {
    vm.createSelectFork("base", 23200000);

    vm.setEnv("DEPLOYMENT_CONTEXT", "omega");

    baseRegistry = getDeployment("baseRegistry");
    spaceFactory = getDeployment("spaceFactory");
    towns = Towns(getDeployment("towns"));
    rewardsDistributionFacet = RewardsDistribution(baseRegistry);
    owner = OwnableFacet(baseRegistry).owner();

    governanceActions();

    getActiveOperators();
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_stake(
    address depositor,
    uint96 amount,
    address beneficiary,
    uint256 seed
  ) public returns (uint256 depositId) {
    address operator = randomOperator(seed);
    vm.assume(depositor != address(rewardsDistributionFacet));
    vm.assume(beneficiary != address(0) && beneficiary != operator);

    depositId = stake(depositor, amount, beneficiary, operator);

    verifyStake(
      depositor,
      depositId,
      amount,
      operator,
      getCommissionRate(operator),
      beneficiary
    );
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_stake_mainnetDelegation_shouldNotStartWith0(
    address delegator,
    uint96 amount,
    uint256 seed
  ) public {
    address operator = randomOperator(seed);
    amount = uint96(bound(amount, 1, type(uint96).max / 2));
    vm.assume(delegator != address(rewardsDistributionFacet));
    vm.assume(delegator != address(0) && delegator != operator);

    setDelegation(delegator, operator, amount);
    assertEq(
      IMainnetDelegation(baseRegistry).getDepositIdByDelegator(delegator),
      0
    );
    assertEq(
      rewardsDistributionFacet.stakedByDepositor(
        address(rewardsDistributionFacet)
      ),
      amount
    );

    setDelegation(delegator, operator, amount);
    assertEq(
      IMainnetDelegation(baseRegistry).getDepositIdByDelegator(delegator),
      1
    );
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_increaseStake(
    uint96 amount0,
    uint96 amount1,
    address beneficiary,
    uint256 seed
  ) public {
    address operator = randomOperator(seed);
    vm.assume(beneficiary != address(0) && beneficiary != operator);
    amount0 = uint96(bound(amount0, 1, type(uint96).max));
    amount1 = uint96(bound(amount1, 0, type(uint96).max - amount0));

    uint96 totalAmount = amount0 + amount1;
    deal(address(towns), address(this), totalAmount, true);

    towns.approve(address(rewardsDistributionFacet), totalAmount);
    uint256 depositId = rewardsDistributionFacet.stake(
      amount0,
      operator,
      beneficiary
    );

    vm.expectEmit(address(rewardsDistributionFacet));
    emit IncreaseStake(depositId, amount1);

    rewardsDistributionFacet.increaseStake(depositId, amount1);

    verifyStake(
      address(this),
      depositId,
      totalAmount,
      operator,
      getCommissionRate(operator),
      beneficiary
    );
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_redelegate(
    uint96 amount,
    uint256 seed0,
    uint256 seed1
  ) public {
    address operator0 = randomOperator(seed0);
    address operator1 = randomOperator(seed1);
    vm.assume(operator0 != operator1);

    uint256 depositId = stake(address(this), amount, address(this), operator0);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit Redelegate(depositId, operator1);

    rewardsDistributionFacet.redelegate(depositId, operator1);

    assertEq(
      rewardsDistributionFacet.treasureByBeneficiary(operator0).earningPower,
      0
    );

    verifyStake(
      address(this),
      depositId,
      amount,
      operator1,
      getCommissionRate(operator1),
      address(this)
    );
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_changeBeneficiary(
    uint96 amount,
    address beneficiary,
    uint256 seed
  ) public {
    address operator = randomOperator(seed);
    vm.assume(beneficiary != address(0) && beneficiary != operator);

    uint256 depositId = stake(address(this), amount, address(this), operator);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit ChangeBeneficiary(depositId, beneficiary);

    rewardsDistributionFacet.changeBeneficiary(depositId, beneficiary);

    verifyStake(
      address(this),
      depositId,
      amount,
      operator,
      getCommissionRate(operator),
      beneficiary
    );
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_initiateWithdraw(
    uint96 amount,
    address beneficiary,
    uint256 seed
  ) public returns (uint256 depositId) {
    address operator = randomOperator(seed);
    vm.assume(beneficiary != address(0) && beneficiary != operator);

    depositId = stake(address(this), amount, beneficiary, operator);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit InitiateWithdraw(address(this), depositId, amount);

    rewardsDistributionFacet.initiateWithdraw(depositId);

    verifyWithdraw(address(this), depositId, amount, 0, operator, beneficiary);
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_withdraw(
    uint96 amount,
    address beneficiary,
    uint256 seed
  ) public returns (uint256 depositId) {
    address operator = randomOperator(seed);
    depositId = test_fuzz_initiateWithdraw(amount, beneficiary, seed);

    address proxy = rewardsDistributionFacet.delegationProxyById(depositId);
    uint256 cd = towns.lockCooldown(proxy);

    vm.warp(cd);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit Withdraw(depositId, amount);

    rewardsDistributionFacet.withdraw(depositId);

    verifyWithdraw(address(this), depositId, 0, amount, operator, beneficiary);
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_notifyRewardAmount(uint256 reward) public {
    reward = bound(reward, rewardDuration, 1e27);
    deal(address(towns), address(rewardsDistributionFacet), reward, true);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit NotifyRewardAmount(owner, reward);

    vm.prank(owner);
    rewardsDistributionFacet.notifyRewardAmount(reward);

    StakingState memory state = rewardsDistributionFacet.stakingState();

    assertEq(
      state.rewardEndTime,
      block.timestamp + rewardDuration,
      "rewardEndTime"
    );
    assertEq(state.lastUpdateTime, block.timestamp, "lastUpdateTime");
    assertEq(
      state.rewardRate,
      reward.fullMulDiv(StakingRewards.SCALE_FACTOR, rewardDuration),
      "rewardRate"
    );
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_claimReward_byBeneficiary(
    address depositor,
    uint96 amount,
    address beneficiary,
    uint256 rewardAmount,
    uint256 timeLapse,
    uint256 seed0,
    uint256 seed1
  ) public {
    address operator0 = randomOperator(seed0);
    address operator1 = randomOperator(seed1);
    vm.assume(
      depositor != address(this) &&
        depositor != address(rewardsDistributionFacet)
    );
    vm.assume(
      beneficiary != operator0 &&
        beneficiary != operator1 &&
        beneficiary != address(this) &&
        beneficiary != address(rewardsDistributionFacet)
    );
    amount = uint96(bound(amount, 1, type(uint96).max - 1 ether));
    timeLapse = bound(timeLapse, 0, rewardDuration);

    test_fuzz_notifyRewardAmount(rewardAmount);
    stake(address(this), 1 ether, address(this), operator0);
    stake(depositor, amount, beneficiary, operator1);

    skip(timeLapse);

    uint256 currentReward = rewardsDistributionFacet.currentReward(beneficiary);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit ClaimReward(beneficiary, beneficiary, currentReward);

    vm.prank(beneficiary);
    uint256 reward = rewardsDistributionFacet.claimReward(
      beneficiary,
      beneficiary
    );

    verifyClaim(beneficiary, beneficiary, reward, currentReward, timeLapse);
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_claimReward_byMainnetDelegator(
    address delegator,
    address claimer,
    uint96 amount,
    uint256 rewardAmount,
    uint256 timeLapse,
    uint256 seed0,
    uint256 seed1
  ) public {
    address operator0 = randomOperator(seed0);
    address operator1 = randomOperator(seed1);
    vm.assume(
      delegator != operator0 &&
        delegator != operator1 &&
        delegator != address(this) &&
        delegator != address(rewardsDistributionFacet)
    );
    vm.assume(
      claimer != address(0) &&
        claimer != delegator &&
        claimer != operator0 &&
        claimer != operator1 &&
        claimer != address(this) &&
        claimer != address(rewardsDistributionFacet)
    );
    amount = uint96(bound(amount, 1, type(uint96).max - 1 ether));
    timeLapse = bound(timeLapse, 0, rewardDuration);

    test_fuzz_notifyRewardAmount(rewardAmount);
    stake(address(this), 1 ether, address(this), operator0);

    setDelegation(delegator, operator1, amount);

    address messenger = IMainnetDelegation(baseRegistry).getMessenger();
    address proxyDelegation = IMainnetDelegation(baseRegistry)
      .getProxyDelegation();

    mockMessenger(messenger, proxyDelegation);
    vm.mockFunction(
      baseRegistry,
      address(mockMainnetDelegation),
      abi.encodePacked(MockMainnetDelegation.setAuthorizedClaimer.selector)
    );
    MockMainnetDelegation(baseRegistry).setAuthorizedClaimer(
      delegator,
      claimer
    );

    skip(timeLapse);

    uint256 currentReward = rewardsDistributionFacet.currentReward(delegator);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit ClaimReward(delegator, delegator, currentReward);

    vm.prank(delegator);
    uint256 reward = rewardsDistributionFacet.claimReward(delegator, delegator);

    verifyClaim(delegator, delegator, reward, currentReward, timeLapse);
  }

  /// forge-config: default.fuzz.runs = 64
  function test_fuzz_claimReward_byOperator(
    uint96 amount,
    uint256 rewardAmount,
    uint256 timeLapse,
    uint256 seed
  ) public {
    address operator = randomOperator(seed);
    timeLapse = bound(timeLapse, 0, rewardDuration);
    amount = uint96(bound(amount, 1 ether, type(uint96).max));

    test_fuzz_notifyRewardAmount(rewardAmount);
    stake(address(this), amount, address(this), operator);

    skip(timeLapse);

    uint256 currentReward = rewardsDistributionFacet.currentReward(operator);

    vm.expectEmit(address(rewardsDistributionFacet));
    emit ClaimReward(operator, operator, currentReward);

    vm.prank(operator);
    uint256 reward = rewardsDistributionFacet.claimReward(operator, operator);

    verifyClaim(operator, operator, reward, currentReward, timeLapse);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           HELPER                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function governanceActions() internal {
    distributionV2Helper = new DeployRewardsDistributionV2();
    address distributionV2Impl = address(new RewardsDistribution());
    address mainnetDelegationImpl = IDiamondLoupe(baseRegistry).facetAddress(
      MainnetDelegation.setProxyDelegation.selector
    );
    address spaceDelegationImpl = IDiamondLoupe(baseRegistry).facetAddress(
      SpaceDelegationFacet.addSpaceDelegation.selector
    );

    // replace the mainnet delegation and space delegation implementations
    vm.etch(mainnetDelegationImpl, type(MainnetDelegation).runtimeCode);
    vm.etch(spaceDelegationImpl, type(SpaceDelegationFacet).runtimeCode);

    FacetCut[] memory facetCuts = new FacetCut[](3);
    facetCuts[0] = distributionV2Helper.makeCut(
      distributionV2Impl,
      FacetCutAction.Add
    );
    bytes4[] memory selectors = new bytes4[](2);
    selectors[0] = SpaceDelegationFacet.setSpaceFactory.selector;
    selectors[1] = SpaceDelegationFacet.getSpaceFactory.selector;
    facetCuts[1] = FacetCut(spaceDelegationImpl, FacetCutAction.Add, selectors);
    selectors = new bytes4[](1);
    selectors[0] = MainnetDelegation.getDepositIdByDelegator.selector;
    facetCuts[2] = FacetCut(
      mainnetDelegationImpl,
      FacetCutAction.Add,
      selectors
    );
    bytes memory initPayload = distributionV2Helper.makeInitData(
      address(towns),
      address(towns),
      rewardDuration
    );

    vm.startPrank(owner);
    IDiamondCut(baseRegistry).diamondCut(
      facetCuts,
      distributionV2Impl,
      initPayload
    );
    rewardsDistributionFacet.setRewardNotifier(owner, true);
    SpaceDelegationFacet(baseRegistry).setSpaceFactory(spaceFactory);
    vm.stopPrank();
  }

  function getActiveOperators() internal {
    address[] memory operators = INodeOperator(baseRegistry).getOperators();
    for (uint256 i; i < operators.length; ++i) {
      NodeOperatorStatus status = INodeOperator(baseRegistry).getOperatorStatus(
        operators[i]
      );
      if (status == NodeOperatorStatus.Active) {
        activeOperators.push(operators[i]);
      }
    }
  }

  function randomOperator(uint256 seed) internal view returns (address) {
    return activeOperators[seed % activeOperators.length];
  }

  function getCommissionRate(address operator) internal view returns (uint256) {
    return INodeOperator(baseRegistry).getCommissionRate(operator);
  }

  function stake(
    address depositor,
    uint96 amount,
    address beneficiary,
    address operator
  ) internal returns (uint256 depositId) {
    vm.assume(depositor != address(0));
    vm.assume(beneficiary != address(0));
    vm.assume(amount > 0);
    deal(address(towns), depositor, amount, true);

    vm.startPrank(depositor);
    towns.approve(address(rewardsDistributionFacet), amount);

    vm.expectEmit(true, true, true, false, address(rewardsDistributionFacet));
    emit Stake(depositor, operator, beneficiary, depositId, amount);

    depositId = rewardsDistributionFacet.stake(amount, operator, beneficiary);
    vm.stopPrank();
  }

  function mockMessenger(address messenger, address proxyDelegation) internal {
    vm.prank(messenger);
    vm.mockCall(
      messenger,
      abi.encodeWithSelector(
        ICrossDomainMessenger.xDomainMessageSender.selector
      ),
      abi.encode(proxyDelegation)
    );
  }

  function setDelegation(
    address delegator,
    address operator,
    uint96 amount
  ) internal {
    address messenger = IMainnetDelegation(baseRegistry).getMessenger();
    address proxyDelegation = IMainnetDelegation(baseRegistry)
      .getProxyDelegation();

    mockMessenger(messenger, proxyDelegation);
    vm.mockFunction(
      baseRegistry,
      address(mockMainnetDelegation),
      abi.encodePacked(MockMainnetDelegation.setDelegation.selector)
    );
    MockMainnetDelegation(baseRegistry).setDelegation(
      delegator,
      operator,
      amount
    );
  }
}

/// @dev Mock contract to include deprecated functions
contract MockMainnetDelegation is MainnetDelegation {
  function setDelegation(
    address delegator,
    address operator,
    uint256 quantity
  ) external onlyCrossDomainMessenger {
    _setDelegation(delegator, operator, quantity);
  }

  function setAuthorizedClaimer(
    address owner,
    address claimer
  ) external onlyCrossDomainMessenger {
    _setAuthorizedClaimer(owner, claimer);
  }
}
