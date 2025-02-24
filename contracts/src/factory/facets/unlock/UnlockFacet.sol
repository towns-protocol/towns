// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IUnlock} from "./IUnlock.sol";
import {UnlockStorage} from "./UnlockStorage.sol";
import {UnlockConditionLib} from "./UnlockConditionLib.sol";
import {SpaceUnlockStatusLib} from "./SpaceUnlockStatusLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {IRewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";
import {ImplementationRegistryStorage} from "contracts/src/factory/facets/registry/ImplementationRegistryStorage.sol";

contract UnlockFacet is IUnlock, OwnableBase, Facet {
  using UnlockConditionLib for UnlockConditionLib.UnlockCondition;
  using SpaceUnlockStatusLib for SpaceUnlockStatusLib.SpaceUnlockStatus;
  using CustomRevert for bytes4;

  bytes32 public constant COMMUNITY_REWARDS = keccak256("COMMUNITY_REWARDS");
  bytes32 public constant EXTENDED_STAKING = keccak256("EXTENDED_STAKING");
  bytes32 public constant ERC20_TIPPING = keccak256("ERC20_TIPPING");

  bytes32 public constant BASE_REGISTRY = bytes32("SpaceOperator");

  function __Unlock_init() external onlyInitializing {
    _addInterface(type(IUnlock).interfaceId);
  }

  function setUnlockCondition(
    bytes32 featureId,
    UnlockConditionLib.UnlockCondition calldata condition
  ) external onlyOwner {
    UnlockStorage.Layout storage l = UnlockStorage.layout();
    UnlockConditionLib.UnlockCondition storage storedCondition = l
      .unlockConditions[featureId];

    storedCondition.threshold = condition.threshold;
    storedCondition.durationRequired = condition.durationRequired;
    storedCondition.active = condition.active;
    storedCondition.extraData = condition.extraData;

    if (!storedCondition.validate()) {
      Unlock__InvalidThreshold.selector.revertWith();
    }

    emit UnlockConditionSet(featureId, condition);
  }

  function setGracePeriod(uint40 newGracePeriod) external onlyOwner {
    if (newGracePeriod == 0) {
      Unlock__InvalidGracePeriod.selector.revertWith();
    }
    UnlockStorage.layout().gracePeriod = newGracePeriod;
    emit GracePeriodSet(newGracePeriod);
  }

  function checkAndUpdateUnlockStatus(
    address space,
    bytes32 featureId
  ) external returns (bool) {
    UnlockStorage.Layout storage l = UnlockStorage.layout();
    UnlockConditionLib.UnlockCondition storage condition = l.unlockConditions[
      featureId
    ];

    if (!condition.validate()) {
      Unlock__ConditionNotSet.selector.revertWith();
    }
    if (!condition.isActive()) {
      Unlock__FeatureNotActive.selector.revertWith();
    }

    SpaceUnlockStatusLib.SpaceUnlockStatus storage status = l.spaceUnlockStatus[
      featureId
    ][space];

    uint256 currentStake = IRewardsDistribution(_getRewardsDistribution())
      .stakedByDepositor(space);

    bool statusChanged = status.updateStatus(
      condition,
      currentStake,
      l.gracePeriod
    );

    if (statusChanged) {
      if (status.isUnlocked) {
        emit FeatureUnlocked(featureId, space, currentStake);
      } else {
        emit FeatureLocked(featureId, space, currentStake);
      }
    }

    return status.isUnlocked;
  }

  function isFeatureUnlocked(
    bytes32 featureId,
    address space
  ) external view returns (bool) {
    UnlockStorage.Layout storage l = UnlockStorage.layout();
    return l.spaceUnlockStatus[featureId][space].isUnlocked;
  }

  function getSpaceUnlockStatus(
    address space,
    bytes32 featureId
  ) external view returns (SpaceUnlockStatusLib.SpaceUnlockStatus memory) {
    UnlockStorage.Layout storage l = UnlockStorage.layout();
    return l.spaceUnlockStatus[featureId][space];
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Internal                         */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _getRewardsDistribution() internal view returns (address) {
    ImplementationRegistryStorage.Layout
      storage registryStorage = ImplementationRegistryStorage.layout();
    return
      registryStorage.implementation[BASE_REGISTRY][
        registryStorage.currentVersion[BASE_REGISTRY]
      ];
  }
}
