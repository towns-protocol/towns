// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementChecker} from "../../../base/registry/facets/checker/IEntitlementChecker.sol";
import {IRuleEntitlement, IRuleEntitlementV2} from "../../../spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "../../../spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceOwner} from "../../../spaces/facets/owner/ISpaceOwner.sol";
import {IWalletLink} from "../wallet-link/IWalletLink.sol";

library ImplementationStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.architect.implementation.storage")) -
    // 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x9e34afa7b4d27d347d25d9d9dab4f1a106fa081382e6c4243e834d093e787d00;

    struct Layout {
        ISpaceOwner spaceOwnerToken;
        IUserEntitlement userEntitlement;
        IRuleEntitlementV2 ruleEntitlement;
        IWalletLink walletLink;
        IEntitlementChecker entitlementChecker;
        IRuleEntitlement legacyRuleEntitlement;
        /// @dev Deprecated: SpaceProxyInitializer is now deployed via CREATE2 in CreateSpaceBase.
        /// Slot preserved for storage layout compatibility.
        address _proxyInitializer;
    }

    function layout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
