// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceDelegation} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {IERC173} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IRewardsDistributionBase} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SpaceDelegationStorage} from "contracts/src/base/registry/facets/delegation/SpaceDelegationStorage.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {NodeOperatorStorage, NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {StakingRewards} from "contracts/src/base/registry/facets/distribution/v2/StakingRewards.sol";
import {RewardsDistributionStorage} from "contracts/src/base/registry/facets/distribution/v2/RewardsDistributionStorage.sol";

// contracts
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract SpaceDelegationFacet is
  ISpaceDelegation,
  IRewardsDistributionBase,
  OwnableBase,
  Facet
{
  using EnumerableSet for EnumerableSet.AddressSet;
  using StakingRewards for StakingRewards.Layout;

  function __SpaceDelegation_init(
    address riverToken_
  ) external onlyInitializing {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    ds.riverToken = riverToken_;
  }

  modifier onlySpaceOwner(address space) {
    if (!_isValidSpaceOwner(space)) {
      CustomRevert.revertWith(SpaceDelegation__InvalidSpace.selector);
    }
    _;
  }

  /// @inheritdoc ISpaceDelegation
  function addSpaceDelegation(
    address space,
    address operator
  ) external onlySpaceOwner(space) {
    if (operator == address(0))
      CustomRevert.revertWith(SpaceDelegation__InvalidAddress.selector);

    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

    address currentOperator = ds.operatorBySpace[space];

    if (currentOperator == operator)
      CustomRevert.revertWith(SpaceDelegation__AlreadyDelegated.selector);

    NodeOperatorStorage.Layout storage nodeOperatorDs = NodeOperatorStorage
      .layout();

    // check if the operator is valid
    if (!nodeOperatorDs.operators.contains(operator))
      CustomRevert.revertWith(SpaceDelegation__InvalidOperator.selector);

    // check if operator is not exiting
    if (nodeOperatorDs.statusByOperator[operator] == NodeOperatorStatus.Exiting)
      CustomRevert.revertWith(SpaceDelegation__InvalidOperator.selector);

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
    if (space == address(0))
      CustomRevert.revertWith(SpaceDelegation__InvalidAddress.selector);

    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

    address operator = ds.operatorBySpace[space];

    if (operator == address(0)) {
      CustomRevert.revertWith(SpaceDelegation__InvalidAddress.selector);
    }

    _sweepSpaceRewardsIfNecessary(space, operator);

    ds.operatorBySpace[space] = address(0);
    ds.spacesByOperator[operator].remove(space);
    ds.spaceDelegationTime[space] = 0;

    emit SpaceDelegatedToOperator(space, address(0));
  }

  /// @inheritdoc ISpaceDelegation
  function getSpaceDelegation(address space) external view returns (address) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    return ds.operatorBySpace[space];
  }

  /// @inheritdoc ISpaceDelegation
  function getSpaceDelegationsByOperator(
    address operator
  ) external view returns (address[] memory) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    return ds.spacesByOperator[operator].values();
  }

  // =============================================================
  //                           Token
  // =============================================================

  /// @inheritdoc ISpaceDelegation
  function setRiverToken(address newToken) external onlyOwner {
    if (newToken == address(0))
      CustomRevert.revertWith(SpaceDelegation__InvalidAddress.selector);

    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

    ds.riverToken = newToken;
    emit RiverTokenChanged(newToken);
  }

  /// @inheritdoc ISpaceDelegation
  function riverToken() external view returns (address) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    return ds.riverToken;
  }

  // =============================================================
  //                      Mainnet Delegation
  // =============================================================

  /// @inheritdoc ISpaceDelegation
  function setMainnetDelegation(address newDelegation) external onlyOwner {
    if (newDelegation == address(0))
      CustomRevert.revertWith(SpaceDelegation__InvalidAddress.selector);

    SpaceDelegationStorage.layout().mainnetDelegation = newDelegation;
    emit MainnetDelegationChanged(newDelegation);
  }

  /// @inheritdoc ISpaceDelegation
  function mainnetDelegation() external view returns (address) {
    return SpaceDelegationStorage.layout().mainnetDelegation;
  }

  // =============================================================
  //                           Stake
  // =============================================================

  /// @inheritdoc ISpaceDelegation
  function getTotalDelegation(
    address operator
  ) external view returns (uint256) {
    return _getTotalDelegation(operator);
  }

  /// @inheritdoc ISpaceDelegation
  function setStakeRequirement(uint256 newRequirement) external onlyOwner {
    if (newRequirement == 0)
      CustomRevert.revertWith(
        SpaceDelegation__InvalidStakeRequirement.selector
      );

    SpaceDelegationStorage.layout().stakeRequirement = newRequirement;
    emit StakeRequirementChanged(newRequirement);
  }

  /// @inheritdoc ISpaceDelegation
  function stakeRequirement() external view returns (uint256) {
    return SpaceDelegationStorage.layout().stakeRequirement;
  }

  // =============================================================
  //                           Space Factory
  // =============================================================

  /// @inheritdoc ISpaceDelegation
  function setSpaceFactory(address spaceFactory) external onlyOwner {
    if (spaceFactory == address(0))
      CustomRevert.revertWith(SpaceDelegation__InvalidAddress.selector);

    SpaceDelegationStorage.layout().spaceFactory = spaceFactory;
    emit SpaceFactoryChanged(spaceFactory);
  }

  /// @inheritdoc ISpaceDelegation
  function getSpaceFactory() public view returns (address) {
    return SpaceDelegationStorage.layout().spaceFactory;
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /// @dev Sweeps the rewards in the space delegation to the operator if necessary
  function _sweepSpaceRewardsIfNecessary(
    address space,
    address currentOperator
  ) internal {
    StakingRewards.Layout storage staking = RewardsDistributionStorage
      .layout()
      .staking;
    StakingRewards.Treasure storage spaceTreasure = staking
      .treasureByBeneficiary[space];

    staking.updateGlobalReward();
    staking.updateReward(spaceTreasure);

    uint256 reward = spaceTreasure.unclaimedRewardSnapshot;
    if (reward == 0) return;

    // forfeit the rewards if the space has undelegated
    if (currentOperator != address(0)) {
      StakingRewards.Treasure storage operatorTreasure = staking
        .treasureByBeneficiary[currentOperator];
      operatorTreasure.unclaimedRewardSnapshot += reward;
    }
    spaceTreasure.unclaimedRewardSnapshot = 0;

    emit SpaceRewardsSwept(space, currentOperator, reward);
  }

  function _getTotalDelegation(
    address operator
  ) internal view returns (uint256) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    (address riverToken_, address mainnetDelegation_) = (
      ds.riverToken,
      ds.mainnetDelegation
    );
    if (riverToken_ == address(0) || mainnetDelegation_ == address(0)) return 0;

    // get the delegation from the mainnet delegation
    uint256 delegation = IMainnetDelegation(mainnetDelegation_)
      .getDelegatedStakeByOperator(operator);

    // get the delegation from the base delegation
    address[] memory baseDelegators = IVotesEnumerable(riverToken_)
      .getDelegatorsByDelegatee(operator);
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

  function _isValidSpaceOwner(address space) internal view returns (bool) {
    return
      IArchitect(getSpaceFactory()).getTokenIdBySpace(space) > 0 &&
      IERC173(space).owner() == msg.sender;
  }
}
