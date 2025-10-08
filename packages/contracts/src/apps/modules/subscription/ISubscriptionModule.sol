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
    error SubscriptionModule__RenewalNotDue();
    error SubscriptionModule__RenewalFailed();
    error SubscriptionModule__InvalidSender();
    error SubscriptionModule__NotSupported();
    error SubscriptionModule__InvalidEntityId();
    error SubscriptionModule__InvalidCaller();
    error SubscriptionModule__InvalidAddress();
    error SubscriptionModule__ExceedsMaxBatchSize();
    error SubscriptionModule__EmptyBatch();
    error SubscriptionModule__InvalidTokenOwner();
    error SubscriptionModule__InsufficientBalance();
    error SubscriptionModule__ActiveSubscription();
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Events                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event SubscriptionConfigured(
        address indexed account,
        uint32 indexed entityId,
        address indexed space,
        uint256 tokenId,
        uint64 nextRenewalTime,
        uint256 expiresAt
    );

    event SubscriptionDeactivated(address indexed account, uint32 indexed entityId);

    event SubscriptionActivated(address indexed account, uint32 indexed entityId);

    event SubscriptionSpent(
        address indexed account,
        uint32 indexed entityId,
        uint256 amount,
        uint256 totalSpent
    );

    event SubscriptionRenewed(
        address indexed account,
        uint32 indexed entityId,
        address indexed space,
        uint256 tokenId,
        uint256 nextRenewalTime,
        uint256 expiresAt
    );

    /// @notice Emitted when a subscription's next renewal time is synced to on-chain expiration
    event SubscriptionSynced(
        address indexed account,
        uint32 indexed entityId,
        uint256 newNextRenewalTime
    );

    event SubscriptionPaused(address indexed account, uint32 indexed entityId);
    event SubscriptionNotDue(address indexed account, uint32 indexed entityId);

    event BatchRenewalSkipped(address indexed account, uint32 indexed entityId, string reason);

    event OperatorGranted(address indexed operator);
    event OperatorRevoked(address indexed operator);
}

interface ISubscriptionModule is ISubscriptionModuleBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Functions                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Processes multiple Towns membership renewals in batch
    /// @param params The parameters for the renewals
    function batchProcessRenewals(RenewalParams[] calldata params) external;

    /// @notice Gets the subscription for an account and entity ID
    /// @param account The address of the account to get the subscription for
    /// @param entityId The entity ID of the subscription to get
    /// @return The subscription for the account and entity ID
    function getSubscription(
        address account,
        uint32 entityId
    ) external view returns (Subscription memory);

    /// @notice Gets the renewal buffer for a space
    /// @param space The space contract address
    /// @return The renewal buffer based on the space's membership duration
    function getRenewalBuffer(address space) external view returns (uint256);

    /// @notice Activates a subscription
    /// @param entityId The entity ID of the subscription to activate
    function activateSubscription(uint32 entityId) external;

    /// @notice Pauses a subscription
    /// @param entityId The entity ID of the subscription to pause
    function pauseSubscription(uint32 entityId) external;

    /// @notice Gets the entity IDs for an account
    /// @param account The address of the account to get the entity IDs for
    /// @return The entity IDs for the account
    function getEntityIds(address account) external view returns (uint256[] memory);

    /// @notice Checks if an operator has access to call processRenewal
    /// @param operator The address of the operator to check
    function isOperator(address operator) external view returns (bool);

    /// @notice Grants an operator access to call processRenewal
    /// @param operator The address of the operator to grant
    function grantOperator(address operator) external;

    /// @notice Revokes an operator access to call processRenewal
    /// @param operator The address of the operator to revoke
    function revokeOperator(address operator) external;
}
