// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";

// libraries

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {ArchitectBase} from "contracts/src/factory/facets/architect/ArchitectBase.sol";
import {PausableBase} from "@river-build/diamond/src/facets/pausable/PausableBase.sol";
import {ReentrancyGuard} from "@river-build/diamond/src/facets/reentrancy/ReentrancyGuard.sol";

contract CreateSpaceFacet is
  ICreateSpace,
  ArchitectBase,
  PausableBase,
  ReentrancyGuard,
  Facet
{
  function __CreateSpace_init() external onlyInitializing {
    _addInterface(type(ICreateSpace).interfaceId);
  }

  function createSpace(
    SpaceInfo memory spaceInfo
  ) external nonReentrant whenNotPaused returns (address) {
    return _createSpace(spaceInfo);
  }

  function createSpaceWithPrepay(
    CreateSpace memory spaceInfo
  ) external payable nonReentrant whenNotPaused returns (address) {
    return _createSpaceWithPrepay(spaceInfo);
  }

  function createSpaceWithPrepay(
    CreateSpaceOld memory spaceInfo
  ) external payable nonReentrant whenNotPaused returns (address) {
    MembershipRequirements memory requirements = MembershipRequirements({
      everyone: spaceInfo.membership.requirements.everyone,
      users: spaceInfo.membership.requirements.users,
      ruleData: spaceInfo.membership.requirements.ruleData,
      syncEntitlements: false
    });
    Membership memory membership = Membership({
      settings: spaceInfo.membership.settings,
      requirements: requirements,
      permissions: spaceInfo.membership.permissions
    });
    CreateSpace memory newSpaceInfo = CreateSpace({
      metadata: spaceInfo.metadata,
      membership: membership,
      channel: spaceInfo.channel,
      prepay: spaceInfo.prepay
    });
    return _createSpaceWithPrepay(newSpaceInfo);
  }
}
