// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "./IArchitect.sol";

import {IRuleEntitlement} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRuleEntitlementV2} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "src/spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {ISpaceProxyInitializer} from "src/spaces/facets/proxy/ISpaceProxyInitializer.sol";

// libraries

import {ArchitectStorage} from "./ArchitectStorage.sol";
import {ImplementationStorage} from "./ImplementationStorage.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// contracts

// modules

abstract contract ArchitectBase is IArchitectBase {
    // =============================================================
    //                           Implementations
    // =============================================================

    function _setImplementations(
        ISpaceOwner spaceOwnerToken,
        IUserEntitlement userEntitlement,
        IRuleEntitlementV2 ruleEntitlement,
        IRuleEntitlement legacyRuleEntitlement
    ) internal {
        if (address(spaceOwnerToken).code.length == 0) {
            revert Architect__NotContract();
        }
        if (address(userEntitlement).code.length == 0) {
            revert Architect__NotContract();
        }
        if (address(ruleEntitlement).code.length == 0) {
            revert Architect__NotContract();
        }

        ImplementationStorage.Layout storage ds = ImplementationStorage.layout();
        ds.spaceOwnerToken = spaceOwnerToken;
        ds.userEntitlement = userEntitlement;
        ds.ruleEntitlement = ruleEntitlement;
        ds.legacyRuleEntitlement = legacyRuleEntitlement;
    }

    // =============================================================
    //                         Proxy Initializer
    // =============================================================

    function _setProxyInitializer(ISpaceProxyInitializer proxyInitializer) internal {
        ImplementationStorage.Layout storage ds = ImplementationStorage.layout();
        ds.proxyInitializer = proxyInitializer;

        emit Architect__ProxyInitializerSet(address(proxyInitializer));
    }

    // =============================================================
    //                           Spaces
    // =============================================================
    function _getTokenIdBySpace(address space) internal view returns (uint256) {
        return ArchitectStorage.layout().tokenIdBySpace[space];
    }

    function _getSpaceByTokenId(uint256 tokenId) internal view returns (address) {
        return ArchitectStorage.layout().spaceByTokenId[tokenId];
    }

    // =============================================================
    //                           Implementations
    // =============================================================

    function _getImplementations()
        internal
        view
        returns (
            ISpaceOwner spaceOwnerToken,
            IUserEntitlement userEntitlementImplementation,
            IRuleEntitlementV2 ruleEntitlementImplementation,
            IRuleEntitlement legacyRuleEntitlement
        )
    {
        ImplementationStorage.Layout storage ds = ImplementationStorage.layout();

        return (
            ds.spaceOwnerToken,
            ds.userEntitlement,
            ds.ruleEntitlement,
            ds.legacyRuleEntitlement
        );
    }

    // =============================================================
    //                         Proxy Initializer
    // =============================================================
    function _getProxyInitializer() internal view returns (ISpaceProxyInitializer) {
        return ImplementationStorage.layout().proxyInitializer;
    }
}
