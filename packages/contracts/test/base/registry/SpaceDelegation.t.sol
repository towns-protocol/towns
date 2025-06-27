// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ISpaceDelegationBase} from "src/base/registry/facets/delegation/ISpaceDelegation.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// libraries
import {NodeOperatorStatus} from "src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {StakingRewards} from "src/base/registry/facets/distribution/v2/StakingRewards.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts

import {BaseRegistryTest} from "./BaseRegistry.t.sol";
import {SpaceDelegationFacet} from "src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

contract SpaceDelegationTest is BaseRegistryTest, IOwnableBase, ISpaceDelegationBase {
    using FixedPointMathLib for uint256;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADD DELEGATION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_addSpaceDelegation_revertIf_invalidSpace() public {
        vm.expectRevert(SpaceDelegation__InvalidSpace.selector);
        spaceDelegationFacet.addSpaceDelegation(address(this), OPERATOR);
    }

    function test_addSpaceDelegation_revertIf_alreadyDelegated() public givenSpaceIsDeployed {
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);

        vm.expectRevert(SpaceDelegation__AlreadyDelegated.selector);
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);
    }

    function test_addSpaceDelegation_revertIf_invalidOperator() public givenSpaceIsDeployed {
        vm.expectRevert(SpaceDelegation__InvalidOperator.selector);
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(space, address(this));
    }

    function test_addSpaceDelegation_revertIf_operatorExiting() public givenSpaceIsDeployed {
        // Set operator status to Exiting
        vm.prank(deployer);
        operatorFacet.setOperatorStatus(OPERATOR, NodeOperatorStatus.Exiting);

        vm.expectRevert(SpaceDelegation__InvalidOperator.selector);
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);
    }

    function test_addSpaceDelegation_ownerCanDelegateUndelegatedSpace()
        public
        givenSpaceIsDeployed
    {
        // Owner should be able to delegate undelegated space (owner is considered a member)
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);

        address assignedOperator = spaceDelegationFacet.getSpaceDelegation(space);
        assertEq(assignedOperator, OPERATOR, "Owner delegation failed");
    }

    function test_addSpaceDelegation_memberCanDelegateUndelegatedSpace(
        address member
    ) public assumeEOA(member) {
        // Member should not be the space owner
        vm.assume(member != deployer);

        // Deploy an "everyone" space that allows anyone to join
        address everyoneSpace = deployEveryoneSpace(deployer);

        // Make the fuzzed address a member by joining the space
        vm.prank(member);
        IMembership(everyoneSpace).joinSpace(member);

        // Verify member has at least one token
        assertGt(
            IERC721(everyoneSpace).balanceOf(member),
            0,
            "Member should have membership token"
        );

        // Member should be able to delegate undelegated space
        vm.prank(member);
        spaceDelegationFacet.addSpaceDelegation(everyoneSpace, OPERATOR);

        address assignedOperator = spaceDelegationFacet.getSpaceDelegation(everyoneSpace);
        assertEq(assignedOperator, OPERATOR, "Member delegation failed");
    }

    function test_addSpaceDelegation_revertIf_nonMemberCannotDelegateUndelegatedSpace(
        address nonMember
    ) public assumeEOA(nonMember) {
        // Non-member should not be the space owner
        vm.assume(nonMember != deployer);

        // Deploy an "everyone" space but don't make the non-member join
        address everyoneSpace = deployEveryoneSpace(deployer);

        // Verify non-member has no tokens (they haven't joined)
        assertEq(
            IERC721(everyoneSpace).balanceOf(nonMember),
            0,
            "Non-member should have no tokens"
        );

        vm.expectRevert(SpaceDelegation__NotSpaceMember.selector);
        vm.prank(nonMember);
        spaceDelegationFacet.addSpaceDelegation(everyoneSpace, OPERATOR);
    }

    function test_addSpaceDelegation_revertIf_nonOwnerCannotChangeDelegation(
        address nonOwner
    ) public givenSpaceIsDeployed assumeEOA(nonOwner) {
        // Non-owner should not be the space owner
        vm.assume(nonOwner != deployer);

        // Owner delegates first
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);

        // Create second operator
        address operator2 = makeAddr("operator2");
        setOperator(operator2, 5000);

        // Non-owner should not be able to change delegation
        vm.expectRevert(SpaceDelegation__NotSpaceOwner.selector);
        vm.prank(nonOwner);
        spaceDelegationFacet.addSpaceDelegation(space, operator2);
    }

    function test_addSpaceDelegation_revertIf_memberCannotRedelegateAfterOwnerRemoval(
        address member
    ) public assumeEOA(member) {
        // Member should not be the space owner
        vm.assume(member != deployer);

        // Deploy an "everyone" space that allows anyone to join
        address everyoneSpace = deployEveryoneSpace(deployer);

        // Make the fuzzed address a member by joining the space
        vm.prank(member);
        IMembership(everyoneSpace).joinSpace(member);

        // Owner delegates first
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(everyoneSpace, OPERATOR);

        // Owner removes delegation
        vm.prank(deployer);
        spaceDelegationFacet.removeSpaceDelegation(everyoneSpace);

        // Verify space is no longer delegated
        address currentOperator = spaceDelegationFacet.getSpaceDelegation(everyoneSpace);
        assertEq(currentOperator, address(0), "Space should not be delegated after removal");

        // Create second operator
        address operator2 = makeAddr("operator2");
        setOperator(operator2, 5000);

        // Member should NOT be able to redelegate after owner explicitly removed delegation
        vm.expectRevert(SpaceDelegation__NotSpaceOwner.selector);
        vm.prank(member);
        spaceDelegationFacet.addSpaceDelegation(everyoneSpace, operator2);

        // But owner should still be able to redelegate
        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(everyoneSpace, operator2);

        address finalOperator = spaceDelegationFacet.getSpaceDelegation(everyoneSpace);
        assertEq(finalOperator, operator2, "Owner should be able to redelegate");
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
        commissionRates[0] = bound(commissionRates[0], 1, 10_000);
        address space = test_fuzz_addSpaceDelegation(operators[0], commissionRates[0]);

        rewardAmount = boundReward(rewardAmount);
        bridgeTokensForUser(address(rewardsDistributionFacet), rewardAmount);

        vm.prank(NOTIFIER);
        rewardsDistributionFacet.notifyRewardAmount(rewardAmount);

        uint96 amount = 1 ether;
        bridgeTokensForUser(address(this), amount);

        towns.approve(address(rewardsDistributionFacet), amount);
        rewardsDistributionFacet.stake(amount, space, address(this));

        timeLapse = bound(timeLapse, 1, rewardDuration);
        skip(timeLapse);

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
        commissionRate = bound(commissionRate, 1, 10_000);
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
        skip(timeLapse);

        assertGe(rewardsDistributionFacet.currentReward(space), 0);

        vm.prank(deployer);
        spaceDelegationFacet.addSpaceDelegation(space, OPERATOR);

        StakingState memory state = rewardsDistributionFacet.stakingState();
        StakingRewards.Treasure memory spaceTreasure = rewardsDistributionFacet
            .treasureByBeneficiary(space);

        // verify forfeited rewards
        assertEq(spaceTreasure.earningPower, (amount * commissionRate) / 10_000);
        assertEq(spaceTreasure.rewardPerTokenAccumulated, state.rewardPerTokenAccumulated);
        assertEq(spaceTreasure.unclaimedRewardSnapshot, 0);

        assertEq(
            rewardsDistributionFacet.treasureByBeneficiary(operator).unclaimedRewardSnapshot,
            0
        );
        assertEq(
            rewardsDistributionFacet.treasureByBeneficiary(OPERATOR).unclaimedRewardSnapshot,
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

    function test_removeSpaceDelegation_revertIf_notDelegated() public givenSpaceIsDeployed {
        vm.expectRevert(SpaceDelegation__NotDelegated.selector);
        vm.prank(deployer);
        spaceDelegationFacet.removeSpaceDelegation(space);
    }

    function test_fuzz_removeSpaceDelegation(
        address operator,
        uint256 commissionRate,
        uint256 rewardAmount,
        uint256 timeLapse
    ) public {
        commissionRate = bound(commissionRate, 1, 10_000);
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
        skip(timeLapse);

        vm.expectEmit(true, true, true, false, address(spaceDelegationFacet));
        emit SpaceRewardsSwept(space, operator, 0);

        vm.prank(deployer);
        spaceDelegationFacet.removeSpaceDelegation(space);

        address afterRemovalOperator = spaceDelegationFacet.getSpaceDelegation(space);
        assertEq(afterRemovalOperator, address(0), "Space removal failed");

        verifySweep(space, operator, amount, commissionRate, timeLapse);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           GETTERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_fuzz_getSpaceDelegationsByOperator(address operator) public {
        address space1 = test_fuzz_addSpaceDelegation(operator, 0);
        address space2 = test_fuzz_addSpaceDelegation(operator, 0);

        address[] memory spaces = spaceDelegationFacet.getSpaceDelegationsByOperator(operator);

        assertEq(spaces.length, 2);
        assertEq(spaces[0], space1);
        assertEq(spaces[1], space2);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           SETTERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_fuzz_setSpaceFactory_revertIf_notOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        spaceDelegationFacet.setSpaceFactory(address(0));
    }

    function test_setSpaceFactory_revertIf_invalidAddress() public {
        vm.expectRevert(SpaceDelegation__InvalidAddress.selector);
        vm.prank(deployer);
        spaceDelegationFacet.setSpaceFactory(address(0));
    }

    function test_fuzz_setSpaceFactory(address newSpaceFactory) public {
        vm.assume(newSpaceFactory != address(0));

        vm.prank(deployer);
        spaceDelegationFacet.setSpaceFactory(newSpaceFactory);

        address retrievedFactory = spaceDelegationFacet.getSpaceFactory();
        assertEq(retrievedFactory, newSpaceFactory);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            UTILS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Deploys a space that allows everyone to join (for membership testing)
    function deployEveryoneSpace(address _deployer) internal returns (address _space) {
        IArchitectBase.SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(
            string(abi.encode(_randomUint256()))
        );
        spaceInfo.membership.settings.pricingModule = pricingModule;
        spaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;
        vm.prank(_deployer);
        _space = ICreateSpace(spaceFactory).createSpace(spaceInfo);
    }
}
