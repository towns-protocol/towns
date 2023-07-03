// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// libraries

// contracts
import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {TownArchitectController} from "./TownArchitectController.sol";
import {GateController} from "contracts/src/towns/facets/gate/GateController.sol";
import {OwnableController} from "contracts/src/diamond/extensions/ownable/OwnableController.sol";
import {ReentrancyGuard} from "contracts/src/diamond/extensions/reentrancy/ReentrancyGuard.sol";
import {PausableController} from "contracts/src/diamond/extensions/pausable/PausableController.sol";

contract TownArchitect is
  TownArchitectController,
  OwnableController,
  GateController,
  PausableController,
  ReentrancyGuard,
  ITownArchitect
{
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

  function createTown(
    TownInfo memory townInfo
  ) external nonReentrant whenNotPaused returns (address) {
    _checkTokenGate(msg.sender);
    return _createTown(townInfo);
  }

  // get pre mint town address
  function computeTown(string memory townId) external view returns (address) {
    uint256 tokenId = _getNextTokenId();
    return _getTownDeploymentAddress(townId, tokenId);
  }

  // get town address
  function getTownById(string memory townId) external view returns (address) {
    return _getTownById(townId);
  }

  function getTokenIdByTownId(
    string memory townId
  ) external view returns (uint256) {
    return _getTokenIdByTownId(townId);
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
}
