// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IBanning} from "../../../src/spaces/facets/banning/IBanning.sol";

// utils
import {ModulesBase} from "./ModulesBase.sol";
import {Validator} from "../../../src/utils/libraries/Validator.sol";

// contracts
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";
import {SubscriptionModuleBase} from "../../../src/apps/modules/subscription/SubscriptionModuleBase.sol";
import {SubscriptionModuleStorage} from "../../../src/apps/modules/subscription/SubscriptionModuleStorage.sol";

/// @title Harness for testing internal functions
contract SubscriptionModuleHarness is SubscriptionModuleBase {
    function getRenewalBuffer(uint256 duration) external pure returns (uint256) {
        return _getRenewalBuffer(duration);
    }

    function calculateBaseRenewalTime(
        uint256 expirationTime,
        uint256 duration
    ) external view returns (uint40) {
        return _calculateBaseRenewalTime(expirationTime, duration);
    }

    function skipReasonToString(SkipReason reason) external pure returns (string memory) {
        return _skipReasonToString(reason);
    }
}

contract SubscriptionModuleUnitTest is ModulesBase, IOwnableBase {
    SubscriptionModuleHarness harness;

    function setUp() public override {
        super.setUp();
        harness = new SubscriptionModuleHarness();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       STORAGE SLOT                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_storageSlot() public pure {
        bytes32 slot = keccak256(
            abi.encode(uint256(keccak256("towns.subscription.validation.module.storage")) - 1)
        ) & ~bytes32(uint256(0xff));
        assertEq(slot, SubscriptionModuleStorage.STORAGE_SLOT);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       HARNESS TESTS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getRenewalBuffer(uint256 duration) public view {
        duration = bound(duration, 1, 365 days);
        uint256 buffer = harness.getRenewalBuffer(duration);

        if (duration <= 1 hours) {
            assertEq(buffer, 2 minutes, "duration <= 1h: buffer should be 2 minutes");
        } else if (duration <= 6 hours) {
            assertEq(buffer, 1 hours, "duration <= 6h: buffer should be 1 hour");
        } else if (duration <= 24 hours) {
            assertEq(buffer, 6 hours, "duration <= 24h: buffer should be 6 hours");
        } else {
            assertEq(buffer, 12 hours, "duration > 24h: buffer should be 12 hours");
        }
    }

    function test_getRenewalBuffer_EdgeCases() public view {
        // Exactly at boundaries
        assertEq(harness.getRenewalBuffer(1 hours), 2 minutes, "at 1h boundary");
        assertEq(harness.getRenewalBuffer(1 hours + 1), 1 hours, "just over 1h");

        assertEq(harness.getRenewalBuffer(6 hours), 1 hours, "at 6h boundary");
        assertEq(harness.getRenewalBuffer(6 hours + 1), 6 hours, "just over 6h");

        assertEq(harness.getRenewalBuffer(24 hours), 6 hours, "at 24h boundary");
        assertEq(harness.getRenewalBuffer(24 hours + 1), 12 hours, "just over 24h");
    }

    function test_calculateBaseRenewalTime(uint256 expirationTime, uint256 duration) public view {
        duration = bound(duration, 1 hours, 365 days);
        expirationTime = bound(expirationTime, block.timestamp, block.timestamp + 365 days);

        uint40 renewalTime = harness.calculateBaseRenewalTime(expirationTime, duration);
        uint256 buffer = harness.getRenewalBuffer(duration);

        if (expirationTime <= block.timestamp) {
            assertEq(renewalTime, block.timestamp, "expired: should return now");
        } else {
            uint256 timeUntilExpiration = expirationTime - block.timestamp;
            if (buffer >= timeUntilExpiration) {
                // Buffer is larger than time until expiration
                assertEq(
                    renewalTime,
                    expirationTime + (buffer - timeUntilExpiration),
                    "buffer > time: schedule after expiration"
                );
            } else {
                assertEq(
                    renewalTime,
                    expirationTime - buffer,
                    "normal: schedule before expiration"
                );
            }
        }
    }

    function test_calculateBaseRenewalTime_AlreadyExpired() public {
        // When expiration is in the past or now
        uint40 result = harness.calculateBaseRenewalTime(block.timestamp, 7 days);
        assertEq(result, block.timestamp, "should return current time when expired");

        vm.warp(block.timestamp + 100);
        result = harness.calculateBaseRenewalTime(block.timestamp - 50, 7 days);
        assertEq(result, block.timestamp, "should return current time when past expiration");
    }

    function test_skipReasonToString_AllReasons() public view {
        assertEq(harness.skipReasonToString(SubscriptionModuleBase.SkipReason.NOT_DUE), "NOT_DUE");
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.INACTIVE),
            "INACTIVE"
        );
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.PAST_GRACE),
            "PAST_GRACE"
        );
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.MEMBERSHIP_BANNED),
            "MEMBERSHIP_BANNED"
        );
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.NOT_OWNER),
            "NOT_OWNER"
        );
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.RENEWAL_PRICE_CHANGED),
            "RENEWAL_PRICE_CHANGED"
        );
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.INSUFFICIENT_BALANCE),
            "INSUFFICIENT_BALANCE"
        );
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.DURATION_CHANGED),
            "DURATION_CHANGED"
        );
        assertEq(
            harness.skipReasonToString(SubscriptionModuleBase.SkipReason.CURRENCY_CHANGED),
            "CURRENCY_CHANGED"
        );
        assertEq(harness.skipReasonToString(SubscriptionModuleBase.SkipReason.NONE), "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       INSTALL TESTS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
            entityId: 2,
            nextRenewalTime: 0
        });

        expectInstallFailed(
            address(subscriptionModule),
            SubscriptionModule__InvalidTokenOwner.selector
        );
        _installSubscriptionModule(userAccount, params);
    }

    function test_onInstall_revertWhen_InvalidEntityId(address user) public {
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
            SubscriptionModule__InvalidEntityId.selector
        );
        _installSubscriptionModule(userAccount, params);
    }

    function test_onInstall_revertWhen_BannedMembership() public {
        ModularAccount userAccount = _createAccount(makeAddr("user"), 0);
        address space = _createSpace(0, 0);
        uint256 tokenId = _joinSpace(address(userAccount), space);

        vm.prank(owner);
        IBanning(space).ban(tokenId);

        SubscriptionParams memory params = _createSubscriptionParams(
            address(userAccount),
            space,
            tokenId
        );

        expectInstallFailed(
            address(subscriptionModule),
            SubscriptionModule__MembershipBanned.selector
        );
        _installSubscriptionModule(userAccount, params);
    }

    function test_onInstall_revertWhen_MembershipExpired() public {
        ModularAccount userAccount = _createAccount(makeAddr("user"), 0);
        address space = _createSpace(1 ether, 7 days);
        uint256 tokenId = _joinSpace(address(userAccount), space);

        // Warp past expiration
        _warpPastGracePeriod(space, tokenId);

        SubscriptionParams memory params = _createSubscriptionParams(
            address(userAccount),
            space,
            tokenId
        );

        expectInstallFailed(
            address(subscriptionModule),
            SubscriptionModule__MembershipExpired.selector
        );
        _installSubscriptionModule(userAccount, params);
    }

    function test_installSubscriptionModule_revertWhen_SubscriptionAlreadyInstalled() public {
        uint64 duration = 1 hours;
        uint256 renewalPrice = 0.001 ether;

        (ModularAccount account, , , SubscriptionParams memory params) = _createSubscription(
            makeAddr("user"),
            duration,
            renewalPrice
        );
        params.entityId = params.entityId + 1;

        expectInstallFailed(
            address(subscriptionModule),
            SubscriptionModule__SubscriptionAlreadyInstalled.selector
        );
        _installSubscriptionModule(account, params);
    }

    function test_installSubscriptionModule_revertWhen_InvalidSpace() public {
        ModularAccount userAccount = _createAccount(makeAddr("user"), 0);
        address space = address(new FakeSpace(address(userAccount)));

        SubscriptionParams memory params = _createSubscriptionParams(
            address(userAccount),
            space,
            1
        );

        expectInstallFailed(address(subscriptionModule), SubscriptionModule__InvalidSpace.selector);
        _installSubscriptionModule(userAccount, params);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      UNINSTALL TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onUninstall_emitsValidationUninstalled_forInvalidEntityId(address user) public {
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
    /*                  BATCH PROCESS RENEWALS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    OPERATOR MANAGEMENT                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_grantOperator_revertWhen_NotOwner() public {
        address newOperator = makeAddr("newOperator");
        address nonOwner = makeAddr("nonOwner");

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, nonOwner));
        vm.prank(nonOwner);
        subscriptionModule.grantOperator(newOperator);
    }

    function test_grantOperator_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        subscriptionModule.grantOperator(address(0));
    }

    function test_grantOperator(address operator) public {
        vm.assume(operator != address(0) && operator != processor);

        assertFalse(subscriptionModule.isOperator(operator));

        vm.expectEmit(address(subscriptionModule));
        emit OperatorGranted(operator);
        vm.prank(deployer);
        subscriptionModule.grantOperator(operator);

        assertTrue(subscriptionModule.isOperator(operator));
    }

    function test_revokeOperator_revertWhen_NotOwner() public {
        address operatorToRevoke = makeAddr("operatorToRevoke");
        address nonOwner = makeAddr("nonOwner");

        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, nonOwner));
        vm.prank(nonOwner);
        subscriptionModule.revokeOperator(operatorToRevoke);
    }

    function test_revokeOperator_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        subscriptionModule.revokeOperator(address(0));
    }

    function test_revokeOperator(address operator) public {
        vm.assume(operator != address(0));

        vm.prank(deployer);
        subscriptionModule.grantOperator(operator);
        assertTrue(subscriptionModule.isOperator(operator));

        vm.expectEmit(address(subscriptionModule));
        emit OperatorRevoked(operator);
        vm.prank(deployer);
        subscriptionModule.revokeOperator(operator);

        assertFalse(subscriptionModule.isOperator(operator));
    }
}

contract FakeSpace {
    address private _owner;

    constructor(address fakeOwner) {
        _owner = fakeOwner;
    }

    function isBanned(uint256) external pure returns (bool) {
        return false;
    }

    function ownerOf(uint256) external view returns (address) {
        return _owner;
    }

    function expiresAt(uint256) external view returns (uint256) {
        return block.timestamp + 100 days;
    }

    function getMembershipDuration() external pure returns (uint256) {
        return 100 days;
    }

    function getMembershipRenewalPrice(uint256) external pure returns (uint256) {
        return 0.001 ether;
    }
}
