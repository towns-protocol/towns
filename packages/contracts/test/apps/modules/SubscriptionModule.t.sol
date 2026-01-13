// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IBanning} from "../../../src/spaces/facets/banning/IBanning.sol";

// utils
import {ModulesBase} from "./ModulesBase.sol";
import {Subscription} from "../../../src/apps/modules/subscription/SubscriptionModuleStorage.sol";

// contracts
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";

contract SubscriptionModuleTest is ModulesBase {
    function test_onInstall_basic(address user) public {
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
            params.nextRenewalTime,
            params.expirationTime
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

        assertNativeDistribution(params.renewalPrice, params.renewalPrice, beforeSnap, afterSnap);

        uint256[] memory entityIds = subscriptionModule.getEntityIds(address(userAccount));
        assertEq(entityIds.length, 1);
        assertEq(entityIds[0], entityId);
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       PROCESS RENEWAL                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

    function test_processRenewal_revertWhen_AccountOwner() public {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));
        vm.deal(address(account), params.renewalPrice);
        _warpToRenewalTime(params.space, params.tokenId);

        // Account owner should be able to process renewal
        vm.expectRevert(SubscriptionModule__InvalidCaller.selector);
        _processRenewalAs(address(account), address(account), entityId);
    }

    function test_processRenewal_revertWhen_InvalidCaller() public {
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

        uint256 originalBasePrice = DEFAULT_MEMBERSHIP_PRICE;
        uint256 newBasePrice = (originalBasePrice * 110) / 100;

        _setMembershipPrice(params.space, newBasePrice);
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

        // Verify payment distribution: account paid original renewal price
        assertNativeDistribution(originalBasePrice, params.renewalPrice, beforeSnap, afterSnap);
    }

    function test_processRenewal_skipWhen_InactiveSubscription(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        _warpPastGracePeriod(params.space, tokenId);

        _processRenewalAs(processor, address(account), entityId);

        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "INACTIVE");
        _processRenewalAs(processor, address(account), entityId);

        assertFalse(subscriptionModule.getSubscription(address(account), entityId).active);
    }

    function test_processRenewal_skipWhen_NotDue(address user) public {
        (ModularAccount account, , uint32 entityId, ) = _createSubscription(user);

        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionNotDue(address(account), entityId);
        _processRenewalAs(processor, address(account), entityId);
    }

    function test_processRenewal_skipWhen_PastGracePeriod(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        _warpPastGracePeriod(params.space, tokenId);

        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "PAST_GRACE");
        _processRenewalAs(processor, address(account), entityId);

        assertFalse(subscriptionModule.getSubscription(address(account), entityId).active);
    }

    function test_processRenewal_skipWhen_NotOwner(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        address newAccount = makeAddr("new_account");

        _transferMembership(params.space, address(account), newAccount, tokenId);

        _warpToRenewalTime(params.space, tokenId);

        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "NOT_OWNER");
        _processRenewalAs(processor, address(account), entityId);

        assertFalse(subscriptionModule.getSubscription(address(account), entityId).active);
    }

    function test_processRenewal_skipWhen_InsufficientBalance(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        _warpToRenewalTime(params.space, tokenId);

        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "INSUFFICIENT_BALANCE");
        _processRenewalAs(processor, address(account), entityId);

        assertFalse(subscriptionModule.getSubscription(address(account), entityId).active);
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

        // Get actual renewal price (base + protocol fee)
        uint256 actualRenewalPrice = params.renewalPrice;
        vm.deal(address(account), actualRenewalPrice * 2);

        uint256 totalSpent;

        _warpToRenewalTime(params.space, tokenId);
        _processRenewalAs(processor, address(account), entityId);

        totalSpent += actualRenewalPrice;

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertEq(sub.spent, totalSpent, "Spent should be equal to the total spent");

        uint256 renewalTime = sub.lastRenewalTime;

        _warpToRenewalTime(params.space, tokenId);
        _processRenewalAs(processor, address(account), entityId);

        totalSpent += actualRenewalPrice;
        sub = subscriptionModule.getSubscription(address(account), entityId);

        // assertEq(sub.spent, totalSpent, "Spent should be equal to the total spent");
        assertTrue(sub.lastRenewalTime > renewalTime, "Last renewal time should be updated");
        assertTrue(sub.active, "Subscription should still be active");
    }

    function test_revertWhen_processRenewal_RenewalNotDue(address user) external {
        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);
        vm.deal(address(account), params.renewalPrice);

        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionNotDue(address(account), entityId);
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
        uint256 price = 1 ether;
        // Create subscriptions with different states
        (
            ModularAccount account1,
            uint256 tokenId1,
            uint32 entityId1,
            SubscriptionParams memory params1
        ) = _createSubscription(makeAddr("user1"), 30 days, price);
        (ModularAccount account2, , uint32 entityId2, ) = _createSubscription(
            makeAddr("user2"),
            20 days,
            price
        );
        (ModularAccount account3, , uint32 entityId3, ) = _createSubscription(
            makeAddr("user3"),
            365 days,
            price
        );
        (ModularAccount account4, , uint32 entityId4, ) = _createSubscription(
            makeAddr("user4"),
            365 days,
            price
        );

        // Fund accounts
        vm.deal(address(account1), params1.renewalPrice);
        vm.deal(address(account2), params1.renewalPrice);
        vm.deal(address(account3), params1.renewalPrice);
        vm.deal(address(account4), params1.renewalPrice);

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
        assertTrue(!sub.active && sub.lastRenewalTime == 0, "account2 should not be renewed");

        // account 3 is not due
        sub = subscriptionModule.getSubscription(address(account3), entityId3);
        assertTrue(sub.active && sub.lastRenewalTime == 0, "account3 should not be renewed");

        // account 4 is paused
        sub = subscriptionModule.getSubscription(address(account4), entityId4);
        assertFalse(sub.active, "account4 should remain inactive");
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      BANNED MEMBERSHIP                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_bannedMembership() public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"));

        vm.prank(owner);
        IBanning(params.space).ban(tokenId);

        _warpToRenewalTime(params.space, tokenId);

        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionPaused(address(account), entityId);
        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "MEMBERSHIP_BANNED");
        _processRenewalAs(processor, address(account), entityId);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertFalse(sub.active, "Subscription should be paused");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    PREVENT DOUBLE RENEWAL                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_preventDoubleRenewal() public {
        uint256 duration = 1 hours;
        uint256 renewalPrice = 0.001 ether;

        (ModularAccount account, , uint32 entityId, ) = _createSubscription(
            makeAddr("user"),
            uint64(duration),
            renewalPrice
        );

        vm.deal(address(account), renewalPrice * 10);

        Subscription memory initialSub = subscriptionModule.getSubscription(
            address(account),
            entityId
        );
        uint256 initialNextRenewal = initialSub.nextRenewalTime;

        vm.warp(initialNextRenewal);

        _processRenewalAs(processor, address(account), entityId);

        Subscription memory afterFirstRenewal = subscriptionModule.getSubscription(
            address(account),
            entityId
        );

        assertTrue(
            afterFirstRenewal.nextRenewalTime > block.timestamp,
            "Next renewal time must be strictly in the future after renewal"
        );

        vm.warp(block.timestamp + 5 minutes);

        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionNotDue(address(account), entityId);
        _processRenewalAs(processor, address(account), entityId);

        Subscription memory afterSecondAttempt = subscriptionModule.getSubscription(
            address(account),
            entityId
        );
        assertEq(
            afterSecondAttempt.spent,
            afterFirstRenewal.spent,
            "No additional charge should occur"
        );
        assertEq(
            afterSecondAttempt.lastRenewalTime,
            afterFirstRenewal.lastRenewalTime,
            "Last renewal time should not change"
        );
    }

    function test_multipleConsecutiveRenewalAttempts() public {
        uint256 duration = 1 hours;
        uint256 renewalPrice = 0.001 ether;

        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"), uint64(duration), renewalPrice);

        vm.deal(address(account), renewalPrice * 10);

        _warpToRenewalTime(params.space, params.tokenId);

        _processRenewalAs(processor, address(account), entityId);

        uint256 spentAfterFirst = subscriptionModule
            .getSubscription(address(account), entityId)
            .spent;

        for (uint i; i < 5; ++i) {
            vm.warp(block.timestamp + 1 minutes);

            vm.expectEmit(address(subscriptionModule));
            emit SubscriptionNotDue(address(account), entityId);
            _processRenewalAs(processor, address(account), entityId);
        }

        uint256 finalSpent = subscriptionModule.getSubscription(address(account), entityId).spent;
        assertEq(finalSpent, spentAfterFirst, "Only one renewal charge should occur");
    }

    function test_renewalSchedulingWithCatchUp() public {
        uint256 duration = 1 hours;
        uint256 renewalPrice = 0.001 ether;

        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"), uint64(duration), renewalPrice);

        vm.deal(address(account), renewalPrice * 10);

        uint256 initialNextRenewal = subscriptionModule
            .getSubscription(address(account), entityId)
            .nextRenewalTime;

        vm.warp(initialNextRenewal + 3 hours + 30 minutes);

        _processRenewalAs(processor, address(account), entityId);

        Subscription memory afterRenewal = subscriptionModule.getSubscription(
            address(account),
            entityId
        );

        assertTrue(
            afterRenewal.nextRenewalTime > block.timestamp,
            "Next renewal must be in the future even after catch-up"
        );

        assertEq(
            afterRenewal.spent,
            params.renewalPrice,
            "Should only charge once despite missed intervals"
        );
    }

    function test_firstRenewal_noDoubleCharge() public {
        uint64 shortDuration = 60 minutes;
        uint256 price = 0.01 ether;

        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"), shortDuration, price);

        vm.deal(address(account), price * 10);

        uint256 balanceBefore = address(account).balance;

        _warpToRenewalTime(params.space, tokenId);
        vm.warp(block.timestamp + 3 minutes);

        _processRenewalAs(processor, address(account), entityId);

        vm.warp(block.timestamp + 5 minutes);

        _processRenewalAs(processor, address(account), entityId);

        assertEq(
            balanceBefore - address(account).balance,
            params.renewalPrice,
            "Should only charge once, not twice"
        );

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertGt(sub.nextRenewalTime, block.timestamp, "Next renewal should be in future");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    DURATION CHANGED                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_membershipDurationChanged() public {
        uint64 duration = 1 hours;
        uint256 renewalPrice = 0.001 ether;

        (
            ModularAccount account,
            ,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"), duration, renewalPrice);

        uint256 totalPrice = _getMembership(params.space).getMembershipPrice();

        vm.deal(address(account), totalPrice);

        _warpToRenewalTime(params.space, params.tokenId);
        _setMembershipDuration(params.space, duration * 2);

        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "DURATION_CHANGED");
        _processRenewalAs(processor, address(account), entityId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     MANUAL RENEWAL SYNC                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_manualRenewalSync() public {
        uint64 duration = 1 hours;
        uint256 renewalPrice = 0.001 ether;

        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"), duration, renewalPrice);

        _warpToRenewalTime(params.space, tokenId);
        _renewMembership(params.space, address(account), tokenId);

        vm.deal(address(account), 1 ether);

        vm.expectEmit(address(subscriptionModule));
        emit SubscriptionSynced(address(account), entityId, block.timestamp + duration);
        _processRenewalAs(processor, address(account), entityId);
    }

    function test_pauseAndResume_afterLongPeriod() public {
        uint64 duration = 7 days;
        uint256 renewalPrice = 1 ether;

        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(makeAddr("user"), duration, renewalPrice);

        uint256 totalPrice = _getMembership(params.space).getMembershipPrice();

        // Process first automated renewal successfully
        _warpToRenewalTime(params.space, tokenId);
        vm.deal(address(account), totalPrice);
        _processRenewalAs(processor, address(account), entityId);

        uint256 firstRenewalTime = subscriptionModule
            .getSubscription(address(account), entityId)
            .lastRenewalTime;
        uint256 firstExpiresAt = _getMembership(params.space).expiresAt(tokenId);

        // User manually renews while subscription is active
        skip(1 days);
        _renewMembership(params.space, address(account), tokenId);
        assertEq(
            _getMembership(params.space).expiresAt(tokenId),
            firstExpiresAt + duration,
            "Manual renewal should extend expiration"
        );

        // User pauses subscription
        vm.prank(address(account));
        subscriptionModule.pauseSubscription(entityId);
        assertFalse(
            subscriptionModule.getSubscription(address(account), entityId).active,
            "Subscription should be paused"
        );

        // Time passes (long period - 30 days), user manually renews while paused
        skip(30 days);
        _renewMembership(params.space, address(account), tokenId);

        // User reactivates subscription
        vm.prank(address(account));
        subscriptionModule.activateSubscription(entityId);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertTrue(sub.active, "Subscription should be active");

        // Verify nextRenewalTime is calculated from CURRENT state, not stale timestamp
        uint256 currentExpiresAt = _getMembership(params.space).expiresAt(tokenId);
        assertEq(
            sub.nextRenewalTime,
            currentExpiresAt - subscriptionModule.getRenewalBuffer(duration),
            "Next renewal should be based on current expiration"
        );
        assertEq(
            sub.lastKnownExpiresAt,
            currentExpiresAt,
            "lastKnownExpiresAt should match current expiration"
        );

        // Verify the subscription can process renewals correctly after reactivation
        _warpToRenewalTime(params.space, tokenId);
        vm.deal(address(account), totalPrice);
        _processRenewalAs(processor, address(account), entityId);

        sub = subscriptionModule.getSubscription(address(account), entityId);
        assertEq(sub.spent, totalPrice * 2, "Should have spent for 2 automated renewals");
        assertTrue(
            sub.lastRenewalTime > firstRenewalTime,
            "Last renewal time should be updated to recent timestamp"
        );
    }

    function test_installSetsTrackingFieldsCorrectly() public {
        uint64 duration = 7 days;
        uint256 renewalPrice = 1 ether;

        ModularAccount account = _createAccount(makeAddr("user"), 0);
        address space = _createSpace(renewalPrice, duration);
        uint256 tokenId = _joinSpace(address(account), space);

        uint256 expectedExpiresAt = _getMembership(space).expiresAt(tokenId);
        uint256 expectedRenewalPrice = _getMembership(space).getMembershipRenewalPrice(tokenId);

        SubscriptionParams memory params = _createSubscriptionParams(
            address(account),
            space,
            tokenId
        );

        uint32 entityId = _installSubscriptionModule(account, params);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);

        // Verify all tracking fields initialized correctly
        assertEq(sub.duration, duration, "Duration should be set on install");
        assertEq(
            sub.lastKnownRenewalPrice,
            expectedRenewalPrice,
            "Last known renewal price should be set on install"
        );
        assertEq(
            sub.lastKnownExpiresAt,
            expectedExpiresAt,
            "Last known expiresAt should be set on install"
        );
        assertEq(
            sub.nextRenewalTime,
            expectedExpiresAt - subscriptionModule.getRenewalBuffer(duration),
            "Next renewal time should be calculated on install"
        );
        assertTrue(sub.active, "Subscription should be active after install");
        assertEq(sub.spent, 0, "Spent should be zero on install");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     USDC SUBSCRIPTION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onInstall_USDC(address user) public {
        ModularAccount userAccount = _createAccount(user, 0);
        address space = _createSpaceUSDC(DEFAULT_USDC_PRICE, DEFAULT_MEMBERSHIP_DURATION);
        uint256 tokenId = _joinSpaceUSDC(address(userAccount), space);

        SubscriptionParams memory params = _createSubscriptionParams(
            address(userAccount),
            space,
            tokenId
        );

        uint32 entityId = _installSubscriptionModule(userAccount, params);

        assertEq(entityId, nextEntityId);
        assertSubscriptionActive(address(userAccount), entityId);

        Subscription memory sub = subscriptionModule.getSubscription(
            address(userAccount),
            entityId
        );
        assertEq(sub.lastKnownCurrency, address(mockUSDC), "Currency should be USDC");
    }

    function test_processRenewal_USDC(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscriptionUSDC(user, DEFAULT_MEMBERSHIP_DURATION, DEFAULT_USDC_PRICE);

        _warpToRenewalTime(params.space, tokenId);

        mockUSDC.mint(address(account), params.renewalPrice);

        address feeRecipient = platformRequirements.getFeeRecipient();

        BalanceSnapshot memory beforeSnap = snapshotBalancesUSDC(
            address(account),
            params.space,
            feeRecipient
        );

        _processRenewalAs(processor, address(account), entityId);

        BalanceSnapshot memory afterSnap = snapshotBalancesUSDC(
            address(account),
            params.space,
            feeRecipient
        );

        assertUSDCDistribution(DEFAULT_USDC_PRICE, params.renewalPrice, beforeSnap, afterSnap);
        assertSubscriptionActive(address(account), entityId);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertEq(sub.spent, params.renewalPrice, "Spent should equal renewal price");
        assertEq(sub.lastRenewalTime, block.timestamp, "Last renewal time should be updated");
    }

    function test_processRenewal_USDC_multipleRenewals(address user) public {
        uint64 duration = 7 days;
        uint256 usdcPrice = 5_000_000; // $5 USDC

        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscriptionUSDC(user, duration, usdcPrice);

        uint256 actualRenewalPrice = params.renewalPrice;

        mockUSDC.mint(address(account), actualRenewalPrice * 3);

        _warpToRenewalTime(params.space, tokenId);
        _processRenewalAs(processor, address(account), entityId);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertEq(sub.spent, actualRenewalPrice, "First renewal spent");
        uint256 firstRenewalTime = sub.lastRenewalTime;

        _warpToRenewalTime(params.space, tokenId);
        _processRenewalAs(processor, address(account), entityId);

        sub = subscriptionModule.getSubscription(address(account), entityId);
        assertEq(sub.spent, actualRenewalPrice * 2, "Second renewal spent");
        assertTrue(sub.lastRenewalTime > firstRenewalTime, "Last renewal time should be updated");
        assertTrue(sub.active, "Subscription should still be active");
    }

    function test_processRenewal_skipWhen_InsufficientUSDCBalance(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscriptionUSDC(user, DEFAULT_MEMBERSHIP_DURATION, DEFAULT_USDC_PRICE);

        _warpToRenewalTime(params.space, tokenId);

        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "INSUFFICIENT_BALANCE");
        _processRenewalAs(processor, address(account), entityId);

        assertFalse(subscriptionModule.getSubscription(address(account), entityId).active);
    }

    function test_processRenewal_skipWhen_CurrencyChanged(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        vm.deal(address(account), params.renewalPrice);

        vm.prank(owner);
        _getMembership(params.space).setMembershipCurrency(address(mockUSDC));

        _warpToRenewalTime(params.space, tokenId);

        vm.expectEmit(address(subscriptionModule));
        emit BatchRenewalSkipped(address(account), entityId, "CURRENCY_CHANGED");
        _processRenewalAs(processor, address(account), entityId);

        assertFalse(
            subscriptionModule.getSubscription(address(account), entityId).active,
            "Subscription should be paused after currency change"
        );
    }

    function test_activateSubscription_afterCurrencyChange(address user) public {
        (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        ) = _createSubscription(user);

        vm.prank(owner);
        _getMembership(params.space).setMembershipCurrency(address(mockUSDC));

        _warpToRenewalTime(params.space, tokenId);

        _processRenewalAs(processor, address(account), entityId);
        assertFalse(subscriptionModule.getSubscription(address(account), entityId).active);

        _renewMembershipUSDC(params.space, address(account), tokenId);

        vm.prank(address(account));
        subscriptionModule.activateSubscription(entityId);

        Subscription memory sub = subscriptionModule.getSubscription(address(account), entityId);
        assertTrue(sub.active, "Subscription should be active");
        assertEq(sub.lastKnownCurrency, address(mockUSDC), "Currency should be updated to USDC");
    }

    function test_batchProcessRenewals_USDC(address user1, address user2) public {
        vm.assume(user1 != address(0) && user2 != address(0) && user1 != user2);

        (
            ModularAccount account1,
            ,
            uint32 entityId1,
            SubscriptionParams memory params1
        ) = _createSubscriptionUSDC(user1, DEFAULT_MEMBERSHIP_DURATION, DEFAULT_USDC_PRICE);
        (
            ModularAccount account2,
            ,
            uint32 entityId2,
            SubscriptionParams memory params2
        ) = _createSubscriptionUSDC(user2, DEFAULT_MEMBERSHIP_DURATION, DEFAULT_USDC_PRICE);

        mockUSDC.mint(address(account1), params1.renewalPrice);
        mockUSDC.mint(address(account2), params2.renewalPrice);

        _warpToRenewalTime(params1.space, params1.tokenId);
        _warpToRenewalTime(params2.space, params2.tokenId);

        RenewalParams[] memory batchParams = new RenewalParams[](2);
        batchParams[0] = RenewalParams({account: address(account1), entityId: entityId1});
        batchParams[1] = RenewalParams({account: address(account2), entityId: entityId2});

        vm.prank(processor);
        subscriptionModule.batchProcessRenewals(batchParams);

        assertSubscriptionActive(address(account1), entityId1);
        assertSubscriptionActive(address(account2), entityId2);

        assertEq(mockUSDC.balanceOf(address(account1)), 0, "Account1 USDC should be spent");
        assertEq(mockUSDC.balanceOf(address(account2)), 0, "Account2 USDC should be spent");
    }
}
