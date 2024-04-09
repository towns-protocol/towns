// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IArchitect} from "contracts/src/spaces/facets/architect/IArchitect.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";
import {IWalletLink} from "contracts/src/river/wallet-link/IWalletLink.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IEntitlementChecker} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";

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
    ISpaceOwner ownerImplementation,
    IUserEntitlement userEntitlementImplementation,
    IRuleEntitlement ruleEntitlementImplementation,
    IWalletLink walletLink,
    IEntitlementChecker entitlementChecker
  ) external onlyInitializing {
    _setImplementations(
      ownerImplementation,
      userEntitlementImplementation,
      ruleEntitlementImplementation,
      walletLink,
      entitlementChecker
    );
  }

  // =============================================================
  //                            Space
  // =============================================================
  function createSpace(
    SpaceInfo memory spaceInfo
  ) external nonReentrant whenNotPaused returns (address) {
    return _createSpace(spaceInfo);
  }

  function getSpaceByTokenId(uint256 tokenId) external view returns (address) {
    return _getSpaceByTokenId(tokenId);
  }

  function getTokenIdBySpace(address space) external view returns (uint256) {
    return _getTokenIdBySpace(space);
  }

  // =============================================================
  //                         Implementations
  // =============================================================

  function setSpaceArchitectImplementations(
    ISpaceOwner spaceToken,
    IUserEntitlement userEntitlementImplementation,
    IRuleEntitlement ruleEntitlementImplementation,
    IWalletLink walletLink,
    IEntitlementChecker entitlementChecker
  ) external onlyOwner {
    _setImplementations(
      spaceToken,
      userEntitlementImplementation,
      ruleEntitlementImplementation,
      walletLink,
      entitlementChecker
    );
  }

  function getSpaceArchitectImplementations()
    external
    view
    returns (
      ISpaceOwner spaceToken,
      IUserEntitlement userEntitlementImplementation,
      IRuleEntitlement ruleEntitlementImplementation,
      IWalletLink walletLink,
      IEntitlementChecker entitlementChecker
    )
  {
    return _getImplementations();
  }
}
