// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {ModulesBase} from "./ModulesBase.sol";

//interfaces
import {IPlatformRequirements} from "../../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";

//libraries
import {Subscription} from "../../../src/apps/modules/subcription/SubscriptionModuleStorage.sol";

//contracts
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract SubscriptionModuleTest is ModulesBase {
    function test_onInstall(address user) public {
        ModularAccount userAccount = _createAccount(user, 0);
        address space = _createSpace(0, 0);
        uint256 tokenId = _joinSpace(address(userAccount), space);

        SubscriptionParams memory params = _createSubscriptionParams(
            address(userAccount),
            space,
            tokenId
        );
        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionConfigured(
            params.account,
            params.entityId,
            params.space,
            params.tokenId,
            params.renewalPrice
        );

        uint32 entityId = _installSubscriptionModule(userAccount, params);

        assertEq(entityId, nextEntityId);
        Subscription memory sub = subscriptionModule.getSubscription(
            address(userAccount),
            entityId
        );
        assertTrue(sub.active, "Subscription should be active");

        _warpToExpiration(space, tokenId);

        vm.deal(address(userAccount), params.renewalPrice);

        uint256 balanceBefore = IPlatformRequirements(spaceFactory).getFeeRecipient().balance;

        _processRenewalAs(processor, address(userAccount), entityId);

        assertEq(
            IPlatformRequirements(spaceFactory).getFeeRecipient().balance,
            balanceBefore + params.renewalPrice
        );
    }
}
