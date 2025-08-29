// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {ModulesBase} from "./ModulesBase.sol";

//contracts
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";

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
        assertSubscriptionActive(address(userAccount), entityId);

        _warpToRenewalTime(space, tokenId);

        vm.deal(address(userAccount), params.renewalPrice);

        address feeRecipient = platformRequirements.getFeeRecipient();

        BalanceSnapshot memory beforeSnap = snapshotBalances(
            address(userAccount),
            params.space,
            feeRecipient
        );

        _processRenewalAs(processor, address(userAccount), entityId);

        BalanceSnapshot memory afterSnap = snapshotBalances(
            address(userAccount),
            params.space,
            feeRecipient
        );

        assertNativeDistribution(beforeSnap, afterSnap);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         PRICE CHANGES                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_processRenewal_AcceptsTenPercentIncrease(address user) public {
        uint64 duration = 365 days;
        uint256 price = 1 ether;

        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user, duration, price);

        uint256 newPrice = (params.renewalPrice * 110) / 100;

        _setMembershipPrice(params.space, newPrice);
        _warpToRenewalTime(params.space, tokenId);

        vm.deal(address(account), newPrice);

        address feeRecipient = platformRequirements.getFeeRecipient();
        BalanceSnapshot memory beforeSnap = snapshotBalances(
            address(account),
            params.space,
            feeRecipient
        );

        // Should succeed with 10% increase
        _processRenewalAs(processor, address(account), entityId);

        BalanceSnapshot memory afterSnap = snapshotBalances(
            address(account),
            params.space,
            feeRecipient
        );

        assertNativeDistribution(beforeSnap, afterSnap);
    }
}
