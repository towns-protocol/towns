// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

import {Subscription} from "./SubscriptionModuleStorage.sol";

interface ISubscriptionModuleBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Structs                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Parameters for renewing a subscription
    /// @param account The address of the account to renew the subscription for
    /// @param entityId The entity ID of the subscription to renew
    struct RenewalParams {
        address account;
        uint32 entityId;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Errors                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error SubscriptionModule__InactiveSubscription();
    error SubscriptionModule__InvalidSpace();
    error SubscriptionModule__InvalidTokenId();
    error SubscriptionModule__InvalidRenewalPrice();
    error SubscriptionModule__SpendLimitExceeded();
    error SubscriptionModule__RenewalNotDue();
    error SubscriptionModule__InsufficientPayment();
    error SubscriptionModule__RenewalFailed();
    error SubscriptionModule__InvalidSender();
    error SubscriptionModule__NotSupported();
    error SubscriptionModule__InvalidConfiguration();
    error SubscriptionModule__UnauthorizedCaller();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Events                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event SubscriptionConfigured(
        address indexed account,
        uint32 indexed entityId,
        address indexed space,
        uint256 tokenId,
        uint256 renewalPrice
    );

    event SubscriptionDeactivated(address indexed account, uint32 indexed entityId);

    event SubscriptionSpent(
        address indexed account,
        uint32 indexed entityId,
        uint256 amount,
        uint256 totalSpent
    );

    event SubscriptionRenewed(
        address indexed account,
        uint32 indexed entityId,
        uint256 nextRenewalTime
    );

    event SubscriptionPaused(address indexed account, uint32 indexed entityId);

    event BatchRenewalSkipped(address indexed account, uint32 indexed entityId, string reason);
}

interface ISubscriptionModule is ISubscriptionModuleBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Functions                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Processes multiple Towns membership renewals in batch
    /// @param params The parameters for the renewals
    function batchProcessRenewals(RenewalParams[] calldata params) external;

    /// @notice Processes a single Towns membership renewal
    /// @param params The parameters for the renewal
    function processRenewal(RenewalParams calldata params) external;

    function getSubscription(
        address account,
        uint32 entityId
    ) external view returns (Subscription memory);

    /// @notice Pauses a subscription
    /// @param entityId The entity ID of the subscription to pause
    function pauseSubscription(uint32 entityId) external;

    /// @notice Gets the entity IDs for an account
    /// @param account The address of the account to get the entity IDs for
    /// @return The entity IDs for the account
    function getEntityIds(address account) external view returns (uint256[] memory);
}
