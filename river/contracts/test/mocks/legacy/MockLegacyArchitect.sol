// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ILegacyArchitect} from "./IMockLegacyArchitect.sol";

// libraries

// contracts
import {LegacyArchitectBase} from "./MockLegacyArchitectBase.sol";
import {ReentrancyGuard} from "@river-build/diamond/src/facets/reentrancy/ReentrancyGuard.sol";
import {PausableBase} from "@river-build/diamond/src/facets/pausable/PausableBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract MockLegacyArchitect is
  ILegacyArchitect,
  LegacyArchitectBase,
  PausableBase,
  ReentrancyGuard,
  Facet
{
  function __Architect_init() external onlyInitializing {
    _addInterface(type(ILegacyArchitect).interfaceId);
  }

  // =============================================================
  //                            Space
  // =============================================================
  function createSpace(
    SpaceInfo memory spaceInfo
  ) external nonReentrant whenNotPaused returns (address) {
    return _createSpace(spaceInfo);
  }
}
