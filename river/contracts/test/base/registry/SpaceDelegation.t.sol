// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
import {ISpaceDelegationBase} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {StakingRewards} from "contracts/src/base/registry/facets/distribution/v2/StakingRewards.sol";

// contracts
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";
import {BaseRegistryTest} from "./BaseRegistry.t.sol";

contract SpaceDelegationTest is
  BaseRegistryTest,
  IOwnableBase,
  ISpaceDelegationBase
{
  using FixedPointMathLib for uint256;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       ADD DELEGATION                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_addSpaceDelegation_revertIf_invalidSpace() public {
    vm.expectRevert(SpaceDelegation__InvalidSpace.selector);
    spaceDelegationFacet.addSpaceDelegation(address(this), OPERATOR);
  }

  function test_addSpaceDelegation_revertIf_alreadyDelegated() public {
    space = deploySpace(deployer);
    vm.prank(deployer);
    spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);

    vm.expectRevert(SpaceDelegation__AlreadyDelegated.selector);
    vm.prank(deployer);
    spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);
  }

  function test_addSpaceDelegation_revertIf_invalidOperator() public {
    space = deploySpace(deployer);
    vm.expectRevert(SpaceDelegation__InvalidOperator.selector);
    vm.prank(deployer);
    spaceDelegationFacet.addSpaceDelegation(space, address(this));
  }

  function test_fuzz_addSpaceDelegation(
    address operator,
    uint256 commissionRate
  ) public givenOperator(operator, commissionRate) returns (address space) {
    space = deploySpace(deployer);

    vm.prank(deployer);
    spaceDelegationFacet.addSpaceDelegation(space, operator);

    address assignedOperator = spaceDelegationFacet.getSpaceDelegation(space);
    assertEq(assignedOperator, operator, "Space delegation failed");
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     REPLACE DELEGATION                     */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_fuzz_addSpaceDelegation_replace(
    address[2] memory operators,
    uint256[2] memory commissionRates,
    uint256 rewardAmount,
    uint256 timeLapse
  ) public givenOperator(operators[1], commissionRates[1]) {
    vm.assume(operators[0] != operators[1]);
    commissionRates[0] = bound(commissionRates[0], 1, 10000);
    address space = test_fuzz_addSpaceDelegation(
      operators[0],
      commissionRates[0]
    );

    rewardAmount = boundReward(rewardAmount);
    bridgeTokensForUser(address(rewardsDistributionFacet), rewardAmount);

    vm.prank(NOTIFIER);
    rewardsDistributionFacet.notifyRewardAmount(rewardAmount);

    uint96 amount = 1 ether;
    bridgeTokensForUser(address(this), amount);

    towns.approve(address(rewardsDistributionFacet), amount);
    rewardsDistributionFacet.stake(amount, space, address(this));

    timeLapse = bound(timeLapse, 1, rewardDuration);
    vm.warp(block.timestamp + timeLapse);

    vm.expectEmit(true, true, true, false, address(spaceDelegationFacet));
    emit SpaceRewardsSwept(space, operators[0], 0);

    vm.prank(deployer);
    spaceDelegationFacet.addSpaceDelegation(space, operators[1]);

    verifySweep(space, operators[0], amount, commissionRates[0], timeLapse);
  }

  function test_fuzz_addSpaceDelegation_forfeitRewardsIfUndelegated(
    address operator,
    uint256 commissionRate,
    uint256 rewardAmount,
    uint256 timeLapse
  ) public {
    vm.assume(operator != OPERATOR);
    commissionRate = bound(commissionRate, 1, 10000);
    address space = test_fuzz_addSpaceDelegation(operator, commissionRate);

    rewardAmount = boundReward(rewardAmount);
    bridgeTokensForUser(address(rewardsDistributionFacet), rewardAmount);

    vm.prank(NOTIFIER);
    rewardsDistributionFacet.notifyRewardAmount(rewardAmount);

    uint96 amount = 1 ether;
    bridgeTokensForUser(address(this), amount);

    towns.approve(address(rewardsDistributionFacet), amount);
    rewardsDistributionFacet.stake(amount, space, address(this));

    // remove delegation and forfeit rewards
    vm.prank(deployer);
    spaceDelegationFacet.removeSpaceDelegation(space);

    timeLapse = bound(timeLapse, 1, rewardDuration);
    vm.warp(block.timestamp + timeLapse);

    assertGe(rewardsDistributionFacet.currentReward(space), 0);

    vm.prank(deployer);
    spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);

    StakingState memory state = rewardsDistributionFacet.stakingState();
    StakingRewards.Treasure memory spaceTreasure = rewardsDistributionFacet
      .treasureByBeneficiary(space);

    // verify forfeited rewards
    assertEq(spaceTreasure.earningPower, (amount * commissionRate) / 10000);
    assertEq(
      spaceTreasure.rewardPerTokenAccumulated,
      state.rewardPerTokenAccumulated
    );
    assertEq(spaceTreasure.unclaimedRewardSnapshot, 0);

    assertEq(
      rewardsDistributionFacet
        .treasureByBeneficiary(operator)
        .unclaimedRewardSnapshot,
      0
    );
    assertEq(
      rewardsDistributionFacet
        .treasureByBeneficiary(OPERATOR)
        .unclaimedRewardSnapshot,
      0
    );
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                      REMOVE DELEGATION                     */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_removeSpaceDelegation_revertIf_invalidSpace() public {
    vm.expectRevert(SpaceDelegation__InvalidSpace.selector);
    spaceDelegationFacet.removeSpaceDelegation(address(0));
  }

  function test_fuzz_removeSpaceDelegation(
    address operator,
    uint256 commissionRate,
    uint256 rewardAmount,
    uint256 timeLapse
  ) public {
    commissionRate = bound(commissionRate, 1, 10000);
    address space = test_fuzz_addSpaceDelegation(operator, commissionRate);

    rewardAmount = boundReward(rewardAmount);
    bridgeTokensForUser(address(rewardsDistributionFacet), rewardAmount);

    vm.prank(NOTIFIER);
    rewardsDistributionFacet.notifyRewardAmount(rewardAmount);

    uint96 amount = 1 ether;
    bridgeTokensForUser(address(this), amount);

    towns.approve(address(rewardsDistributionFacet), amount);
    rewardsDistributionFacet.stake(amount, space, address(this));

    timeLapse = bound(timeLapse, 1, rewardDuration);
    vm.warp(block.timestamp + timeLapse);

    vm.expectEmit(true, true, true, false, address(spaceDelegationFacet));
    emit SpaceRewardsSwept(space, operator, 0);

    vm.prank(deployer);
    spaceDelegationFacet.removeSpaceDelegation(space);

    address afterRemovalOperator = spaceDelegationFacet.getSpaceDelegation(
      space
    );
    assertEq(afterRemovalOperator, address(0), "Space removal failed");

    verifySweep(space, operator, amount, commissionRate, timeLapse);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           GETTERS                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_fuzz_getSpaceDelegationsByOperator(address operator) public {
    address space1 = test_fuzz_addSpaceDelegation(operator, 0);
    address space2 = test_fuzz_addSpaceDelegation(operator, 0);

    address[] memory spaces = spaceDelegationFacet
      .getSpaceDelegationsByOperator(operator);

    assertEq(spaces.length, 2);
    assertEq(spaces[0], space1);
    assertEq(spaces[1], space2);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           SETTERS                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_setRiverToken_revertIf_notOwner() public {
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    spaceDelegationFacet.setRiverToken(address(0));
  }

  function test_fuzz_setRiverToken(address newToken) public {
    vm.assume(newToken != address(0));

    vm.expectEmit(address(spaceDelegationFacet));
    emit RiverTokenChanged(newToken);

    vm.prank(deployer);
    spaceDelegationFacet.setRiverToken(newToken);

    address retrievedToken = spaceDelegationFacet.riverToken();
    assertEq(retrievedToken, newToken);
  }

  function test_fuzz_setSpaceFactory_revertIf_notOwner() public {
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, address(this))
    );
    spaceDelegationFacet.setSpaceFactory(address(0));
  }

  function test_fuzz_setSpaceFactory(address newSpaceFactory) public {
    vm.assume(newSpaceFactory != address(0));

    vm.prank(deployer);
    spaceDelegationFacet.setSpaceFactory(newSpaceFactory);

    address retrievedFactory = spaceDelegationFacet.getSpaceFactory();
    assertEq(retrievedFactory, newSpaceFactory);
  }
}
