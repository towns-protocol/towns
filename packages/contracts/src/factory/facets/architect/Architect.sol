// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRuleEntitlement} from "../../../spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRuleEntitlementV2} from "../../../spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "../../../spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceOwner} from "../../../spaces/facets/owner/ISpaceOwner.sol";
import {IArchitect, IArchitectBase} from "./IArchitect.sol";

// libraries
import {ArchitectStorage} from "./ArchitectStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {ImplementationStorage} from "./ImplementationStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

contract Architect is IArchitect, OwnableBase, PausableBase, ReentrancyGuard, Facet {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       INITIALIZATION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           REGISTRY                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IArchitect
    function getSpaceByTokenId(uint256 tokenId) external view returns (address) {
        return ArchitectStorage.layout().spaceByTokenId[tokenId];
    }

    /// @inheritdoc IArchitect
    function getTokenIdBySpace(address space) external view returns (uint256) {
        return ArchitectStorage.layout().tokenIdBySpace[space];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      IMPLEMENTATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
        ImplementationStorage.Layout storage $ = ImplementationStorage.getStorage();
        return ($.spaceOwnerToken, $.userEntitlement, $.ruleEntitlement, $.legacyRuleEntitlement);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _setImplementations(
        ISpaceOwner spaceOwnerToken,
        IUserEntitlement userEntitlement,
        IRuleEntitlementV2 ruleEntitlement,
        IRuleEntitlement legacyRuleEntitlement
    ) private {
        if (address(spaceOwnerToken).code.length == 0) {
            Architect__NotContract.selector.revertWith();
        }
        if (address(userEntitlement).code.length == 0) {
            Architect__NotContract.selector.revertWith();
        }
        if (address(ruleEntitlement).code.length == 0) {
            Architect__NotContract.selector.revertWith();
        }

        ImplementationStorage.Layout storage $ = ImplementationStorage.getStorage();
        $.spaceOwnerToken = spaceOwnerToken;
        $.userEntitlement = userEntitlement;
        $.ruleEntitlement = ruleEntitlement;
        $.legacyRuleEntitlement = legacyRuleEntitlement;
    }
}
