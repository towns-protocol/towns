// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IEntitlementChecker} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IWalletLink} from "src/factory/facets/wallet-link/IWalletLink.sol";
import {IRuleEntitlement} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRuleEntitlementV2} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "src/spaces/entitlements/user/IUserEntitlement.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {ISpaceProxyInitializer} from "src/spaces/facets/proxy/ISpaceProxyInitializer.sol";
// libraries

// contracts

library ImplementationStorage {
    struct Layout {
        ISpaceOwner spaceOwnerToken;
        IUserEntitlement userEntitlement;
        IRuleEntitlementV2 ruleEntitlement;
        IWalletLink walletLink;
        IEntitlementChecker entitlementChecker;
        IRuleEntitlement legacyRuleEntitlement;
        ISpaceProxyInitializer proxyInitializer;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.architect.implementation.storage")) -
    // 1))
    // & ~bytes32(uint256(0xff))
    bytes32 internal constant SLOT_POSITION =
        0x9e34afa7b4d27d347d25d9d9dab4f1a106fa081382e6c4243e834d093e787d00;

    function layout() internal pure returns (Layout storage ds) {
        bytes32 position = SLOT_POSITION;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            ds.slot := position
        }
    }
}
