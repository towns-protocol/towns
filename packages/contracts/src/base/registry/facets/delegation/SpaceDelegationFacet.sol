// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
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
        if (!_isValidSpaceOwner(space)) SpaceDelegation__NotSpaceOwner.selector.revertWith();
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         DELEGATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @inheritdoc ISpaceDelegation
     * @dev Delegates a space to a node operator for reward distribution.
     * Authorization logic:
     * - Only space members can delegate a space that has never been delegated
     * - Only the space owner can delegate/redelegate once the space has been delegated before
     *
     * Process:
     * 1. Validates operator address and space existence
     * 2. Checks operator is registered and not exiting
     * 3. Validates caller is member (for never delegated) or owner (for previously delegated)
     * 4. Sweeps any pending rewards from previous delegation
     * 5. Updates storage mappings and delegation timestamp
     * 6. Emits SpaceDelegatedToOperator event
     */
    function addSpaceDelegation(address space, address operator) external {
        if (operator == address(0)) SpaceDelegation__InvalidAddress.selector.revertWith();

        // validate that the space exists
        if (!_isValidSpace(space)) SpaceDelegation__InvalidSpace.selector.revertWith();

        SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

        address currentOperator = ds.operatorBySpace[space];

        if (currentOperator == operator) SpaceDelegation__AlreadyDelegated.selector.revertWith();

        // Authorization logic: only members can delegate if space has never been delegated,
        // only owner can delegate/redelegate if space has been delegated before (even if removed)
        if (ds.spaceDelegationTime[space] != 0) {
            // space has been delegated before (even if currently removed), only owner can delegate
            if (!_isValidSpaceOwner(space)) SpaceDelegation__NotSpaceOwner.selector.revertWith();
        } else {
            // Space has never been delegated, only members can delegate
            if (!_isValidSpaceMember(space)) SpaceDelegation__NotSpaceMember.selector.revertWith();
        }

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

    /**
     * @inheritdoc ISpaceDelegation
     * @dev Removes delegation from a space, returning it to an undelegated state.
     * Only the space owner can call this function.
     * Note: The delegation timestamp is preserved to maintain history that the space
     * was delegated before, ensuring only the owner can redelegate.
     *
     * Process:
     * 1. Validates space address and delegation existence
     * 2. Sweeps any pending rewards to the current operator
     * 3. Clears operator mappings but preserves delegation timestamp
     * 4. Emits SpaceDelegatedToOperator event with address(0)
     */
    function removeSpaceDelegation(address space) external onlySpaceOwner(space) {
        if (space == address(0)) SpaceDelegation__InvalidAddress.selector.revertWith();

        SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

        address operator = ds.operatorBySpace[space];

        if (operator == address(0)) SpaceDelegation__NotDelegated.selector.revertWith();

        _sweepSpaceRewardsIfNecessary(space, operator);

        ds.operatorBySpace[space] = address(0);
        ds.spacesByOperator[operator].remove(space);
        // don't reset spaceDelegationTime to preserve delegation history

        emit SpaceDelegatedToOperator(space, address(0));
    }

    /// @inheritdoc ISpaceDelegation
    function setSpaceFactory(address spaceFactory) external onlyOwner {
        if (spaceFactory == address(0)) SpaceDelegation__InvalidAddress.selector.revertWith();

        SpaceDelegationStorage.layout().spaceFactory = spaceFactory;
        emit SpaceFactoryChanged(spaceFactory);
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

    /// @inheritdoc ISpaceDelegation
    function getSpaceFactory() public view returns (address) {
        return SpaceDelegationStorage.layout().spaceFactory;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Sweeps the rewards in the space delegation to the operator if necessary
    /// @dev Handles two scenarios:
    /// 1. If currentOperator exists: transfers accumulated rewards to the current operator
    ///    (rewards earned while the space was delegated to them)
    /// 2. If no currentOperator: forfeits accumulated rewards (clears unallocated rewards from
    ///    existing stakes after undelegation that shouldn't go to a new operator)
    /// @param space The space address to sweep rewards from
    /// @param currentOperator The current operator (address(0) if undelegated)
    function _sweepSpaceRewardsIfNecessary(address space, address currentOperator) internal {
        StakingRewards.Layout storage staking = RewardsDistributionStorage.layout().staking;

        uint256 reward;
        if (currentOperator != address(0)) {
            // transfer rewards from space to current operator
            reward = staking.transferReward(space, currentOperator);
        } else {
            // forfeit rewards (clear without transfer)
            reward = staking.sweepReward(space);
        }

        if (reward != 0) {
            emit IRewardsDistributionBase.SpaceRewardsSwept(space, currentOperator, reward);
        }
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

    /// @dev Checks if the caller is a member of the space (has at least one membership token)
    /// @dev Also considers the space owner as a member
    /// @dev Assumes that the space is valid
    function _isValidSpaceMember(address space) internal view returns (bool) {
        // Check if caller is the space owner
        if (IERC173(space).owner() == msg.sender) return true;

        // Check if caller has at least one membership token
        return IERC721(space).balanceOf(msg.sender) != 0;
    }
}
