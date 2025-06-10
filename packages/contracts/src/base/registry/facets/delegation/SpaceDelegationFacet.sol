// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IArchitect} from "../../../../factory/facets/architect/IArchitect.sol";
import {IVotesEnumerable} from "../../../../diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";
import {IMainnetDelegation} from "../mainnet/IMainnetDelegation.sol";
import {IRewardsDistributionBase} from "../distribution/v2/IRewardsDistribution.sol";
import {ISpaceDelegation} from "./ISpaceDelegation.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {NodeOperatorStatus, NodeOperatorStorage} from "../operator/NodeOperatorStorage.sol";
import {RewardsDistributionStorage} from "../distribution/v2/RewardsDistributionStorage.sol";
import {StakingRewards} from "../distribution/v2/StakingRewards.sol";
import {SpaceDelegationStorage} from "./SpaceDelegationStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract SpaceDelegationFacet is ISpaceDelegation, OwnableBase, Facet {
    using EnumerableSet for EnumerableSet.AddressSet;
    using StakingRewards for StakingRewards.Layout;
    using CustomRevert for bytes4;

    modifier onlySpaceOwner(address space) {
        if (!_isValidSpace(space)) SpaceDelegation__InvalidSpace.selector.revertWith();
        if (!_isValidSpaceOwner(space)) SpaceDelegation__InvalidSpace.selector.revertWith();
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         DELEGATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISpaceDelegation
    function addSpaceDelegation(address space, address operator) external onlySpaceOwner(space) {
        if (operator == address(0)) SpaceDelegation__InvalidAddress.selector.revertWith();

        SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

        address currentOperator = ds.operatorBySpace[space];

        if (currentOperator == operator) SpaceDelegation__AlreadyDelegated.selector.revertWith();

        NodeOperatorStorage.Layout storage nodeOperatorDs = NodeOperatorStorage.layout();

        // check if the operator is valid
        if (!nodeOperatorDs.operators.contains(operator))
            SpaceDelegation__InvalidOperator.selector.revertWith();

        // check if operator is not exiting
        if (nodeOperatorDs.statusByOperator[operator] == NodeOperatorStatus.Exiting)
            SpaceDelegation__InvalidOperator.selector.revertWith();

        _sweepSpaceRewardsIfNecessary(space, currentOperator);

        // remove the space from the current operator
        ds.spacesByOperator[currentOperator].remove(space);

        // overwrite the operator for this space
        ds.operatorBySpace[space] = operator;

        // add the space to this new operator array
        ds.spacesByOperator[operator].add(space);
        ds.spaceDelegationTime[space] = block.timestamp;

        emit SpaceDelegatedToOperator(space, operator);
    }

    /// @inheritdoc ISpaceDelegation
    function removeSpaceDelegation(address space) external onlySpaceOwner(space) {
        if (space == address(0)) SpaceDelegation__InvalidAddress.selector.revertWith();

        SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

        address operator = ds.operatorBySpace[space];

        if (operator == address(0)) SpaceDelegation__NotDelegated.selector.revertWith();

        _sweepSpaceRewardsIfNecessary(space, operator);

        ds.operatorBySpace[space] = address(0);
        ds.spacesByOperator[operator].remove(space);
        ds.spaceDelegationTime[space] = 0;

        emit SpaceDelegatedToOperator(space, address(0));
    }

    /// @inheritdoc ISpaceDelegation
    function getSpaceDelegation(address space) external view returns (address) {
        return SpaceDelegationStorage.layout().operatorBySpace[space];
    }

    /// @inheritdoc ISpaceDelegation
    function getSpaceDelegationsByOperator(
        address operator
    ) external view returns (address[] memory) {
        return SpaceDelegationStorage.layout().spacesByOperator[operator].values();
    }

    /// @inheritdoc ISpaceDelegation
    function getTotalDelegation(address operator) external view returns (uint256) {
        return _getTotalDelegation(operator);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FACTORY                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISpaceDelegation
    function setSpaceFactory(address spaceFactory) external onlyOwner {
        if (spaceFactory == address(0)) SpaceDelegation__InvalidAddress.selector.revertWith();

        SpaceDelegationStorage.layout().spaceFactory = spaceFactory;
        emit SpaceFactoryChanged(spaceFactory);
    }

    /// @inheritdoc ISpaceDelegation
    function getSpaceFactory() public view returns (address) {
        return SpaceDelegationStorage.layout().spaceFactory;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Sweeps the rewards in the space delegation to the operator if necessary
    function _sweepSpaceRewardsIfNecessary(address space, address currentOperator) internal {
        StakingRewards.Layout storage staking = RewardsDistributionStorage.layout().staking;
        StakingRewards.Treasure storage spaceTreasure = staking.treasureByBeneficiary[space];

        staking.updateGlobalReward();
        staking.updateReward(spaceTreasure);

        uint256 reward = spaceTreasure.unclaimedRewardSnapshot;
        if (reward == 0) return;

        // forfeit the rewards if the space has undelegated
        if (currentOperator != address(0)) {
            StakingRewards.Treasure storage operatorTreasure = staking.treasureByBeneficiary[
                currentOperator
            ];
            operatorTreasure.unclaimedRewardSnapshot += reward;
        }
        spaceTreasure.unclaimedRewardSnapshot = 0;

        emit IRewardsDistributionBase.SpaceRewardsSwept(space, currentOperator, reward);
    }

    function _getTotalDelegation(address operator) internal view returns (uint256) {
        SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
        (address riverToken_, address mainnetDelegation_) = (ds.riverToken, ds.mainnetDelegation);
        if (riverToken_ == address(0) || mainnetDelegation_ == address(0)) return 0;

        // get the delegation from the mainnet delegation
        uint256 delegation = IMainnetDelegation(mainnetDelegation_).getDelegatedStakeByOperator(
            operator
        );

        // get the delegation from the base delegation
        address[] memory baseDelegators = IVotesEnumerable(riverToken_).getDelegatorsByDelegatee(
            operator
        );
        for (uint256 i; i < baseDelegators.length; ++i) {
            delegation += IERC20(riverToken_).balanceOf(baseDelegators[i]);
        }

        address[] memory spaces = ds.spacesByOperator[operator].values();

        for (uint256 i; i < spaces.length; ++i) {
            address[] memory usersDelegatingToSpace = IVotesEnumerable(riverToken_)
                .getDelegatorsByDelegatee(spaces[i]);

            for (uint256 j; j < usersDelegatingToSpace.length; ++j) {
                delegation += IERC20(riverToken_).balanceOf(usersDelegatingToSpace[j]);
            }
        }

        return delegation;
    }

    /// @dev Checks if the space is valid by verifying if it has a nonzero token ID in the factory
    function _isValidSpace(address space) internal view returns (bool) {
        return IArchitect(getSpaceFactory()).getTokenIdBySpace(space) != 0;
    }

    /// @dev Checks if the caller is the owner of the space
    /// @dev Assumes that the space is valid
    function _isValidSpaceOwner(address space) internal view returns (bool) {
        return IERC173(space).owner() == msg.sender;
    }
}
