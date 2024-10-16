// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRuleEntitlementV2} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceProxyInitializer} from "contracts/src/spaces/facets/proxy/ISpaceProxyInitializer.sol";

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
    IRuleEntitlementV2 ruleEntitlementImplementation,
    IRuleEntitlement legacyRuleEntitlement
  ) external onlyInitializing {
    _setImplementations(
      ownerImplementation,
      userEntitlementImplementation,
      ruleEntitlementImplementation,
      legacyRuleEntitlement
    );
  }

  // =============================================================
  //                            Space
  // =============================================================

  /// @inheritdoc IArchitect
  function getSpaceByTokenId(uint256 tokenId) external view returns (address) {
    return _getSpaceByTokenId(tokenId);
  }

  /// @inheritdoc IArchitect
  function getTokenIdBySpace(address space) external view returns (uint256) {
    return _getTokenIdBySpace(space);
  }

  // =============================================================
  //                         Implementations
  // =============================================================

  /// @inheritdoc IArchitect
  function setSpaceArchitectImplementations(
    ISpaceOwner spaceToken,
    IUserEntitlement userEntitlementImplementation,
    IRuleEntitlementV2 ruleEntitlementImplementation,
    IRuleEntitlement legacyRuleEntitlement
  ) external onlyOwner {
    _setImplementations(
      spaceToken,
      userEntitlementImplementation,
      ruleEntitlementImplementation,
      legacyRuleEntitlement
    );
  }

  /// @inheritdoc IArchitect
  function getSpaceArchitectImplementations()
    external
    view
    returns (
      ISpaceOwner spaceToken,
      IUserEntitlement userEntitlementImplementation,
      IRuleEntitlementV2 ruleEntitlementImplementation,
      IRuleEntitlement legacyRuleEntitlement
    )
  {
    return _getImplementations();
  }

  // =============================================================
  //                         Proxy Initializer
  // =============================================================

  /// @inheritdoc IArchitect
  function getProxyInitializer()
    external
    view
    returns (ISpaceProxyInitializer)
  {
    return _getProxyInitializer();
  }

  /// @inheritdoc IArchitect
  function setProxyInitializer(
    ISpaceProxyInitializer proxyInitializer
  ) external onlyOwner {
    _setProxyInitializer(proxyInitializer);
  }
}
