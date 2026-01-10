// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitect} from "src/factory/facets/architect/IArchitect.sol";
import {IRuleEntitlement} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRuleEntitlementV2} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";

import {IUserEntitlement} from "src/spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {ISpaceProxyInitializer} from "src/spaces/facets/proxy/ISpaceProxyInitializer.sol";

// libraries

// contracts
import {ArchitectBase} from "./ArchitectBase.sol";

import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

contract Architect is IArchitect, ArchitectBase, OwnableBase, PausableBase, ReentrancyGuard, Facet {
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

    // =============================================================
    //                         Proxy Initializer
    // =============================================================

    /// @inheritdoc IArchitect
    function setProxyInitializer(ISpaceProxyInitializer proxyInitializer) external onlyOwner {
        _setProxyInitializer(proxyInitializer);
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
    function getProxyInitializer() external view returns (ISpaceProxyInitializer) {
        return _getProxyInitializer();
    }
}
