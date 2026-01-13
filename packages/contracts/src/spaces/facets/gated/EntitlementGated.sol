// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementChecker} from "../../../base/registry/facets/checker/IEntitlementChecker.sol";
import {IRuleEntitlement} from "../../entitlements/rule/IRuleEntitlement.sol";
import {IEntitlementGated} from "./IEntitlementGated.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {EntitlementGatedBase} from "./EntitlementGatedBase.sol";

abstract contract EntitlementGated is
    IEntitlementGated,
    EntitlementGatedBase,
    ReentrancyGuard,
    Facet
{
    function __EntitlementGated_init(
        IEntitlementChecker entitlementChecker
    ) external onlyInitializing {
        __EntitlementGated_init_unchained(entitlementChecker);
    }

    function __EntitlementGated_init_unchained(IEntitlementChecker entitlementChecker) internal {
        _addInterface(type(IEntitlementGated).interfaceId);
        _setEntitlementChecker(entitlementChecker);
    }

    /// @inheritdoc IEntitlementGated
    function postEntitlementCheckResult(
        bytes32 transactionId,
        uint256 roleId,
        NodeVoteStatus result
    ) external nonReentrant {
        _postEntitlementCheckResult(transactionId, roleId, result);
    }

    /// @inheritdoc IEntitlementGated
    function postEntitlementCheckResultV2(
        bytes32 transactionId,
        uint256 roleId,
        NodeVoteStatus result
    ) external payable onlyEntitlementChecker nonReentrant {
        _postEntitlementCheckResultV2(transactionId, roleId, result);
    }

    /// @inheritdoc IEntitlementGated
    function getRuleData(
        bytes32 transactionId,
        uint256 roleId
    ) external view returns (IRuleEntitlement.RuleData memory) {
        return _getRuleData(transactionId, roleId);
    }
}
