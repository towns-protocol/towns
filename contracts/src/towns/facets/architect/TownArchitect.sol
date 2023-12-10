// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// libraries

// contracts
import {TownArchitectBase} from "./TownArchitectBase.sol";
import {GateBase} from "contracts/src/towns/facets/gate/GateBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract TownArchitect is
  ITownArchitect,
  TownArchitectBase,
  OwnableBase,
  GateBase,
  PausableBase,
  ReentrancyGuard,
  Facet
{
  function __TownArchitect_init(
    address townOwner,
    address userEntitlementImplementation,
    address tokenEntitlementImplementation
  ) external onlyInitializing {
    _setImplementations(
      townOwner,
      userEntitlementImplementation,
      tokenEntitlementImplementation
    );
  }

  // =============================================================
  //                           Token Gating
  // =============================================================

  function isTokenGated(address token) external view returns (bool) {
    return _isTokenGated(token);
  }

  // rename to premintCondition
  function gateByToken(address token, uint256 quantity) external onlyOwner {
    _gateByToken(token, quantity);
  }

  function ungateByToken(address token) external onlyOwner {
    _ungateByToken(token);
  }

  // =============================================================
  //                            Town
  // =============================================================

  function getTownById(string memory townId) external view returns (address) {
    return _getTownById(townId);
  }

  function getTokenIdByTownId(
    string memory townId
  ) external view returns (uint256) {
    return _getTokenIdByTownId(townId);
  }

  function getTokenIdByTown(address town) external view returns (uint256) {
    return _getTokenIdByTown(town);
  }

  function isTown(address town) external view returns (bool) {
    return _isValidTown(town);
  }

  function createTown(
    TownInfo memory townInfo
  ) external nonReentrant whenNotPaused returns (address) {
    _checkTokenGate(msg.sender);
    return _createTown(townInfo);
  }

  // get pre mint town address
  function computeTown(
    string memory townId,
    Membership memory membership
  ) external view returns (address) {
    uint256 tokenId = _getNextTokenId();
    return _getTownDeploymentAddress(townId, tokenId, membership);
  }

  // =============================================================
  //                         Implementations
  // =============================================================

  function setTownArchitectImplementations(
    address townToken,
    address userEntitlementImplementation,
    address tokenEntitlementImplementation
  ) external onlyOwner {
    _setImplementations(
      townToken,
      userEntitlementImplementation,
      tokenEntitlementImplementation
    );
  }

  function getTownArchitectImplementations()
    external
    view
    returns (
      address townToken,
      address userEntitlementImplementation,
      address tokenEntitlementImplementation
    )
  {
    return _getImplementations();
  }
}
