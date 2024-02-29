// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IArchitect} from "contracts/src/spaces/facets/architect/IArchitect.sol";

// libraries

// contracts
import {ArchitectBase} from "./ArchitectBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract Architect is
  IArchitect,
  ArchitectBase,
  OwnableBase,
  PausableBase,
  ReentrancyGuard,
  Facet
{
  function __Architect_init(
    address ownerImplementation,
    address userEntitlementImplementation,
    address tokenEntitlementImplementation
  ) external onlyInitializing {
    _setImplementations(
      ownerImplementation,
      userEntitlementImplementation,
      tokenEntitlementImplementation
    );
  }

  // =============================================================
  //                            Space
  // =============================================================

  function getSpaceById(string memory spaceId) external view returns (address) {
    return _getSpaceById(spaceId);
  }

  function getTokenIdBySpaceId(
    string memory spaceId
  ) external view returns (uint256) {
    return _getTokenIdBySpaceId(spaceId);
  }

  function getTokenIdBySpace(address space) external view returns (uint256) {
    return _getTokenIdBySpace(space);
  }

  function isSpace(address space) external view returns (bool) {
    return _isValidSpace(space);
  }

  function createSpace(
    SpaceInfo memory spaceInfo
  ) external nonReentrant whenNotPaused returns (address) {
    return _createSpace(spaceInfo);
  }

  // =============================================================
  //                         Implementations
  // =============================================================

  function setSpaceArchitectImplementations(
    address spaceToken,
    address userEntitlementImplementation,
    address tokenEntitlementImplementation
  ) external onlyOwner {
    _setImplementations(
      spaceToken,
      userEntitlementImplementation,
      tokenEntitlementImplementation
    );
  }

  function getSpaceArchitectImplementations()
    external
    view
    returns (
      address spaceToken,
      address userEntitlementImplementation,
      address tokenEntitlementImplementation
    )
  {
    return _getImplementations();
  }
}
