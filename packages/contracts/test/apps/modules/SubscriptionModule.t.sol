// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";

// utils
import {ModulesBase} from "./ModulesBase.sol";
import {Subscription} from "../../../src/apps/modules/subscription/SubscriptionModuleStorage.sol";
import {Validator} from "../../../src/utils/libraries/Validator.sol";

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
            params.nextRenewalTime
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

        uint256[] memory entityIds = subscriptionModule.getEntityIds(address(userAccount));
        assertEq(entityIds.length, 1);
        assertEq(entityIds[0], entityId);
    }

    function test_onInstall_revertWhen_InvalidSpace(address user) public {
        ModularAccount userAccount = _createAccount(user, 0);

        SubscriptionParams memory params = SubscriptionParams({
            account: address(userAccount),
            space: address(0),
            tokenId: 0,
            renewalPrice: 0,
            expirationTime: 0,
            entityId: 0,
            nextRenewalTime: 0
        });

        expectInstallFailed(address(subscriptionModule), Validator.InvalidAddress.selector);
        _installSubscriptionModule(userAccount, params);
    }

    function test_onInstall_revertWhen_InvalidTokenOwner(address user) public {
        ModularAccount userAccount = _createAccount(user, 0);
        address space = _createSpace(0, 0);

        SubscriptionParams memory params = SubscriptionParams({
            account: address(userAccount),
            space: space,
            tokenId: 0,
            renewalPrice: 0,
            expirationTime: 0,
            entityId: 0,
            nextRenewalTime: 0
        });

        expectInstallFailed(
            address(subscriptionModule),
            SubscriptionModule__InvalidTokenOwner.selector
        );
        _installSubscriptionModule(userAccount, params);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           UNINSTALL                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onUninstall(address user) public {
        (ModularAccount account, , uint32 entityId, ) = _createSubscription(user);

        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionDeactivated(address(account), entityId);
        _uninstallSubscriptionModule(account, entityId);
    }

    function test_onUninstall_revertWhen_InvalidEntityId(address user) public {
        (ModularAccount account, , , ) = _createSubscription(user);
        vm.expectEmit(address(account));
        emit IModularAccount.ValidationUninstalled(address(subscriptionModule), 0, false);
        _uninstallSubscriptionModule(account, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      VALIDATE RUNTIME                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_validateRuntime_revertWhen_SenderIsNotModule() public {
        vm.expectRevert(SubscriptionModule__InvalidSender.selector);
        subscriptionModule.validateRuntime(
            makeAddr("not_module"),
            0,
            makeAddr("not_account"),
            0,
            new bytes(0),
            new bytes(0)
        );
    }

    function test_validateRuntime_revertWhen_SubscriptionInactive(address user) public {
        vm.expectRevert(SubscriptionModule__InactiveSubscription.selector);
        subscriptionModule.validateRuntime(
            user,
            0,
            address(subscriptionModule),
            0,
            new bytes(0),
            new bytes(0)
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       PROCESS RENEWAL                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_processRenewal_OnlyAccountOwner() public {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));
        vm.deal(address(account), params.renewalPrice);
        _warpToRenewalTime(params.space, params.tokenId);

        // Account owner should be able to process renewal
        _processRenewalAs(address(account), address(account), entityId);
        assertSubscriptionActive(address(account), entityId);
    }

    function test_processRenewal_OnlyAuthorizedOperator() public {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));
        vm.deal(address(account), params.renewalPrice);
        _warpToRenewalTime(params.space, params.tokenId);

        // Authorized operator (processor) should be able to process renewal
        _processRenewalAs(processor, address(account), entityId);
        assertSubscriptionActive(address(account), entityId);
    }

    function test_processRenewal_revertWhen_UnauthorizedCaller() public {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));
        vm.deal(address(account), params.renewalPrice);
        _warpToRenewalTime(params.space, params.tokenId);

        // Unauthorized caller should not be able to process renewal
        address unauthorizedCaller = makeAddr("unauthorized");
        vm.expectRevert(SubscriptionModule__InvalidCaller.selector);
        _processRenewalAs(unauthorizedCaller, address(account), entityId);
    }

    function test_processRenewal_MembershipPriceIncrease(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        uint256 newPrice = (params.renewalPrice * 110) / 100;

        _setMembershipPrice(params.space, newPrice);
        _warpToRenewalTime(params.space, tokenId);

        vm.deal(address(account), params.renewalPrice);

        address feeRecipient = platformRequirements.getFeeRecipient();
        BalanceSnapshot memory beforeSnap = snapshotBalances(
            address(account),
            params.space,
            feeRecipient
        );

        // Should respect the original price and succeed even with 10% increase
        _processRenewalAs(processor, address(account), entityId);

        BalanceSnapshot memory afterSnap = snapshotBalances(
            address(account),
            params.space,
            feeRecipient
        );

        assertNativeDistribution(beforeSnap, afterSnap);
    }

    function test_processRenewal_revertWhen_InsufficientBalance(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        _warpToRenewalTime(params.space, tokenId);

        vm.expectRevert(SubscriptionModule__InsufficientBalance.selector);
        _processRenewalAs(processor, address(account), entityId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXPIRATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_processRenewal_GracePeriod(address user) external {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);
        vm.deal(address(account), params.renewalPrice);

        _warpToGracePeriod(params.space, tokenId);
        assertTrue(_getMembership(params.space).expiresAt(tokenId) <= block.timestamp);

        Subscription memory subBefore = subscriptionModule.getSubscription(
            address(account),
            entityId
        );

        assertEq(subBefore.lastRenewalTime, 0);
        assertEq(subBefore.spent, 0);

        _processRenewalAs(processor, address(account), entityId);

        Subscription memory subAfter = subscriptionModule.getSubscription(
            address(account),
            entityId
        );

        assertTrue(subAfter.active, "Subscription should still be active");
        assertEq(subAfter.lastRenewalTime, block.timestamp, "Last renewal time should be updated");
        assertEq(subAfter.spent, params.renewalPrice, "Spent should be updated");
        assertTrue(
            subAfter.nextRenewalTime != subBefore.nextRenewalTime,
            "Next renewal time should be updated"
        );
    }

    function test_processRenewal_multipleRenewals(address user) external {
        uint256 expectedRenewalPrice = 1 ether;

        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user, 7 days, expectedRenewalPrice);
        vm.deal(address(account), expectedRenewalPrice * 2);

        uint256 totalSpent;

        _warpToRenewalTime(params.space, tokenId);
        _processRenewalAs(processor, address(account), entityId);

        totalSpent += expectedRenewalPrice;

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertEq(sub.spent, totalSpent, "Spent should be equal to the total spent");

        uint256 renewalTime = sub.lastRenewalTime;

        _warpToRenewalTime(params.space, tokenId);
        _processRenewalAs(processor, address(account), entityId);

        totalSpent += expectedRenewalPrice;
        sub = subscriptionModule.getSubscription(address(account), entityId);

        assertEq(sub.spent, totalSpent, "Spent should be equal to the total spent");
        assertTrue(sub.lastRenewalTime > renewalTime, "Last renewal time should be updated");
        assertTrue(sub.active, "Subscription should still be active");
    }

    function test_processRenewal_revertWhen_InvalidCaller(address user) external {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);
        vm.deal(address(account), params.renewalPrice);

        vm.expectRevert(SubscriptionModule__InvalidCaller.selector);
        _processRenewalAs(makeAddr("not_processor"), address(account), entityId);
    }

    function test_revertWhen_processRenewal_RenewalNotDue(address user) external {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);
        vm.deal(address(account), params.renewalPrice);

        vm.expectRevert(SubscriptionModule__RenewalNotDue.selector);
        _processRenewalAs(processor, address(account), entityId);
    }

    function test_revertWhen_processRenewal_SubscriptionPaused(address user) external {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);
        vm.deal(address(account), params.renewalPrice);

        _warpPastGracePeriod(params.space, tokenId);

        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionPaused(address(account), entityId);
        _processRenewalAs(processor, address(account), entityId);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertFalse(sub.active, "Subscription should be paused");
    }

    function test_processRenewal_MembershipLifecycle(address user) external {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);
        vm.deal(address(account), params.renewalPrice);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertTrue(sub.active, "Subscription should be active");

        uint256 expiresAt = _getMembership(params.space).expiresAt(tokenId);
        vm.warp(expiresAt + 1);

        assertTrue(_getMembership(params.space).expiresAt(tokenId) <= block.timestamp);

        _processRenewalAs(processor, address(account), entityId);

        assertSubscriptionActive(address(account), entityId);
        assertTrue(_getMembership(params.space).expiresAt(tokenId) > block.timestamp);
    }

    /*´:°•.°+.*•´.*:•.°•.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        OPERATOR MANAGEMENT                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_grantOperator() public {
        address newOperator = makeAddr("newOperator");

        vm.prank(deployer);
        subscriptionModule.grantOperator(newOperator);

        assertTrue(subscriptionModule.isOperator(newOperator));

        // Test that the operator can now process renewals
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));
        vm.deal(address(account), params.renewalPrice);
        _warpToRenewalTime(params.space, params.tokenId);

        _processRenewalAs(newOperator, address(account), entityId);
        assertSubscriptionActive(address(account), entityId);
    }

    function test_revokeOperator() public {
        address operatorToRevoke = makeAddr("operatorToRevoke");

        // First grant the operator
        vm.prank(deployer);
        subscriptionModule.grantOperator(operatorToRevoke);

        // Then revoke it
        vm.prank(deployer);
        subscriptionModule.revokeOperator(operatorToRevoke);

        // Test that the operator can no longer process renewals
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));
        vm.deal(address(account), params.renewalPrice);
        _warpToRenewalTime(params.space, params.tokenId);

        vm.expectRevert(SubscriptionModule__InvalidCaller.selector);
        _processRenewalAs(operatorToRevoke, address(account), entityId);
    }

    function test_grantOperator_revertWhen_NotOwner() public {
        address newOperator = makeAddr("newOperator");
        address nonOwner = makeAddr("nonOwner");

        vm.expectRevert();
        vm.prank(nonOwner);
        subscriptionModule.grantOperator(newOperator);
    }

    function test_revokeOperator_revertWhen_NotOwner() public {
        address operatorToRevoke = makeAddr("operatorToRevoke");
        address nonOwner = makeAddr("nonOwner");

        vm.expectRevert();
        vm.prank(nonOwner);
        subscriptionModule.revokeOperator(operatorToRevoke);
    }

    function test_grantOperator_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        subscriptionModule.grantOperator(address(0));
    }

    function test_revokeOperator_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        subscriptionModule.revokeOperator(address(0));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  BATCH PROCESS RENEWALS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_batchProcessRenewals_SingleRenewal() public {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));
        vm.deal(address(account), params.renewalPrice);
        _warpToRenewalTime(params.space, params.tokenId);

        // Create batch with single renewal
        RenewalParams[] memory batchParams = new RenewalParams[](1);
        batchParams[0] = RenewalParams({account: address(account), entityId: entityId});

        // Process batch renewal as authorized operator (processor)
        vm.prank(processor);
        subscriptionModule.batchProcessRenewals(batchParams);

        // Verify renewal was successful
        assertSubscriptionActive(address(account), entityId);
    }

    function test_batchProcessRenewals_MultipleRenewals() public {
        // Create multiple subscriptions
        (
            ModularAccount account1,
            ,
            uint32 entityId1,
            SubscriptionParams memory params1
        ) = _createSubscription(makeAddr("user1"));
        (
            ModularAccount account2,
            ,
            uint32 entityId2,
            SubscriptionParams memory params2
        ) = _createSubscription(makeAddr("user2"));
        (
            ModularAccount account3,
            ,
            uint32 entityId3,
            SubscriptionParams memory params3
        ) = _createSubscription(makeAddr("user3"));

        // Fund all accounts
        vm.deal(address(account1), params1.renewalPrice);
        vm.deal(address(account2), params2.renewalPrice);
        vm.deal(address(account3), params3.renewalPrice);

        // Warp to renewal time for all
        _warpToRenewalTime(params1.space, params1.tokenId);
        _warpToRenewalTime(params2.space, params2.tokenId);
        _warpToRenewalTime(params3.space, params3.tokenId);

        // Create batch with multiple renewals
        RenewalParams[] memory batchParams = new RenewalParams[](3);
        batchParams[0] = RenewalParams({account: address(account1), entityId: entityId1});
        batchParams[1] = RenewalParams({account: address(account2), entityId: entityId2});
        batchParams[2] = RenewalParams({account: address(account3), entityId: entityId3});

        // Process batch renewal as authorized operator
        vm.prank(processor);
        subscriptionModule.batchProcessRenewals(batchParams);

        // Verify all renewals were successful
        assertSubscriptionActive(address(account1), entityId1);
        assertSubscriptionActive(address(account2), entityId2);
        assertSubscriptionActive(address(account3), entityId3);
    }

    function test_batchProcessRenewals_MixedResults() public {
        uint256 renewalPrice = 1 ether;
        // Create subscriptions with different states
        (
            ModularAccount account1,
            uint256 tokenId1,
            uint32 entityId1,
            SubscriptionParams memory params1
        ) = _createSubscription(makeAddr("user1"), 30 days, renewalPrice);
        (ModularAccount account2, , uint32 entityId2, ) = _createSubscription(
            makeAddr("user2"),
            20 days,
            renewalPrice
        );
        (ModularAccount account3, , uint32 entityId3, ) = _createSubscription(
            makeAddr("user3"),
            365 days,
            renewalPrice
        );
        (ModularAccount account4, , uint32 entityId4, ) = _createSubscription(
            makeAddr("user4"),
            365 days,
            renewalPrice
        );

        // Fund accounts
        vm.deal(address(account1), renewalPrice);
        vm.deal(address(account2), renewalPrice);
        vm.deal(address(account3), renewalPrice);
        vm.deal(address(account4), renewalPrice);

        vm.prank(address(account4));
        subscriptionModule.pauseSubscription(entityId4);

        _warpToRenewalTime(params1.space, tokenId1);

        // Create batch
        RenewalParams[] memory batchParams = new RenewalParams[](4);
        batchParams[0] = RenewalParams({account: address(account1), entityId: entityId1});
        batchParams[1] = RenewalParams({account: address(account2), entityId: entityId2});
        batchParams[2] = RenewalParams({account: address(account3), entityId: entityId3});
        batchParams[3] = RenewalParams({account: address(account4), entityId: entityId4});

        // Process batch
        vm.prank(processor);
        subscriptionModule.batchProcessRenewals(batchParams);

        // Verify: only account1 should be renewed
        Subscription memory sub = subscriptionModule.getSubscription(address(account1), entityId1);
        assertTrue(
            sub.active && sub.lastRenewalTime == block.timestamp,
            "account1 should be renewed"
        );

        // account 2 is past grace period
        sub = subscriptionModule.getSubscription(address(account2), entityId2);
        assertTrue(sub.active && sub.lastRenewalTime == 0, "account2 should not be renewed");

        // account 3 is not due
        sub = subscriptionModule.getSubscription(address(account3), entityId3);
        assertTrue(sub.active && sub.lastRenewalTime == 0, "account3 should not be renewed");

        // account 4 is paused
        sub = subscriptionModule.getSubscription(address(account4), entityId4);
        assertFalse(sub.active, "account4 should remain inactive");
    }

    function test_batchProcessRenewals_revertWhen_ExceedsMaxBatchSize() public {
        RenewalParams[] memory batchParams = new RenewalParams[](100);
        vm.expectRevert(SubscriptionModule__ExceedsMaxBatchSize.selector);
        vm.prank(processor);
        subscriptionModule.batchProcessRenewals(batchParams);
    }

    function test_batchProcessRenewals_EmptyArray() public {
        RenewalParams[] memory batchParams = new RenewalParams[](0);
        vm.expectRevert(SubscriptionModule__EmptyBatch.selector);
        vm.prank(processor);
        subscriptionModule.batchProcessRenewals(batchParams);
    }

    function test_batchProcessRenewals_AllSkipped() public {
        uint256 renewalPrice = 1 ether;

        // Create subscriptions that will all be skipped
        (ModularAccount account1, , uint32 entityId1, ) = _createSubscription(
            makeAddr("user1"),
            365 days,
            renewalPrice
        ); // Not due
        (ModularAccount account2, , uint32 entityId2, ) = _createSubscription(
            makeAddr("user2"),
            365 days,
            renewalPrice
        ); // Not due
        (ModularAccount account3, , uint32 entityId3, ) = _createSubscription(
            makeAddr("user3"),
            365 days,
            renewalPrice
        ); // Not due

        // Fund accounts
        vm.deal(address(account1), renewalPrice);
        vm.deal(address(account2), renewalPrice);
        vm.deal(address(account3), renewalPrice);

        // Pause one subscription to make it inactive
        vm.prank(address(account1));
        subscriptionModule.pauseSubscription(entityId1);

        // Create batch with all subscriptions that should be skipped
        RenewalParams[] memory batchParams = new RenewalParams[](3);
        batchParams[0] = RenewalParams({account: address(account1), entityId: entityId1}); // Inactive
        batchParams[1] = RenewalParams({account: address(account2), entityId: entityId2}); // Not due
        batchParams[2] = RenewalParams({account: address(account3), entityId: entityId3}); // Not due

        // Process batch
        vm.prank(processor);
        subscriptionModule.batchProcessRenewals(batchParams);

        // Verify all subscriptions remain unchanged
        Subscription memory sub1 = subscriptionModule.getSubscription(address(account1), entityId1);
        assertFalse(sub1.active, "account1 should remain inactive");
        assertEq(sub1.lastRenewalTime, 0, "account1 should not be renewed");

        Subscription memory sub2 = subscriptionModule.getSubscription(address(account2), entityId2);
        assertTrue(sub2.active, "account2 should remain active");
        assertEq(sub2.lastRenewalTime, 0, "account2 should not be renewed");

        Subscription memory sub3 = subscriptionModule.getSubscription(address(account3), entityId3);
        assertTrue(sub3.active, "account3 should remain active");
        assertEq(sub3.lastRenewalTime, 0, "account3 should not be renewed");
    }
}
